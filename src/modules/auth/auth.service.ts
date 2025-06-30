import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/services/user.service';
import { PasswordService } from './services/password.service';
import { CacheService } from '../../cache/cache.service';
import { JwtPayload, AuthTokens, LoginResponse } from './interfaces/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { v4 as uuidv4 } from 'uuid';
import { WinstonLoggerService } from '@/logger/winston-logger.service';
import { UserType } from '@/common/enums/user.enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.userService.findByEmail(email);

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${email}`);
        return null;
      }

      if (user.status !== 'active') {
        this.logger.warn(`Login attempt with inactive account: ${email}`);
        throw new UnauthorizedException('Account is not active');
      }

      const isPasswordValid = await this.passwordService.validatePassword(
        password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        this.logger.warn(`Invalid password attempt for user: ${email}`);
        return null;
      }

      // Update last login
      await this.userService.updateLastLogin(user.id);

      const { passwordHash: _passwordHash, ...result } = user;

      return result;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`);
      return null;
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    // Store refresh token in database
    await this.userService.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: user.userType,
        firstName: user.userProfile?.firstName,
        lastName: user.userProfile?.lastName,
        avatar: user.userProfile?.avatarUrl,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await this.userService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(registerDto.password);

    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(registerDto.password);

    // Create user
    const userData = {
      email: registerDto.email,
      username: registerDto.username,
      passwordHash,
      userType: registerDto.userType || UserType.STUDENT,
      status: 'pending', // Require email verification
    };

    const user = await this.userService.create(userData);

    // Send verification email
    await this.sendVerificationEmail(user);

    const tokens = await this.generateTokens(user);
    await this.userService.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User registered successfully: ${user.email}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: user.userType,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.userService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify refresh token exists in database
      const isValidRefreshToken = await this.userService.verifyRefreshToken(user.id, refreshToken);

      if (!isValidRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Store new refresh token and remove old one
      await this.userService.rotateRefreshToken(user.id, refreshToken, tokens.refreshToken);

      return tokens;
    } catch (error) {
      this.logger.error(`Error refreshing token: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    // Remove refresh token from database
    if (refreshToken) {
      await this.userService.revokeRefreshToken(userId, refreshToken);
    } else {
      // Revoke all refresh tokens for user
      await this.userService.revokeAllRefreshTokens(userId);
    }

    // Add access token to blacklist cache
    await this.blacklistToken(userId);

    this.logger.log(`User logged out: ${userId}`);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.validatePassword(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.passwordService.validatePasswordStrength(
      changePasswordDto.newPassword,
    );

    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(changePasswordDto.newPassword);

    // Update password and password changed timestamp
    await this.userService.updatePassword(userId, newPasswordHash);

    // Revoke all existing refresh tokens
    await this.userService.revokeAllRefreshTokens(userId);

    this.logger.log(`Password changed for user: ${userId}`);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.userService.storePasswordResetToken(user.id, resetToken, resetTokenExpiry);

    // Send reset email
    await this.sendPasswordResetEmail(user, resetToken);

    this.logger.log(`Password reset email sent to: ${email}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.userService.findByPasswordResetToken(resetPasswordDto.token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate new password
    const passwordValidation = this.passwordService.validatePasswordStrength(
      resetPasswordDto.newPassword,
    );

    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(resetPasswordDto.newPassword);

    // Update password and clear reset token
    await this.userService.resetPasswordWithToken(user.id, passwordHash);

    // Revoke all refresh tokens
    await this.userService.revokeAllRefreshTokens(user.id);

    this.logger.log(`Password reset successfully for user: ${user.email}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userService.findByEmailVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userService.verifyEmailWithToken(user.id);

    this.logger.log(`Email verified for user: ${user.email}`);
  }

  private async generateTokens(user: any): Promise<AuthTokens> {
    const jwtId = uuidv4();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      userType: user.userType,
      roles: user.roles || [],
      jti: jwtId,
    };

    const accessTokenExpiresIn = this.configService.get<string>('jwt.expiresIn');
    const refreshTokenExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(
        { sub: user.id, jti: jwtId },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: refreshTokenExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(accessTokenExpiresIn!),
      tokenType: 'Bearer',
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const time = parseInt(expiresIn.slice(0, -1));
    const unit = expiresIn.slice(-1);

    switch (unit) {
      case 's':
        return time;
      case 'm':
        return time * 60;
      case 'h':
        return time * 3600;
      case 'd':
        return time * 86400;
      default:
        return time;
    }
  }

  private async blacklistToken(userId: string): Promise<void> {
    const key = `blacklist:${userId}`;
    await this.cacheService.set(key, 'true', 900); // 15 minutes
  }

  async isTokenBlacklisted(userId: string): Promise<boolean> {
    const key = `blacklist:${userId}`;
    const result = await this.cacheService.get(key);
    return result === 'true';
  }

  private async sendVerificationEmail(user: any): Promise<void> {
    // Email verification implementation
    // This will be implemented in the notification module
    this.logger.log(`Verification email would be sent to: ${user.email}`);
  }

  private async sendPasswordResetEmail(user: any, resetToken: string): Promise<void> {
    // Password reset email implementation
    // This will be implemented in the notification module
    this.logger.log(
      `Password reset email would be sent to: ${user.email} with token: ${resetToken}`,
    );
  }
}

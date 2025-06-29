import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WinstonLoggerService } from '@/logger/winston-logger.service';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { TwoFactorService } from './services/two-factor.service';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DisableTwoFactorDto, VerifyTwoFactorDto } from './dto/two-factor.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: WinstonLoggerService,
    private readonly twoFactorService: TwoFactorService,
  ) {
    this.logger.setContext(AuthController.name);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or user already exists' })
  async register(@Body() registerDto: RegisterDto, @Response() res) {
    const result = await this.authService.register(registerDto);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.status(HttpStatus.CREATED).json({
      message: 'User registered successfully',
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  // dùng để thiết lập HTTP status code trả về cho một route mặc định là 200 OK
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Request() req, @Response() res) {
    const user = req.user;

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return res.json({
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        userId: user.id,
      });
    }

    const result = await this.authService.login(loginDto);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return res.json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  }

  @Public()
  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with 2FA' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async loginWith2FA(@Body() body: { userId: string; token: string }, @Response() res) {
    const { userId, token } = body;

    const isValidToken = await this.twoFactorService.verifyTwoFactorToken(userId, token);

    if (!isValidToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid verification code',
      });
    }

    // Generate tokens for authenticated user
    const user = await this.authService['userService'].findById(userId);
    const result = await this.authService.login({ email: user.email, password: '' });

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  }

  @Public()
  @UseGuards(RefreshJwtAuthGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Request() req, @Response() res) {
    const refreshToken =
      req.cookies['refresh-token'] || req.headers.authorization?.replace('Bearer ', '');

    const result = await this.authService.refreshToken(refreshToken);

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return res.json({
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentUser('id') userId: string, @Request() req, @Response() res) {
    const refreshToken = req.cookies['refresh-token'];

    await this.authService.logout(userId, refreshToken);

    // Clear cookies
    res.clearCookie('access-token');
    res.clearCookie('refresh-token');

    this.logger.log(`User logged out: ${userId}`);

    return res.json({
      message: 'Logout successful',
    });
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, changePasswordDto);

    return {
      message: 'Password changed successfully',
    };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent (if email exists)' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(resetPasswordDto);

    return {
      message: 'Password reset successfully',
    };
  }

  @Public()
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification token' })
  async verifyEmail(@Request() req) {
    const token = req.params.token;
    await this.authService.verifyEmail(token);

    return {
      message: 'Email verified successfully',
    };
  }

  // Two-Factor Authentication endpoints
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 200, description: '2FA secret generated' })
  async generate2FA(@CurrentUser('id') userId: string) {
    const result = await this.twoFactorService.generateTwoFactorSecret(userId);

    return {
      message: '2FA secret generated successfully',
      secret: result.secret,
      qrCodeUrl: result.qrCodeUrl,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA with verification code' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async enable2FA(
    @CurrentUser('id') userId: string,
    @Body() verifyTwoFactorDto: VerifyTwoFactorDto,
  ) {
    await this.twoFactorService.enableTwoFactor(userId, verifyTwoFactorDto.token);

    // Generate backup codes
    const backupCodes = await this.twoFactorService.generateBackupCodes(userId);

    return {
      message: '2FA enabled successfully',
      backupCodes,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA with verification code' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async disable2FA(
    @CurrentUser('id') userId: string,
    @Body() disableTwoFactorDto: DisableTwoFactorDto,
  ) {
    await this.twoFactorService.disableTwoFactor(userId, disableTwoFactorDto.token);

    return {
      message: '2FA disabled successfully',
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: any) {
    return {
      user,
    };
  }

  private setAuthCookies(res: any, accessToken: string, refreshToken: string): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // Set access token cookie
    res.cookie('access-token', accessToken, {
      httpOnly: true, // Cookie chỉ gửi qua HTTP, JavaScript không đọc được → chống XSS
      secure: isProduction, // Chỉ gửi cookie qua HTTPS nếu isProduction === true → chống MITM
      sameSite: 'strict', // 'strict' ngăn chặn gửi cookie qua các yêu cầu cross-site → chống CSRF
      maxAge: 15 * 60 * 1000, // Cookie tồn tại trong 15 phút tính từ khi được gửi
    });

    // Set refresh token cookie
    res.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}

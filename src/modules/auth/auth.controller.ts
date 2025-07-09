import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WinstonService } from '@/logger/winston.service';
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
import { FacebookAuthGuard, GoogleAuthGuard } from './guards/oauth.guard';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './services/session.service';
import { DeviceInfo } from './interfaces/device-info.interface';
import { CurrentSession } from './decorators/session.decorator';
import { Complete2FALoginDto, Enable2FADto, Verify2FADto } from './dto/two-factor.dto';
import { LinkOAuthDto } from './dto/oauth.dto';
import { UserService } from '../user/services/user.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: WinstonService,
    private readonly twoFactorService: TwoFactorService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
  ) {
    this.logger.setContext(AuthController.name);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or user already exists' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    const deviceInfo: DeviceInfo = this.extractDeviceInfo(userAgent, ip);
    const result = await this.authService.register(registerDto, deviceInfo);

    return {
      message: 'User registered successfully',
      ...result,
    };
  }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  // dùng để thiết lập HTTP status code trả về cho một route mặc định là 200 OK
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked or suspended' })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Response({ passthrough: true }) res,
  ) {
    const deviceInfo: DeviceInfo = this.extractDeviceInfo(userAgent, ip);
    const result = await this.authService.login(loginDto, deviceInfo);

    // Set cookies if not requiring 2FA
    if (!result.requires2FA) {
      this.setAuthCookies(res, result);
    }

    return {
      message: result.requires2FA ? '2FA verification required' : 'Login successful',
      ...result,
    };
  }

  @Public()
  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with 2FA' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async complete2FALogin(
    @Body() complete2FADto: Complete2FALoginDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Response({ passthrough: true }) res,
  ) {
    const deviceInfo: DeviceInfo = this.extractDeviceInfo(userAgent, ip);
    const result = await this.authService.complete2FALogin(
      complete2FADto.tempToken,
      complete2FADto.code,
      deviceInfo,
    );

    this.setAuthCookies(res, result);

    return {
      message: '2FA login successful',
      ...result,
    };
  }

  @Public()
  @Post('refresh')
  @UseGuards(RefreshJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Request() req, @Response({ passthrough: true }) res) {
    const refreshToken =
      req.cookies?.['refresh-token'] || req.headers?.authorization?.replace('Bearer ', '');

    const tokens = await this.authService.refreshToken(refreshToken);
    this.setAuthCookies(res, tokens);

    return {
      message: 'Token refreshed successfully',
      ...tokens,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser('id') userId: string,
    @CurrentSession('sessionId') sessionId: string,
    @Request() req,
    @Response({ passthrough: true }) res,
  ) {
    const refreshToken = req.cookies?.['refresh-token'];

    await this.authService.logout(userId, sessionId, refreshToken);
    this.clearAuthCookies(res);

    return {
      message: 'Logout successful',
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutFromAllDevices(
    @CurrentUser('id') userId: string,
    @CurrentSession('sessionId') currentSessionId: string,
    @Response({ passthrough: true }) _res,
  ) {
    await this.authService.logoutFromAllDevices(userId, currentSessionId);

    return {
      message: 'Logged out from all devices successfully',
    };
  }

  // Password Management
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password or weak new password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

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
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification token' })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);

    return {
      message: 'Email verified successfully',
    };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerificationEmail(@Body('email') email: string) {
    await this.authService.resendVerificationEmail(email);

    return {
      message: 'Verification email sent if the account exists',
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
  async enable2FA(@CurrentUser('id') userId: string, @Body() enable2FADto: Enable2FADto) {
    await this.twoFactorService.enableTwoFactor(userId, enable2FADto.code);

    return {
      message: '2FA enabled successfully',
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA with verification code' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async disable2FA(@CurrentUser('id') userId: string, @Body() verify2FADto: Verify2FADto) {
    await this.twoFactorService.disableTwoFactor(userId, verify2FADto.code);

    return {
      message: '2FA disabled successfully',
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('2fa/backup-codes')
  @ApiOperation({ summary: 'Generate backup codes for 2FA' })
  @ApiResponse({ status: 200, description: 'Backup codes generated' })
  async generateBackupCodes(@CurrentUser('id') userId: string) {
    const backupCodes = await this.twoFactorService.generateBackupCodes(userId);

    return {
      message: 'Backup codes generated successfully',
      backupCodes,
    };
  }

  // Profile and Account Management
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: any) {
    return {
      message: 'Profile retrieved successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: user.userType,
        roles: user.roles,
        permissions: user.permissions,
      },
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('check-auth')
  @ApiOperation({ summary: 'Check authentication status' })
  @ApiResponse({ status: 200, description: 'Authentication status' })
  async checkAuth(@CurrentUser() user: any, @CurrentSession() session: any) {
    return {
      authenticated: true,
      user,
      session: session
        ? {
            sessionId: session.sessionId,
            createdAt: session.createdAt,
            lastAccessedAt: session.lastAccessedAt,
          }
        : null,
    };
  }

  // Security and Audit
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('security/login-history')
  @ApiOperation({ summary: 'Get user login history' })
  @ApiResponse({ status: 200, description: 'Login history retrieved' })
  async getLoginHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') _limit: string = '20',
    @Query('offset') _offset: string = '0',
  ) {
    // This would typically come from audit logs
    // For now, return session statistics
    const sessionStats = await this.sessionService.getUserSessionStats(userId);

    return {
      message: 'Login history retrieved successfully',
      stats: sessionStats,
      // TODO: Implement actual login history from audit logs
      history: [],
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('security/devices')
  @ApiOperation({ summary: 'Get user trusted devices' })
  @ApiResponse({ status: 200, description: 'Trusted devices retrieved' })
  async getTrustedDevices(@CurrentUser('id') userId: string) {
    const sessions = await this.authService.getUserSessions(userId);

    return {
      message: 'Trusted devices retrieved successfully',
      devices: sessions.map(session => ({
        sessionId: session.sessionId,
        device: session.deviceInfo.device,
        browser: session.deviceInfo.browser,
        os: session.deviceInfo.os,
        lastAccessed: session.lastAccessedAt,
        current: session.current,
      })),
    };
  }

  // Account Security Actions
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('security/revoke-all-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all refresh tokens and sessions' })
  @ApiResponse({ status: 200, description: 'All tokens and sessions revoked' })
  async revokeAllTokens(
    @CurrentUser('id') userId: string,
    @CurrentSession('sessionId') currentSessionId: string,
  ) {
    await this.authService.logoutFromAllDevices(userId, currentSessionId);

    return {
      message: 'All tokens and sessions revoked successfully',
    };
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth login successful' })
  async googleAuthCallback(@Request() req, @Response() res) {
    const user = req.user;

    if (!user) {
      return res.redirect(
        `${this.configService.get<string>('frontend.url')}/auth/error?message=OAuth failed`,
      );
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);
    this.setAuthCookies(res, tokens);

    return res.redirect(`${this.configService.get<string>('frontend.url')}/auth/oauth-success`);
  }

  @Public()
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  @ApiOperation({ summary: 'Login with Facebook' })
  @ApiResponse({ status: 302, description: 'Redirect to Facebook OAuth' })
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth login successful' })
  async facebookAuthCallback(@Request() req, @Response() res) {
    const user = req.user;

    if (!user) {
      return res.redirect(
        `${this.configService.get<string>('frontend.url')}/auth/error?message=OAuth failed`,
      );
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);
    this.setAuthCookies(res, tokens);

    return res.redirect(`${this.configService.get<string>('frontend.url')}/auth/oauth-success`);
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('link-oauth')
  @ApiOperation({ summary: 'Link OAuth account to existing user' })
  @ApiResponse({ status: 200, description: 'OAuth account linked successfully' })
  async linkOAuthAccount(@CurrentUser('id') userId: string, @Body() linkOAuthDto: LinkOAuthDto) {
    await this.userService.linkOAuthAccount(userId, {
      provider: linkOAuthDto.provider,
      providerId: linkOAuthDto.providerId,
      accessToken: linkOAuthDto.accessToken,
      refreshToken: linkOAuthDto.refreshToken,
      profileData: linkOAuthDto.profileData,
    });

    return {
      message: 'OAuth account linked successfully',
    };
  }

  // Session Management endpoints
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiResponse({ status: 200, description: 'Active sessions retrieved' })
  async getUserSessions(@CurrentUser('id') userId: string) {
    const sessions = await this.authService.getUserSessions(userId);

    return {
      message: 'Active sessions retrieved successfully',
      sessions,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to terminate' })
  @ApiResponse({ status: 200, description: 'Session terminated successfully' })
  async terminateSession(@CurrentUser('id') userId: string, @Param('sessionId') sessionId: string) {
    await this.authService.terminateSession(userId, sessionId);

    return {
      message: 'Session terminated successfully',
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Delete('unlink-oauth/:provider')
  @ApiOperation({ summary: 'Unlink OAuth account' })
  @ApiResponse({ status: 200, description: 'OAuth account unlinked successfully' })
  async unlinkOAuthAccount(
    @CurrentUser('id') userId: string,
    @Param('provider') provider: 'google' | 'facebook',
  ) {
    await this.userService.unlinkOAuthAccount(userId, provider);

    return {
      message: 'OAuth account unlinked successfully',
    };
  }

  private setAuthCookies(res: any, tokens: any) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('cookie.domain');

    res.cookie('access-token', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      domain,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      domain,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    if (tokens.sessionId) {
      res.cookie('session-id', tokens.sessionId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        domain,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }
  }

  private extractDeviceInfo(userAgent: string, ip: string): DeviceInfo {
    // Basic device info extraction - in production, use a proper user-agent parser
    const device = this.getDeviceType(userAgent);
    const browser = this.getBrowserInfo(userAgent);
    const os = this.getOSInfo(userAgent);

    return {
      userAgent: userAgent || 'Unknown',
      ip: ip || '0.0.0.0',
      device,
      browser,
      os,
    };
  }

  private getDeviceType(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'Mobile';
    } else if (/Tablet/.test(userAgent)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  private getBrowserInfo(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';

    return 'Unknown';
  }

  private getOSInfo(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';

    return 'Unknown';
  }
  private clearAuthCookies(res: any) {
    const domain = this.configService.get<string>('cookie.domain');

    res.clearCookie('access-token', { domain });
    res.clearCookie('refresh-token', { domain });
    res.clearCookie('session-id', { domain });
  }
}

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
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
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
import { TeacherRegistrationDto } from './dto/teacher-registration.dto';
import { FacebookAuthGuard, GoogleAuthGuard } from './guards/oauth.guard';
import { ConfigService } from '@nestjs/config';
import { SessionService } from './services/session.service';
import { DeviceInfo } from './interfaces/device-info.interface';
import { CurrentSession } from './decorators/session.decorator';
import { Complete2FALoginDto, Enable2FADto, Verify2FADto } from './dto/two-factor.dto';
import { LinkOAuthDto } from './dto/oauth.dto';
import { UserService } from '../user/services/user.service';
import { SkipCsrf } from '../security/decorators/security.decorators';

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
  @SkipCsrf()
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
  @SkipCsrf()
  @UseGuards(LocalAuthGuard)
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

    if (!result.twoFactorEnabled) {
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
  async refreshToken(
    @Request() req,
    @Response({ passthrough: true }) res,
    @Body() body?: { refreshToken?: string },
  ) {
    // Try to get refresh token from multiple sources: body, cookies, headers
    const refreshToken =
      body?.refreshToken || // From request body (frontend sends this)
      req.cookies?.['refresh-token'] || // From cookies
      req.headers?.authorization?.replace('Bearer ', ''); // From headers

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

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
  @SkipCsrf()
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
  @SkipCsrf()
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
  @SkipCsrf()
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification token' })
  async verifyEmail(
    @Query('token') token: string,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
    @Response() res,
  ) {
    try {
      this.logger.log(`Starting email verification for token: ${token.substring(0, 10)}...`);

      const deviceInfo: DeviceInfo = this.extractDeviceInfo(userAgent, ip);
      const result = await this.authService.verifyEmail(token, deviceInfo);

      this.logger.log(`Verification result:`, JSON.stringify(result, null, 2));

      // If verification includes user info, set auth cookies
      if (result.user && result.sessionId) {
        this.logger.log(`Setting auth cookies for user: ${result.user.id}`);
        this.setAuthCookies(res, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          sessionId: result.sessionId,
        });
      } else {
        this.logger.warn('No user or session found in verification result');
      }

      // Get frontend URL with fallback
      const frontendUrl = this.configService.get<string>('frontend.url') || 'http://localhost:3000';

      // Determine redirect URL based on user type
      let redirectUrl = `${frontendUrl}/student`;

      if (result.user?.userType) {
        this.logger.log(`User type found: ${result.user.userType}`);
        switch (result.user.userType) {
          case 'student':
            // Check if student has completed onboarding
            if (result.user.studentProfile?.onboardingCompleted) {
              redirectUrl = `${frontendUrl}/student`;
            } else {
              redirectUrl = `${frontendUrl}/onboarding`;
            }
            break;
          case 'teacher':
            // For teachers, check if they are approved
            if (result.user.teacherProfile?.isApproved) {
              redirectUrl = `${frontendUrl}/teacher`;
            } else {
              // Not approved yet, redirect to pending approval page
              redirectUrl = `${frontendUrl}/teacher-application-pending`;
            }
            break;
          case 'admin':
            redirectUrl = `${frontendUrl}/admin`;
            break;
          default:
            redirectUrl = `${frontendUrl}/student`;
        }
      } else {
        // If no user info, default to login
        this.logger.log('No user type found, redirecting to login');
        redirectUrl = `${frontendUrl}/login`;
      }

      // Add success message as query param
      redirectUrl += `?verified=true&message=${encodeURIComponent('Email verified successfully')}`;

      this.logger.log(`Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error('Email verification failed:', error);
      const frontendUrl = this.configService.get<string>('frontend.url') || 'http://localhost:3000';
      const errorMessage = error.message || 'Email verification failed';
      const errorUrl = `${frontendUrl}/verify-email?error=${encodeURIComponent(errorMessage)}`;

      this.logger.log(`Redirecting to error page: ${errorUrl}`);
      res.redirect(errorUrl);
    }
  }

  @Public()
  @Post('resend-verification')
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerificationEmail(@Body('email') email: string) {
    await this.authService.resendVerificationEmail(email);

    return {
      message: 'Verification email sent if the account exists',
    };
  }

  @Public()
  @Post('teacher/apply')
  @SkipCsrf()
  @ApiOperation({ summary: 'Submit teacher application' })
  @ApiResponse({
    status: 201,
    description: 'Teacher application submitted successfully',
    schema: {
      example: {
        message:
          'Teacher application submitted successfully. Please check your email to verify your account.',
        user: {
          id: 'uuid',
          email: 'teacher@example.com',
          firstName: 'John',
          lastName: 'Doe',
          userType: 'teacher',
        },
        applicationId: 'uuid',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request or validation failed' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async applyAsTeacher(
    @Body() teacherData: TeacherRegistrationDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    const deviceInfo: DeviceInfo = this.extractDeviceInfo(userAgent, ip);
    const result = await this.authService.registerTeacher(teacherData, deviceInfo);

    this.logger.log(`teacherDataaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ${teacherData}`);

    return {
      success: true,
      ...result,
    };
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('teacher/application-status')
  @ApiOperation({ summary: 'Get teacher application status' })
  @ApiResponse({
    status: 200,
    description: 'Teacher application status retrieved successfully',
    schema: {
      example: {
        status: 'pending',
        message: 'Your application is under review',
        submittedAt: '2025-08-08T12:00:00Z',
        reviewedAt: null,
        reviewNotes: null,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Not a teacher or no application found' })
  async getTeacherApplicationStatus(@CurrentUser() user: any) {
    this.logger.log(`Teacher application status requested for user: ${user?.id || 'unknown'}`);
    this.logger.log(`User data:`, JSON.stringify(user, null, 2));
    // Only teachers can access this endpoint
    if (user.userType !== 'teacher') {
      throw new ForbiddenException('Only teachers can access application status');
    }

    const teacherProfile = await this.userService.getTeacherProfile(user.id);
    if (!teacherProfile) {
      throw new NotFoundException('Teacher application not found');
    }

    // Determine status based on profile data
    let status: 'pending' | 'under_review' | 'approved' | 'rejected';
    let message: string;

    if (teacherProfile.isApproved) {
      status = 'approved';
      message =
        'Congratulations! Your application has been approved. You can now access all teacher features.';
    } else if (teacherProfile.reviewNotes) {
      status = 'rejected';
      message = 'Your application requires some revisions before it can be approved.';
    } else {
      // Check if it's been submitted recently (under review) or just pending
      const daysSinceSubmission = teacherProfile.applicationDate
        ? Math.floor(
            (Date.now() - new Date(teacherProfile.applicationDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      if (daysSinceSubmission > 1) {
        status = 'under_review';
        message =
          'Your application is currently being reviewed by our team. We appreciate your patience.';
      } else {
        status = 'pending';
        message = 'Your application has been received and is in our review queue.';
      }
    }

    return {
      status,
      message,
      submittedAt: teacherProfile.applicationDate || teacherProfile.createdAt,
      reviewedAt: teacherProfile.approvedAt,
      reviewNotes: teacherProfile.reviewNotes,
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
    if (user.userType === 'teacher') {
      const teacherProfile = await this.userService.getTeacherProfile(user.id);
      return {
        message: 'Profile retrieved successfully',
        ...user,
        teacherProfile,
      };
    }
  }

  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('check-auth')
  @ApiOperation({ summary: 'Check authentication status' })
  @ApiResponse({ status: 200, description: 'Authentication status' })
  async checkAuth(@CurrentUser() user: any, @CurrentSession() session: any) {
    return {
      isAuthenticated: true,
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
      const errorUrl =
        this.configService.get<string>('oauth.errorRedirect') ||
        `${this.configService.get<string>('frontend.url')}/oauth-error`;
      return res.redirect(`${errorUrl}?message=OAuth failed`);
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);
    this.setAuthCookies(res, tokens);

    const successUrl =
      this.configService.get<string>('oauth.successRedirect') ||
      `${this.configService.get<string>('frontend.url')}/oauth-success`;
    return res.redirect(successUrl);
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
      const errorUrl =
        this.configService.get<string>('oauth.errorRedirect') ||
        `${this.configService.get<string>('frontend.url')}/oauth-error`;
      return res.redirect(`${errorUrl}?message=OAuth failed`);
    }

    // Generate JWT tokens
    const tokens = await this.authService.generateTokens(user);
    this.setAuthCookies(res, tokens);

    const successUrl =
      this.configService.get<string>('oauth.successRedirect') ||
      `${this.configService.get<string>('frontend.url')}/oauth-success`;
    return res.redirect(successUrl);
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

    // For development, use more relaxed cookie settings
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax', // More permissive for dev
      ...(isProduction && domain && { domain }), // Only set domain in production
      path: '/', // Explicitly set path
    };

    res.cookie('access-token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh-token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    if (tokens.sessionId) {
      res.cookie('session-id', tokens.sessionId, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    console.log('🍪 Setting cookies with options:', cookieOptions);
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

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '@/modules/user/services/user.service';
import { PasswordService } from './password.service';
import { CacheService } from '@/cache/cache.service';
import { JwtPayload, AuthTokens, LoginResponse } from '../interfaces/jwt-payload.interface';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { WinstonService } from '@/logger/winston.service';
import { UserType, UserStatus } from '@/common/enums/user.enums';
import { DeviceInfo } from '../interfaces/device-info.interface';
import { EmailVerificationService } from './email-verification.service';
import { SessionService } from './session.service';
import { EmailService } from './email.service';
import { LoginAttempt } from '../interfaces/login-attempt.interface';
import { AuditLogService } from '@/modules/system/services/audit-log.service';
import { TwoFactorService } from './two-factor.service';
import { AuditAction } from '@/common/enums/system.enums';
import { User } from '@/modules/user/entities/user.entity';
import { TeacherProfile } from '@/modules/user/entities/teacher-profile.entity';
import { StudentProfile } from '@/modules/user/entities/student-profile.entity';
import { Repository } from 'typeorm';
import { UserProfile } from '@/modules/user/entities/user-profile.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthService {
  private readonly LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
  private readonly ACCOUNT_LOCKOUT_PREFIX = 'account_lockout:';
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly auditLogService: AuditLogService,
    private readonly sessionService: SessionService,
    private readonly twoFactorService: TwoFactorService,
    private readonly emailService: EmailService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile) private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepository: Repository<TeacherProfile>,
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

      await this.userService.updateLastLogin(user.id);

      const { passwordHash: _passwordHash, ...result } = user;

      return result;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`);
      return null;
    }
  }

  async login(loginDto: LoginDto, deviceInfo: DeviceInfo): Promise<LoginResponse> {
    const { email, password, rememberMe } = loginDto;

    let teacherProfile: TeacherProfile | null = null;
    let studentProfile: StudentProfile | null = null;

    this.logger.log(`Login attempt for email: ${email}`);

    await this.checkAccountLockout(email);

    try {
      const user = await this.userService.findByEmail(email);
      if (!user) {
        await this.recordFailedLoginAttempt(email, deviceInfo, 'User not found');
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await this.passwordService.validatePassword(
        password,
        user.passwordHash,
      );
      if (!isPasswordValid) {
        await this.recordFailedLoginAttempt(email, deviceInfo, 'Invalid password');
        throw new UnauthorizedException('Invalid credentials');
      }

      if (user.status === 'suspended') {
        await this.recordFailedLoginAttempt(email, deviceInfo, 'Account suspended');
        throw new ForbiddenException('Account is suspended');
      }

      if (user.status === 'inactive') {
        await this.recordFailedLoginAttempt(email, deviceInfo, 'Account inactive');
        throw new ForbiddenException('Account is inactive');
      }

      if (user.userType === UserType.TEACHER) {
        // teacherProfile = await this.userService.getTeacherProfile(user.id);
        teacherProfile = user.teacherProfile!;
        if (!teacherProfile) {
          await this.recordFailedLoginAttempt(email, deviceInfo, 'Teacher profile not found');
          throw new ForbiddenException('Teacher profile not found');
        }
      } else if (user.userType === UserType.STUDENT) {
        // studentProfile = await this.userService.getStudentProfile(user.id);
        studentProfile = user.studentProfile!;
        if (!studentProfile) {
          this.logger.warn(`Student profile not found for user ${user.id}, creating one`);
          // Optionally create student profile here or just continue
        }
      }

      if (user.twoFactorEnabled) {
        const tempToken = await this.generate2FAToken(user.id);

        await this.auditLogService.createAuditLog({
          userId: user.id,
          action: AuditAction.LOGIN_2FA_REQUIRED,
          entityType: 'auth',
          metadata: { email, deviceInfo },
        });

        return {
          accessToken: '',
          refreshToken: '',
          expiresIn: 0,
          tokenType: 'Bearer',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            userType: user.userType,
            teacherProfile: teacherProfile,
            studentProfile: studentProfile,
          },
          requires2FA: true,
          tempToken,
        };
      }

      await this.recordSuccessfulLoginAttempt(email, deviceInfo);
      await this.clearLoginAttempts(email);

      const sessionId = await this.sessionService.createSession(
        user.id,
        user.userType,
        {
          email: user.email,
          username: user.username,
          roles: (user.roles || []).map(role => role.name),
          permissions: (user.permissions || []).map(permission => permission.name),
        },
        deviceInfo,
        'local',
      );

      const tokens = await this.generateTokens(user, rememberMe);
      await this.userService.storeRefreshToken(user.id, tokens.refreshToken);

      await this.userService.updateLastLogin(user.id, deviceInfo.ip);
      await this.auditLogService.createAuditLog({
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'auth',
        metadata: { email, deviceInfo, sessionId },
      });

      this.logger.log(`User logged in successfully: ${user.email}`);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          userType: user.userType,
          firstName: user.firstName,
          displayName: user.displayName,
          phone: user.phone,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          coverUrl: user.coverUrl,
          userProfile: user.userProfile,
          teacherProfile: teacherProfile,
          studentProfile: studentProfile,
          socials: user.socials ? user.socials : [],
        },
        twoFactorEnabled: user.twoFactorEnabled,
        sessionId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      await this.recordFailedLoginAttempt(email, deviceInfo, 'System error');
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async complete2FALogin(
    tempToken: string,
    twoFactorCode: string,
    deviceInfo: DeviceInfo,
  ): Promise<LoginResponse> {
    const tempTokenData = await this.verify2FAToken(tempToken);
    if (!tempTokenData) {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    const user = await this.userService.findById(tempTokenData.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await this.twoFactorService.verifyTwoFactorToken(user.id, twoFactorCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    const sessionId = await this.sessionService.createSession(
      user.id,
      user.userType,
      {
        email: user.email,
        username: user.username,
        roles: (user.roles || []).map(role => role.name),
        permissions: (user.permissions || []).map(permission => permission.name),
      },
      deviceInfo,
      '2fa',
    );

    const tokens = await this.generateTokens(user);
    await this.userService.storeRefreshToken(user.id, tokens.refreshToken);

    await this.userService.updateLastLogin(user.id, deviceInfo.ip);
    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.LOGIN_2FA_COMPLETED,
      entityType: 'auth',
      metadata: { deviceInfo, sessionId },
    });

    await this.clear2FAToken(tempToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: user.userType,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
      },
      sessionId,
    };
  }

  async registerTeacher(
    teacherData: any,
    deviceInfo: DeviceInfo,
  ): Promise<{
    user: any;
    tokens: AuthTokens;
    sessionId: string;
    message: string;
    applicationId: string;
  }> {
    this.logger.log(`teacherDataaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ${teacherData}`);

    let user: User | null = null;
    let teacherProfile: TeacherProfile | null = null;

    const existingUser = await this.userService.findByEmail(teacherData.personalInfo.email);

    if (existingUser) {
      throw new ConflictException('Teacher application already exists for this email');
    }

    const passwordValidation = this.passwordService.validatePasswordStrength(teacherData.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    const passwordHash = await this.passwordService.hashPassword(teacherData.password);

    const userData = {
      email: teacherData.personalInfo.email,
      username: `teacher_${Date.now()}`,
      passwordHash,
      firstName: teacherData.personalInfo.firstName,
      lastName: teacherData.personalInfo.lastName,
      phone: teacherData.personalInfo.phone,
      userType: UserType.TEACHER,
      status: UserStatus.PENDING,
      emailVerified: false,
      timezone: teacherData.personalInfo.timezone,
    };

    try {
      const savedUser = this.userRepository.create({
        ...userData,
      });

      user = await this.userRepository.save(savedUser);

      const userProfile = this.userProfileRepository.create({
        userId: user.id,
        country: teacherData.personalInfo.country,
        isPublic: true,
        isSearchable: true,
      });

      await this.userProfileRepository.save(userProfile);

      const teacherProfileData = {
        userId: user.id,
        teacherCode: await this.generateTeacherCode(),
        applicationDate: new Date(),
        isApproved: false,
        acceptingStudents: false,
        specializations: teacherData.experience.subjectAreas.join(', '),
        qualifications: `${teacherData.education.highestDegree} in ${teacherData.education.fieldOfStudy} from ${teacherData.education.institution} (${teacherData.education.graduationYear})`,
        yearsExperience: this.mapExperienceToYears(teacherData.experience.teachingExperience),
        subjects: teacherData.experience.subjectAreas,
        isActive: false,
        isVerified: false,
        applicationData: {
          motivation: teacherData.motivation,
          education: teacherData.education,
          experience: teacherData.experience,
          availability: teacherData.availability,
          documents: teacherData.documents,
          agreements: teacherData.agreements,
          submittedAt: new Date(),
          applicationMetadata: {
            ipAddress: deviceInfo.ip,
            userAgent: deviceInfo.userAgent,
            source: 'web_application',
          },
        },
      };

      teacherProfile = await this.userService.createTeacherProfile(user.id, teacherProfileData);
      this.logger.log(`Teacher profile created successfully: ${teacherProfile.id}`);
    } catch (error) {
      this.logger.error(`Error creating user or teacher profile:`, error);

      if (user && !teacherProfile) {
        this.logger.warn(`User ${user.id} was created but teacher profile creation failed`);
      }

      throw error;
    }

    const verificationToken = await this.emailVerificationService.generateEmailVerificationToken(
      user.id,
      user.email,
    );

    await this.emailService.sendTeacherApplicationVerificationEmail(user.email, verificationToken, {
      firstName: user.firstName || 'Teacher',
      lastName: user.lastName || 'User',
    });

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.TEACHER_APPLICATION_SUBMITTED,
      entityType: 'teacher_application',
      entityId: teacherProfile.id,
      metadata: {
        email: user.email,
        deviceInfo,
        applicationData: teacherProfile.applicationData,
      },
    });

    const sessionId = await this.sessionService.createSession(
      user.id,
      user.userType,
      {
        email: user.email,
        username: user.username,
        roles: [],
        permissions: [],
      },
      deviceInfo,
      'local',
    );

    const tokens = await this.generateTokens(user);
    await this.userService.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`Teacher application submitted successfully: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
      },
      tokens,
      sessionId,
      message:
        'Teacher application submitted successfully. Please check your email to verify your account.',
      applicationId: teacherProfile.id,
    };
  }

  async getTeacherApplicationStatus(userId: string): Promise<{
    status: 'pending' | 'under_review' | 'approved' | 'rejected';
    message: string;
    submittedAt: Date;
    reviewedAt?: Date;
    reviewNotes?: string;
  }> {
    this.logger.log(`Getting teacher application status for user: ${userId}`);

    const teacherProfile = await this.userService.getTeacherProfile(userId);
    if (!teacherProfile) {
      throw new Error('Teacher application not found');
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

  private async generateTeacherCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.teacherProfileRepository.count();
    return `TCH${year}${String(count + 1).padStart(6, '0')}`;
  }

  private mapExperienceToYears(experience: string): number {
    switch (experience) {
      case 'entry':
        return 1;
      case 'intermediate':
        return 4;
      case 'experienced':
        return 8;
      case 'expert':
        return 15;
      default:
        return 0;
    }
  }

  async register(registerDto: RegisterDto, deviceInfo: DeviceInfo): Promise<LoginResponse> {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);

    const existingUser = await this.userService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordValidation = this.passwordService.validatePasswordStrength(registerDto.password);

    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
    }

    const passwordHash = await this.passwordService.hashPassword(registerDto.password);

    const userData = {
      email: registerDto.email,
      username: 'temp' + registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      userType: registerDto.userType || UserType.STUDENT,
      status: 'pending',
      emailVerified: false,
    };

    const user = await this.userService.create(userData);

    const verificationToken = await this.emailVerificationService.generateEmailVerificationToken(
      user.id,
      user.email,
    );
    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entityType: 'auth',
      entityId: user.id,
      metadata: {
        email: user.email,
        userType: user.userType,
        deviceInfo,
      },
    });

    const sessionId = await this.sessionService.createSession(
      user.id,
      user.userType,
      {
        email: user.email,
        username: user.username,
        roles: (user.roles || []).map(role => role.name),
        permissions: (user.permissions || []).map(permission => permission.name),
      },
      deviceInfo,
      'local',
    );

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
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        coverUrl: user.coverUrl,
      },
      requiresEmailVerification: true,
      sessionId,
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

      const isValidRefreshToken = await this.userService.verifyRefreshToken(user.id, refreshToken);
      if (!isValidRefreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      await this.userService.rotateRefreshToken(user.id, refreshToken, tokens.refreshToken);

      return tokens;
    } catch (error) {
      this.logger.error(`Error refreshing token: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId?: string, refreshToken?: string): Promise<void> {
    // Destroy session if provided
    if (sessionId) {
      await this.sessionService.destroySession(sessionId);
    }

    // Remove refresh token from database
    if (refreshToken) {
      await this.userService.revokeRefreshToken(userId, refreshToken);
    } else {
      // Revoke all refresh tokens for user
      // await this.userService.revokeAllRefreshTokens(userId);
    }

    // Log logout
    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.USER_LOGOUT,
      entityType: 'auth',
      metadata: { sessionId },
    });

    this.logger.log(`User logged out: ${userId}`);

    // Add access token to blacklist cache
    // await this.blacklistToken(userId);

    // this.logger.log(`User logged out: ${userId}`);
  }

  async logoutFromAllDevices(userId: string, currentSessionId?: string): Promise<void> {
    // Destroy all sessions except current one
    await this.sessionService.destroyAllUserSessions(userId, currentSessionId);

    // Revoke all refresh tokens
    await this.userService.revokeAllRefreshTokens(userId);

    // Log logout all
    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.USER_LOGOUT_ALL_DEVICES,
      entityType: 'auth',
      metadata: { excludedSessionId: currentSessionId },
    });

    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.validatePassword(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength
    await this.passwordService.validatePasswordStrength(newPassword);

    // Check if new password is different from current
    const isSamePassword = await this.passwordService.validatePassword(
      newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // Update password
    await this.userService.updatePassword(userId, passwordHash);

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.CHANGE_PASSWORD,
      entityType: 'auth',
      metadata: {},
    });

    this.logger.log(`Password changed for user: ${userId}`);
  }

  async forgotPassword(email: string): Promise<void> {
    const resetToken = await this.emailVerificationService.generatePasswordResetToken(email);
    if (resetToken) {
      await this.emailService.sendPasswordResetEmail(email, resetToken);

      // Log password reset request
      const user = await this.userService.findByEmail(email);
      if (user) {
        await this.auditLogService.createAuditLog({
          userId: user.id,
          action: AuditAction.PASSWORD_RESET_REQUESTED,
          entityType: 'auth',
          metadata: { email },
        });
      }
    }

    this.logger.log(`Password reset requested for email: ${email}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Verify reset token
    const tokenData = await this.emailVerificationService.verifyPasswordResetToken(token);

    // Validate new password
    await this.passwordService.validatePasswordStrength(newPassword);

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // Update user password
    await this.userService.updatePassword(tokenData.userId, passwordHash);

    // Mark token as used
    await this.emailVerificationService.markResetTokenAsUsed(token);

    // Revoke all existing sessions and tokens for security
    await this.sessionService.destroyAllUserSessions(tokenData.userId);
    await this.userService.revokeAllRefreshTokens(tokenData.userId);

    // Log password reset
    await this.auditLogService.createAuditLog({
      userId: tokenData.userId,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      entityType: 'auth',
      metadata: { email: tokenData.email },
    });

    this.logger.log(`Password reset completed for user: ${tokenData.userId}`);
  }

  async verifyEmail(
    token: string,
    deviceInfo?: DeviceInfo,
  ): Promise<{
    userId: string;
    email: string;
    user?: any;
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string;
  }> {
    const verificationData = await this.emailVerificationService.verifyEmailToken(token);

    // For teachers, update user status to active after email verification
    // They can login but will be redirected to pending approval if not approved
    if (verificationData.user && verificationData.user.userType === UserType.TEACHER) {
      await this.userService.activateUser(verificationData.userId);
      this.logger.log(
        `Teacher user status updated to ACTIVE after email verification: ${verificationData.userId}`,
      );
    }

    // Log email verification
    await this.auditLogService.createAuditLog({
      userId: verificationData.userId,
      action: AuditAction.EMAIL_VERIFIED,
      entityType: 'auth',
      metadata: { email: verificationData.email },
    });

    this.logger.log(`Email verified for user: ${verificationData.userId}`);

    // Auto-login user after email verification
    if (verificationData.user && deviceInfo) {
      const sessionId = await this.sessionService.createSession(
        verificationData.user.id,
        verificationData.user.userType,
        {
          email: verificationData.user.email,
          username: verificationData.user.username,
          roles: [],
          permissions: [],
        },
        deviceInfo,
        'email_verify',
      );

      const tokens = await this.generateTokens(verificationData.user);
      await this.userService.storeRefreshToken(verificationData.user.id, tokens.refreshToken);

      return {
        userId: verificationData.userId,
        email: verificationData.email,
        user: verificationData.user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId,
      };
    }

    return {
      userId: verificationData.userId,
      email: verificationData.email,
      user: verificationData.user,
    };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = await this.emailVerificationService.resendVerificationEmail(user.id);
    await this.emailService.sendVerificationEmail(email, verificationToken);

    // Log resend verification
    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.EMAIL_VERIFICATION_RESENT,
      entityType: 'auth',
      metadata: { email },
    });

    this.logger.log(`Verification email resent for user: ${user.id}`);
  }

  async getUserSessions(userId: string): Promise<any[]> {
    return this.sessionService.getUserSessions(userId);
  }

  async terminateSession(userId: string, sessionId: string): Promise<void> {
    // Verify session belongs to user
    const sessionData = await this.sessionService.getSession(sessionId);

    if (!sessionData || sessionData.userId !== userId) {
      throw new BadRequestException('Session not found or access denied');
    }

    await this.sessionService.destroySession(sessionId);

    // Log session termination
    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.SESSION_TERMINATED,
      entityType: 'auth',
      metadata: { sessionId },
    });
  }

  async isTokenBlacklisted(userId: string): Promise<boolean> {
    const key = `blacklist:${userId}`;
    const result = await this.cacheService.get(key);
    return result === 'true';
  }

  async generateTokens(user: any, rememberMe: boolean = false): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      userType: user.userType,
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      jti: this.generateJwtId(),
    };

    const accessTokenExpiration = this.configService.get<string>('jwt.expiresIn', '15m');
    const refreshTokenExpiration = rememberMe
      ? this.configService.get<string>('jwt.rememberMeRefreshExpiration', '30d')
      : this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessTokenExpiration,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshTokenExpiration,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationToSeconds(accessTokenExpiration),
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

  private async clearLoginAttempts(email: string): Promise<void> {
    const attemptsKey = `${this.LOGIN_ATTEMPTS_PREFIX}${email}`;
    await this.cacheService.del(attemptsKey);
  }

  private async checkAccountLockout(email: string): Promise<void> {
    const lockoutKey = `${this.ACCOUNT_LOCKOUT_PREFIX}${email}`;
    const lockoutData = await this.cacheService.get(lockoutKey);

    if (lockoutData) {
      const lockout = JSON.parse(lockoutData as string);
      const remainingTime = Math.ceil((lockout.expiresAt - Date.now()) / 1000 / 60);

      throw new ForbiddenException(
        `Account is locked due to too many failed login attempts. Try again in ${remainingTime} minutes.`,
      );
    }
  }

  private async recordSuccessfulLoginAttempt(email: string, deviceInfo: DeviceInfo): Promise<void> {
    const attemptsKey = `${this.LOGIN_ATTEMPTS_PREFIX}${email}`;
    const existingAttempts = await this.cacheService.get(attemptsKey);

    const attempts: LoginAttempt[] = existingAttempts ? JSON.parse(existingAttempts as string) : [];

    attempts.push({
      email,
      ip: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      timestamp: new Date(),
      success: true,
    });

    await this.cacheService.set(attemptsKey, JSON.stringify(attempts), 3600); // 1 hour
  }

  private async lockAccount(email: string): Promise<void> {
    const lockoutKey = `${this.ACCOUNT_LOCKOUT_PREFIX}${email}`;
    const lockoutData = {
      email,
      lockedAt: Date.now(),
      expiresAt: Date.now() + this.LOCKOUT_DURATION * 1000,
    };

    await this.cacheService.set(lockoutKey, JSON.stringify(lockoutData), this.LOCKOUT_DURATION);

    this.logger.warn(`Account locked for ${email} due to too many failed login attempts`);
  }

  private async recordFailedLoginAttempt(
    email: string,
    deviceInfo: DeviceInfo,
    reason: string,
  ): Promise<void> {
    const attemptsKey = `${this.LOGIN_ATTEMPTS_PREFIX}${email}`;
    const existingAttempts = await this.cacheService.get(attemptsKey);

    let attempts: LoginAttempt[] = existingAttempts ? JSON.parse(existingAttempts as string) : [];

    attempts.push({
      email,
      ip: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      timestamp: new Date(),
      success: false,
      failureReason: reason,
    });

    // Keep only recent attempts (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    attempts = attempts.filter(attempt => attempt.timestamp > oneHourAgo);

    await this.cacheService.set(attemptsKey, JSON.stringify(attempts), 3600); // 1 hour

    // Check if should lock account
    if (attempts.length >= this.MAX_LOGIN_ATTEMPTS) {
      await this.lockAccount(email);
    }

    this.logger.warn(`Failed login attempt for ${email}: ${reason}`);
  }

  private async generate2FAToken(userId: string): Promise<string> {
    const payload = {
      userId,
      type: '2fa-temp',
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: '5m', // 5 minutes for 2FA completion
    });
  }

  private async verify2FAToken(tempToken: string): Promise<{ userId: string } | null> {
    try {
      const payload = this.jwtService.verify(tempToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      if (payload.type !== '2fa-temp') {
        return null;
      }

      return { userId: payload.userId };
    } catch {
      return null;
    }
  }

  private async clear2FAToken(tempToken: string): Promise<void> {
    // Add token to blacklist
    const blacklistKey = `2fa_temp_blacklist:${tempToken}`;
    await this.cacheService.set(blacklistKey, 'true', 300); // 5 minutes
  }

  private generateUsername(email: string): string {
    const baseUsername = email.split('@')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseUsername}_${randomSuffix}`;
  }

  private generateJwtId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }
}

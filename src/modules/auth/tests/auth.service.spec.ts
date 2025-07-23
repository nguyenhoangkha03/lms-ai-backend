import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { UserService } from '@/modules/user/services/user.service';
import { PasswordService } from '../services/password.service';
import { TwoFactorService } from '../services/two-factor.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { SessionService } from '../services/session.service';
import { CacheService } from '@/cache/cache.service';
import { AuditLogService } from '@/modules/system/services/audit-log.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let passwordService: jest.Mocked<PasswordService>;
  let jwtService: jest.Mocked<JwtService>;
  let _twoFactorService: jest.Mocked<TwoFactorService>;
  let _emailVerificationService: jest.Mocked<EmailVerificationService>;
  let sessionService: jest.Mocked<SessionService>;
  let cacheService: jest.Mocked<CacheService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed-password',
    userType: 'student',
    status: 'active',
    emailVerified: true,
    twoFactorEnabled: false,
    roles: [],
    permissions: [],
  };

  const mockDeviceInfo = {
    userAgent: 'Mozilla/5.0...',
    ip: '127.0.0.1',
    device: 'Desktop',
    browser: 'Chrome',
    os: 'Windows',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateLastLogin: jest.fn(),
            storeRefreshToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
            rotateRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn(),
            revokeAllRefreshTokens: jest.fn(),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: jest.fn(),
            validatePassword: jest.fn(),
            validatePasswordStrength: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: TwoFactorService,
          useValue: {
            generateSecret: jest.fn(),
            verifyToken: jest.fn(),
            generateBackupCodes: jest.fn(),
          },
        },
        {
          provide: EmailVerificationService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            verifyEmail: jest.fn(),
            isVerificationRequired: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: jest.fn(),
            findSession: jest.fn(),
            updateSession: jest.fn(),
            revokeSession: jest.fn(),
            revokeAllSessions: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: createMockCacheService(),
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
            logAuthEvent: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshExpiresIn': '7d',
                'auth.maxLoginAttempts': 5,
                'auth.lockoutDuration': 15,
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    passwordService = module.get(PasswordService);
    jwtService = module.get(JwtService);
    _twoFactorService = module.get(TwoFactorService);
    _emailVerificationService = module.get(EmailVerificationService);
    sessionService = module.get(SessionService);
    cacheService = module.get(CacheService);
    auditLogService = module.get(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    it('should successfully login with valid credentials', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(mockUser as any);
      passwordService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      sessionService.createSession.mockResolvedValue({
        id: 'session-1',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
      } as any);

      const result = await service.login(loginDto, mockDeviceInfo);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
      });
      expect(userService.findByEmailWithPassword).toHaveBeenCalledWith(loginDto.email);
      expect(passwordService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(auditLogService.logAuthEvent).toHaveBeenCalledWith(
        'LOGIN_SUCCESS',
        mockUser.id,
        mockDeviceInfo,
      );
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto, mockDeviceInfo)).rejects.toThrow(UnauthorizedException);
      expect(auditLogService.logAuthEvent).toHaveBeenCalledWith(
        'LOGIN_FAILED',
        null,
        expect.objectContaining({ reason: 'Invalid credentials' }),
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(mockUser as any);
      passwordService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto, mockDeviceInfo)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle account lockout after max attempts', async () => {
      userService.findByEmailWithPassword.mockResolvedValue(mockUser as any);
      passwordService.validatePassword.mockResolvedValue(false);
      cacheService.get.mockResolvedValue('5'); // Max attempts reached
      await expect(service.login(loginDto, mockDeviceInfo)).rejects.toThrow(
        'Account temporarily locked',
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
      userType: 'student',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should successfully register a new user', async () => {
      userService.findByEmail.mockResolvedValue(null);
      passwordService.validatePasswordStrength.mockReturnValue({ isValid: true } as any);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      userService.create.mockResolvedValue({ ...mockUser, ...registerDto } as any);
      //   emailVerificationService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register(registerDto as any, mockDeviceInfo);
      expect(result).toEqual({
        message: 'Registration successful',
        user: expect.objectContaining({
          email: registerDto.email,
          username: registerDto.username,
        }),
      });
      expect(passwordService.hashPassword).toHaveBeenCalledWith(registerDto.password);
      //   expect(emailVerificationService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto as any, mockDeviceInfo)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for weak password', async () => {
      userService.findByEmail.mockResolvedValue(null);
      passwordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
      } as any);

      await expect(service.register(registerDto as any, mockDeviceInfo)).rejects.toThrow(
        'Password does not meet requirements',
      );
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = { refreshToken: 'refresh-token' };

    it('should successfully refresh tokens', async () => {
      userService.verifyRefreshToken.mockResolvedValue(mockUser as any);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      //   sessionService.updateSession.mockResolvedValue(undefined);

      const result = await service.refreshToken(refreshTokenDto.refreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      userService.verifyRefreshToken.mockResolvedValue(null as any);

      await expect(service.refreshToken(refreshTokenDto.refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      //   sessionService.revokeSession.mockResolvedValue(undefined);
      userService.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout(mockUser.id, 'refresh-token', mockDeviceInfo as any);

      //   expect(sessionService.revokeSession).toHaveBeenCalled();
      expect(auditLogService.logAuthEvent).toHaveBeenCalledWith(
        'LOGOUT',
        mockUser.id,
        mockDeviceInfo,
      );
    });
  });
});

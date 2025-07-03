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
import { CacheService as CustomCacheService } from '@/cache/cache.service';
import { AuditLogService } from '@/modules/system/services/audit-log.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let passwordService: jest.Mocked<PasswordService>;
  let jwtService: jest.Mocked<JwtService>;

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
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: TwoFactorService,
          useValue: {
            verifyTwoFactorToken: jest.fn(),
          },
        },
        {
          provide: EmailVerificationService,
          useValue: {
            generateEmailVerificationToken: jest.fn(),
            generatePasswordResetToken: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            createSession: jest.fn(),
            destroySession: jest.fn(),
            destroyAllUserSessions: jest.fn(),
            getUserSessions: jest.fn(),
          },
        },
        {
          provide: CustomCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config = {
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '15m',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.refreshExpiresIn': '7d',
                'frontend.url': 'http://localhost:3001',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    passwordService = module.get(PasswordService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      userType: 'student' as const,
    };

    it('should register a new user successfully', async () => {
      userService.findByEmail.mockResolvedValue(null);
      userService.findByUsername.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      userService.create.mockResolvedValue(mockUser as any);
      jwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.register(registerDto as any, mockDeviceInfo);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.requiresEmailVerification).toBe(true);
    });

    it('should throw ConflictException if email already exists', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.register(registerDto as any, mockDeviceInfo)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
      rememberMe: false,
    };

    it('should login user successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser as any);
      passwordService.validatePassword.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.login(loginDto, mockDeviceInfo);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.requires2FA).toBeUndefined();
    });

    it('should require 2FA if enabled', async () => {
      const userWith2FA = { ...mockUser, twoFactorEnabled: true };
      userService.findByEmail.mockResolvedValue(userWith2FA as any);
      passwordService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('temp-token');

      const result = await service.login(loginDto, mockDeviceInfo);

      expect(result.requires2FA).toBe(true);
      expect(result.tempToken).toBe('temp-token');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto, mockDeviceInfo)).rejects.toThrow(UnauthorizedException);
    });
  });
});

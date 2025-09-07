import { MiddlewareConsumer, Module, NestModule, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '@/modules/user/user.module';
import { CustomCacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';
import { SystemModule } from '../system/system.module';

// Service
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TwoFactorService } from './services/two-factor.service';
import { EmailVerificationService } from './services/email-verification.service';
import { SessionService } from './services/session.service';
import { EmailService } from './services/email.service';

// Strategies
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SessionGuard } from './guards/session.guard';
import { GoogleAuthGuard, FacebookAuthGuard } from './guards/oauth.guard';

// Middleware
import { SessionMiddleware } from './middleware/session.middleware';
import { PermissionCheckMiddleware } from './middleware/permission-check.middleware';
import { EnhancedPermissionsGuard } from './guards/enhanced-permissions.guard';
import { ResourceGuard } from './guards/resource.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { OwnerGuard } from './guards/owner.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { SecurityEventInterceptor } from './interceptors/security-event.interceptor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { UserProfile } from '../user/entities/user-profile.entity';
import { TeacherProfile } from '../user/entities/teacher-profile.entity';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
    }),
    forwardRef(() => UserModule),
    CustomCacheModule,
    WinstonModule,
    SystemModule,

    TypeOrmModule.forFeature([User, UserProfile, TeacherProfile]),
  ],
  controllers: [AuthController],
  providers: [
    // Core Services
    AuthService,
    PasswordService,
    TwoFactorService,
    EmailVerificationService,
    SessionService,
    EmailService,

    // Authentication Strategies
    LocalStrategy,
    JwtStrategy,
    RefreshJwtStrategy,
    GoogleStrategy,
    FacebookStrategy,

    // Guards
    JwtAuthGuard,
    LocalAuthGuard,
    RefreshJwtAuthGuard,
    RolesGuard,
    SessionGuard,
    GoogleAuthGuard,
    FacebookAuthGuard,
    EnhancedPermissionsGuard,
    ResourceGuard,
    RateLimitGuard,
    OwnerGuard,
    ApiKeyGuard,

    // Interceptors
    SecurityEventInterceptor,
  ],
  exports: [
    AuthService,
    PasswordService,
    TwoFactorService,
    EmailVerificationService,
    SessionService,
    EmailService,
    JwtAuthGuard,
    RolesGuard,
    SessionGuard,
    EnhancedPermissionsGuard,
    ResourceGuard,
    RateLimitGuard,
    OwnerGuard,
    ApiKeyGuard,
    SecurityEventInterceptor,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionMiddleware)
      .forRoutes('*')
      .apply(PermissionCheckMiddleware)
      .forRoutes('*');
  }
}

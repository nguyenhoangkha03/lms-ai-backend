import { MiddlewareConsumer, Module, NestModule, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '@/modules/user/user.module';
import { CustomCacheModule } from '@/cache/cache.module';
import { LoggerModule } from '@/logger/logger.module';
import { SystemModule } from '../system/system.module';

// Service
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TwoFactorService } from './services/two-factor.service';
import { EmailVerificationService } from './services/email-verification.service';
import { SessionService } from './services/session.service';

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
    LoggerModule,
    SystemModule,
  ],
  controllers: [AuthController],
  providers: [
    // Core Services
    AuthService,
    PasswordService,
    TwoFactorService,
    EmailVerificationService,
    SessionService,

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
  ],
  exports: [
    AuthService,
    PasswordService,
    TwoFactorService,
    EmailVerificationService,
    SessionService,
    JwtAuthGuard,
    RolesGuard,
    SessionGuard,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}

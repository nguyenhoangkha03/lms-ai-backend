import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '@/modules/user/user.module';
import { PasswordService } from './services/password.service';
import { TwoFactorService } from './services/two-factor.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshJwtStrategy } from './strategies/refresh-jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RefreshJwtAuthGuard } from './guards/refresh-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CustomCacheModule } from '@/cache/cache.module';
import { LoggerModule } from '@/logger/logger.module';

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
    UserModule,
    CustomCacheModule,
    LoggerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TwoFactorService,
    LocalStrategy,
    JwtStrategy,
    RefreshJwtStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    RefreshJwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, PasswordService, TwoFactorService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

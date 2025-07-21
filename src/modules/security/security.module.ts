import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '@/redis/redis.module';
import { WinstonModule } from '@/logger/winston.module';

// Services
import { EncryptionService } from './services/encryption.service';
import { InputValidationService } from './services/input-validation.service';
import { ApiSecurityService } from './services/api-security.service';
import { SecurityAuditService } from './services/security-audit.service';

// Middleware
import { SecurityValidationMiddleware } from './middleware/security-validation.middleware';

// Guards
import { SqlInjectionGuard } from './guards/sql-injection.guard';
import { XssProtectionGuard } from './guards/xss-protection.guard';
import { CsrfProtectionGuard } from './guards/csrf-protection.guard';
import { ApiSecurityGuard } from './guards/api-security.guard';

// Pipes
import { SanitizationPipe } from './pipes/sanitization.pipe';

// Filters
import { SecurityExceptionFilter } from './filters/security-exception.filter';

// Controllers
import { SecurityController } from './controllers/security.controller';

// Entities for audit logging
import { SecurityEvent } from './entities/security-event.entity';
import { SecurityPolicy } from './entities/security-policy.entity';
import { ApiKeyEntity } from './entities/api-key.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [
    ConfigModule,
    RedisModule,
    WinstonModule,
    TypeOrmModule.forFeature([SecurityEvent, SecurityPolicy, ApiKeyEntity]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    EncryptionService,
    InputValidationService,
    ApiSecurityService,
    SecurityAuditService,

    SqlInjectionGuard,
    XssProtectionGuard,
    CsrfProtectionGuard,
    ApiSecurityGuard,

    SanitizationPipe,

    {
      provide: APP_GUARD,
      useClass: SqlInjectionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: XssProtectionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfProtectionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiSecurityGuard,
    },

    {
      provide: APP_PIPE,
      useClass: SanitizationPipe,
    },

    {
      provide: APP_FILTER,
      useClass: SecurityExceptionFilter,
    },
  ],
  controllers: [SecurityController],
  exports: [
    EncryptionService,
    InputValidationService,
    ApiSecurityService,
    SecurityAuditService,
    SqlInjectionGuard,
    XssProtectionGuard,
    CsrfProtectionGuard,
    ApiSecurityGuard,
    SanitizationPipe,
  ],
})
// export class SecurityModule {}
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityValidationMiddleware).forRoutes('*');
  }
}

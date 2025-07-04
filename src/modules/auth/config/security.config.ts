import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityConfig {
  constructor(private readonly configService: ConfigService) {}

  get rateLimiting() {
    return {
      default: {
        points: this.configService.get<number>('RATE_LIMIT_DEFAULT_POINTS', 100),
        duration: this.configService.get<number>('RATE_LIMIT_DEFAULT_DURATION', 60),
      },
      auth: {
        points: this.configService.get<number>('RATE_LIMIT_AUTH_POINTS', 5),
        duration: this.configService.get<number>('RATE_LIMIT_AUTH_DURATION', 300),
      },
      api: {
        points: this.configService.get<number>('RATE_LIMIT_API_POINTS', 1000),
        duration: this.configService.get<number>('RATE_LIMIT_API_DURATION', 3600),
      },
    };
  }

  get bruteForceProtection() {
    return {
      maxAttempts: this.configService.get<number>('BRUTE_FORCE_MAX_ATTEMPTS', 5),
      windowMinutes: this.configService.get<number>('BRUTE_FORCE_WINDOW_MINUTES', 15),
      blockDurationMinutes: this.configService.get<number>('BRUTE_FORCE_BLOCK_DURATION', 30),
    };
  }

  get sessionSecurity() {
    return {
      maxSessions: this.configService.get<number>('MAX_SESSIONS_PER_USER', 5),
      sessionTimeout: this.configService.get<number>('SESSION_TIMEOUT_MINUTES', 30),
      requireReauth: this.configService.get<boolean>('REQUIRE_REAUTH_SENSITIVE', true),
    };
  }

  get auditLogging() {
    return {
      enabled: this.configService.get<boolean>('AUDIT_LOGGING_ENABLED', true),
      retentionDays: this.configService.get<number>('AUDIT_LOG_RETENTION_DAYS', 90),
      logSensitiveData: this.configService.get<boolean>('AUDIT_LOG_SENSITIVE_DATA', false),
      realTimeAlerts: this.configService.get<boolean>('AUDIT_REAL_TIME_ALERTS', true),
    };
  }

  get threatDetection() {
    return {
      enabled: this.configService.get<boolean>('THREAT_DETECTION_ENABLED', true),
      riskThreshold: this.configService.get<number>('THREAT_RISK_THRESHOLD', 70),
      autoBlock: this.configService.get<boolean>('THREAT_AUTO_BLOCK', false),
      alertWebhook: this.configService.get<string>('THREAT_ALERT_WEBHOOK'),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isStaging(): boolean {
    return this.nodeEnv === 'staging';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get apiVersion(): string {
    return this.configService.get<string>('API_VERSION', 'v1');
  }

  get databaseConfig() {
    return {
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 3306),
      username: this.configService.get<string>('DATABASE_USER', 'root'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME', 'lms_ai'),
      ssl: this.isProduction ? { rejectUnauthorized: false } : false,
      extra: {
        connectionLimit: this.configService.get<number>('DATABASE_CONNECTION_LIMIT', 10),
      },
    };
  }

  get redisConfig() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
    };
  }

  get jwtConfig() {
    return {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    };
  }

  get awsConfig() {
    return {
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      s3Bucket: this.configService.get<string>('AWS_S3_BUCKET'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    };
  }

  get openAiApiKey(): string | undefined {
    return this.configService.get<string>('OPENAI_API_KEY');
  }

  get sendGridApiKey(): string | undefined {
    return this.configService.get<string>('SENDGRID_API_KEY');
  }

  get sentryDsn(): string | undefined {
    return this.configService.get<string>('SENTRY_DSN');
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  get featureFlags() {
    return {
      aiFeatures: this.configService.get<boolean>('ENABLE_AI_FEATURES', true),
      videoCalls: this.configService.get<boolean>('ENABLE_VIDEO_CALLS', true),
      analytics: this.configService.get<boolean>('ENABLE_ANALYTICS', true),
      chatbot: this.configService.get<boolean>('ENABLE_CHATBOT', true),
      recommendations: this.configService.get<boolean>('ENABLE_RECOMMENDATIONS', true),
    };
  }

  get healthCheckConfig() {
    return {
      timeout: this.configService.get<number>('HEALTH_CHECK_TIMEOUT', 5000),
      retries: this.configService.get<number>('HEALTH_CHECK_RETRIES', 3),
    };
  }
}

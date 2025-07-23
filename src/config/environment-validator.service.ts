import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';

interface ValidationRule {
  key: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'file' | 'email';
  validator?: (value: any) => boolean;
  description: string;
}

@Injectable()
export class EnvironmentValidatorService implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentValidatorService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    if (this.configService.get('NODE_ENV') === 'production') {
      await this.validateProductionEnvironment();
    }
  }

  private async validateProductionEnvironment(): Promise<void> {
    const rules: ValidationRule[] = [
      { key: 'NODE_ENV', required: true, type: 'string', description: 'Environment mode' },
      { key: 'PORT', required: true, type: 'number', description: 'Application port' },
      { key: 'API_PREFIX', required: true, type: 'string', description: 'API prefix' },
      { key: 'FRONTEND_URL', required: true, type: 'url', description: 'Frontend URL' },

      { key: 'DATABASE_HOST', required: true, type: 'string', description: 'Database host' },
      { key: 'DATABASE_USER', required: true, type: 'string', description: 'Database user' },
      {
        key: 'DATABASE_PASSWORD',
        required: true,
        type: 'string',
        description: 'Database password',
      },
      { key: 'DATABASE_NAME', required: true, type: 'string', description: 'Database name' },

      { key: 'REDIS_HOST', required: true, type: 'string', description: 'Redis host' },
      { key: 'REDIS_PASSWORD', required: false, type: 'string', description: 'Redis password' },

      {
        key: 'JWT_SECRET',
        required: true,
        type: 'string',
        validator: (v: string) => v.length >= 32,
        description: 'JWT secret (min 32 chars)',
      },
      {
        key: 'JWT_REFRESH_SECRET',
        required: true,
        type: 'string',
        validator: (v: string) => v.length >= 32,
        description: 'JWT refresh secret (min 32 chars)',
      },
      {
        key: 'ENCRYPTION_MASTER_KEY',
        required: true,
        type: 'string',
        validator: (v: string) => v.length >= 32,
        description: 'Encryption master key (min 32 chars)',
      },

      // SSL (conditional)
      ...(this.configService.get('SSL_ENABLED') === 'true'
        ? [
            {
              key: 'SSL_KEY_PATH',
              required: true,
              type: 'file' as const,
              description: 'SSL private key file',
            },
            {
              key: 'SSL_CERT_PATH',
              required: true,
              type: 'file' as const,
              description: 'SSL certificate file',
            },
          ]
        : []),

      // AWS (conditional)
      ...(this.configService.get('AWS_ACCESS_KEY_ID')
        ? [
            {
              key: 'AWS_ACCESS_KEY_ID',
              required: true,
              type: 'string' as const,
              description: 'AWS access key',
            },
            {
              key: 'AWS_SECRET_ACCESS_KEY',
              required: true,
              type: 'string' as const,
              description: 'AWS secret key',
            },
            {
              key: 'AWS_S3_BUCKET',
              required: true,
              type: 'string' as const,
              description: 'AWS S3 bucket',
            },
          ]
        : []),

      // External services
      {
        key: 'SENTRY_DSN',
        required: false,
        type: 'url',
        description: 'Sentry DSN for error tracking',
      },
    ];

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const value = this.configService.get(rule.key);

      if (rule.required && !value) {
        errors.push(`Missing required environment variable: ${rule.key} - ${rule.description}`);
        continue;
      }

      if (value && !this.validateType(value, rule.type)) {
        errors.push(`Invalid type for ${rule.key}: expected ${rule.type}, got ${typeof value}`);
        continue;
      }

      if (value && rule.validator && !rule.validator(value)) {
        errors.push(`Validation failed for ${rule.key}: ${rule.description}`);
        continue;
      }

      // Additional validations
      if (rule.type === 'file' && value && !existsSync(value)) {
        errors.push(`File not found for ${rule.key}: ${value}`);
      }
    }

    // Security warnings
    if (this.configService.get('JWT_SECRET') === 'akaisui2003') {
      warnings.push('Using default JWT_SECRET in production - SECURITY RISK');
    }

    if (this.configService.get('DATABASE_SSL') !== 'true') {
      warnings.push('Database SSL is not enabled - SECURITY RISK');
    }

    // Log results
    if (errors.length > 0) {
      this.logger.error('❌ Production environment validation failed:');
      errors.forEach(error => this.logger.error(`  - ${error}`));
      throw new Error('Production environment validation failed');
    }

    if (warnings.length > 0) {
      this.logger.warn('⚠️ Production environment warnings:');
      warnings.forEach(warning => this.logger.warn(`  - ${warning}`));
    }

    this.logger.log('✅ Production environment validation passed');
  }

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string' && value.length > 0;
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return value === 'true' || value === 'false';
      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      case 'file':
        return typeof value === 'string' && value.length > 0;
      default:
        return true;
    }
  }
}

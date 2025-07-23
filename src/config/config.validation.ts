import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  validateSync,
  IsUrl,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT?: number = 3000;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  @IsOptional()
  DATABASE_PORT?: number = 3306;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '7d';

  @IsString()
  @IsOptional()
  AWS_REGION?: string = 'us-east-1';

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET?: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  SENDGRID_API_KEY?: string;

  @IsUrl()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsBoolean()
  @IsOptional()
  ENABLE_AI_FEATURES?: boolean = true;

  @IsBoolean()
  @IsOptional()
  ENABLE_VIDEO_CALLS?: boolean = true;

  @IsBoolean()
  @IsOptional()
  ENABLE_ANALYTICS?: boolean = true;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}

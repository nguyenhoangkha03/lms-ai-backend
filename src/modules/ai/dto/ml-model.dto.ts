import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ModelType,
  ModelFramework,
  ModelStatus,
  DeploymentEnvironment,
} from '@/common/enums/ai.enums';

export class CreateMLModelDto {
  @ApiProperty({ description: 'Model name identifier' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Human-readable display name' })
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ description: 'Model description and purpose' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ModelType, description: 'Type of ML model' })
  @IsEnum(ModelType)
  modelType: ModelType;

  @ApiProperty({ enum: ModelFramework, description: 'ML framework used' })
  @IsEnum(ModelFramework)
  framework: ModelFramework;

  @ApiPropertyOptional({ description: 'Python service endpoint URL' })
  @IsOptional()
  @IsString()
  serviceEndpoint?: string;

  @ApiPropertyOptional({ description: 'Model configuration and hyperparameters' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Model tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateMLModelDto {
  @ApiPropertyOptional({ description: 'Human-readable display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Model description and purpose' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ModelStatus, description: 'Model status' })
  @IsOptional()
  @IsEnum(ModelStatus)
  status?: ModelStatus;

  @ApiPropertyOptional({ description: 'Python service endpoint URL' })
  @IsOptional()
  @IsString()
  serviceEndpoint?: string;

  @ApiPropertyOptional({ description: 'Model configuration and hyperparameters' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Whether model is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Model tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ModelDeploymentDto {
  @ApiProperty({ description: 'Model ID to deploy' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Model version to deploy' })
  @IsString()
  version: string;

  @ApiProperty({ enum: DeploymentEnvironment, description: 'Target environment' })
  @IsEnum(DeploymentEnvironment)
  environment: DeploymentEnvironment;

  @ApiPropertyOptional({ description: 'Deployment configuration' })
  @IsOptional()
  @IsObject()
  deploymentConfig?: {
    replicas?: number;
    resources?: {
      cpu?: string;
      memory?: string;
      gpu?: string;
    };
    autoScaling?: {
      enabled?: boolean;
      minReplicas?: number;
      maxReplicas?: number;
      targetCPU?: number;
    };
    healthCheck?: {
      endpoint?: string;
      timeout?: number;
      interval?: number;
    };
  };
}

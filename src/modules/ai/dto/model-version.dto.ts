import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateModelVersionDto {
  @ApiProperty({ description: 'Model ID' })
  @IsString()
  modelId: string;

  @ApiProperty({ description: 'Version identifier' })
  @IsString()
  version: string;

  @ApiPropertyOptional({ description: 'Version description and changes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Model file path or artifact URL' })
  @IsOptional()
  @IsString()
  modelPath?: string;

  @ApiPropertyOptional({ description: 'Docker image for this version' })
  @IsOptional()
  @IsString()
  dockerImage?: string;

  @ApiPropertyOptional({ description: 'Version-specific configuration' })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

export class ModelVersionResponseDto {
  @ApiProperty({ description: 'Version ID' })
  id: string;

  @ApiProperty({ description: 'Model ID' })
  modelId: string;

  @ApiProperty({ description: 'Version identifier' })
  version: string;

  @ApiProperty({ description: 'Version status' })
  status: string;

  @ApiPropertyOptional({ description: 'Training metrics' })
  trainingMetrics?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Evaluation results' })
  evaluationResults?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Whether this version is active' })
  isActive: boolean;
}

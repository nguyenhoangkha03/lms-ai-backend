import { PredictionType } from '@/common/enums/ai.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePredictionDto {
  @ApiProperty({ description: 'Model ID to use for prediction' })
  @IsString()
  modelId: string;

  @ApiPropertyOptional({ description: 'Specific model version (defaults to latest)' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ enum: PredictionType, description: 'Type of prediction' })
  @IsEnum(PredictionType)
  predictionType: PredictionType;

  @ApiProperty({ description: 'Input data for prediction' })
  @IsObject()
  inputData: Record<string, any>;

  @ApiPropertyOptional({ description: 'User ID for personalized predictions' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Request timeout in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({ description: 'Whether to cache prediction result' })
  @IsOptional()
  @IsBoolean()
  enableCache?: boolean;

  @ApiPropertyOptional({ description: 'Additional request metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BatchPredictionDto {
  @ApiProperty({ description: 'Model ID to use for predictions' })
  @IsString()
  modelId: string;

  @ApiPropertyOptional({ description: 'Specific model version (defaults to latest)' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ enum: PredictionType, description: 'Type of prediction' })
  @IsEnum(PredictionType)
  predictionType: PredictionType;

  @ApiProperty({ description: 'Array of input data for batch prediction' })
  @IsArray()
  @IsObject({ each: true })
  inputDataList: Record<string, any>[];

  @ApiPropertyOptional({ description: 'Batch processing options' })
  @IsOptional()
  @IsObject()
  batchOptions?: {
    batchSize?: number;
    parallelism?: number;
    timeout?: number;
    retryAttempts?: number;
  };
}

export class PredictionResponseDto {
  @ApiProperty({ description: 'Prediction ID' })
  id: string;

  @ApiProperty({ description: 'Model ID used' })
  modelId: string;

  @ApiProperty({ description: 'Model version used' })
  version: string;

  @ApiProperty({ description: 'Prediction type' })
  predictionType: string;

  @ApiProperty({ description: 'Prediction result' })
  prediction: Record<string, any>;

  @ApiProperty({ description: 'Confidence score' })
  confidence: number;

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTime: number;

  @ApiProperty({ description: 'Request timestamp' })
  requestedAt: Date;

  @ApiProperty({ description: 'Completion timestamp' })
  completedAt: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

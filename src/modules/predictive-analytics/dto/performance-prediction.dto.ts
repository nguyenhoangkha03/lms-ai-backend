import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsObject,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PredictionType, RiskLevel } from '../entities/performance-prediction.entity';

export class CreatePerformancePredictionDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ enum: PredictionType, description: 'Type of prediction' })
  @IsEnum(PredictionType)
  predictionType: PredictionType;

  @ApiPropertyOptional({ description: 'Target date for prediction outcome' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiProperty({ description: 'Predicted value (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  predictedValue: number;

  @ApiProperty({ description: 'Confidence score (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceScore: number;

  @ApiProperty({ enum: RiskLevel, description: 'Risk level assessment' })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiPropertyOptional({ description: 'Contributing factors to prediction' })
  @IsOptional()
  @IsObject()
  contributingFactors?: {
    engagementLevel?: number;
    performanceHistory?: number;
    timeManagement?: number;
    contentDifficulty?: number;
    socialFactors?: number;
    technicalIssues?: number;
    motivationLevel?: number;
    priorKnowledge?: number;
  };

  @ApiProperty({ description: 'Model version used' })
  @IsString()
  modelVersion: string;

  @ApiPropertyOptional({ description: 'Model metadata' })
  @IsOptional()
  @IsObject()
  modelMetadata?: Record<string, any>;
}

export class UpdatePerformancePredictionDto {
  @ApiPropertyOptional({ description: 'Actual outcome for validation', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  actualValue?: number;

  @ApiPropertyOptional({ description: 'Prediction accuracy score', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracyScore?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PerformancePredictionQueryDto {
  @ApiPropertyOptional({ description: 'Student ID filter' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Course ID filter' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ enum: PredictionType, description: 'Prediction type filter' })
  @IsOptional()
  @IsEnum(PredictionType)
  predictionType?: PredictionType;

  @ApiPropertyOptional({ enum: RiskLevel, description: 'Risk level filter' })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum confidence score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Only validated predictions' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  validated?: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OutcomeType } from '../entities/learning-outcome-forecast.entity';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateLearningOutcomeForecastDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ enum: OutcomeType, description: 'Type of learning outcome' })
  @IsEnum(OutcomeType)
  outcomeType: OutcomeType;

  @ApiProperty({ description: 'Target completion date' })
  @IsDateString()
  targetDate: string;

  @ApiProperty({ description: 'Predicted success probability (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  successProbability: number;

  @ApiPropertyOptional({
    description: 'Predicted score or completion percentage',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  predictedScore?: number;

  @ApiPropertyOptional({ description: 'Estimated days to completion' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDaysToCompletion?: number;

  @ApiProperty({ description: 'Scenario-based forecasts' })
  @IsObject()
  scenarios: {
    optimistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
    realistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
    pessimistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
  };

  @ApiProperty({ description: 'Forecast confidence level (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceLevel: number;

  @ApiPropertyOptional({ description: 'Baseline data used for forecast' })
  @IsOptional()
  @IsObject()
  baselineData?: {
    currentProgress: number;
    averagePerformance: number;
    engagementLevel: number;
    timeSpentLearning: number;
    completedActivities: number;
    skillLevel: string;
  };
}

export class UpdateLearningOutcomeForecastDto {
  @ApiPropertyOptional({ description: 'Actual outcome for validation', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  actualOutcome?: number;

  @ApiPropertyOptional({ description: 'Actual completion date' })
  @IsOptional()
  @IsDateString()
  actualCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Forecast accuracy metrics' })
  @IsOptional()
  @IsObject()
  accuracyMetrics?: {
    outcomeAccuracy: number;
    timeAccuracy: number;
    overallAccuracy: number;
    errorMargin: number;
  };
}

export class LearningOutcomeQueryDto {
  @ApiPropertyOptional({ description: 'Student ID filter' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Course ID filter' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ enum: OutcomeType, description: 'Outcome type filter' })
  @IsOptional()
  @IsEnum(OutcomeType)
  outcomeType?: OutcomeType;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum success probability' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minSuccessProbability?: number;

  @ApiPropertyOptional({ description: 'Only realized outcomes' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  realized?: boolean;
}

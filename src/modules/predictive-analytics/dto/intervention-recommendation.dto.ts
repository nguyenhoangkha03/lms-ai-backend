import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InterventionStatus,
  InterventionOutcome,
} from '../entities/intervention-recommendation.entity';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { InterventionType } from '../entities/performance-prediction.entity';
import { Transform, Type } from 'class-transformer';

export class CreateInterventionRecommendationDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Related prediction ID' })
  @IsOptional()
  @IsUUID()
  predictionId?: string;

  @ApiProperty({ enum: InterventionType, description: 'Type of intervention' })
  @IsEnum(InterventionType)
  interventionType: InterventionType;

  @ApiProperty({ description: 'Intervention title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed intervention description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Priority level (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  priority: number;

  @ApiPropertyOptional({ description: 'Recommended intervention date' })
  @IsOptional()
  @IsDateString()
  recommendedDate?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDuration?: number;

  @ApiProperty({ description: 'Intervention parameters and settings' })
  @IsObject()
  parameters: {
    targetMetrics?: string[];
    customContent?: string;
    resourceLinks?: string[];
    communicationMethod?: string;
    followUpRequired?: boolean;
    groupIntervention?: boolean;
    automatedIntervention?: boolean;
  };

  @ApiPropertyOptional({ description: 'Success criteria for intervention' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  successCriteria?: {
    metric: string;
    targetValue: number;
    timeframe: number;
    measurementMethod: string;
  }[];

  @ApiPropertyOptional({ description: 'Assigned instructor/tutor ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class UpdateInterventionRecommendationDto {
  @ApiPropertyOptional({ enum: InterventionStatus, description: 'Intervention status' })
  @IsOptional()
  @IsEnum(InterventionStatus)
  status?: InterventionStatus;

  @ApiPropertyOptional({ description: 'Scheduled intervention date' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Assigned instructor/tutor ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: InterventionOutcome, description: 'Intervention outcome' })
  @IsOptional()
  @IsEnum(InterventionOutcome)
  outcome?: InterventionOutcome;

  @ApiPropertyOptional({ description: 'Effectiveness score (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  effectivenessScore?: number;

  @ApiPropertyOptional({ description: 'Student feedback' })
  @IsOptional()
  @IsString()
  studentFeedback?: string;

  @ApiPropertyOptional({ description: 'Instructor notes' })
  @IsOptional()
  @IsString()
  instructorNotes?: string;

  @ApiPropertyOptional({ description: 'Metrics before intervention' })
  @IsOptional()
  @IsObject()
  preInterventionMetrics?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Metrics after intervention' })
  @IsOptional()
  @IsObject()
  postInterventionMetrics?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Follow-up scheduled date' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ description: 'Whether follow-up is required' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  followUpRequired?: boolean;
}

export class InterventionRecommendationQueryDto {
  @ApiPropertyOptional({ description: 'Student ID filter' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Course ID filter' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ enum: InterventionType, description: 'Intervention type filter' })
  @IsOptional()
  @IsEnum(InterventionType)
  interventionType?: InterventionType;

  @ApiPropertyOptional({ enum: InterventionStatus, description: 'Status filter' })
  @IsOptional()
  @IsEnum(InterventionStatus)
  status?: InterventionStatus;

  @ApiPropertyOptional({ description: 'Minimum priority level' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minPriority?: number;

  @ApiPropertyOptional({ description: 'Assigned to user ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Only interventions needing follow-up' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  followUpRequired?: boolean;
}

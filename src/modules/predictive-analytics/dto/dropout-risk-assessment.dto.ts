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
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { InterventionType, RiskLevel } from '../entities/performance-prediction.entity';

export class CreateDropoutRiskAssessmentDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsUUID()
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ enum: RiskLevel, description: 'Overall dropout risk level' })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Risk probability percentage (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  riskProbability: number;

  @ApiProperty({ description: 'Risk factors analysis' })
  @IsObject()
  riskFactors: {
    academicPerformance?: {
      score: number;
      weight: number;
      details: string[];
    };
    engagementLevel?: {
      score: number;
      weight: number;
      details: string[];
    };
    attendancePattern?: {
      score: number;
      weight: number;
      details: string[];
    };
    timeManagement?: {
      score: number;
      weight: number;
      details: string[];
    };
    socialIntegration?: {
      score: number;
      weight: number;
      details: string[];
    };
    technicalIssues?: {
      score: number;
      weight: number;
      details: string[];
    };
    personalFactors?: {
      score: number;
      weight: number;
      details: string[];
    };
  };

  @ApiPropertyOptional({ description: 'Protective factors' })
  @IsOptional()
  @IsObject()
  protectiveFactors?: {
    strongMotivation?: boolean;
    goodSupport?: boolean;
    priorSuccess?: boolean;
    effectiveStudyHabits?: boolean;
    technicalCompetence?: boolean;
    timeAvailability?: boolean;
  };

  @ApiProperty({ description: 'Whether immediate intervention is required' })
  @Transform(({ value }) => value === 'true')
  interventionRequired: boolean;

  @ApiPropertyOptional({
    enum: InterventionType,
    isArray: true,
    description: 'Recommended intervention types',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(InterventionType, { each: true })
  recommendedInterventions?: InterventionType[];

  @ApiProperty({ description: 'Priority level for intervention (1-10)', minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  interventionPriority: number;

  @ApiPropertyOptional({ description: 'Specific intervention recommendations' })
  @IsOptional()
  @IsString()
  interventionRecommendations?: string;
}

export class UpdateDropoutRiskAssessmentDto {
  @ApiPropertyOptional({ description: 'Whether student has been notified' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  studentNotified?: boolean;

  @ApiPropertyOptional({ description: 'Whether instructor has been notified' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  instructorNotified?: boolean;

  @ApiPropertyOptional({ description: 'Next assessment date' })
  @IsOptional()
  @IsDateString()
  nextAssessmentDate?: string;

  @ApiPropertyOptional({ description: 'Updated intervention recommendations' })
  @IsOptional()
  @IsString()
  interventionRecommendations?: string;
}

export class DropoutRiskQueryDto {
  @ApiPropertyOptional({ description: 'Student ID filter' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Course ID filter' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ enum: RiskLevel, description: 'Risk level filter' })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: 'Only cases requiring intervention' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  interventionRequired?: boolean;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum risk probability' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minRiskProbability?: number;
}

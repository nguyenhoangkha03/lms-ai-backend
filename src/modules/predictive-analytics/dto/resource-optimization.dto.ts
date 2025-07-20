import { ResourceType } from '../entities/resource-optimization.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateResourceOptimizationDto {
  @ApiProperty({ enum: ResourceType, description: 'Type of resource being optimized' })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ description: 'Resource identifier' })
  @IsString()
  resourceId: string;

  @ApiProperty({ description: 'Current efficiency score (0-100)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  currentEfficiency: number;

  @ApiProperty({
    description: 'Predicted efficiency with optimization (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  predictedEfficiency: number;

  @ApiProperty({ description: 'Current usage patterns' })
  @IsObject()
  currentUsage: {
    utilizationRate: number;
    peakHours: string[];
    averageSessionDuration: number;
    userSatisfaction: number;
    bottlenecks: string[];
  };

  @ApiProperty({ description: 'Optimization recommendations' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  recommendations: {
    action: string;
    impact: number;
    effort: number;
    timeline: string;
    dependencies: string[];
  }[];

  @ApiPropertyOptional({ description: 'Predicted outcomes' })
  @IsOptional()
  @IsObject()
  predictedOutcomes?: {
    costSavings: number;
    performanceImprovement: number;
    userExperienceImprovement: number;
    implementationCost: number;
    riskLevel: string;
  };
}

export class UpdateResourceOptimizationDto {
  @ApiPropertyOptional({ description: 'Whether optimization has been implemented' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isImplemented?: boolean;

  @ApiPropertyOptional({
    description: 'Actual efficiency after implementation',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  actualEfficiency?: number;

  @ApiPropertyOptional({ description: 'Implementation results' })
  @IsOptional()
  @IsObject()
  implementationResults?: {
    successRate: number;
    unexpectedIssues: string[];
    additionalBenefits: string[];
    lessonsLearned: string[];
  };
}

export class ResourceOptimizationQueryDto {
  @ApiPropertyOptional({ enum: ResourceType, description: 'Resource type filter' })
  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @ApiPropertyOptional({ description: 'Resource ID filter' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Minimum efficiency improvement' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minEfficiencyImprovement?: number;

  @ApiPropertyOptional({ description: 'Only implemented optimizations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  implemented?: boolean;

  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

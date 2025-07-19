import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QualityDimension } from '../entities/content-quality-assessment.entity';

export class AssessContentQualityDto {
  @ApiProperty({ description: 'Content type to assess', enum: ['course', 'lesson'] })
  @IsEnum(['course', 'lesson'])
  contentType: 'course' | 'lesson';

  @ApiProperty({ description: 'Content ID' })
  @IsString()
  contentId: string;

  @ApiPropertyOptional({
    description: 'Specific dimensions to assess',
    enum: QualityDimension,
    isArray: true,
  })
  @IsOptional()
  @IsEnum(QualityDimension, { each: true })
  dimensions?: QualityDimension[];

  @ApiPropertyOptional({ description: 'Include detailed analysis' })
  @IsOptional()
  @IsBoolean()
  includeDetailedAnalysis?: boolean = true;

  @ApiPropertyOptional({ description: 'Generate improvement suggestions' })
  @IsOptional()
  @IsBoolean()
  generateSuggestions?: boolean = true;

  @ApiPropertyOptional({ description: 'Force reassessment even if recent assessment exists' })
  @IsOptional()
  @IsBoolean()
  forceReassessment?: boolean = false;
}

export class BulkQualityAssessmentDto {
  @ApiProperty({ description: 'Content type to assess', enum: ['course', 'lesson'] })
  @IsEnum(['course', 'lesson'])
  contentType: 'course' | 'lesson';

  @ApiProperty({ description: 'Content IDs to assess', type: [String] })
  @IsString({ each: true })
  contentIds: string[];

  @ApiPropertyOptional({
    description: 'Specific dimensions to assess',
    enum: QualityDimension,
    isArray: true,
  })
  @IsOptional()
  @IsEnum(QualityDimension, { each: true })
  dimensions?: QualityDimension[];

  @ApiPropertyOptional({ description: 'Include detailed analysis' })
  @IsOptional()
  @IsBoolean()
  includeDetailedAnalysis?: boolean = false;
}

export class QualityAssessmentQueryDto {
  @ApiPropertyOptional({ description: 'Content type filter', enum: ['course', 'lesson'] })
  @IsOptional()
  @IsEnum(['course', 'lesson'])
  contentType?: 'course' | 'lesson';

  @ApiPropertyOptional({ description: 'Content ID filter' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Minimum overall score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minOverallScore?: number;

  @ApiPropertyOptional({ description: 'Maximum overall score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxOverallScore?: number;

  @ApiPropertyOptional({
    description: 'Quality level filter',
    enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
  })
  @IsOptional()
  @IsEnum(['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'])
  qualityLevel?: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'poor';

  @ApiPropertyOptional({ description: 'Only latest assessments' })
  @IsOptional()
  @IsBoolean()
  latestOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Sort by score', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortByScore?: 'asc' | 'desc' = 'desc';
}

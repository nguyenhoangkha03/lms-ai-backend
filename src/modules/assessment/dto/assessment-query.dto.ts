import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AssessmentType, AssessmentStatus, GradingMethod } from '@/common/enums/assessment.enums';

export class AssessmentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by assessment type',
    enum: Object.values(AssessmentType),
  })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;

  @ApiPropertyOptional({ description: 'Filter by status', enum: Object.values(AssessmentStatus) })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by lesson ID' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Filter by teacher ID' })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Filter by grading method',
    enum: Object.values(GradingMethod),
  })
  @IsOptional()
  @IsEnum(GradingMethod)
  gradingMethod?: GradingMethod;

  @ApiPropertyOptional({ description: 'Filter by mandatory status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'Filter by proctoring requirement' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isProctored?: boolean;

  @ApiPropertyOptional({ description: 'Filter assessments available from date' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'Filter assessments available until date' })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({ description: 'Include questions in response' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Include attempts statistics' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeAttempts?: boolean;
}

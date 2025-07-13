import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradebookStatus } from '../entities/gradebook.entity';

export class CreateGradebookDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Gradebook name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Gradebook description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Grading scale configuration as JSON' })
  @IsOptional()
  @IsString()
  gradingScale?: string;

  @ApiPropertyOptional({ description: 'Weighting scheme as JSON' })
  @IsOptional()
  @IsString()
  weightingScheme?: string;

  @ApiPropertyOptional({ description: 'Passing threshold percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  passingThreshold?: number;

  @ApiPropertyOptional({ description: 'Allow late submissions' })
  @IsOptional()
  @IsBoolean()
  allowLateSubmissions?: boolean;

  @ApiPropertyOptional({ description: 'Late penalty percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  latePenaltyPercentage?: number;
}

export class UpdateGradebookDto {
  @ApiPropertyOptional({ description: 'Gradebook name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Gradebook description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: GradebookStatus, description: 'Gradebook status' })
  @IsOptional()
  @IsEnum(GradebookStatus)
  status?: GradebookStatus;

  @ApiPropertyOptional({ description: 'Grading scale configuration as JSON' })
  @IsOptional()
  @IsString()
  gradingScale?: string;

  @ApiPropertyOptional({ description: 'Weighting scheme as JSON' })
  @IsOptional()
  @IsString()
  weightingScheme?: string;

  @ApiPropertyOptional({ description: 'Passing threshold percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  passingThreshold?: number;

  @ApiPropertyOptional({ description: 'Allow late submissions' })
  @IsOptional()
  @IsBoolean()
  allowLateSubmissions?: boolean;

  @ApiPropertyOptional({ description: 'Late penalty percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  latePenaltyPercentage?: number;

  @ApiPropertyOptional({ description: 'Display settings as JSON' })
  @IsOptional()
  @IsString()
  displaySettings?: string;

  @ApiPropertyOptional({ description: 'Export settings as JSON' })
  @IsOptional()
  @IsString()
  exportSettings?: string;
}

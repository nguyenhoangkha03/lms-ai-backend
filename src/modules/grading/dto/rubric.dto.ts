import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RubricType } from '../entities/grading-rubric.entity';

export class CreateRubricDto {
  @ApiPropertyOptional({ description: 'Assessment ID (optional for templates)' })
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ApiProperty({ description: 'Rubric title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Rubric description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RubricType, description: 'Type of rubric' })
  @IsOptional()
  @IsEnum(RubricType)
  type?: RubricType;

  @ApiPropertyOptional({ description: 'Whether this is a template' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiProperty({ description: 'Rubric criteria as JSON' })
  @IsString()
  criteria: string;

  @ApiProperty({ description: 'Maximum score', minimum: 1 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  maxScore: number;
}

export class UpdateRubricDto {
  @ApiPropertyOptional({ description: 'Rubric title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Rubric description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RubricType, description: 'Type of rubric' })
  @IsOptional()
  @IsEnum(RubricType)
  type?: RubricType;

  @ApiPropertyOptional({ description: 'Whether this is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Rubric criteria as JSON' })
  @IsOptional()
  @IsString()
  criteria?: string;

  @ApiPropertyOptional({ description: 'Maximum score', minimum: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  maxScore?: number;
}

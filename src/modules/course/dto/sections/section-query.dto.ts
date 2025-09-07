import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsBoolean,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SectionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by course ID',
    example: 'course-uuid-123',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by required status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Search in section titles and descriptions',
    example: 'introduction',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Include lessons in the response',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeLessons?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'orderIndex',
    enum: ['title', 'orderIndex', 'createdAt', 'updatedAt', 'totalLessons'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'title' | 'orderIndex' | 'createdAt' | 'updatedAt' | 'totalLessons';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
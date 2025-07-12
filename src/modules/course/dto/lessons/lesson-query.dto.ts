import { ContentStatus } from '@/common/enums/content.enums';
import { LessonType } from '@/common/enums/course.enums';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class LessonQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by section ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by lesson type',
    enum: LessonType,
    example: LessonType.VIDEO,
  })
  @IsOptional()
  @IsEnum(LessonType)
  lessonType?: LessonType;

  @ApiPropertyOptional({
    description: 'Filter by content status',
    enum: ContentStatus,
    example: ContentStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({
    description: 'Filter by preview status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isPreview?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search in title and description',
    example: 'introduction variables',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'orderIndex',
    enum: ['orderIndex', 'title', 'createdAt', 'updatedAt', 'publishedAt'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Include progress information',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeProgress?: boolean;

  @ApiPropertyOptional({
    description: 'Include file attachments',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeFiles?: boolean;

  @ApiPropertyOptional({
    description: 'Include content versions',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeVersions?: boolean;
}

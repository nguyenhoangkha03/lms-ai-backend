import { FileAccessLevel } from '@/common/enums/file.enums';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { FileType } from '@/common/enums/course.enums';
import { Transform } from 'class-transformer';

export class FileQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by file type',
    enum: FileType,
    example: FileType.VIDEO,
  })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiPropertyOptional({
    description: 'Filter by uploader ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  uploaderId?: string;

  @ApiPropertyOptional({
    description: 'Filter by lesson ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({
    description: 'Filter by course ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by access level',
    enum: FileAccessLevel,
    example: FileAccessLevel.PUBLIC,
  })
  @IsOptional()
  @IsEnum(FileAccessLevel)
  accessLevel?: FileAccessLevel;

  @ApiPropertyOptional({
    description: 'Search in file names and metadata',
    example: 'introduction video',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter files uploaded from this date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter files uploaded until this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Minimum file size in bytes',
    example: 1024,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSize?: number;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    example: 104857600,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSize?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'uploadedAt',
    enum: ['uploadedAt', 'fileSize', 'originalName', 'viewCount'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Include download URLs in response',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeUrls?: boolean;

  @ApiPropertyOptional({
    description: 'Include processing status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeProcessingStatus?: boolean;
}

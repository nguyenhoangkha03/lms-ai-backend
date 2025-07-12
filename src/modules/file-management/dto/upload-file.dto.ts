import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsObject,
  IsIP,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileType, FileAccessLevel } from '@/common/enums/file.enums';

export class UploadFileDto {
  @ApiProperty({
    description: 'Type of file being uploaded',
    enum: FileType,
    example: FileType.IMAGE,
  })
  @IsEnum(FileType)
  fileType: FileType;

  @ApiPropertyOptional({
    description: 'File access level',
    enum: FileAccessLevel,
    example: FileAccessLevel.PRIVATE,
    default: FileAccessLevel.PRIVATE,
  })
  @IsOptional()
  @IsEnum(FileAccessLevel)
  accessLevel?: FileAccessLevel = FileAccessLevel.PRIVATE;

  @ApiPropertyOptional({
    description: 'Lesson ID this file belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiPropertyOptional({
    description: 'Course ID this file belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'File description',
    example: 'Course introduction video',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Allow duplicate files with same hash',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDuplicates?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional file metadata',
    example: { category: 'lecture', tags: ['introduction', 'basics'] },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Client IP address',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}

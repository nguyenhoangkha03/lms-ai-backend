import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateUploadUrlDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'my-course-trailer.mp4',
  })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 52428800, // 50MB
    minimum: 1,
    maximum: 500 * 1024 * 1024, // 500MB
  })
  @IsNumber()
  @Min(1)
  @Max(500 * 1024 * 1024) // 500MB max
  fileSize: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'video/mp4',
    enum: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/avi',
      'video/mov',
      'video/wmv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/aac',
      'audio/ogg',
      'audio/flac',
      'audio/webm',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      'application/zip',
      'application/x-rar-compressed',
    ],
  })
  @IsString()
  @IsIn([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/avi',
    'video/mov',
    'video/wmv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    'application/zip',
    'application/x-rar-compressed',
  ])
  mimeType: string;

  @ApiProperty({
    description: 'Type of upload',
    example: 'trailer',
    enum: ['trailer', 'lesson', 'promotional'],
  })
  @IsEnum(['trailer', 'lesson', 'promotional'])
  uploadType: 'trailer' | 'lesson' | 'promotional';

  @ApiProperty({
    description: 'Lesson ID (required for lesson uploads)',
    example: 'uuid-lesson-id',
    required: false,
  })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { description: 'Course introduction video', tags: ['intro', 'welcome'] },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

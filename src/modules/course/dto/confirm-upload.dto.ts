import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmUploadDto {
  @ApiProperty({
    description: 'Unique upload ID from presigned URL generation',
    example: 'upload_1703123456789_abc123',
  })
  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @ApiProperty({
    description: 'S3 object key where file was uploaded',
    example: 'courses/course-uuid/trailer/upload_123_video.mp4',
  })
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @ApiProperty({
    description: 'S3 ETag returned after successful upload (without quotes)',
    example: 'd41d8cd98f00b204e9800998ecf8427e',
  })
  @IsString()
  @IsNotEmpty()
  etag: string;

  @ApiProperty({
    description: 'Actual uploaded file size in bytes',
    example: 52428800,
  })
  @IsNumber()
  @Min(1)
  actualFileSize: number;

  @ApiProperty({
    description: 'Additional upload metadata from client',
    example: { uploadDuration: 45.2, userAgent: 'Mozilla/5.0...' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  uploadMetadata?: Record<string, any>;
}
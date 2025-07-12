import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class VideoProcessingDto {
  @ApiPropertyOptional({
    description: 'Generate video thumbnails',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  generateThumbnails?: boolean;

  @ApiPropertyOptional({
    description: 'Create preview video (first 30 seconds)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  createPreview?: boolean;

  @ApiPropertyOptional({
    description: 'Enable adaptive bitrate streaming',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  adaptiveBitrate?: boolean;

  @ApiPropertyOptional({
    description: 'Target video qualities',
    example: ['1080p', '720p', '480p'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualities?: string[];

  @ApiPropertyOptional({
    description: 'Add watermark to video',
    example: 'LMS Platform',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  watermark?: string;

  @ApiPropertyOptional({
    description: 'Watermark position',
    example: 'bottom-right',
    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
  })
  @IsOptional()
  @IsEnum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

  @ApiPropertyOptional({
    description: 'Maximum video duration in seconds',
    example: 3600,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDuration?: number;
}

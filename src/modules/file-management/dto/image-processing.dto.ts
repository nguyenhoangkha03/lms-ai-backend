import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ImageProcessingDto {
  @ApiPropertyOptional({
    description: 'Target width for image resize',
    example: 800,
    minimum: 1,
    maximum: 4096,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4096)
  width?: number;

  @ApiPropertyOptional({
    description: 'Target height for image resize',
    example: 600,
    minimum: 1,
    maximum: 4096,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4096)
  height?: number;

  @ApiPropertyOptional({
    description: 'Image quality (1-100)',
    example: 85,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiPropertyOptional({
    description: 'Output format',
    example: 'jpeg',
    enum: ['jpeg', 'png', 'webp', 'avif'],
  })
  @IsOptional()
  @IsEnum(['jpeg', 'png', 'webp', 'avif'])
  format?: 'jpeg' | 'png' | 'webp' | 'avif';

  @ApiPropertyOptional({
    description: 'Resize fit mode',
    example: 'cover',
    enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
  })
  @IsOptional()
  @IsEnum(['cover', 'contain', 'fill', 'inside', 'outside'])
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

  @ApiPropertyOptional({
    description: 'Generate thumbnails',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  generateThumbnails?: boolean;

  @ApiPropertyOptional({
    description: 'Generate responsive images',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  generateResponsive?: boolean;

  @ApiPropertyOptional({
    description: 'Watermark text',
    example: 'LMS Platform',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  watermark?: string;

  @ApiPropertyOptional({
    description: 'Apply image filter',
    example: 'sharpen',
    enum: ['blur', 'sharpen', 'grayscale', 'sepia', 'negative'],
  })
  @IsOptional()
  @IsEnum(['blur', 'sharpen', 'grayscale', 'sepia', 'negative'])
  filter?: 'blur' | 'sharpen' | 'grayscale' | 'sepia' | 'negative';
}

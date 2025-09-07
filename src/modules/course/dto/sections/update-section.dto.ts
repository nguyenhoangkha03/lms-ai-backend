import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsObject,
  IsInt,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSectionDto {
  @ApiPropertyOptional({
    description: 'Title of the section',
    example: 'Introduction to React Components',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the section content',
    example: 'This section covers the basics of React components...',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Order index for section positioning',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    description: 'Whether this section is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this section is required for course completion',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Learning objectives for this section',
    example: ['Understand React components', 'Create functional components'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  objectives?: string[];

  @ApiPropertyOptional({
    description: 'Date when this section becomes available',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({
    description: 'Date when this section expires',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({
    description: 'Additional settings for the section',
    example: { 
      allowDownloads: true, 
      requireSequentialAccess: false,
      completionCriteria: 'all_lessons'
    },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the section',
    example: { tags: ['react', 'frontend'], difficulty: 'beginner' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
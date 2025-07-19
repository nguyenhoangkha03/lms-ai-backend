import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagCategory, TagType } from '../entities/content-tag.entity';

export class GenerateTagsDto {
  @ApiProperty({ description: 'Content type to analyze', enum: ['course', 'lesson'] })
  @IsEnum(['course', 'lesson'])
  contentType: 'course' | 'lesson';

  @ApiProperty({ description: 'Content ID' })
  @IsString()
  contentId: string;

  @ApiPropertyOptional({ description: 'Maximum number of tags to generate', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxTags?: number = 10;

  @ApiPropertyOptional({
    description: 'Tag categories to generate',
    enum: TagCategory,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TagCategory, { each: true })
  categories?: TagCategory[];

  @ApiPropertyOptional({ description: 'Minimum confidence threshold', default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number = 0.5;

  @ApiPropertyOptional({ description: 'Force regeneration even if tags exist' })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean = false;

  @ApiPropertyOptional({ description: 'Include manual tags in analysis' })
  @IsOptional()
  @IsBoolean()
  includeManualTags?: boolean = true;
}

export class CreateContentTagDto {
  @ApiProperty({ description: 'Content type', enum: ['course', 'lesson'] })
  @IsEnum(['course', 'lesson'])
  contentType: 'course' | 'lesson';

  @ApiProperty({ description: 'Content ID' })
  @IsString()
  contentId: string;

  @ApiProperty({ description: 'Tag text' })
  @IsString()
  tag: string;

  @ApiProperty({ description: 'Tag category', enum: TagCategory })
  @IsEnum(TagCategory)
  category: TagCategory;

  @ApiProperty({ description: 'Tag type', enum: TagType })
  @IsEnum(TagType)
  type: TagType;

  @ApiPropertyOptional({ description: 'Confidence score (0-1)', default: 1.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number = 1.0;

  @ApiPropertyOptional({ description: 'Tag description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateContentTagDto {
  @ApiPropertyOptional({ description: 'Tag text' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Tag category', enum: TagCategory })
  @IsOptional()
  @IsEnum(TagCategory)
  category?: TagCategory;

  @ApiPropertyOptional({ description: 'Confidence score (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ description: 'Tag description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is tag active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is tag verified' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class TagQueryDto {
  @ApiPropertyOptional({ description: 'Content type filter', enum: ['course', 'lesson'] })
  @IsOptional()
  @IsEnum(['course', 'lesson'])
  contentType?: 'course' | 'lesson';

  @ApiPropertyOptional({ description: 'Content ID filter' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Tag category filter', enum: TagCategory })
  @IsOptional()
  @IsEnum(TagCategory)
  category?: TagCategory;

  @ApiPropertyOptional({ description: 'Tag type filter', enum: TagType })
  @IsOptional()
  @IsEnum(TagType)
  type?: TagType;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Minimum confidence' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Only verified tags' })
  @IsOptional()
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Only active tags' })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean = true;
}

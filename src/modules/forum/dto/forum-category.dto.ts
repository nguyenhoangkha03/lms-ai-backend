import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsHexColor,
  IsUrl,
  IsObject,
  Min,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateForumCategoryDto {
  @ApiProperty({ description: 'Category name', minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ description: 'URL-friendly category identifier', minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  slug: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Category icon URL' })
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Category banner image URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Category color theme', default: '#3B82F6' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Display order index', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Is category active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is category featured', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Is category private', default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ description: 'Requires approval to post', default: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Category settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Category metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateForumCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', minLength: 1, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly category identifier',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  slug?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Category icon URL' })
  @IsOptional()
  @IsUrl()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Category banner image URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ description: 'Category color theme' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ description: 'Display order index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Is category active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is category featured' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Is category private' })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ description: 'Requires approval to post' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Category settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Category metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

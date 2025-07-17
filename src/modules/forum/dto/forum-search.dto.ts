import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  Min,
  IsObject,
  IsUrl,
  IsHexColor,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ForumPostType,
  ForumSearchType,
  ForumSortBy,
  ForumThreadStatus,
} from '@/common/enums/forum.enums';

export class ForumSearchDto {
  @ApiPropertyOptional({ description: 'Search query', minLength: 3, maxLength: 100 })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Search type',
    enum: ForumSearchType,
    default: ForumSearchType.POSTS,
  })
  @IsOptional()
  @IsEnum(ForumSearchType)
  type?: ForumSearchType;

  @ApiPropertyOptional({ description: 'Category IDs to search in' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'Tags to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Author user ID' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Search start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Search end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by threads with accepted answer' })
  @IsOptional()
  @IsBoolean()
  hasAcceptedAnswer?: boolean;

  @ApiPropertyOptional({ description: 'Minimum vote count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minVotes?: number;

  @ApiPropertyOptional({ description: 'Maximum vote count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxVotes?: number;

  @ApiPropertyOptional({
    description: 'Thread status filter',
    enum: ForumThreadStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ForumThreadStatus, { each: true })
  status?: ForumThreadStatus[];

  @ApiPropertyOptional({
    description: 'Post type filter',
    enum: ForumPostType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  postType?: string;

  @ApiPropertyOptional({ description: 'Sort by', enum: ForumSortBy })
  @IsOptional()
  @IsEnum(ForumSortBy)
  sortBy?: ForumSortBy;

  page?: number = 1;
  limit?: number = 20;

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

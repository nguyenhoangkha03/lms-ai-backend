import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  Length,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForumPostType, ForumThreadStatus } from '@/common/enums/forum.enums';

export class CreateForumThreadDto {
  @ApiProperty({ description: 'Thread title', minLength: 5, maxLength: 255 })
  @IsString()
  @Length(5, 255)
  title: string;

  @ApiProperty({ description: 'Thread content', minLength: 10, maxLength: 50000 })
  @IsString()
  @Length(10, 50000)
  content: string;

  @ApiProperty({ description: 'Category ID this thread belongs to' })
  @IsString()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Thread summary or excerpt' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Thread type',
    enum: ForumPostType,
    default: ForumPostType.THREAD,
  })
  @IsOptional()
  @IsEnum(ForumPostType)
  type?: ForumPostType;

  @ApiPropertyOptional({ description: 'Thread tags', maxItems: 5 })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Thread metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateForumThreadDto {
  @ApiPropertyOptional({ description: 'Thread title', minLength: 5, maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(5, 255)
  title?: string;

  @ApiPropertyOptional({ description: 'Thread summary or excerpt' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Thread status', enum: ForumThreadStatus })
  @IsOptional()
  @IsEnum(ForumThreadStatus)
  status?: ForumThreadStatus;

  @ApiPropertyOptional({ description: 'Is thread pinned' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Is thread featured' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Is thread locked' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Is thread resolved' })
  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;

  @ApiPropertyOptional({ description: 'Thread tags', maxItems: 5 })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Thread metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

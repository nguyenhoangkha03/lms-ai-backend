import { IsString, IsOptional, IsEnum, IsObject, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForumPostType, ForumPostStatus } from '@/common/enums/forum.enums';

export class CreateForumPostDto {
  @ApiProperty({ description: 'Post content', minLength: 10, maxLength: 50000 })
  @IsString()
  @Length(10, 50000)
  content: string;

  @ApiProperty({ description: 'Thread ID this post belongs to' })
  @IsString()
  threadId: string;

  @ApiPropertyOptional({ description: 'Parent post ID for replies' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Post type',
    enum: ForumPostType,
    default: ForumPostType.REPLY,
  })
  @IsOptional()
  @IsEnum(ForumPostType)
  type?: ForumPostType;

  @ApiPropertyOptional({ description: 'Post mentions' })
  @IsOptional()
  @IsObject()
  mentions?: {
    users?: string[];
    roles?: string[];
  };

  @ApiPropertyOptional({ description: 'Post metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateForumPostDto {
  @ApiPropertyOptional({ description: 'Post content', minLength: 10, maxLength: 50000 })
  @IsOptional()
  @IsString()
  @Length(10, 50000)
  content?: string;

  @ApiPropertyOptional({ description: 'Post status', enum: ForumPostStatus })
  @IsOptional()
  @IsEnum(ForumPostStatus)
  status?: ForumPostStatus;

  @ApiPropertyOptional({ description: 'Edit reason' })
  @IsOptional()
  @IsString()
  editReason?: string;

  @ApiPropertyOptional({ description: 'Post mentions' })
  @IsOptional()
  @IsObject()
  mentions?: {
    users?: string[];
    roles?: string[];
  };

  @ApiPropertyOptional({ description: 'Post metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

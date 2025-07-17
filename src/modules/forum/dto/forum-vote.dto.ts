import { IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForumVoteType } from '@/common/enums/forum.enums';

export class CreateForumVoteDto {
  @ApiProperty({ description: 'Vote type', enum: ForumVoteType })
  @IsEnum(ForumVoteType)
  voteType: ForumVoteType;

  @ApiPropertyOptional({ description: 'Vote metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

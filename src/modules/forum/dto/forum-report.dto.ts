import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ForumReportReason } from '@/common/enums/forum.enums';

export class CreateForumReportDto {
  @ApiProperty({ description: 'Report reason', enum: ForumReportReason })
  @IsEnum(ForumReportReason)
  reason: ForumReportReason;

  @ApiPropertyOptional({ description: 'Additional details about the report' })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiPropertyOptional({ description: 'Report metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateForumReportDto {
  @ApiPropertyOptional({ description: 'Report status' })
  @IsOptional()
  @IsEnum(['pending', 'reviewed', 'resolved', 'dismissed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Moderator notes' })
  @IsOptional()
  @IsString()
  moderatorNotes?: string;

  @ApiPropertyOptional({ description: 'Report metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

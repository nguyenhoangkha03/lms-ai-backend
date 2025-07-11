import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateLessonDto {
  @ApiProperty({
    description: 'Moderation status',
    enum: ContentModerationStatus,
    example: ContentModerationStatus.APPROVED,
  })
  @IsEnum(ContentModerationStatus)
  status: ContentModerationStatus;

  @ApiPropertyOptional({
    description: 'Moderation reason/note',
    example: 'Content approved after review',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

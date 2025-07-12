import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContentStatus } from '@/common/enums/content.enums';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {
  @ApiPropertyOptional({
    description: 'Version note for content changes',
    example: 'Updated examples and fixed typos',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  versionNote?: string;

  @ApiPropertyOptional({
    description: 'Content status',
    enum: ContentStatus,
    example: ContentStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}

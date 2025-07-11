import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { BulkLessonOperationDto } from './bulk-lesson-operation.dto';

export class BulkUpdateLessonStatusDto extends BulkLessonOperationDto {
  @ApiProperty({
    description: 'New status for all lessons',
    enum: ContentStatus,
    example: ContentStatus.PUBLISHED,
  })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}

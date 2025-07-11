import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { BulkLessonOperationDto } from './bulk-lesson-operation.dto';

export class BulkDeleteLessonsDto extends BulkLessonOperationDto {
  @ApiPropertyOptional({
    description: 'Reason for bulk deletion',
    example: 'Content restructuring',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { LessonOrderDto } from './lesson-order.dto';

export class ReorderLessonsDto {
  @ApiProperty({
    description: 'Lesson reorder data',
    example: [
      { id: '123e4567-e89b-12d3-a456-426614174000', orderIndex: 1 },
      { id: '123e4567-e89b-12d3-a456-426614174001', orderIndex: 2 },
    ],
    type: 'array',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderDto)
  lessons: LessonOrderDto[];
}

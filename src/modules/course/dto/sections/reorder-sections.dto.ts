import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderSectionsDto {
  @ApiProperty({
    description: 'ID of the course',
    example: 'course-uuid-123',
  })
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Array of section IDs in the desired order',
    example: ['section-1', 'section-2', 'section-3'],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  sectionIds: string[];
}
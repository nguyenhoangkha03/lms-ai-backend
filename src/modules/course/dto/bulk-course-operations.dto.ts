import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize, IsUUID } from 'class-validator';
import { CourseStatus } from '@/common/enums/course.enums';

export class BulkCourseIdsDto {
  @ApiProperty({ description: 'Array of course IDs', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  courseIds: string[];
}

export class BulkUpdateCourseStatusDto extends BulkCourseIdsDto {
  @ApiProperty({ enum: CourseStatus, description: 'New status for selected courses' })
  @IsEnum(CourseStatus)
  status: CourseStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkUpdateCourseCategoryDto extends BulkCourseIdsDto {
  @ApiProperty({ description: 'New category ID for selected courses' })
  @IsUUID()
  categoryId: string;
}

export class BulkUpdateCourseTagsDto extends BulkCourseIdsDto {
  @ApiProperty({ description: 'Tags to add/remove', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ description: 'Action: add or remove tags', enum: ['add', 'remove', 'replace'] })
  @IsEnum(['add', 'remove', 'replace'])
  action: 'add' | 'remove' | 'replace';
}

export class BulkDeleteCoursesDto extends BulkCourseIdsDto {
  @ApiPropertyOptional({ description: 'Force delete (skip to trash)' })
  @IsOptional()
  force?: boolean = false;
}

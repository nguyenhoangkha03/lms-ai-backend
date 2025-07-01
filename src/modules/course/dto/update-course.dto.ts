import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateCourseDto } from './create-course.dto';
import { CourseStatus } from '@/common/enums/course.enums';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @ApiPropertyOptional({
    description: 'Course status',
    enum: CourseStatus,
  })
  @IsOptional()
  @IsEnum(CourseStatus, { message: 'Invalid course status' })
  status?: CourseStatus;

  @ApiPropertyOptional({
    description: 'Featured course status',
    example: false,
  })
  @IsOptional()
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'New course badge',
    example: false,
  })
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional({
    description: 'Bestseller badge',
    example: false,
  })
  @IsOptional()
  bestseller?: boolean;
}

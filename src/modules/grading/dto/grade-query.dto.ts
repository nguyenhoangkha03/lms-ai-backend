import { IsOptional, IsString, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { GradeStatus } from '../entities/grade.entity';

export class GradeQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by student ID' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by assessment ID' })
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by grader ID' })
  @IsOptional()
  @IsString()
  graderId?: string;

  @ApiPropertyOptional({ enum: GradeStatus, description: 'Filter by grade status' })
  @IsOptional()
  @IsEnum(GradeStatus)
  status?: GradeStatus;

  @ApiPropertyOptional({ description: 'Filter by publication status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Filter by AI grading' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isAiGraded?: boolean;

  @ApiPropertyOptional({ description: 'Filter from date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Search in feedback or comments' })
  @IsOptional()
  @IsString()
  search?: string;
}

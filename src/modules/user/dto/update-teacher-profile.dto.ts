import { IsOptional, IsString, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional({ description: 'Teacher specializations', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specializations?: string;

  @ApiPropertyOptional({ description: 'Qualifications and certifications', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qualifications?: string;

  @ApiPropertyOptional({ description: 'Years of experience', minimum: 0, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsExperience?: number;

  @ApiPropertyOptional({ description: 'Teaching style and methodology', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  teachingStyle?: string;

  @ApiPropertyOptional({ description: 'Office hours schedule', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  officeHours?: string;
}

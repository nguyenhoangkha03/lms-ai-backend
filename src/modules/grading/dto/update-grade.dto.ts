import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsBoolean, IsNumber } from 'class-validator';
import { CreateGradeDto } from './create-grade.dto';

export class UpdateGradeDto extends PartialType(CreateGradeDto) {
  @IsOptional()
  @IsString()
  reviewComments?: string;

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

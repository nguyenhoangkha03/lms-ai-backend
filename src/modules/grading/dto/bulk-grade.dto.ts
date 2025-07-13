import { IsArray, ValidateNested, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGradeDto } from './create-grade.dto';

export class BulkGradeDto {
  @ApiProperty({ type: [CreateGradeDto], description: 'Array of grades to create' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGradeDto)
  grades: CreateGradeDto[];

  @ApiPropertyOptional({ description: 'Whether to publish all grades immediately' })
  @IsOptional()
  @IsBoolean()
  publishImmediately?: boolean;

  @ApiPropertyOptional({ description: 'Common feedback for all grades' })
  @IsOptional()
  @IsString()
  commonFeedback?: string;
}

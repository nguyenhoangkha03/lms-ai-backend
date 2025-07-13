import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutoGradeDto {
  @ApiProperty({ description: 'Assessment attempt ID to grade' })
  @IsString()
  attemptId: string;

  @ApiPropertyOptional({ description: 'Whether to use AI for essay questions' })
  @IsOptional()
  @IsBoolean()
  useAiForEssays?: boolean;

  @ApiPropertyOptional({ description: 'Specific question IDs to grade (if not all)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionIds?: string[];

  @ApiPropertyOptional({ description: 'Whether to automatically publish results' })
  @IsOptional()
  @IsBoolean()
  autoPublish?: boolean;
}

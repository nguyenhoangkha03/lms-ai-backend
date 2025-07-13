import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiEssayGradeDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Student answer text' })
  @IsString()
  answerText: string;

  @ApiProperty({ description: 'Model answer or rubric' })
  @IsString()
  modelAnswer: string;

  @ApiPropertyOptional({ description: 'Maximum score for this question' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Minimum confidence threshold', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @ApiPropertyOptional({ description: 'Whether to generate detailed feedback' })
  @IsOptional()
  @IsString()
  generateDetailedFeedback?: string;
}

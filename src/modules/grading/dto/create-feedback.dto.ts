import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackCategory, FeedbackSeverity } from '../entities/feedback.entity';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Grade ID this feedback belongs to' })
  @IsString()
  gradeId: string;

  @ApiPropertyOptional({ description: 'Question ID for question-specific feedback' })
  @IsOptional()
  @IsString()
  questionId?: string;

  @ApiProperty({ enum: FeedbackCategory, description: 'Category of feedback' })
  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @ApiPropertyOptional({ enum: FeedbackSeverity, description: 'Severity level' })
  @IsOptional()
  @IsEnum(FeedbackSeverity)
  severity?: FeedbackSeverity;

  @ApiProperty({ description: 'Feedback content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Suggested improvement' })
  @IsOptional()
  @IsString()
  suggestion?: string;

  @ApiPropertyOptional({ description: 'Whether this is AI-generated feedback' })
  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @ApiPropertyOptional({ description: 'AI confidence score', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @ApiPropertyOptional({ description: 'Start position for highlighting' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startPosition?: number;

  @ApiPropertyOptional({ description: 'End position for highlighting' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  endPosition?: number;

  @ApiPropertyOptional({ description: 'Text to highlight' })
  @IsOptional()
  @IsString()
  highlightedText?: string;
}

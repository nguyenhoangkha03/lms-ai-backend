import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradeStatus, FeedbackType } from '../entities/grade.entity';

export class CreateGradeDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Assessment ID' })
  @IsString()
  assessmentId: string;

  @ApiProperty({ description: 'Assessment attempt ID' })
  @IsString()
  attemptId: string;

  @ApiProperty({ description: 'Grade score', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  score: number;

  @ApiProperty({ description: 'Maximum possible score', minimum: 1 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  maxScore: number;

  @ApiPropertyOptional({ enum: GradeStatus, description: 'Grade status' })
  @IsOptional()
  @IsEnum(GradeStatus)
  status?: GradeStatus;

  @ApiPropertyOptional({ enum: FeedbackType, description: 'Type of feedback' })
  @IsOptional()
  @IsEnum(FeedbackType)
  feedbackType?: FeedbackType;

  @ApiPropertyOptional({ description: 'Individual question scores as JSON' })
  @IsOptional()
  @IsString()
  questionScores?: string;

  @ApiPropertyOptional({ description: 'Overall feedback for the assessment' })
  @IsOptional()
  @IsString()
  overallFeedback?: string;

  @ApiPropertyOptional({ description: 'Additional comments' })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ description: 'Whether this is AI-graded' })
  @IsOptional()
  @IsBoolean()
  isAiGraded?: boolean;

  @ApiPropertyOptional({ description: 'AI confidence score', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @ApiPropertyOptional({ description: 'Grading rubric as JSON' })
  @IsOptional()
  @IsString()
  gradingRubric?: string;
}

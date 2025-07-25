import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../entities/generated-quiz.entity';

export class GenerateQuizDto {
  @ApiProperty({ description: 'Lesson ID to generate quiz from' })
  @IsString()
  lessonId: string;

  @ApiProperty({ description: 'Quiz title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Quiz description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Number of questions to generate', default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  questionCount?: number = 5;

  @ApiPropertyOptional({
    description: 'Difficulty level',
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficultyLevel?: 'easy' | 'medium' | 'hard' = 'medium';

  @ApiPropertyOptional({
    description: 'Question types to generate',
    enum: QuestionType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(QuestionType, { each: true })
  questionTypes?: QuestionType[];

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Target learning objectives', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLearningObjectives?: string[];

  @ApiPropertyOptional({ description: 'Custom generation prompt' })
  @IsOptional()
  @IsString()
  customPrompt?: string;

  @ApiPropertyOptional({ description: 'Include explanations for answers' })
  @IsOptional()
  @IsBoolean()
  includeExplanations?: boolean = true;
}

export class ReviewGeneratedQuizDto {
  @ApiProperty({ description: 'Quality rating (1-10)' })
  @IsNumber()
  @Min(1)
  @Max(10)
  qualityRating: number;

  @ApiProperty({ description: 'Review feedback' })
  @IsString()
  feedback: string;

  @ApiPropertyOptional({ description: 'Suggested changes', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedChanges?: string[];

  @ApiPropertyOptional({ description: 'Approve or reject the quiz' })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}

export class UpdateGeneratedQuizDto {
  @ApiPropertyOptional({ description: 'Quiz title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Quiz description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Updated questions' })
  @IsOptional()
  questions?: {
    id: string;
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    estimatedTime: number;
    keywords?: string[];
  }[];
}

export class QuizGenerationQueryDto {
  @ApiPropertyOptional({ description: 'Lesson ID filter' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({
    description: 'Status filter',
    enum: ['pending', 'generating', 'completed', 'failed', 'reviewed', 'approved', 'rejected'],
  })
  @IsOptional()
  @IsEnum(['pending', 'generating', 'completed', 'failed', 'reviewed', 'approved', 'rejected'])
  status?: 'pending' | 'generating' | 'completed' | 'failed' | 'reviewed' | 'approved' | 'rejected';

  @ApiPropertyOptional({ description: 'Difficulty level filter', enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficultyLevel?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional({ description: 'Generated by user ID' })
  @IsOptional()
  @IsString()
  generatedBy?: string;

  @ApiPropertyOptional({ description: 'Minimum quality score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  minQualityScore?: number;

  @ApiPropertyOptional({
    description: 'Sort by creation date',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortByDate?: 'asc' | 'desc' = 'desc';
}

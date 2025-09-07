import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsUUID,
  Length,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  AssessmentType,
  GradingMethod,
  DifficultyLevel,
  QuestionType,
  AssessmentStatus,
} from '@/common/enums/assessment.enums';

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text content' })
  @IsString()
  @Length(10, 5000)
  questionText: string;

  @ApiProperty({ description: 'Question type', enum: Object.values(QuestionType) })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiPropertyOptional({ description: 'Question explanation' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  explanation?: string;

  @ApiPropertyOptional({ description: 'Points for correct answer', default: 1.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(100)
  points?: number;

  @ApiPropertyOptional({ description: 'Question difficulty', enum: Object.values(DifficultyLevel) })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Time limit in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(3600)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Hint text' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  hint?: string;

  @ApiPropertyOptional({ description: 'Answer options for multiple choice' })
  @IsOptional()
  @IsArray()
  options?: any[];

  @ApiProperty({ description: 'Correct answer(s)' })
  correctAnswer: any;

  @ApiPropertyOptional({ description: 'Question tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'File attachments' })
  @IsOptional()
  @IsArray()
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Validation rules' })
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateAssessmentDto {
  @ApiProperty({ description: 'Assessment title' })
  @IsString()
  @Length(3, 255)
  title: string;

  @ApiPropertyOptional({ description: 'Assessment description' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({ description: 'Assessment status', enum: Object.values(AssessmentStatus) })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({ description: 'Detailed instructions' })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  instructions?: string;

  @ApiPropertyOptional({ description: 'Assessment type', enum: Object.values(AssessmentType) })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;

  @ApiPropertyOptional({ description: 'Course ID if assessment belongs to course' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Lesson ID if assessment belongs to lesson' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  // Time Configuration
  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(480) // Max 8 hours
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Maximum attempts allowed', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Passing score percentage', default: 70 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  passingScore?: number;

  // Randomization Settings
  @ApiPropertyOptional({ description: 'Randomize question order', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  randomizeQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Randomize answer choices', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  randomizeAnswers?: boolean;

  // Display Settings
  @ApiPropertyOptional({ description: 'Show results immediately', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  showResults?: boolean;

  @ApiPropertyOptional({ description: 'Show correct answers', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  showCorrectAnswers?: boolean;

  // Requirements
  @ApiPropertyOptional({ description: 'Is mandatory assessment', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isMandatory?: boolean;

  @ApiPropertyOptional({ description: 'Requires proctoring', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isProctored?: boolean;

  // Scheduling
  @ApiPropertyOptional({ description: 'Available from date' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'Available until date' })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  // Grading Configuration
  @ApiPropertyOptional({ description: 'Grading method', enum: Object.values(GradingMethod) })
  @IsOptional()
  @IsEnum(GradingMethod)
  gradingMethod?: GradingMethod;

  @ApiPropertyOptional({ description: 'Weight in final grade', default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weight?: number;

  // Questions
  @ApiPropertyOptional({ description: 'Assessment questions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];

  // Advanced Settings
  @ApiPropertyOptional({ description: 'Assessment-specific settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Anti-cheating configuration' })
  @IsOptional()
  @IsObject()
  antiCheatSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

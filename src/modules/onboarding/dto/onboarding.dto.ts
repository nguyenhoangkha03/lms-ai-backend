import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING = 'reading',
}

export enum StudyTimePreference {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
}

export enum DifficultyPreference {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  MIXED = 'mixed',
}

import { QuestionType as BaseQuestionType } from '@/common/enums/assessment.enums';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false', 
  SCALE_RATING = 'scale_rating', // Custom for onboarding
  TEXT_INPUT = 'short_answer', // Map to existing SHORT_ANSWER
}

export class AssessmentResponseDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  answer: string | number | string[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  timeSpent: number;
}

export class AssessmentQuestionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  questionText: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  skillArea: string;
}

export class SkillAssessmentDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ type: [AssessmentQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentQuestionDto)
  questions: AssessmentQuestionDto[];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  timeLimit: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  totalQuestions: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;
}

export class SkillAssessmentSubmissionDto {
  @ApiProperty({ type: [AssessmentResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentResponseDto)
  responses: AssessmentResponseDto[];
}

export class NotificationPreferencesDto {
  @ApiProperty()
  @IsBoolean()
  email: boolean;

  @ApiProperty()
  @IsBoolean()
  push: boolean;

  @ApiProperty()
  @IsBoolean()
  reminders: boolean;

  @ApiProperty()
  @IsBoolean()
  achievements: boolean;
}

export class LearningPreferencesDto {
  @ApiProperty({ enum: LearningStyle })
  @IsEnum(LearningStyle)
  preferredLearningStyle: LearningStyle;

  @ApiProperty({ enum: StudyTimePreference })
  @IsEnum(StudyTimePreference)
  studyTimePreference: StudyTimePreference;

  @ApiProperty()
  @IsNumber()
  @Min(15)
  @Max(180)
  sessionDuration: number;

  @ApiProperty({ enum: DifficultyPreference })
  @IsEnum(DifficultyPreference)
  difficultyPreference: DifficultyPreference;

  @ApiProperty({ type: NotificationPreferencesDto })
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences: NotificationPreferencesDto;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  goals: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  interests: string[];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(168)
  availableHoursPerWeek: number;
}

export class OnboardingStepDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsBoolean()
  isCompleted: boolean;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  stepNumber: number;
}

export class OnboardingProgressDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  currentStep: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  totalSteps: number;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  completedSteps: string[];

  @ApiProperty()
  @IsBoolean()
  skillAssessmentCompleted: boolean;

  @ApiProperty()
  @IsBoolean()
  preferencesSetup: boolean;

  @ApiProperty()
  @IsBoolean()
  learningPathSelected: boolean;

  @ApiProperty()
  @IsBoolean()
  onboardingCompleted: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  completedAt?: string;
}

export class UpdateOnboardingProgressDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  step: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: any;
}

export class LearningPathCourseDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  duration: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty()
  @IsBoolean()
  isRequired: boolean;
}

export class LearningPathDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: DifficultyPreference })
  @IsEnum(DifficultyPreference)
  level: DifficultyPreference;

  @ApiProperty()
  @IsString()
  estimatedDuration: string;

  @ApiProperty({ type: [LearningPathCourseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningPathCourseDto)
  courses: LearningPathCourseDto[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  prerequisites: string[];

  @ApiProperty()
  @IsBoolean()
  isRecommended: boolean;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence: number;
}

export class SelectLearningPathDto {
  @ApiProperty()
  @IsString()
  pathId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customization?: any;
}

export class SkipOnboardingStepDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  step: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssessmentResultDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty()
  @IsString()
  assessmentId: string;

  @ApiProperty({ type: [AssessmentResponseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentResponseDto)
  responses: AssessmentResponseDto[];

  @ApiProperty()
  @IsObject()
  skillScores: Record<string, number>;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty()
  @IsString()
  completedAt: string;
}
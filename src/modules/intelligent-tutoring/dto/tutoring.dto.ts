import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TutoringMode,
  SessionStatus,
  InteractionType,
  ResponseType,
  LearningStyleType,
  ContentType,
  DifficultyLevel,
  HintType,
  QuestionAnsweringType,
  TutoringStrategy,
} from '@/common/enums/tutoring.enums';

export class SessionGoalsDto {
  @ApiProperty({
    enum: ['mastery', 'practice', 'review', 'exploration'],
    description: 'Type of learning goal',
  })
  @IsEnum(['mastery', 'practice', 'review', 'exploration'])
  type: 'mastery' | 'practice' | 'review' | 'exploration';

  @ApiProperty({ type: [String], description: 'Topics to focus on' })
  @IsArray()
  @IsString({ each: true })
  topics: string[];

  @ApiPropertyOptional({ description: 'Target accuracy percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  targetAccuracy?: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit?: number;
}

// ==================== SESSION MANAGEMENT ====================
export class CreateTutoringSessionDto {
  @ApiProperty({ description: 'Course ID for the tutoring session' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ description: 'Lesson ID for the tutoring session' })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiProperty({ enum: TutoringMode, description: 'Tutoring mode' })
  @IsEnum(TutoringMode)
  mode: TutoringMode;

  @ApiPropertyOptional({ description: 'Session goals and objectives' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionGoalsDto)
  sessionGoals?: SessionGoalsDto;

  @ApiPropertyOptional({ description: 'Initial difficulty level' })
  @IsOptional()
  @IsString()
  initialDifficultyLevel?: string;
}

export class UpdateTutoringSessionDto {
  @ApiPropertyOptional({ enum: SessionStatus, description: 'Session status' })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Completion percentage', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercentage?: number;

  @ApiPropertyOptional({ description: 'Session summary' })
  @IsOptional()
  @IsString()
  sessionSummary?: string;
}

// ==================== QUESTION ANSWERING ====================
export class AskQuestionDto {
  @ApiProperty({ description: "The user's question" })
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({ description: 'Session ID for context' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ enum: QuestionAnsweringType, description: 'Type of question' })
  @IsOptional()
  @IsEnum(QuestionAnsweringType)
  questionType?: QuestionAnsweringType;

  @ApiPropertyOptional({ description: 'Additional context for the question' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Current topic being studied' })
  @IsOptional()
  @IsString()
  currentTopic?: string;
}

export class QuestionAnswerResponseDto {
  @ApiProperty({ description: "The AI's response" })
  answer: string;

  @ApiProperty({ enum: ResponseType, description: 'Type of response provided' })
  responseType: ResponseType;

  @ApiProperty({ description: 'Confidence score of the answer', minimum: 0, maximum: 1 })
  confidenceScore: number;

  @ApiPropertyOptional({ type: [String], description: 'Related concepts' })
  relatedConcepts?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Follow-up questions suggested' })
  followUpQuestions?: string[];

  @ApiPropertyOptional({
    description: 'Estimated difficulty of the question',
    minimum: 1,
    maximum: 10,
  })
  estimatedDifficulty?: number;

  @ApiPropertyOptional({ description: 'Learning objectives addressed' })
  learningObjectives?: string[];
}

// ==================== LEARNING PATH ====================
export class GeneratePersonalizedPathDto {
  @ApiProperty({ description: 'Course ID for the learning path' })
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({ type: [String], description: 'Learning goals' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningGoals?: string[];

  @ApiPropertyOptional({ description: 'Preferred daily study time in minutes' })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  dailyStudyTime?: number;

  @ApiPropertyOptional({ description: 'Target completion date' })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  targetCompletionDate?: Date;

  @ApiPropertyOptional({ enum: DifficultyLevel, description: 'Preferred difficulty level' })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  preferredDifficulty?: DifficultyLevel;
}

export class LearningPathNodeDto {
  @ApiProperty({ description: 'Node ID' })
  id: string;

  @ApiProperty({ enum: ['lesson', 'quiz', 'project', 'review'], description: 'Node type' })
  type: 'lesson' | 'quiz' | 'project' | 'review';

  @ApiProperty({ description: 'Node title' })
  title: string;

  @ApiProperty({ type: [String], description: 'Prerequisites' })
  prerequisites: string[];

  @ApiProperty({ description: 'Estimated duration in minutes' })
  estimatedDuration: number;

  @ApiProperty({ enum: DifficultyLevel, description: 'Difficulty level' })
  difficultyLevel: DifficultyLevel;

  @ApiProperty({ type: [String], description: 'Skills to be learned' })
  skills: string[];

  @ApiProperty({ description: 'Order in the path' })
  order: number;

  @ApiProperty({ description: 'Whether this node is optional' })
  isOptional: boolean;
}

export class PersonalizedLearningPathDto {
  @ApiProperty({ description: 'Learning path ID' })
  id: string;

  @ApiProperty({ description: 'Total estimated duration in hours' })
  totalDuration: number;

  @ApiProperty({ description: 'Number of learning nodes' })
  nodeCount: number;

  @ApiProperty({ type: [LearningPathNodeDto], description: 'Learning path nodes' })
  nodes: LearningPathNodeDto[];

  @ApiProperty({ description: 'Adaptation rules applied' })
  adaptationRules: string[];

  @ApiProperty({ description: 'Estimated completion date' })
  estimatedCompletion: Date;

  @ApiProperty({ type: [String], description: 'Focus areas' })
  focusAreas: string[];
}

// ==================== ADAPTIVE CONTENT ====================
export class RequestAdaptiveContentDto {
  @ApiProperty({ description: 'Session ID for context' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ enum: ContentType, description: 'Type of content requested' })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({ description: 'Current topic' })
  @IsString()
  currentTopic: string;

  @ApiPropertyOptional({ enum: DifficultyLevel, description: 'Preferred difficulty' })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  preferredDifficulty?: DifficultyLevel;

  @ApiPropertyOptional({ description: 'Performance on recent content (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  recentPerformance?: number;
}

export class AdaptiveContentResponseDto {
  @ApiProperty({ description: 'Content ID' })
  id: string;

  @ApiProperty({ description: 'Content title' })
  title: string;

  @ApiProperty({ description: 'Content body' })
  content: string;

  @ApiProperty({ enum: ContentType, description: 'Content type' })
  contentType: ContentType;

  @ApiProperty({ enum: DifficultyLevel, description: 'Difficulty level' })
  difficultyLevel: DifficultyLevel;

  @ApiProperty({ description: 'Estimated duration in minutes' })
  estimatedDuration: number;

  @ApiProperty({ type: [String], description: 'Target learning styles' })
  targetLearningStyles: LearningStyleType[];

  @ApiPropertyOptional({ description: 'Media assets' })
  mediaAssets?: {
    images?: string[];
    videos?: string[];
    audio?: string[];
    documents?: string[];
  };

  @ApiPropertyOptional({ description: 'Interactive elements' })
  interactiveElements?: {
    hasQuiz?: boolean;
    hasSimulation?: boolean;
    hasCodeEditor?: boolean;
    hasDragDrop?: boolean;
  };

  @ApiProperty({ description: 'Adaptation reasoning' })
  adaptationReasoning: string;
}

// ==================== LEARNING STYLE RECOGNITION ====================
export class AnalyzeLearningStyleDto {
  @ApiProperty({ description: 'Session ID for analysis' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Minimum interactions for analysis' })
  @IsOptional()
  @IsInt()
  @Min(5)
  minimumInteractions?: number;

  @ApiPropertyOptional({ description: 'Force re-analysis even if recent profile exists' })
  @IsOptional()
  @IsBoolean()
  forceReanalysis?: boolean;
}

export class LearningStyleAnalysisDto {
  @ApiProperty({ enum: LearningStyleType, description: 'Primary learning style' })
  primaryLearningStyle: LearningStyleType;

  @ApiPropertyOptional({ enum: LearningStyleType, description: 'Secondary learning style' })
  secondaryLearningStyle?: LearningStyleType;

  @ApiProperty({ description: 'Style scores breakdown' })
  styleScores: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    readingWriting: number;
  };

  @ApiProperty({ description: 'Confidence level in analysis (0-100)' })
  confidenceLevel: number;

  @ApiProperty({ description: 'Number of interactions analyzed' })
  interactionsAnalyzed: number;

  @ApiProperty({ description: 'Learning preferences identified' })
  learningPreferences: {
    pacePreference: 'slow' | 'moderate' | 'fast';
    depthPreference: 'surface' | 'strategic' | 'deep';
    feedbackFrequency: 'immediate' | 'periodic' | 'minimal';
    challengeLevel: 'low' | 'moderate' | 'high';
    collaborationPreference: 'individual' | 'small_group' | 'large_group';
  };

  @ApiPropertyOptional({ description: 'Cognitive traits identified' })
  cognitiveTraits?: {
    processingSpeed: number;
    workingMemoryCapacity: number;
    attentionSpan: number;
    abstractReasoning: number;
    patternRecognition: number;
  };

  @ApiProperty({ description: 'Recommended adaptations' })
  recommendedAdaptations: string[];
}

// ==================== HINT GENERATION ====================
export class RequestHintDto {
  @ApiProperty({ description: 'Session ID for context' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Current question or problem' })
  @IsString()
  currentProblem: string;

  @ApiPropertyOptional({ enum: HintType, description: 'Type of hint requested' })
  @IsOptional()
  @IsEnum(HintType)
  hintType?: HintType;

  @ApiPropertyOptional({ description: 'Hint level (1-5, increasing specificity)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  hintLevel?: number;

  @ApiPropertyOptional({ description: "User's current attempt or approach" })
  @IsOptional()
  @IsString()
  userAttempt?: string;

  @ApiPropertyOptional({ description: 'What the user is struggling with' })
  @IsOptional()
  @IsString()
  struggleArea?: string;
}

export class HintResponseDto {
  @ApiProperty({ description: 'The generated hint' })
  hintContent: string;

  @ApiProperty({ enum: HintType, description: 'Type of hint provided' })
  hintType: HintType;

  @ApiProperty({ description: 'Hint level (1-5)' })
  hintLevel: number;

  @ApiProperty({ description: 'Relevance score (0-100)' })
  relevanceScore: number;

  @ApiPropertyOptional({ description: 'Next hint level available' })
  nextHintLevel?: number;

  @ApiPropertyOptional({ description: 'Estimated help effectiveness' })
  estimatedEffectiveness?: number;

  @ApiProperty({ description: 'Context analysis that led to this hint' })
  contextAnalysis: {
    userStrugglePoints: string[];
    conceptDifficulty: number;
    priorKnowledge: string[];
    similarMistakes: string[];
  };

  @ApiPropertyOptional({ type: [String], description: 'Alternative approaches suggested' })
  alternativeApproaches?: string[];
}

// ==================== INTERACTION TRACKING ====================
export class CreateInteractionDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ enum: InteractionType, description: 'Type of interaction' })
  @IsEnum(InteractionType)
  interactionType: InteractionType;

  @ApiProperty({ description: 'User input or action' })
  @IsString()
  userInput: string;

  @ApiPropertyOptional({ description: 'Response time in milliseconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  responseTime?: number;

  @ApiPropertyOptional({ description: 'Topic being covered' })
  @IsOptional()
  @IsString()
  topicCovered?: string;

  @ApiPropertyOptional({ description: 'Current difficulty level' })
  @IsOptional()
  @IsString()
  difficultyLevel?: string;

  @ApiPropertyOptional({ description: 'Additional context data' })
  @IsOptional()
  contextData?: {
    questionId?: string;
    conceptTags?: string[];
    prerequisitesCovered?: boolean;
    userStrugglePoints?: string[];
  };
}

export class InteractionResponseDto {
  @ApiProperty({ description: 'AI response to the interaction' })
  aiResponse: string;

  @ApiProperty({ enum: ResponseType, description: 'Type of response' })
  responseType: ResponseType;

  @ApiProperty({ description: 'Confidence score (0-100)' })
  confidenceScore: number;

  @ApiPropertyOptional({ description: 'Adaptation triggers identified' })
  adaptationTriggers?: {
    difficultyAdjustment?: 'increase' | 'decrease' | 'maintain';
    hintGenerated?: boolean;
    pathRedirection?: boolean;
    conceptReinforcement?: boolean;
  };

  @ApiPropertyOptional({ description: 'Follow-up suggestions' })
  followUpSuggestions?: string[];

  @ApiProperty({ description: 'Learning progress update' })
  progressUpdate: {
    conceptMastery: Record<string, number>;
    skillDevelopment: Record<string, number>;
    engagementLevel: number;
  };
}

// ==================== TUTORING STRATEGY ====================
export class PerformanceMetricsDto {
  @ApiProperty({ description: 'Average response time in milliseconds' })
  @IsNumber()
  averageResponseTime: number;

  @ApiProperty({ description: 'Accuracy rate (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracyRate: number;

  @ApiProperty({ description: 'Engagement score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  engagementScore: number;

  @ApiProperty({ description: 'Concept mastery scores' })
  conceptMastery: Record<string, number>;
}

export class AdaptTutoringStrategyDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Current performance metrics' })
  @ValidateNested()
  @Type(() => PerformanceMetricsDto)
  performanceMetrics: PerformanceMetricsDto;

  @ApiPropertyOptional({ enum: TutoringStrategy, description: 'Preferred tutoring strategy' })
  @IsOptional()
  @IsEnum(TutoringStrategy)
  preferredStrategy?: TutoringStrategy;

  @ApiPropertyOptional({ description: 'Specific learning objectives' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];
}

export class TutoringStrategyResponseDto {
  @ApiProperty({ enum: TutoringStrategy, description: 'Recommended tutoring strategy' })
  recommendedStrategy: TutoringStrategy;

  @ApiProperty({ description: 'Rationale for the strategy choice' })
  strategyRationale: string;

  @ApiProperty({ description: 'Specific adaptations to apply' })
  adaptations: string[];

  @ApiProperty({ description: 'Expected outcomes' })
  expectedOutcomes: string[];

  @ApiProperty({ description: 'Success metrics to track' })
  successMetrics: string[];

  @ApiPropertyOptional({ description: 'Alternative strategies to consider' })
  alternativeStrategies?: TutoringStrategy[];
}

// ==================== RESPONSE WRAPPERS ====================
export class TutoringSessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiPropertyOptional({ description: 'Lesson ID' })
  lessonId?: string;

  @ApiProperty({ enum: TutoringMode, description: 'Tutoring mode' })
  mode: TutoringMode;

  @ApiProperty({ enum: SessionStatus, description: 'Session status' })
  status: SessionStatus;

  @ApiProperty({ description: 'Session start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Session end time' })
  endedAt?: Date;

  @ApiProperty({ description: 'Total duration in seconds' })
  totalDuration: number;

  @ApiProperty({ description: 'Questions asked' })
  questionsAsked: number;

  @ApiProperty({ description: 'Hints provided' })
  hintsProvided: number;

  @ApiProperty({ description: 'Completion percentage' })
  completionPercentage: number;

  @ApiPropertyOptional({ enum: LearningStyleType, description: 'Detected learning style' })
  detectedLearningStyle?: LearningStyleType;

  @ApiProperty({ description: 'Current difficulty level' })
  currentDifficultyLevel: string;

  @ApiPropertyOptional({ description: 'Session summary' })
  sessionSummary?: string;
}

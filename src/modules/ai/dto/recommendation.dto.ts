import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationType, RecommendationStatus, Priority } from '@/common/enums/ai.enums';

export class CreateRecommendationDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ enum: RecommendationType, description: 'Type of recommendation' })
  @IsEnum(RecommendationType)
  recommendationType: RecommendationType;

  @ApiPropertyOptional({ description: 'Related content ID' })
  @IsOptional()
  @IsString()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Content type' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiProperty({ description: 'Recommendation title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'AI reasoning' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Confidence score (0.0 - 1.0)', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional({ enum: Priority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetRecommendationsDto {
  @ApiPropertyOptional({ enum: RecommendationType, description: 'Filter by recommendation type' })
  @IsOptional()
  @IsEnum(RecommendationType)
  type?: RecommendationType;

  @ApiPropertyOptional({ enum: RecommendationStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ enum: Priority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Number of results to skip', minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Include expired recommendations', default: false })
  @IsOptional()
  @IsBoolean()
  includeExpired?: boolean = false;
}

export class RecommendationInteractionDto {
  @ApiProperty({
    description: 'Type of interaction',
    enum: ['viewed', 'clicked', 'accepted', 'dismissed', 'completed'],
  })
  @IsString()
  interactionType: string;

  @ApiPropertyOptional({ description: 'Additional interaction data' })
  @IsOptional()
  @IsObject()
  interactionData?: Record<string, any>;
}

export class RecommendationFeedbackDto {
  @ApiProperty({ description: 'User rating (1.0 - 5.0)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'User feedback comments' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'Whether recommendation was helpful' })
  @IsOptional()
  @IsBoolean()
  wasHelpful?: boolean;
}

export class LearningPathRequestDto {
  @ApiPropertyOptional({ description: 'Specific subject/category to focus on' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Preferred difficulty level' })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced', 'adaptive'])
  difficultyLevel?: string;

  @ApiPropertyOptional({ description: 'Target completion time in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  targetDays?: number;

  @ApiPropertyOptional({ description: 'Learning goals' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningGoals?: string[];

  @ApiPropertyOptional({ description: 'Available time per day in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  dailyTimeAvailable?: number;
}

export class ContentRecommendationRequestDto {
  @ApiPropertyOptional({ description: 'Content type to recommend' })
  @IsOptional()
  @IsEnum(['course', 'lesson', 'assessment', 'all'])
  contentType?: string;

  @ApiPropertyOptional({ description: 'Maximum number of recommendations' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Exclude already seen content' })
  @IsOptional()
  @IsBoolean()
  excludeSeen?: boolean = true;

  @ApiPropertyOptional({ description: 'Preferred categories' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCategories?: string[];

  @ApiPropertyOptional({ description: 'Difficulty preferences' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  difficultyLevels?: string[];
}

export class DifficultyAdjustmentRequestDto {
  @ApiPropertyOptional({ description: 'Course ID to analyze' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Subject area to analyze' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Minimum performance threshold for adjustment' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  performanceThreshold?: number = 70;
}

export class StudyScheduleRequestDto {
  @ApiPropertyOptional({ description: 'Preferred study times' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredTimes?: string[];

  @ApiPropertyOptional({ description: 'Available days of week' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[];

  @ApiPropertyOptional({ description: 'Maximum session duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(240)
  maxSessionDuration?: number;

  @ApiPropertyOptional({ description: 'Study intensity preference' })
  @IsOptional()
  @IsEnum(['light', 'moderate', 'intensive'])
  intensity?: string;

  @ApiPropertyOptional({ description: 'Goals to achieve' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];
}

export class PerformanceImprovementRequestDto {
  @ApiPropertyOptional({ description: 'Specific areas to analyze' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({ description: 'Time period for analysis in days' })
  @IsOptional()
  @IsNumber()
  @Min(7)
  @Max(90)
  analysisPeriod?: number = 30;

  @ApiPropertyOptional({ description: 'Include peer comparison' })
  @IsOptional()
  @IsBoolean()
  includePeerComparison?: boolean = true;

  @ApiPropertyOptional({ description: 'Target improvement percentage' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  targetImprovement?: number;
}

export class RecommendationAnalyticsDto {
  @ApiProperty({ description: 'Total recommendations generated' })
  totalRecommendations: number;

  @ApiProperty({ description: 'Recommendations by type' })
  byType: Record<string, number>;

  @ApiProperty({ description: 'Recommendations by status' })
  byStatus: Record<string, number>;

  @ApiProperty({ description: 'Recommendations by priority' })
  byPriority: Record<string, number>;

  @ApiProperty({ description: 'Average confidence score' })
  avgConfidenceScore: number;

  @ApiProperty({ description: 'Interaction rates' })
  interactionRates: {
    viewRate: number;
    acceptanceRate: number;
    dismissalRate: number;
    completionRate: number;
  };

  @ApiProperty({ description: 'Effectiveness metrics' })
  effectiveness: {
    avgUserRating: number;
    helpfulPercentage: number;
    timeToAction: number;
  };
}

export class BulkRecommendationRequestDto {
  @ApiProperty({ description: 'User IDs to generate recommendations for' })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiPropertyOptional({ description: 'Types of recommendations to generate' })
  @IsOptional()
  @IsArray()
  @IsEnum(RecommendationType, { each: true })
  types?: RecommendationType[];

  @ApiPropertyOptional({ description: 'Force regeneration of existing recommendations' })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean = false;

  @ApiPropertyOptional({ description: 'Run in background (async)' })
  @IsOptional()
  @IsBoolean()
  async?: boolean = true;
}

export class RecommendationConfigDto {
  @ApiProperty({ description: 'Algorithm weights for different recommendation types' })
  @IsObject()
  algorithmWeights: {
    contentBased: number;
    collaborativeFiltering: number;
    knowledgeBased: number;
    demographic: number;
  };

  @ApiProperty({ description: 'Minimum confidence threshold' })
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidenceThreshold: number;

  @ApiProperty({ description: 'Maximum recommendations per user per day' })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxRecommendationsPerDay: number;

  @ApiProperty({ description: 'Recommendation expiry settings' })
  @IsObject()
  expirySettings: {
    defaultExpiryHours: number;
    typeSpecificExpiry: Record<string, number>;
  };

  @ApiProperty({ description: 'A/B testing configuration' })
  @IsOptional()
  @IsObject()
  abTestConfig?: {
    enabled: boolean;
    testGroups: string[];
    trafficSplit: number[];
  };
}

export class RecommendationResponseDto {
  @ApiProperty({ description: 'Recommendation ID' })
  id: string;

  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiProperty({ enum: RecommendationType, description: 'Recommendation type' })
  recommendationType: RecommendationType;

  @ApiPropertyOptional({ description: 'Related content ID' })
  contentId?: string;

  @ApiPropertyOptional({ description: 'Content type' })
  contentType?: string;

  @ApiProperty({ description: 'Recommendation title' })
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  description: string;

  @ApiProperty({ description: 'AI reasoning' })
  reason: string;

  @ApiProperty({ description: 'Confidence score' })
  confidenceScore: number;

  @ApiProperty({ enum: Priority, description: 'Priority level' })
  priority: Priority;

  @ApiProperty({ enum: RecommendationStatus, description: 'Current status' })
  status: RecommendationStatus;

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Interaction timestamp' })
  interactedAt?: Date;

  @ApiPropertyOptional({ description: 'Interaction type' })
  interactionType?: string;

  @ApiPropertyOptional({ description: 'User rating' })
  userRating?: number;

  @ApiPropertyOptional({ description: 'User feedback' })
  userFeedback?: string;

  @ApiProperty({ description: 'Whether recommendation was effective' })
  wasEffective: boolean;

  @ApiProperty({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Model information' })
  modelInfo?: Record<string, any>;

  @ApiProperty({ description: 'User context' })
  userContext?: Record<string, any>;

  @ApiProperty({ description: 'Expected outcomes' })
  expectedOutcomes?: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class LearningPathResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Generated learning path' })
  learningPath: RecommendationResponseDto[];

  @ApiProperty({ description: 'Path metadata' })
  pathMetadata: {
    totalEstimatedTime: number;
    difficultyProgression: string[];
    prerequisites: string[];
    learningObjectives: string[];
    milestones: string[];
  };

  @ApiProperty({ description: 'Personalization factors' })
  personalizationFactors: {
    learningStyle: string;
    pace: string;
    preferredTimes: string[];
    strongSubjects: string[];
    weakSubjects: string[];
    engagementScore: number;
  };

  @ApiProperty({ description: 'Path generation timestamp' })
  generatedAt: Date;

  @ApiProperty({ description: 'Path expiry timestamp' })
  expiresAt: Date;
}

export class ContentRecommendationResponseDto {
  @ApiProperty({ description: 'Recommended content items' })
  recommendations: RecommendationResponseDto[];

  @ApiProperty({ description: 'Algorithm information' })
  algorithmInfo: {
    primaryAlgorithm: string;
    algorithmsUsed: string[];
    totalCandidates: number;
    filteredCandidates: number;
    rankingFactors: string[];
  };

  @ApiProperty({ description: 'Content statistics' })
  contentStats: {
    courseRecommendations: number;
    lessonRecommendations: number;
    assessmentRecommendations: number;
    avgConfidenceScore: number;
    avgDifficultyLevel: number;
  };

  @ApiProperty({ description: 'User preferences applied' })
  appliedPreferences: {
    contentTypes: string[];
    categories: string[];
    difficultyLevels: string[];
    excludedContent: string[];
  };
}

export class DifficultyAdjustmentResponseDto {
  @ApiProperty({ description: 'Difficulty adjustment recommendations' })
  adjustments: RecommendationResponseDto[];

  @ApiProperty({ description: 'Performance analysis' })
  performanceAnalysis: {
    overallScore: number;
    subjectScores: Record<string, number>;
    strugglingAreas: string[];
    excellentAreas: string[];
    recommendedAdjustments: {
      increase: string[];
      decrease: string[];
      maintain: string[];
    };
  };

  @ApiProperty({ description: 'Learning velocity analysis' })
  learningVelocity: {
    currentPace: string;
    optimalPace: string;
    paceAdjustmentNeeded: boolean;
    timeEfficiencyScore: number;
  };
}

export class StudyScheduleResponseDto {
  @ApiProperty({ description: 'Schedule optimization recommendations' })
  scheduleRecommendations: RecommendationResponseDto[];

  @ApiProperty({ description: 'Optimized schedule' })
  optimizedSchedule: {
    dailySchedule: Record<
      string,
      {
        timeSlots: { start: string; end: string; activity: string }[];
        totalStudyTime: number;
        breakTimes: string[];
      }
    >;
    weeklyGoals: string[];
    monthlyMilestones: string[];
  };

  @ApiProperty({ description: 'Schedule analysis' })
  scheduleAnalysis: {
    currentEfficiency: number;
    projectedImprovement: number;
    consistencyScore: number;
    balanceScore: number;
    recommendations: string[];
  };

  @ApiProperty({ description: 'Personalization applied' })
  personalization: {
    chronotype: string;
    preferredSessionLength: number;
    optimalBreakFrequency: number;
    productiveTimes: string[];
    learningStyle: string;
  };
}

export class PerformanceImprovementResponseDto {
  @ApiProperty({ description: 'Performance improvement recommendations' })
  improvements: RecommendationResponseDto[];

  @ApiProperty({ description: 'Skill gap analysis' })
  skillGapAnalysis: {
    identifiedGaps: {
      skillName: string;
      currentLevel: string;
      targetLevel: string;
      importance: string;
      estimatedTimeToImprove: number;
    }[];
    improvementPriority: string[];
    strengthsToLeverage: string[];
  };

  @ApiProperty({ description: 'Performance trends' })
  performanceTrends: {
    overallTrend: string;
    subjectTrends: Record<string, string>;
    improvementAreas: string[];
    declineAreas: string[];
    stabilityScore: number;
  };

  @ApiProperty({ description: 'Peer comparison' })
  peerComparison?: {
    percentileRank: number;
    similarLearnerAverage: number;
    topPerformerGap: number;
    improvementSuggestions: string[];
  };

  @ApiProperty({ description: 'Action plan' })
  actionPlan: {
    shortTermGoals: string[];
    mediumTermGoals: string[];
    longTermGoals: string[];
    recommendedResources: string[];
    timeline: string;
  };
}

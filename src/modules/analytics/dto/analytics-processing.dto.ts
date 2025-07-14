// src/modules/analytics/dto/analytics-processing.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LearningPatternType } from '@/common/enums/analytics.enums';

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'Start date for analytics query' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date for analytics query' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Specific course ID to filter by' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Array of student IDs to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];

  @ApiPropertyOptional({
    description: 'Data granularity',
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily',
  })
  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'])
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Include detailed breakdowns', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeBreakdowns?: boolean;

  @ApiPropertyOptional({ description: 'Include comparative data', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeComparative?: boolean;
}

export class AnalyticsAggregationDto {
  @ApiProperty({ description: 'Time period for aggregation' })
  period: {
    startDate: string;
    endDate: string;
  };

  @ApiPropertyOptional({ description: 'Course ID if filtered' })
  courseId?: string;

  @ApiProperty({ description: 'Number of unique students' })
  studentCount: number;

  @ApiProperty({ description: 'Total number of activities' })
  totalActivities: number;

  @ApiProperty({ description: 'Total number of sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Aggregated metrics summary' })
  aggregatedMetrics: {
    totalStudents: number;
    totalTimeSpent: number;
    totalActivities: number;
    averageEngagement: number;
    completionRate: number;
    performanceDistribution: Record<string, number>;
  };

  @ApiProperty({ description: 'Performance trends over time' })
  performanceTrends: Array<{
    date: string;
    engagement: number;
    performance: number;
    timeSpent: number;
    activitiesCount: number;
  }>;

  @ApiProperty({ description: 'Engagement patterns analysis' })
  engagementPatterns: {
    hourlyDistribution: Record<number, number>;
    deviceUsage: Record<string, number>;
    peakHours: number[];
    averageSessionDuration: number;
  };

  @ApiProperty({ description: 'Overall statistics' })
  overallStats: {
    averageCompletionTime?: number;
    retentionRate?: number;
    dropoutRate?: number;
    satisfactionScore?: number;
  };

  @ApiProperty({ description: 'When the aggregation was generated' })
  generatedAt: Date;
}

export class PerformanceTrendDto {
  @ApiProperty({ description: 'Analysis period' })
  period: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({ description: 'Data granularity used' })
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Course ID if filtered' })
  courseId?: string;

  @ApiProperty({ description: 'Number of students analyzed' })
  studentCount: number;

  @ApiProperty({ description: 'Engagement trend data' })
  engagementTrend: Array<{
    date: string;
    value: number;
    change?: number;
    changePercent?: number;
  }>;

  @ApiProperty({ description: 'Performance trend data' })
  performanceTrend: Array<{
    date: string;
    value: number;
    change?: number;
    changePercent?: number;
  }>;

  @ApiProperty({ description: 'Time spent trend data' })
  timeSpentTrend: Array<{
    date: string;
    value: number;
    change?: number;
    changePercent?: number;
  }>;

  @ApiProperty({ description: 'Identified patterns in trends' })
  patterns: Array<{
    type: 'increasing' | 'decreasing' | 'stable' | 'cyclical' | 'volatile';
    metric: 'engagement' | 'performance' | 'timeSpent';
    confidence: number;
    description: string;
    duration: number; // days
  }>;

  @ApiProperty({ description: 'Detected anomalies' })
  anomalies: Array<{
    date: string;
    metric: string;
    expectedValue: number;
    actualValue: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;

  @ApiProperty({ description: 'Generated insights' })
  insights: string[];

  @ApiProperty({ description: 'When the analysis was generated' })
  generatedAt: Date;
}

export class PeerComparisonDto {
  @ApiProperty({ description: 'Student ID being compared' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID if comparison is course-specific' })
  courseId?: string;

  @ApiProperty({ description: 'Time frame for comparison in days' })
  timeFrame: number;

  @ApiProperty({ description: "Student's metrics" })
  studentMetrics: {
    engagementScore: number;
    averageScore: number;
    timeSpent: number;
    completionRate: number;
    activitiesCount: number;
    consistencyScore: number;
  };

  @ApiProperty({ description: 'Peer group metrics' })
  peerMetrics: {
    averageEngagement: number;
    averageScore: number;
    averageTimeSpent: number;
    averageCompletionRate: number;
    averageActivitiesCount: number;
    averageConsistencyScore: number;
    totalPeers: number;
  };

  @ApiProperty({ description: 'Comparison results' })
  comparison: {
    engagementRank: number;
    engagementPercentile: number;
    performanceRank: number;
    performancePercentile: number;
    timeSpentRank: number;
    timeSpentPercentile: number;
    overallRank: number;
    overallPercentile: number;
    strengths: string[];
    improvements: string[];
  };

  @ApiProperty({ description: 'Similar students for comparison' })
  similarStudents: Array<{
    studentId: string;
    similarityScore: number;
    sharedCharacteristics: string[];
  }>;

  @ApiProperty({ description: 'Generated insights from comparison' })
  insights: string[];

  @ApiProperty({ description: 'Recommendations based on peer performance' })
  recommendations: string[];

  @ApiProperty({ description: 'When the comparison was generated' })
  generatedAt: Date;
}

export class LearningPatternDto {
  @ApiProperty({ description: 'Student ID being analyzed' })
  studentId: string;

  @ApiProperty({ description: 'Time frame for pattern analysis in days' })
  timeFrame: number;

  @ApiProperty({ description: 'Dominant learning pattern identified', enum: LearningPatternType })
  dominantPattern: LearningPatternType;

  @ApiProperty({ description: 'Temporal patterns analysis' })
  temporalPatterns: {
    studyTimePreference: 'morning' | 'afternoon' | 'evening' | 'night' | 'mixed';
    peakHours: number[];
    studyFrequency: 'daily' | 'regular' | 'irregular' | 'binge';
    sessionDurationPreference: 'short' | 'medium' | 'long' | 'mixed';
    weeklyDistribution: Record<string, number>; // day of week -> activity count
  };

  @ApiProperty({ description: 'Behavioral patterns analysis' })
  behavioralPatterns: {
    contentTypePreference: Record<string, number>; // video, text, quiz, etc.
    interactionStyle: 'passive' | 'active' | 'mixed';
    helpSeekingBehavior: 'frequent' | 'moderate' | 'rare';
    socialLearningTendency: 'collaborative' | 'independent' | 'mixed';
    riskTaking: 'conservative' | 'moderate' | 'adventurous';
  };

  @ApiProperty({ description: 'Performance patterns analysis' })
  performancePatterns: {
    improvementTrend: 'improving' | 'stable' | 'declining';
    consistencyLevel: 'high' | 'medium' | 'low';
    challengeResponse: 'thrives' | 'adapts' | 'struggles';
    masterySpeed: 'fast' | 'average' | 'slow';
    retentionRate: number;
  };

  @ApiProperty({ description: 'Engagement patterns analysis' })
  engagementPatterns: {
    focusLevel: 'high' | 'medium' | 'low';
    persistenceLevel: 'high' | 'medium' | 'low';
    motivationTrend: 'increasing' | 'stable' | 'decreasing';
    distractionTendency: 'low' | 'medium' | 'high';
    feedbackResponsiveness: 'high' | 'medium' | 'low';
  };

  @ApiProperty({ description: 'Confidence score for pattern identification' })
  confidenceScore: number;

  @ApiProperty({ description: 'Generated insights from pattern analysis' })
  insights: string[];

  @ApiProperty({ description: 'Recommendations based on identified patterns' })
  recommendations: string[];

  @ApiProperty({ description: 'When the pattern analysis was generated' })
  generatedAt: Date;
}

export class DropoutPredictionDto {
  @ApiProperty({ description: 'Student ID' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID if prediction is course-specific' })
  courseId?: string;

  @ApiProperty({ description: 'Risk score from 0-100' })
  @Min(0)
  @Max(100)
  riskScore: number;

  @ApiProperty({
    description: 'Risk level categorization',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ description: 'Contributing risk factors' })
  factors: Array<{
    factor: string;
    weight: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;

  @ApiProperty({ description: 'Protective factors (reducing risk)' })
  protectiveFactors?: Array<{
    factor: string;
    strength: number;
    description: string;
  }>;

  @ApiProperty({ description: 'Predictive indicators' })
  indicators?: {
    engagementDecline: boolean;
    performanceDecline: boolean;
    attendanceIssues: boolean;
    socialIsolation: boolean;
    technologicalDifficulties: boolean;
    motivationalIssues: boolean;
    timeManagementProblems: boolean;
  };

  @ApiProperty({ description: 'Intervention recommendations' })
  recommendations: Array<{
    type: 'immediate' | 'short-term' | 'long-term';
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    expectedImpact: number;
  }>;

  @ApiProperty({ description: 'Model confidence in prediction' })
  confidence: number;

  @ApiProperty({ description: 'Predicted timeline if no intervention' })
  timeline?: {
    riskIncrease30Days: number;
    riskIncrease60Days: number;
    riskIncrease90Days: number;
    criticalPoint?: string; // date when risk becomes critical
  };

  @ApiProperty({ description: 'Historical comparison' })
  historicalComparison?: {
    similarCasesCount: number;
    successfulInterventionRate: number;
    averageRecoveryTime: number; // days
  };

  @ApiProperty({ description: 'When the prediction was generated' })
  generatedAt: Date;
}

export class ComparativeAnalyticsDto {
  @ApiProperty({ description: 'Comparison type' })
  comparisonType: 'student-to-peers' | 'course-to-course' | 'time-period' | 'cohort-analysis';

  @ApiProperty({ description: 'Primary entity being compared' })
  primaryEntity: {
    id: string;
    type: 'student' | 'course' | 'cohort';
    name?: string;
  };

  @ApiProperty({ description: 'Comparison baseline' })
  baseline: {
    id?: string;
    type: 'average' | 'top-quartile' | 'specific-entity' | 'historical';
    name?: string;
  };

  @ApiProperty({ description: 'Metrics comparison' })
  metricsComparison: Array<{
    metric: string;
    primaryValue: number;
    baselineValue: number;
    difference: number;
    percentageDifference: number;
    significance: 'significant' | 'moderate' | 'minimal';
    trend: 'improving' | 'stable' | 'declining';
  }>;

  @ApiProperty({ description: 'Performance ranking' })
  ranking: {
    overall: number;
    byMetric: Record<string, number>;
    percentile: number;
    tier: 'top' | 'high' | 'medium' | 'low' | 'bottom';
  };

  @ApiProperty({ description: 'Strengths and improvement areas' })
  analysis: {
    strengths: string[];
    improvements: string[];
    opportunities: string[];
    risks: string[];
  };

  @ApiProperty({ description: 'Benchmark comparison' })
  benchmarks: Array<{
    category: string;
    value: number;
    benchmark: number;
    status: 'exceeds' | 'meets' | 'below' | 'far-below';
    industryAverage?: number;
  }>;

  @ApiProperty({ description: 'Generated insights and recommendations' })
  insights: string[];

  @ApiProperty({ description: 'When the comparison was generated' })
  generatedAt: Date;
}

export class DataAggregationConfigDto {
  @ApiPropertyOptional({ description: 'Aggregation frequency' })
  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'])
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Metrics to include in aggregation' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @ApiPropertyOptional({ description: 'Enable real-time aggregation' })
  @IsOptional()
  @IsBoolean()
  realTimeEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Retention period for aggregated data in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650) // Max 10 years
  retentionDays?: number;

  @ApiPropertyOptional({ description: 'Enable anomaly detection' })
  @IsOptional()
  @IsBoolean()
  anomalyDetectionEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Notification thresholds' })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  notificationThresholds?: {
    engagementDrop: number;
    performanceDrop: number;
    riskScoreIncrease: number;
  };
}

export class ProcessingStatusDto {
  @ApiProperty({ description: 'Processing job ID' })
  jobId: string;

  @ApiProperty({ description: 'Current status' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({ description: 'Progress percentage' })
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: 'Processing stage' })
  stage: string;

  @ApiProperty({ description: 'Estimated completion time' })
  estimatedCompletion?: Date;

  @ApiProperty({ description: 'Error message if failed' })
  error?: string;

  @ApiProperty({ description: 'Processing statistics' })
  stats: {
    recordsProcessed: number;
    totalRecords: number;
    startTime: Date;
    endTime?: Date;
    duration?: number; // milliseconds
  };

  @ApiProperty({ description: 'Result summary when completed' })
  result?: {
    aggregationsCreated: number;
    trendsIdentified: number;
    patternsRecognized: number;
    alertsGenerated: number;
  };
}

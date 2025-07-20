import { ResourceType } from '../entities/resource-optimization.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InterventionStatus,
  InterventionOutcome,
} from '../entities/intervention-recommendation.entity';
import {
  InterventionType,
  PredictionType,
  RiskLevel,
} from '../entities/performance-prediction.entity';
import { OutcomeType } from '../entities/learning-outcome-forecast.entity';

export class PerformancePredictionResponseDto {
  @ApiProperty({ description: 'Prediction ID' })
  id: string;

  @ApiProperty({ description: 'Student user ID' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiProperty({ enum: PredictionType, description: 'Type of prediction' })
  predictionType: PredictionType;

  @ApiProperty({ description: 'Prediction date' })
  predictionDate: Date;

  @ApiPropertyOptional({ description: 'Target date for prediction outcome' })
  targetDate?: Date;

  @ApiProperty({ description: 'Predicted value (0-100)' })
  predictedValue: number;

  @ApiProperty({ description: 'Confidence score (0-100)' })
  confidenceScore: number;

  @ApiProperty({ enum: RiskLevel, description: 'Risk level assessment' })
  riskLevel: RiskLevel;

  @ApiPropertyOptional({ description: 'Contributing factors to prediction' })
  contributingFactors?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Prediction details' })
  predictionDetails?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Actual outcome for validation' })
  actualValue?: number;

  @ApiPropertyOptional({ description: 'Prediction accuracy score' })
  accuracyScore?: number;

  @ApiProperty({ description: 'Whether prediction has been validated' })
  isValidated: boolean;

  @ApiProperty({ description: 'Model version used' })
  modelVersion: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class DropoutRiskAssessmentResponseDto {
  @ApiProperty({ description: 'Assessment ID' })
  id: string;

  @ApiProperty({ description: 'Student user ID' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiProperty({ description: 'Assessment date' })
  assessmentDate: Date;

  @ApiProperty({ enum: RiskLevel, description: 'Overall dropout risk level' })
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Risk probability percentage (0-100)' })
  riskProbability: number;

  @ApiProperty({ description: 'Risk factors analysis' })
  riskFactors: Record<string, any>;

  @ApiPropertyOptional({ description: 'Protective factors' })
  protectiveFactors?: Record<string, boolean>;

  @ApiProperty({ description: 'Whether immediate intervention is required' })
  interventionRequired: boolean;

  @ApiPropertyOptional({ description: 'Recommended intervention types' })
  recommendedInterventions?: InterventionType[];

  @ApiProperty({ description: 'Priority level for intervention (1-10)' })
  interventionPriority: number;

  @ApiPropertyOptional({ description: 'Specific intervention recommendations' })
  interventionRecommendations?: string;

  @ApiPropertyOptional({ description: 'Trend analysis data' })
  trendAnalysis?: Record<string, any>;

  @ApiProperty({ description: 'Whether student has been notified' })
  studentNotified: boolean;

  @ApiProperty({ description: 'Whether instructor has been notified' })
  instructorNotified: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class LearningOutcomeForecastResponseDto {
  @ApiProperty({ description: 'Forecast ID' })
  id: string;

  @ApiProperty({ description: 'Student user ID' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiProperty({ enum: OutcomeType, description: 'Type of learning outcome' })
  outcomeType: OutcomeType;

  @ApiProperty({ description: 'Forecast generation date' })
  forecastDate: Date;

  @ApiProperty({ description: 'Target completion date' })
  targetDate: Date;

  @ApiProperty({ description: 'Predicted success probability (0-100)' })
  successProbability: number;

  @ApiPropertyOptional({ description: 'Predicted score or completion percentage' })
  predictedScore?: number;

  @ApiPropertyOptional({ description: 'Estimated days to completion' })
  estimatedDaysToCompletion?: number;

  @ApiProperty({ description: 'Scenario-based forecasts' })
  scenarios: Record<string, any>;

  @ApiPropertyOptional({ description: 'Milestone predictions' })
  milestones?: any[];

  @ApiProperty({ description: 'Forecast confidence level (0-100)' })
  confidenceLevel: number;

  @ApiProperty({ description: 'Whether outcome has been realized' })
  isRealized: boolean;

  @ApiPropertyOptional({ description: 'Actual outcome for validation' })
  actualOutcome?: number;

  @ApiPropertyOptional({ description: 'Actual completion date' })
  actualCompletionDate?: Date;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class InterventionRecommendationResponseDto {
  @ApiProperty({ description: 'Intervention ID' })
  id: string;

  @ApiProperty({ description: 'Student user ID' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID' })
  courseId?: string;

  @ApiPropertyOptional({ description: 'Related prediction ID' })
  predictionId?: string;

  @ApiProperty({ enum: InterventionType, description: 'Type of intervention' })
  interventionType: InterventionType;

  @ApiProperty({ description: 'Intervention title' })
  title: string;

  @ApiProperty({ description: 'Detailed intervention description' })
  description: string;

  @ApiProperty({ description: 'Priority level (1-10)' })
  priority: number;

  @ApiProperty({ enum: InterventionStatus, description: 'Current intervention status' })
  status: InterventionStatus;

  @ApiPropertyOptional({ description: 'Recommended intervention date' })
  recommendedDate?: Date;

  @ApiPropertyOptional({ description: 'Scheduled intervention date' })
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  estimatedDuration?: number;

  @ApiProperty({ description: 'Intervention parameters and settings' })
  parameters: Record<string, any>;

  @ApiPropertyOptional({ description: 'Success criteria for intervention' })
  successCriteria?: any[];

  @ApiPropertyOptional({ description: 'Assigned instructor/tutor ID' })
  assignedToId?: string;

  @ApiPropertyOptional({ enum: InterventionOutcome, description: 'Intervention outcome' })
  outcome?: InterventionOutcome;

  @ApiPropertyOptional({ description: 'Effectiveness score (0-100)' })
  effectivenessScore?: number;

  @ApiProperty({ description: 'Whether follow-up is required' })
  followUpRequired: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class ResourceOptimizationResponseDto {
  @ApiProperty({ description: 'Optimization ID' })
  id: string;

  @ApiProperty({ enum: ResourceType, description: 'Type of resource being optimized' })
  resourceType: ResourceType;

  @ApiProperty({ description: 'Resource identifier' })
  resourceId: string;

  @ApiProperty({ description: 'Optimization analysis date' })
  optimizationDate: Date;

  @ApiProperty({ description: 'Current efficiency score (0-100)' })
  currentEfficiency: number;

  @ApiProperty({ description: 'Predicted efficiency with optimization (0-100)' })
  predictedEfficiency: number;

  @ApiProperty({ description: 'Current usage patterns' })
  currentUsage: Record<string, any>;

  @ApiProperty({ description: 'Optimization recommendations' })
  recommendations: any[];

  @ApiPropertyOptional({ description: 'Predicted outcomes' })
  predictedOutcomes?: Record<string, any>;

  @ApiProperty({ description: 'Whether optimization has been implemented' })
  isImplemented: boolean;

  @ApiPropertyOptional({ description: 'Actual efficiency after implementation' })
  actualEfficiency?: number;

  @ApiPropertyOptional({ description: 'Implementation results' })
  implementationResults?: Record<string, any>;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

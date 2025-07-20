import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';

export enum PredictionType {
  PERFORMANCE = 'performance',
  DROPOUT_RISK = 'dropout_risk',
  LEARNING_OUTCOME = 'learning_outcome',
  COMPLETION_TIME = 'completion_time',
  RESOURCE_USAGE = 'resource_usage',
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum InterventionType {
  MOTIVATION = 'motivation',
  CONTENT_REVIEW = 'content_review',
  STUDY_PLAN = 'study_plan',
  TUTOR_SUPPORT = 'tutor_support',
  PEER_SUPPORT = 'peer_support',
  TECHNICAL_SUPPORT = 'technical_support',
  ASSESSMENT_ADJUSTMENT = 'assessment_adjustment',
  LEARNING_PATH_CHANGE = 'learning_path_change',
}

@Entity('performance_predictions')
@Index(['studentId', 'predictionType'])
@Index(['courseId', 'predictionType'])
@Index(['predictionDate'])
@Index(['riskLevel'])
export class PerformancePrediction extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Course ID (null for general predictions)',
  })
  courseId?: string;

  @Column({
    type: 'enum',
    enum: PredictionType,
    comment: 'Type of prediction',
  })
  predictionType: PredictionType;

  @Column({
    type: 'datetime',
    comment: 'Date when prediction was made',
  })
  predictionDate: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Target date for prediction outcome',
  })
  targetDate?: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Predicted score or probability (0-100)',
  })
  predictedValue: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Confidence level of prediction (0-100)',
  })
  confidenceScore: number;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    comment: 'Risk level assessment',
  })
  riskLevel: RiskLevel;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Contributing factors to prediction',
  })
  contributingFactors?: {
    engagementLevel?: number;
    performanceHistory?: number;
    timeManagement?: number;
    contentDifficulty?: number;
    socialFactors?: number;
    technicalIssues?: number;
    motivationLevel?: number;
    priorKnowledge?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Detailed prediction breakdown',
  })
  predictionDetails?: {
    currentPerformance?: number;
    trendAnalysis?: string;
    comparisonToPeers?: number;
    seasonalFactors?: string[];
    behavioralPatterns?: string[];
    riskFactors?: string[];
    protectiveFactors?: string[];
  };

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Actual outcome for validation',
  })
  actualValue?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Prediction accuracy when validated',
  })
  accuracyScore?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether prediction has been validated',
  })
  isValidated: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Date when prediction was validated',
  })
  validatedAt?: Date;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Model version used for prediction',
  })
  modelVersion: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Model-specific metadata',
  })
  modelMetadata?: {
    algorithm?: string;
    features?: string[];
    trainingDataSize?: number;
    lastTrainingDate?: Date;
    hyperparameters?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional prediction metadata',
  })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course?: Course;
}

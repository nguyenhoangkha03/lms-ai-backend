import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { RecommendationType, RecommendationStatus, Priority } from '@/common/enums/ai.enums';
import { User } from '../../user/entities/user.entity';

@Entity('ai_recommendations')
@Index(['studentId'])
@Index(['recommendationType'])
@Index(['status'])
@Index(['priority'])
@Index(['expiresAt'])
@Index(['confidenceScore'])
@Index(['createdAt'])
export class AIRecommendation extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'enum',
    enum: RecommendationType,
    comment: 'Type of recommendation',
  })
  recommendationType: RecommendationType;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related content ID (course, lesson, assessment)',
  })
  contentId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Content type (course, lesson, assessment, skill)',
  })
  contentType?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Recommendation title',
  })
  title: string;

  @Column({
    type: 'text',
    comment: 'Detailed recommendation description',
  })
  description: string;

  @Column({
    type: 'text',
    comment: 'AI reasoning for this recommendation',
  })
  reason: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.5,
    comment: 'AI confidence score (0.0 - 1.0)',
  })
  confidenceScore: number;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
    comment: 'Recommendation priority level',
  })
  priority: Priority;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.PENDING,
    comment: 'Current recommendation status',
  })
  status: RecommendationStatus;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When this recommendation expires',
  })
  expiresAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When user interacted with recommendation',
  })
  interactedAt?: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'User interaction type (viewed, clicked, accepted, dismissed)',
  })
  interactionType?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Recommendation-specific metadata',
  })
  metadata?: {
    estimatedDuration?: number;
    difficultyLevel?: string;
    prerequisites?: string[];
    skills?: string[];
    tags?: string[];
    relatedContent?: string[];
    personalizedReason?: string;
    [key: string]: any;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'AI model information',
  })
  modelInfo?: {
    modelVersion?: string;
    algorithmUsed?: string;
    trainingDate?: Date;
    features?: string[];
    weights?: Record<string, number>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'User context when recommendation was generated',
  })
  userContext?: {
    currentCourse?: string;
    recentActivities?: string[];
    performanceMetrics?: Record<string, number>;
    learningGoals?: string[];
    preferences?: Record<string, any>;
    timeOfDay?: string;
    deviceType?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Expected outcomes from this recommendation',
  })
  expectedOutcomes?: {
    skillImprovement?: string[];
    performanceBoost?: number;
    engagementIncrease?: number;
    timeToComplete?: number;
    successProbability?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'A/B testing information',
  })
  abTestInfo?: {
    testId?: string;
    variant?: string;
    controlGroup?: boolean;
  };

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'User feedback rating (1.0 - 5.0)',
  })
  userRating?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User feedback comments',
  })
  userFeedback?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether recommendation was effective',
  })
  wasEffective?: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Effectiveness metrics',
  })
  effectivenessMetrics?: {
    clickThroughRate?: number;
    completionRate?: number;
    timeToAction?: number;
    userSatisfaction?: number;
    learningOutcome?: number;
  };

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'studentId' })
  student: User;

  // Virtual properties
  get isActive(): boolean {
    return (
      this.status === RecommendationStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date())
    );
  }

  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt! <= new Date();
  }

  get isHighPriority(): boolean {
    return this.priority === Priority.HIGH || this.priority === Priority.URGENT;
  }

  get isHighConfidence(): boolean {
    return this.confidenceScore >= 0.8;
  }

  get hasBeenInteracted(): boolean {
    return this.interactedAt !== null;
  }
}

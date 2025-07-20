import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';

export enum OutcomeType {
  COURSE_COMPLETION = 'course_completion',
  SKILL_MASTERY = 'skill_mastery',
  ASSESSMENT_SCORE = 'assessment_score',
  CERTIFICATION = 'certification',
  TIME_TO_COMPLETION = 'time_to_completion',
  KNOWLEDGE_RETENTION = 'knowledge_retention',
}

@Entity('learning_outcome_forecasts')
@Index(['studentId', 'outcomeType'])
@Index(['courseId'])
@Index(['forecastDate'])
export class LearningOutcomeForecast extends BaseEntity {
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
    comment: 'Course ID',
  })
  courseId?: string;

  @Column({
    type: 'enum',
    enum: OutcomeType,
    comment: 'Type of learning outcome',
  })
  outcomeType: OutcomeType;

  @Column({
    type: 'datetime',
    comment: 'Forecast generation date',
  })
  forecastDate: Date;

  @Column({
    type: 'datetime',
    comment: 'Target completion date',
  })
  targetDate: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Predicted success probability (0-100)',
  })
  successProbability: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Predicted score or completion percentage',
  })
  predictedScore?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Estimated days to completion',
  })
  estimatedDaysToCompletion?: number;

  @Column({
    type: 'json',
    comment: 'Scenario-based forecasts',
  })
  scenarios: {
    optimistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
    realistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
    pessimistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Milestone predictions',
  })
  milestones?: {
    milestoneId: string;
    name: string;
    predictedCompletionDate: Date;
    probability: number;
    dependencies: string[];
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Resource requirements forecast',
  })
  resourceRequirements?: {
    studyHoursRequired: number;
    preferredStudyTimes: string[];
    recommendedResources: string[];
    supportNeeded: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Potential obstacles and solutions',
  })
  obstaclesAndSolutions?: {
    obstacle: string;
    probability: number;
    impact: string;
    solutions: string[];
  }[];

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Forecast confidence level (0-100)',
  })
  confidenceLevel: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Baseline data used for forecast',
  })
  baselineData?: {
    currentProgress: number;
    averagePerformance: number;
    engagementLevel: number;
    timeSpentLearning: number;
    completedActivities: number;
    skillLevel: string;
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether outcome has been realized',
  })
  isRealized: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Actual outcome for validation',
  })
  actualOutcome?: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Actual completion date',
  })
  actualCompletionDate?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Forecast accuracy metrics',
  })
  accuracyMetrics?: {
    outcomeAccuracy: number;
    timeAccuracy: number;
    overallAccuracy: number;
    errorMargin: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional forecast metadata',
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

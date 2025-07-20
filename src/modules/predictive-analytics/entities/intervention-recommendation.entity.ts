import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InterventionType, PerformancePrediction } from './performance-prediction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';

export enum InterventionStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred',
}

export enum InterventionOutcome {
  SUCCESSFUL = 'successful',
  PARTIALLY_SUCCESSFUL = 'partially_successful',
  UNSUCCESSFUL = 'unsuccessful',
  TOO_EARLY = 'too_early',
  NO_RESPONSE = 'no_response',
}

@Entity('intervention_recommendations')
@Index(['studentId', 'status'])
@Index(['interventionType'])
@Index(['priority'])
@Index(['scheduledDate'])
export class InterventionRecommendation extends BaseEntity {
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
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related prediction ID',
  })
  predictionId?: string;

  @Column({
    type: 'enum',
    enum: InterventionType,
    comment: 'Type of intervention',
  })
  interventionType: InterventionType;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Intervention title',
  })
  title: string;

  @Column({
    type: 'text',
    comment: 'Detailed intervention description',
  })
  description: string;

  @Column({
    type: 'int',
    comment: 'Priority level (1-10, 10 being highest)',
  })
  priority: number;

  @Column({
    type: 'enum',
    enum: InterventionStatus,
    default: InterventionStatus.PENDING,
    comment: 'Current intervention status',
  })
  status: InterventionStatus;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Recommended intervention date',
  })
  recommendedDate?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Scheduled intervention date',
  })
  scheduledDate?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Actual intervention start date',
  })
  startedAt?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Intervention completion date',
  })
  completedAt?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Estimated duration in minutes',
  })
  estimatedDuration?: number;

  @Column({
    type: 'json',
    comment: 'Intervention parameters and settings',
  })
  parameters: {
    targetMetrics?: string[];
    customContent?: string;
    resourceLinks?: string[];
    communicationMethod?: string;
    followUpRequired?: boolean;
    groupIntervention?: boolean;
    automatedIntervention?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Success criteria for intervention',
  })
  successCriteria?: {
    metric: string;
    targetValue: number;
    timeframe: number; // days
    measurementMethod: string;
  }[];

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Assigned instructor/tutor ID',
  })
  assignedToId?: string;

  @Column({
    type: 'enum',
    enum: InterventionOutcome,
    nullable: true,
    comment: 'Intervention outcome',
  })
  outcome?: InterventionOutcome;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Effectiveness score (0-100)',
  })
  effectivenessScore?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Student feedback',
  })
  studentFeedback?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Instructor notes',
  })
  instructorNotes?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Metrics before intervention',
  })
  preInterventionMetrics?: Record<string, number>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Metrics after intervention',
  })
  postInterventionMetrics?: Record<string, number>;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Follow-up scheduled date',
  })
  followUpDate?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether follow-up is required',
  })
  followUpRequired: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Related interventions',
  })
  relatedInterventions?: {
    interventionId: string;
    relationship: 'prerequisite' | 'followup' | 'alternative' | 'complementary';
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional intervention metadata',
  })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedToId' })
  assignedTo?: User;

  @ManyToOne(() => PerformancePrediction)
  @JoinColumn({ name: 'predictionId' })
  prediction?: PerformancePrediction;
}

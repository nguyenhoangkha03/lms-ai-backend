import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { AttemptStatus, GradingStatus } from '@/common/enums/assessment.enums';
import { Assessment } from './assessment.entity';
import { User } from '../../user/entities/user.entity';

@Entity('assessment_attempts')
@Index(['studentId'])
@Index(['assessmentId'])
@Index(['attemptNumber'])
@Index(['status'])
@Index(['gradingStatus'])
@Index(['startedAt'])
@Index(['submittedAt'])
export class AssessmentAttempt extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Assessment ID',
  })
  assessmentId: string;

  @Column({
    type: 'int',
    comment: 'Attempt number for this student',
  })
  attemptNumber: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the attempt was started',
  })
  startedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When the attempt was submitted',
  })
  submittedAt?: Date;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
    comment: 'Current status of the attempt',
  })
  status: AttemptStatus;

  @Column({
    type: 'enum',
    enum: GradingStatus,
    default: GradingStatus.PENDING,
    comment: 'Grading status of the attempt',
  })
  gradingStatus: GradingStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Score achieved in this attempt',
  })
  score?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Maximum possible score',
  })
  maxScore?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Percentage score',
  })
  percentage?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Time taken to complete in seconds',
  })
  timeTaken?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Student answers for all questions',
  })
  answers?: {
    questionId: string;
    answer: any;
    timeSpent?: number;
    isCorrect?: boolean;
    points?: number;
    feedback?: string;
  }[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Overall feedback for the attempt',
  })
  feedback?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Graded by user ID',
  })
  gradedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When the attempt was graded',
  })
  gradedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Proctoring data and flags',
  })
  proctoringData?: {
    faceDetectionLogs?: any[];
    tabSwitchCount?: number;
    copyPasteAttempts?: number;
    suspiciousActivities?: any[];
    browserInfo?: any;
    ipAddress?: string;
    location?: any;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Session tracking data',
  })
  sessionData?: {
    sessionId?: string;
    deviceFingerprint?: string;
    userAgent?: string;
    screenResolution?: string;
    timezone?: string;
    autoSaveCount?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Learning analytics data',
  })
  analyticsData?: {
    questionOrder?: string[];
    timePerQuestion?: { [questionId: string]: number };
    revisitedQuestions?: string[];
    flaggedQuestions?: string[];
    confidenceScores?: { [questionId: string]: number };
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this attempt is flagged for review',
  })
  isFlagged: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Flag reason if attempt is flagged',
  })
  flagReason?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional attempt metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Assessment, assessment => assessment.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'gradedBy' })
  grader?: User;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === AttemptStatus.SUBMITTED;
  }

  get isPassed(): boolean {
    if (!this.percentage || !this.assessment) return false;
    return this.percentage >= this.assessment.passingScore;
  }

  get durationFormatted(): string {
    if (!this.timeTaken) return 'N/A';
    const hours = Math.floor(this.timeTaken / 3600);
    const minutes = Math.floor((this.timeTaken % 3600) / 60);
    const seconds = this.timeTaken % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

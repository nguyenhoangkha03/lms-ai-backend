import { Entity, Column, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Assessment } from './assessment.entity';
import { User } from '../../user/entities/user.entity';
import { AssessmentAttempt } from './assessment-attempt.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum SessionStatus {
  PREPARING = 'preparing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum SecurityEvent {
  TAB_SWITCH = 'tab_switch',
  WINDOW_BLUR = 'window_blur',
  COPY_DETECTED = 'copy_detected',
  PASTE_DETECTED = 'paste_detected',
  RIGHT_CLICK = 'right_click',
  FULLSCREEN_EXIT = 'fullscreen_exit',
  NETWORK_INTERRUPTION = 'network_interruption',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

@Entity('assessment_sessions')
// @Index(['studentId', 'assessmentId', 'status'])
// @Index(['sessionToken'])
@Index(['expiresAt'])
export class AssessmentSession extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true, comment: 'Unique session token' })
  sessionToken: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.PREPARING,
    comment: 'Session status',
  })
  status: SessionStatus;

  @Column({ type: 'timestamp', comment: 'Session start time', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Session end time' })
  endedAt?: Date;

  @Column({ type: 'timestamp', comment: 'Session expiration time', nullable: true })
  expiresAt: Date;

  @Column({ type: 'int', nullable: true, comment: 'Time remaining in seconds' })
  timeRemaining?: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Last activity timestamp',
  })
  lastActivityAt: Date;

  @Column({ type: 'int', default: 0, comment: 'Current question index' })
  currentQuestionIndex: number;

  @Column({ type: 'int', default: 0, comment: 'Questions answered count' })
  questionsAnswered: number;

  @Column({ type: 'int', comment: 'Total questions count' })
  totalQuestions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, comment: 'Progress percentage' })
  progressPercentage: number;

  @Column({ type: 'longtext', nullable: true, comment: 'Current answers (JSON)' })
  currentAnswers?: string;

  @Column({ type: 'timestamp', nullable: true, comment: 'Last auto-save timestamp' })
  lastAutoSaveAt?: Date;

  @Column({ type: 'int', default: 30, comment: 'Auto-save interval in seconds' })
  autoSaveInterval: number;

  // Security and Proctoring
  @Column({ type: 'longtext', nullable: true, comment: 'Security events log (JSON)' })
  securityEvents?: string;

  @Column({ type: 'int', default: 0, comment: 'Security violations count' })
  securityViolationsCount: number;

  @Column({ type: 'tinyint', default: false, comment: 'Is session flagged for review' })
  isFlagged: boolean;

  @Column({ type: 'text', nullable: true, comment: 'Flag reason' })
  flagReason?: string;

  @Column({ type: 'longtext', nullable: true, comment: 'Browser information (JSON)' })
  browserInfo?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Screen resolution' })
  screenResolution?: string;

  @Column({ type: 'tinyint', default: false, comment: 'Is fullscreen mode' })
  isFullscreen: boolean;

  @Column({ type: 'int', default: 0, comment: 'Tab switches count' })
  tabSwitchCount: number;

  @Column({ type: 'int', default: 0, comment: 'Connection interruptions count' })
  connectionInterruptions: number;

  @Column({ type: 'timestamp', nullable: true, comment: 'Last ping timestamp' })
  lastPingAt?: Date;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Network quality score',
  })
  networkQuality?: number;

  @Column({ type: 'longtext', nullable: true, comment: 'Session configuration (JSON)' })
  sessionConfig?: string;

  @Column({ type: 'longtext', nullable: true, comment: 'Randomized questions order (JSON)' })
  questionsOrder?: string;

  @Column({ type: 'longtext', nullable: true, comment: 'Additional metadata (JSON)' })
  metadata?: string;

  // Relationships
  @Column({ type: 'varchar', length: 36, comment: 'Student ID' })
  studentId: string;

  @Column({ type: 'varchar', length: 36, comment: 'Assessment ID' })
  assessmentId: string;

  @Column({ type: 'varchar', length: 36, nullable: true, comment: 'Assessment attempt ID' })
  attemptId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Assessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @ManyToOne(() => AssessmentAttempt, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt?: AssessmentAttempt;

  // Virtual Properties
  get isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt || this.status === SessionStatus.EXPIRED;
  }

  get remainingTimeInSeconds(): number {
    if (this.isExpired || this.status === SessionStatus.COMPLETED) return 0;
    return Math.max(0, Math.floor((this.expiresAt.getTime() - Date.now()) / 1000));
  }

  get durationInSeconds(): number {
    const end = this.endedAt || new Date();
    return Math.floor((end.getTime() - this.startedAt.getTime()) / 1000);
  }

  // Parse JSON fields
  get currentAnswersJson() {
    return this.currentAnswers ? JSON.parse(this.currentAnswers) : {};
  }

  get securityEventsJson() {
    return this.securityEvents ? JSON.parse(this.securityEvents) : [];
  }

  get browserInfoJson() {
    return this.browserInfo ? JSON.parse(this.browserInfo) : {};
  }

  get sessionConfigJson() {
    return this.sessionConfig ? JSON.parse(this.sessionConfig) : {};
  }

  get questionsOrderJson() {
    return this.questionsOrder ? JSON.parse(this.questionsOrder) : [];
  }

  get metadataJson() {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateProgress() {
    if (this.totalQuestions > 0) {
      this.progressPercentage = (this.questionsAnswered / this.totalQuestions) * 100;
    }
  }
}

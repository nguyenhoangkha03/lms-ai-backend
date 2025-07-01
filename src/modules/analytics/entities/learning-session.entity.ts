import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { SessionStatus, DeviceType } from '@/common/enums/analytics.enums';
import { LearningActivity } from './learning-activity.entity';

@Entity('learning_sessions')
@Index(['studentId'])
@Index(['startTime'])
@Index(['endTime'])
@Index(['duration'])
@Index(['status'])
export class LearningSession extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Unique session identifier',
  })
  sessionId: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Session start time',
  })
  startTime: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Session end time',
  })
  endTime?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Session duration in seconds',
  })
  duration?: number;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
    comment: 'Current session status',
  })
  status: SessionStatus;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of page views in this session',
  })
  pageViews: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of learning activities in this session',
  })
  activitiesCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Courses accessed during this session',
  })
  coursesAccessed?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lessons accessed during this session',
  })
  lessonsAccessed?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Assessments taken during this session',
  })
  assessmentsTaken?: string[];

  @Column({
    type: 'enum',
    enum: DeviceType,
    nullable: true,
    comment: 'Primary device type used in session',
  })
  deviceType?: DeviceType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Browser used in session',
  })
  browser?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Operating system used in session',
  })
  operatingSystem?: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address used in session',
  })
  ipAddress?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Geolocation data for session',
  })
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Session engagement metrics',
  })
  engagementMetrics?: {
    scrollDepth?: number;
    clickCount?: number;
    keystrokeCount?: number;
    idleTime?: number;
    focusTime?: number;
    tabSwitches?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Learning outcomes from this session',
  })
  learningOutcomes?: {
    lessonsCompleted?: number;
    quizzesCompleted?: number;
    averageQuizScore?: number;
    newSkillsLearned?: string[];
    certificatesEarned?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Session quality indicators',
  })
  qualityIndicators?: {
    completionRate?: number;
    engagementScore?: number;
    focusScore?: number;
    interactionQuality?: number;
    learningEfficiency?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional session metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @OneToMany(() => LearningActivity, activity => activity.sessionId)
  activities?: LearningActivity[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  get durationFormatted(): string {
    if (!this.duration) return 'N/A';
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ActivityType, DeviceType } from '@/common/enums/analytics.enums';

@Entity('learning_activities')
@Index(['studentId'])
@Index(['courseId'])
@Index(['lessonId'])
@Index(['activityType'])
@Index(['sessionId'])
@Index(['timestamp'])
@Index(['studentId', 'courseId', 'timestamp'])
export class LearningActivity extends BaseEntity {
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
    comment: 'Course ID if activity is course-related',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Lesson ID if activity is lesson-related',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Assessment ID if activity is assessment-related',
  })
  assessmentId?: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    comment: 'Type of learning activity',
  })
  activityType: ActivityType;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Unique session identifier',
  })
  sessionId: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Activity timestamp',
  })
  timestamp: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Duration of activity in seconds',
  })
  duration?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Activity-specific metadata',
  })
  metadata?: {
    videoPosition?: number;
    playbackSpeed?: number;
    quality?: string;
    questionsAnswered?: number;
    questionsCorrect?: number;
    score?: number;
    pageUrl?: string;
    referrer?: string;
    searchQuery?: string;
    downloadedFile?: string;
    chatMessages?: number;
    interactionType?: string;
    [key: string]: any;
  };

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address of the user',
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User agent string',
  })
  userAgent?: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    nullable: true,
    comment: 'Type of device used',
  })
  deviceType?: DeviceType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Browser name',
  })
  browser?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Operating system',
  })
  operatingSystem?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Screen resolution',
  })
  screenResolution?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'User timezone',
  })
  timezone?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Geolocation data if available',
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
    comment: 'Additional tracking data',
  })
  trackingData?: Record<string, any>;

  // Virtual properties
  get isEngagementActivity(): boolean {
    return [
      ActivityType.VIDEO_PLAY,
      ActivityType.VIDEO_PAUSE,
      ActivityType.QUIZ_START,
      ActivityType.QUIZ_SUBMIT,
      ActivityType.DISCUSSION_POST,
      ActivityType.CHAT_MESSAGE,
    ].includes(this.activityType);
  }

  get isLearningProgress(): boolean {
    return [
      ActivityType.LESSON_START,
      ActivityType.LESSON_COMPLETE,
      ActivityType.COURSE_COMPLETE,
      ActivityType.QUIZ_SUBMIT,
    ].includes(this.activityType);
  }
}

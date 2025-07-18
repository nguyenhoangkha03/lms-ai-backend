import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum PresenceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
  DO_NOT_DISTURB = 'do_not_disturb',
  INVISIBLE = 'invisible',
}

export enum ActivityStatus {
  STUDYING = 'studying',
  IN_LESSON = 'in_lesson',
  TAKING_QUIZ = 'taking_quiz',
  IN_CHAT = 'in_chat',
  IN_VIDEO_CALL = 'in_video_call',
  IDLE = 'idle',
  BROWSING = 'browsing',
}

@Entity('user_presence')
@Index(['userId'], { unique: true })
@Index(['status'])
@Index(['lastSeenAt'])
@Index(['isOnline'])
@Index(['currentCourseId'])
@Index(['currentLessonId'])
export class UserPresence extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: PresenceStatus,
    default: PresenceStatus.OFFLINE,
    comment: 'Current presence status',
  })
  status: PresenceStatus;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.IDLE,
    comment: 'Current activity status',
  })
  activityStatus: ActivityStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether user is currently online',
  })
  isOnline: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Last time user was seen online',
  })
  lastSeenAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When user came online',
  })
  onlineAt?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Custom status message',
  })
  statusMessage?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Current course user is in',
  })
  currentCourseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Current lesson user is viewing',
  })
  currentLessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Current chat room user is in',
  })
  currentChatRoomId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Current video session user is in',
  })
  currentVideoSessionId?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Device information',
  })
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
    userAgent?: string;
    screenResolution?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Location information',
  })
  locationInfo?: {
    country?: string;
    city?: string;
    timezone?: string;
    ip?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Current activity details',
  })
  activityDetails?: {
    startedAt?: Date;
    progress?: number;
    timeSpent?: number;
    interactionCount?: number;
    metadata?: Record<string, any>;
  };

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total session duration in seconds',
  })
  sessionDuration: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of pages/screens viewed in session',
  })
  pageViews: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'User interaction count in current session',
  })
  interactionCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last activity timestamp',
  })
  lastActivityAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Active socket connections',
  })
  connections?: {
    socketId: string;
    namespace: string;
    connectedAt: Date;
    rooms: string[];
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Presence preferences',
  })
  preferences?: {
    showOnlineStatus?: boolean;
    showActivity?: boolean;
    allowDirectMessages?: boolean;
    notifications?: {
      desktop?: boolean;
      sound?: boolean;
      vibration?: boolean;
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}

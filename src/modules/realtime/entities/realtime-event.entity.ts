import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export enum EventType {
  // Learning Progress Events
  LESSON_STARTED = 'lesson_started',
  LESSON_COMPLETED = 'lesson_completed',
  COURSE_PROGRESS_UPDATED = 'course_progress_updated',
  ASSIGNMENT_SUBMITTED = 'assignment_submitted',
  GRADE_RECEIVED = 'grade_received',

  // User Activity Events
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  USER_TYPING = 'user_typing',

  // Course Events
  COURSE_ENROLLED = 'course_enrolled',
  COURSE_CREATED = 'course_created',
  COURSE_UPDATED = 'course_updated',
  NEW_ANNOUNCEMENT = 'new_announcement',

  // Chat & Communication
  NEW_MESSAGE = 'new_message',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  REACTION_ADDED = 'reaction_added',

  // Assessment Events
  QUIZ_STARTED = 'quiz_started',
  QUIZ_SUBMITTED = 'quiz_submitted',
  QUIZ_GRADED = 'quiz_graded',

  // System Events
  SYSTEM_NOTIFICATION = 'system_notification',
  MAINTENANCE_MODE = 'maintenance_mode',
  BROADCAST_MESSAGE = 'broadcast_message',
}

export enum EventScope {
  GLOBAL = 'global', // All users
  USER = 'user', // Specific user
  COURSE = 'course', // Course participants
  GROUP = 'group', // Study group members
  ROOM = 'room', // Chat room participants
  ROLE = 'role', // Users with specific role
}

@Entity('realtime_events')
@Index(['eventType'])
@Index(['scope'])
@Index(['targetId'])
@Index(['createdAt'])
@Index(['isActive'])
@Index(['priority'])
export class RealtimeEvent extends BaseEntity {
  @Column({
    type: 'enum',
    enum: EventType,
    comment: 'Type of real-time event',
  })
  eventType: EventType;

  @Column({
    type: 'enum',
    enum: EventScope,
    comment: 'Scope of event distribution',
  })
  scope: EventScope;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Target ID based on scope (userId, courseId, groupId, etc.)',
  })
  targetId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User who triggered the event',
  })
  triggeredBy?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Event title/headline',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Event message/description',
  })
  message?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Event payload data',
  })
  payload?: {
    courseId?: string;
    lessonId?: string;
    assignmentId?: string;
    chatRoomId?: string;
    messageId?: string;
    progressPercentage?: number;
    score?: number;
    metadata?: Record<string, any>;
  };

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Action URL for event',
  })
  actionUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Icon URL for event',
  })
  iconUrl?: string;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Event priority (1=low, 5=critical)',
  })
  priority: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether event is active',
  })
  isActive: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When event expires',
  })
  expiresAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Delivery channels configuration',
  })
  channels?: {
    websocket?: boolean;
    push?: boolean;
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Event delivery status',
  })
  deliveryStatus?: {
    websocket?: { sent: boolean; timestamp?: Date };
    push?: { sent: boolean; timestamp?: Date };
    email?: { sent: boolean; timestamp?: Date };
    sms?: { sent: boolean; timestamp?: Date };
    inApp?: { sent: boolean; timestamp?: Date };
  };

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of users reached',
  })
  reachCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of interactions (clicks, views)',
  })
  interactionCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Event tags for filtering',
  })
  tags?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;
}

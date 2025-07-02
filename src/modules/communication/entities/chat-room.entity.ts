import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ChatRoomType, ChatRoomStatus } from '@/common/enums/communication.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { ChatParticipant } from './chat-participant.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_rooms')
@Index(['roomType'])
@Index(['status'])
@Index(['courseId'])
@Index(['lessonId'])
@Index(['createdBy'])
@Index(['isActive'])
@Index(['createdAt'])
export class ChatRoom extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Chat room name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Chat room description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ChatRoomType,
    default: ChatRoomType.GENERAL,
    comment: 'Type of chat room',
  })
  roomType: ChatRoomType;

  @Column({
    type: 'enum',
    enum: ChatRoomStatus,
    default: ChatRoomStatus.ACTIVE,
    comment: 'Current status of the room',
  })
  status: ChatRoomStatus;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related course ID',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related lesson ID',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User who created the room',
  })
  createdBy: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether the room is active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the room is private (invite-only)',
  })
  isPrivate: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Maximum number of participants',
  })
  maxParticipants?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Current number of participants',
  })
  participantCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of messages in room',
  })
  messageCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last message timestamp',
  })
  lastMessageAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of last message sender',
  })
  lastMessageBy?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Room avatar/image URL',
  })
  avatarUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Room settings and permissions',
  })
  settings?: {
    allowFileSharing?: boolean;
    allowVoiceMessages?: boolean;
    allowVideoMessages?: boolean;
    messageRetentionDays?: number;
    moderationEnabled?: boolean;
    autoTranslateEnabled?: boolean;
    readReceiptsEnabled?: boolean;
    typingIndicatorsEnabled?: boolean;
    pinnedMessagesLimit?: number;
    allowedFileTypes?: string[];
    maxFileSize?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Moderation rules and settings',
  })
  moderationSettings?: {
    autoModeration?: boolean;
    bannedWords?: string[];
    spamDetection?: boolean;
    linkFiltering?: boolean;
    imageModeration?: boolean;
    profanityFilter?: boolean;
    moderatorIds?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Room analytics and metrics',
  })
  analytics?: {
    dailyActiveUsers?: number;
    averageMessagesPerDay?: number;
    peakActiveHours?: number[];
    engagementScore?: number;
    participationRate?: number;
  };

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Room expiry date for temporary rooms',
  })
  expiresAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Integration settings (Discord, Slack, etc.)',
  })
  integrations?: {
    discord?: { webhookUrl?: string; channelId?: string };
    slack?: { webhookUrl?: string; channelId?: string };
    teams?: { webhookUrl?: string; channelId?: string };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional room metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => Course, course => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => ChatParticipant, participant => participant.room)
  participants?: ChatParticipant[];

  @OneToMany(() => ChatMessage, message => message.room)
  messages?: ChatMessage[];

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt! <= new Date();
  }

  get isFull(): boolean {
    return this.maxParticipants !== null && this.participantCount >= this.maxParticipants!;
  }

  get isPublic(): boolean {
    return !this.isPrivate;
  }

  get canAcceptNewMembers(): boolean {
    return this.isActive && !this.isExpired && !this.isFull;
  }
}

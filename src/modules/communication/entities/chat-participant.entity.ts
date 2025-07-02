import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ParticipantRole, ParticipantStatus } from '@/common/enums/communication.enums';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';

@Entity('chat_participants')
@Unique(['roomId', 'userId'])
@Index(['roomId'])
@Index(['userId'])
@Index(['role'])
@Index(['status'])
@Index(['joinedAt'])
@Index(['lastRead'])
export class ChatParticipant extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Chat room ID',
  })
  roomId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER,
    comment: 'Role of participant in the room',
  })
  role: ParticipantRole;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.ACTIVE,
    comment: 'Current status of participant',
  })
  status: ParticipantStatus;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When user joined the room',
  })
  joinedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When user left the room',
  })
  leftAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last message read timestamp',
  })
  lastRead?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of last read message',
  })
  lastReadMessageId?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of unread messages',
  })
  unreadCount: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether notifications are muted',
  })
  isMuted: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether participant is pinned in room list',
  })
  isPinned: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether participant is currently typing',
  })
  isTyping: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last activity timestamp in room',
  })
  lastActiveAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When user was last seen online',
  })
  lastSeenAt?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Custom nickname in this room',
  })
  nickname?: string;

  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
    comment: 'Custom color for messages in this room',
  })
  customColor?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Participant permissions in this room',
  })
  permissions?: {
    canSendMessages?: boolean;
    canSendFiles?: boolean;
    canSendMedia?: boolean;
    canMentionEveryone?: boolean;
    canPinMessages?: boolean;
    canDeleteOwnMessages?: boolean;
    canEditOwnMessages?: boolean;
    canInviteUsers?: boolean;
    canKickUsers?: boolean;
    canMuteUsers?: boolean;
    canManageRoom?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Notification preferences for this room',
  })
  notificationSettings?: {
    mentions?: boolean;
    directMessages?: boolean;
    allMessages?: boolean;
    keywords?: string[];
    sound?: boolean;
    vibration?: boolean;
    desktop?: boolean;
    email?: boolean;
    push?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Participant statistics in this room',
  })
  statistics?: {
    messagesSent?: number;
    filesShared?: number;
    timeSpentMinutes?: number;
    firstMessageAt?: Date;
    lastMessageAt?: Date;
    averageResponseTime?: number;
    reactionsGiven?: number;
    reactionsReceived?: number;
  };

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When participant was banned (if applicable)',
  })
  bannedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who banned this participant',
  })
  bannedBy?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Reason for ban',
  })
  banReason?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When ban expires (null for permanent)',
  })
  banExpiresAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional participant metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ChatRoom, room => room.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get isActive(): boolean {
    return this.status === ParticipantStatus.ACTIVE;
  }

  get isBanned(): boolean {
    return (
      this.status === ParticipantStatus.BANNED &&
      (!this.banExpiresAt || this.banExpiresAt > new Date())
    );
  }

  get isModerator(): boolean {
    return [ParticipantRole.MODERATOR, ParticipantRole.ADMIN, ParticipantRole.OWNER].includes(
      this.role,
    );
  }

  get canModerate(): boolean {
    return [ParticipantRole.MODERATOR, ParticipantRole.ADMIN, ParticipantRole.OWNER].includes(
      this.role,
    );
  }

  get hasUnreadMessages(): boolean {
    return this.unreadCount > 0;
  }
}

import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { MessageType, MessageStatus } from '@/common/enums/communication.enums';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';

@Entity('chat_messages')
@Index(['roomId'])
@Index(['senderId'])
@Index(['messageType'])
@Index(['status'])
@Index(['createdAt'])
@Index(['replyToId'])
@Index(['isEdited'])
@Index(['isDeleted'])
@Index(['isPinned'])
export class ChatMessage extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Chat room ID',
  })
  roomId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Message sender ID',
  })
  senderId: string;

  @Column({
    type: 'text',
    comment: 'Message content',
  })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
    comment: 'Type of message',
  })
  messageType: MessageType;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
    comment: 'Message delivery status',
  })
  status: MessageStatus;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of message being replied to',
  })
  replyToId?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'File attachments',
  })
  attachments?: {
    id: string;
    type: 'image' | 'video' | 'audio' | 'document' | 'link';
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
    thumbnail?: string;
    duration?: number;
    dimensions?: { width: number; height: number };
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Message mentions (users, channels, etc.)',
  })
  mentions?: {
    users?: string[];
    everyone?: boolean;
    channels?: string[];
    roles?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Message reactions',
  })
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether message has been edited',
  })
  isEdited: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last edit timestamp',
  })
  editedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Original content before edit',
  })
  originalContent?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether message is deleted',
  })
  isDeleted: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Deletion timestamp',
  })
  deletedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who deleted the message',
  })
  deletedBy?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether message is pinned in room',
  })
  isPinned: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When message was pinned',
  })
  pinnedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who pinned the message',
  })
  pinnedBy?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether message is flagged for moderation',
  })
  isFlagged: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who flagged the message',
  })
  flaggedBy?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Reason for flagging',
  })
  flagReason?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Rich content formatting',
  })
  formatting?: {
    bold?: { start: number; end: number }[];
    italic?: { start: number; end: number }[];
    underline?: { start: number; end: number }[];
    strikethrough?: { start: number; end: number }[];
    code?: { start: number; end: number }[];
    codeBlock?: { start: number; end: number; language?: string }[];
    links?: { start: number; end: number; url: string }[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Link preview data',
  })
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Message translation data',
  })
  translations?: {
    [languageCode: string]: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'AI moderation results',
  })
  moderationResult?: {
    toxicity?: number;
    profanity?: boolean;
    spam?: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative';
    topics?: string[];
    confidence?: number;
    action?: 'approved' | 'flagged' | 'blocked';
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Message analytics data',
  })
  analytics?: {
    readBy?: string[];
    readCount?: number;
    reactionCount?: number;
    replyCount?: number;
    shareCount?: number;
    clickCount?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional message metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ChatRoom, room => room.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => ChatMessage, message => message.id)
  @JoinColumn({ name: 'replyToId' })
  replyTo?: ChatMessage;

  @OneToMany(() => ChatMessage, message => message.replyTo)
  replies?: ChatMessage[];

  // Virtual properties
  get isSystem(): boolean {
    return this.messageType === MessageType.SYSTEM;
  }

  get hasAttachments(): boolean {
    return !!(this.attachments && this.attachments.length > 0);
  }

  get hasReactions(): boolean {
    return !!(this.reactions && this.reactions.length > 0);
  }

  get isReply(): boolean {
    return this.replyToId !== null;
  }

  get reactionCount(): number {
    return this.reactions?.reduce((sum, reaction) => sum + reaction.count, 0) || 0;
  }

  get readCount(): number {
    return this.analytics?.readCount || 0;
  }
}

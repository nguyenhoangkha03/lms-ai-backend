import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { MessageType, MessageStatus } from '@/common/enums/communication.enums';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';
import { ChatFile } from './chat-file.entity';
import { ChatMessageReaction } from './chat-message-reaction.entity';

@Entity('chat_messages')
@Index(['roomId'])
@Index(['senderId'])
@Index(['messageType'])
@Index(['status'])
@Index(['parentMessageId'])
@Index(['createdAt'])
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
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Parent message ID for replies',
  })
  parentMessageId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Thread ID for threaded conversations',
  })
  threadId?: string;

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
    here?: boolean;
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is message edited',
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
    comment: 'Edit history (JSON array)',
  })
  editHistory?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is message pinned',
  })
  isPinned: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Pin timestamp',
  })
  pinnedAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User who pinned the message',
  })
  pinnedBy?: string | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is message flagged for moderation',
  })
  isFlagged: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is message hidden by moderation',
  })
  isHidden: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of reactions',
  })
  reactionCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of replies',
  })
  replyCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Read receipts tracking',
  })
  readBy?: {
    userId: string;
    readAt: Date;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Message priority and urgency',
  })
  priority?: {
    level: 'low' | 'normal' | 'high' | 'urgent';
    expiresAt?: Date;
    notificationSettings?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Message formatting and styling',
  })
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: string;
    backgroundColor?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Message metadata',
  })
  metadata?: Record<string, any>;

  // old
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
    comment: 'Message delivery status',
  })
  status: MessageStatus;

  //   @Column({
  //     type: 'varchar',
  //     length: 36,
  //     nullable: true,
  //     comment: 'ID of message being replied to',
  //   })
  //   replyToId?: string;

  //   @Column({
  //     type: 'json',
  //     nullable: true,
  //     comment: 'File attachments',
  //   })
  //   attachments?: {
  //     id: string;
  //     type: 'image' | 'video' | 'audio' | 'document' | 'link';
  //     name: string;
  //     url: string;
  //     size?: number;
  //     mimeType?: string;
  //     thumbnail?: string;
  //     duration?: number;
  //     dimensions?: { width: number; height: number };
  //   }[];

  //   @Column({
  //     type: 'json',
  //     nullable: true,
  //     comment: 'Message reactions',
  //   })
  //   reactions?: {
  //     emoji: string;
  //     count: number;
  //     users: string[];
  //   }[];

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

  // Relationships
  @ManyToOne(() => ChatRoom, room => room.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => ChatMessage, message => message.id, { nullable: true })
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage?: ChatMessage;

  @OneToMany(() => ChatMessage, message => message.parentMessage)
  replies?: ChatMessage[];

  @OneToMany(() => ChatFile, file => file.message)
  files?: ChatFile[];

  @OneToMany(() => ChatMessageReaction, reaction => reaction.message)
  reactions?: ChatMessageReaction[];

  //   @ManyToOne(() => ChatMessage, message => message.id)
  //   @JoinColumn({ name: 'replyToId' })
  //   replyTo?: ChatMessage;

  //   @OneToMany(() => ChatMessage, message => message.replyTo)
  //   replies?: ChatMessage[];

  // Virtual properties
  get hasAttachments(): boolean {
    return !!(this.files && this.files.length > 0);
  }

  get isThread(): boolean {
    return this.threadId !== null;
  }

  get isReply(): boolean {
    return this.parentMessageId !== null;
  }

  get totalInteractions(): number {
    return this.reactionCount + this.replyCount;
  }
  get isSystem(): boolean {
    return this.messageType === MessageType.SYSTEM;
  }

  //   get hasAttachments(): boolean {
  //     return !!(this.attachments && this.attachments.length > 0);
  //   }

  //   get hasReactions(): boolean {
  //     return !!(this.reactions && this.reactions.length > 0);
  //   }

  //   get reactionCount(): number {
  //     return this.reactions?.reduce((sum, reaction) => sum + reaction.count, 0) || 0;
  //   }

  get readCount(): number {
    return this.analytics?.readCount || 0;
  }
}

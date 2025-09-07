import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('chat_moderation')
export class ChatModeration extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: true })
  messageId?: string;

  @Column({ type: 'varchar', length: 36 })
  roomId: string;

  @Column({ type: 'varchar', length: 36 })
  targetUserId: string;

  @Column({ type: 'varchar', length: 36 })
  moderatorId: string;

  @Column({
    type: 'enum',
    enum: [
      'warn',
      'mute',
      'kick',
      'ban',
      'delete_message',
      'edit_message',
      'flag_content',
      'timeout',
      'restrict_permissions',
    ],
    comment: 'Moderation action type',
  })
  action: string;

  @Column({
    type: 'text',
    comment: 'Reason for moderation action',
  })
  reason: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Additional notes from moderator',
  })
  notes?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'applied', 'appealed', 'reversed', 'expired'],
    default: 'pending',
    comment: 'Moderation status',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When moderation action expires',
  })
  expiresAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When action was applied',
  })
  appliedAt?: Date;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    comment: 'Severity level',
  })
  severity: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Was action automated by AI',
  })
  isAutomated: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'AI confidence score for automated actions',
  })
  confidenceScore?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Evidence and context for moderation',
  })
  evidence?: {
    originalContent?: string;
    flaggedWords?: string[];
    aiAnalysis?: Record<string, any>;
    reportedBy?: string[];
    screenshots?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Appeal information if applicable',
  })
  appeal?: {
    submittedAt?: Date;
    submittedBy?: string;
    reason?: string;
    reviewedAt?: Date;
    reviewedBy?: string;
    decision?: 'approved' | 'denied';
    reviewNotes?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ChatMessage, message => message.id, { nullable: true })
  @JoinColumn({ name: 'messageId' })
  message?: ChatMessage;

  @ManyToOne(() => ChatRoom, room => room.id)
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'moderatorId' })
  moderator: User;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt! <= new Date();
  }

  get isActive(): boolean {
    return this.status === 'applied' && !this.isExpired;
  }
}

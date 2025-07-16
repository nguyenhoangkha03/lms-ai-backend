import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('chat_message_threads')
export class ChatMessageThread extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  parentMessageId: string;

  @Column({ type: 'varchar', length: 36 })
  roomId: string;

  @Column({ type: 'varchar', length: 36 })
  createdBy: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Thread title/subject',
  })
  title?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Thread description',
  })
  description?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Is thread active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is thread pinned',
  })
  isPinned: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is thread resolved',
  })
  isResolved: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thread resolved at',
  })
  resolvedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Thread resolved by user ID',
  })
  resolvedBy?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of replies in thread',
  })
  replyCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last reply timestamp',
  })
  lastReplyAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Last reply author ID',
  })
  lastReplyBy?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thread participants list',
  })
  participants?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thread tags/labels',
  })
  tags?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thread metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ChatMessage, message => message.id)
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage: ChatMessage;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => ChatMessage, message => message.threadId)
  replies?: ChatMessage[];
}

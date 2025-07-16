import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('chat_message_reactions')
@Unique(['messageId', 'userId', 'emoji'])
export class ChatMessageReaction extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  messageId: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Emoji or reaction type',
  })
  emoji: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Unicode emoji code',
  })
  emojiCode?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Is reaction active',
  })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => ChatMessage, message => message.reactions)
  @JoinColumn({ name: 'messageId' })
  message: ChatMessage;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;
}

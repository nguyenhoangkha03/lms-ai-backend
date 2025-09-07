import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { ForumPost } from './forum-post.entity';

@Entity('forum_reputation_history')
@Index(['userId'])
@Index(['relatedPostId'])
@Index(['createdAt'])
export class ForumReputationHistory extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'int',
    comment: 'Points gained or lost',
  })
  points: number;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Reason for reputation change',
  })
  reason: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related post ID',
  })
  relatedPostId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related user ID (who gave vote/award)',
  })
  relatedUserId?: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    comment: 'Multiplier applied to points',
  })
  multiplier: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ForumPost, post => post.id)
  @JoinColumn({ name: 'relatedPostId' })
  relatedPost?: ForumPost;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'relatedUserId' })
  relatedUser?: User;
}

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumBadgeType } from '@/common/enums/forum.enums';
import { User } from '../../user/entities/user.entity';

@Entity('forum_user_badges')
@Index(['userId'])
@Index(['badgeType'])
@Index(['earnedAt'])
export class ForumUserBadge extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Badge identifier',
  })
  badgeId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Badge name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Badge description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ForumBadgeType,
    comment: 'Badge type',
  })
  badgeType: ForumBadgeType;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Badge icon URL',
  })
  iconUrl?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '#FFD700',
    comment: 'Badge color',
  })
  color: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Points awarded for badge',
  })
  points: number;

  @Column({
    type: 'timestamp',
    comment: 'Badge earned timestamp',
    nullable: true,
  })
  earnedAt: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related post/thread ID',
  })
  relatedId?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Badge metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;
}

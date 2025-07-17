import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity('forum_user_reputations')
@Index(['userId'], { unique: true })
@Index(['score'])
@Index(['rank'])
export class ForumUserReputation extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total reputation score',
  })
  score: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'User rank based on reputation',
  })
  rank: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total posts made',
  })
  totalPosts: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total threads created',
  })
  totalThreads: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total upvotes received',
  })
  totalUpvotes: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total downvotes received',
  })
  totalDownvotes: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total accepted answers',
  })
  totalAcceptedAnswers: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total helpful votes received',
  })
  totalHelpfulVotes: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Best answer streak',
  })
  bestAnswerStreak: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Current answer streak',
  })
  currentAnswerStreak: number;

  @Column({
    type: 'date',
    nullable: true,
    comment: 'Last activity date',
  })
  lastActivityDate?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Points earned today',
  })
  todayPoints: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Points earned this week',
  })
  weekPoints: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Points earned this month',
  })
  monthPoints: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Reputation history summary',
  })
  history?: Array<{
    date: string;
    points: number;
    reason: string;
  }>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'User badges earned',
  })
  badges?: Array<{
    type: string;
    name: string;
    earnedAt: Date;
    metadata?: Record<string, any>;
  }>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Reputation metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;
}

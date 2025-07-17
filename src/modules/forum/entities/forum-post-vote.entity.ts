import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumVoteType } from '@/common/enums/forum.enums';
import { ForumPost } from './forum-post.entity';
import { User } from '../../user/entities/user.entity';

@Entity('forum_post_votes')
@Index(['postId', 'userId'], { unique: true })
@Index(['postId'])
@Index(['userId'])
@Index(['voteType'])
export class ForumPostVote extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Post ID',
  })
  postId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID who voted',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ForumVoteType,
    comment: 'Type of vote',
  })
  voteType: ForumVoteType;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Vote value (1 for upvote, -1 for downvote)',
  })
  value: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Vote metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ForumPost, post => post.votes)
  @JoinColumn({ name: 'postId' })
  post: ForumPost;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;
}

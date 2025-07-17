import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumPostType, ForumPostStatus } from '@/common/enums/forum.enums';
import { ForumThread } from './forum-thread.entity';
import { User } from '../../user/entities/user.entity';
import { ForumPostVote } from './forum-post-vote.entity';
import { ForumPostAttachment } from './forum-post-attachment.entity';

@Entity('forum_posts')
@Index(['threadId'])
@Index(['authorId'])
@Index(['type'])
@Index(['status'])
@Index(['parentId'])
@Index(['createdAt'])
@Index(['isAccepted'])
export class ForumPost extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Thread ID this post belongs to',
  })
  threadId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Post author ID',
  })
  authorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Parent post ID for replies',
  })
  parentId?: string;

  @Column({
    type: 'text',
    comment: 'Post content',
  })
  content: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Post content in HTML format',
  })
  contentHtml?: string;

  @Column({
    type: 'enum',
    enum: ForumPostType,
    default: ForumPostType.REPLY,
    comment: 'Type of post',
  })
  type: ForumPostType;

  @Column({
    type: 'enum',
    enum: ForumPostStatus,
    default: ForumPostStatus.PUBLISHED,
    comment: 'Post status',
  })
  status: ForumPostStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is post accepted as answer',
  })
  isAccepted: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is post edited',
  })
  isEdited: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last edit timestamp',
  })
  editedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who edited post',
  })
  editedBy?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Edit reason',
  })
  editReason?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of upvotes',
  })
  upvoteCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of downvotes',
  })
  downvoteCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Post score (upvotes - downvotes)',
  })
  score: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of helpful votes',
  })
  helpfulCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of replies to this post',
  })
  replyCount: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is post reported',
  })
  isReported: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of reports',
  })
  reportCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Post mentions',
  })
  mentions?: {
    users?: string[];
    roles?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Post metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ForumThread, thread => thread.posts)
  @JoinColumn({ name: 'threadId' })
  thread: ForumThread;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => ForumPost, post => post.replies)
  @JoinColumn({ name: 'parentId' })
  parent?: ForumPost;

  @OneToMany(() => ForumPost, post => post.parent)
  replies?: ForumPost[];

  @OneToMany(() => ForumPostVote, vote => vote.post)
  votes?: ForumPostVote[];

  @OneToMany(() => ForumPostAttachment, attachment => attachment.post)
  attachments?: ForumPostAttachment[];
}

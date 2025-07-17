import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumThreadStatus, ForumPostType } from '@/common/enums/forum.enums';
import { ForumCategory } from './forum-category.entity';
import { ForumPost } from './forum-post.entity';
import { User } from '../../user/entities/user.entity';
import { ForumTag } from './forum-tag.entity';
import { ForumThreadTag } from './forum-thread-tag.entity';

@Entity('forum_threads')
@Index(['categoryId'])
@Index(['authorId'])
@Index(['status'])
@Index(['isPinned'])
@Index(['isFeatured'])
@Index(['isLocked'])
@Index(['lastActivityAt'])
export class ForumThread extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Thread title',
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'URL-friendly thread identifier',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Thread summary or excerpt',
  })
  summary?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Thread author ID',
  })
  authorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Category ID this thread belongs to',
  })
  categoryId: string;

  @Column({
    type: 'enum',
    enum: ForumPostType,
    default: ForumPostType.THREAD,
    comment: 'Type of thread (thread, question)',
  })
  type: ForumPostType;

  @Column({
    type: 'enum',
    enum: ForumThreadStatus,
    default: ForumThreadStatus.OPEN,
    comment: 'Thread status',
  })
  status: ForumThreadStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is thread pinned',
  })
  isPinned: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is thread featured',
  })
  isFeatured: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is thread locked',
  })
  isLocked: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is thread resolved (for questions)',
  })
  isResolved: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of accepted answer post',
  })
  acceptedAnswerId?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of views',
  })
  viewCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of replies',
  })
  replyCount: number;

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
    comment: 'Thread score (upvotes - downvotes)',
  })
  score: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last activity timestamp',
  })
  lastActivityAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of last post in thread',
  })
  lastPostId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who made last post',
  })
  lastPostUserId?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thread locked timestamp',
  })
  lockedAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who locked thread',
  })
  lockedBy?: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Reason for locking thread',
  })
  lockReason?: string | null;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thread metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => ForumCategory, category => category.threads)
  @JoinColumn({ name: 'categoryId' })
  category: ForumCategory;

  @OneToMany(() => ForumPost, post => post.thread)
  posts?: ForumPost[];

  @OneToMany(() => ForumThreadTag, threadTag => threadTag.thread)
  threadTags?: ForumThreadTag[];

  // Virtual properties
  get tags(): ForumTag[] {
    return this.threadTags?.map(tt => tt.tag) || [];
  }
}

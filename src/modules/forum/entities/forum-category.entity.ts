import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumThread } from './forum-thread.entity';
import { ForumCategoryPermission } from './forum-category-permission.entity';

@Entity('forum_categories')
@Index(['parentId'])
@Index(['slug'])
@Index(['orderIndex'])
@Index(['isActive'])
export class ForumCategory extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Category name',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'URL-friendly category identifier',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Category description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Parent category ID for hierarchical structure',
  })
  parentId?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Category icon URL',
  })
  iconUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Category banner image URL',
  })
  bannerUrl?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '#3B82F6',
    comment: 'Category color theme',
  })
  color: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Display order index',
  })
  orderIndex: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Is category active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is category featured',
  })
  isFeatured: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is category private (invite only)',
  })
  isPrivate: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Requires approval to post',
  })
  requiresApproval: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of threads in category',
  })
  threadCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of posts in category',
  })
  postCount: number;

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
    comment: 'ID of last post in category',
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
    type: 'json',
    nullable: true,
    comment: 'Category settings and configuration',
  })
  settings?: {
    allowGuests?: boolean;
    allowImages?: boolean;
    allowAttachments?: boolean;
    maxAttachmentSize?: number;
    allowPolls?: boolean;
    autoLockAfterDays?: number;
    maxPostsPerThread?: number;
    moderationRequired?: boolean;
    [key: string]: any;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Category metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ForumCategory, category => category.children)
  @JoinColumn({ name: 'parentId' })
  parent?: ForumCategory;

  @OneToMany(() => ForumCategory, category => category.parent)
  children?: ForumCategory[];

  @OneToMany(() => ForumThread, thread => thread.category)
  threads?: ForumThread[];

  @OneToMany(() => ForumCategoryPermission, permission => permission.category)
  permissions?: ForumCategoryPermission[];
}

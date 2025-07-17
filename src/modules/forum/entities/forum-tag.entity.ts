import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumThreadTag } from './forum-thread-tag.entity';

@Entity('forum_tags')
@Index(['name'], { unique: true })
@Index(['slug'])
@Index(['isActive'])
export class ForumTag extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Tag name',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'URL-friendly tag identifier',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Tag description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: '#6B7280',
    comment: 'Tag color',
  })
  color: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Is tag active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is tag featured',
  })
  isFeatured: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of threads using this tag',
  })
  usageCount: number;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of user who created tag',
  })
  createdBy?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Tag metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @OneToMany(() => ForumThreadTag, threadTag => threadTag.tag)
  threadTags?: ForumThreadTag[];
}

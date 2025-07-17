import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumThread } from './forum-thread.entity';
import { ForumTag } from './forum-tag.entity';

@Entity('forum_thread_tags')
@Index(['threadId', 'tagId'], { unique: true })
@Index(['threadId'])
@Index(['tagId'])
export class ForumThreadTag extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Thread ID',
  })
  threadId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Tag ID',
  })
  tagId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID of user who added this tag',
  })
  addedBy: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Tag metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ForumThread, thread => thread.threadTags)
  @JoinColumn({ name: 'threadId' })
  thread: ForumThread;

  @ManyToOne(() => ForumTag, tag => tag.threadTags)
  @JoinColumn({ name: 'tagId' })
  tag: ForumTag;
}

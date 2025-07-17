import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumReportReason } from '@/common/enums/forum.enums';
import { ForumPost } from './forum-post.entity';
import { User } from '../../user/entities/user.entity';

@Entity('forum_post_reports')
@Index(['postId'])
@Index(['reporterId'])
@Index(['status'])
@Index(['reason'])
export class ForumPostReport extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Post ID being reported',
  })
  postId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID who reported',
  })
  reporterId: string;

  @Column({
    type: 'enum',
    enum: ForumReportReason,
    comment: 'Reason for report',
  })
  reason: ForumReportReason;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Additional details about report',
  })
  details?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
    comment: 'Report status',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Moderator who handled report',
  })
  handledBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Report handled timestamp',
  })
  handledAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Moderator notes',
  })
  moderatorNotes?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Report metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ForumPost, post => post.id)
  @JoinColumn({ name: 'postId' })
  post: ForumPost;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'handledBy' })
  handler?: User;
}

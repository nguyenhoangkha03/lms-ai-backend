import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumPost } from './forum-post.entity';

@Entity('forum_post_attachments')
@Index(['postId'])
@Index(['fileType'])
export class ForumPostAttachment extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Post ID',
  })
  postId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Original filename',
  })
  filename: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'File URL',
  })
  fileUrl: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'File MIME type',
  })
  mimeType: string;

  @Column({
    type: 'varchar',
    length: 20,
    comment: 'File type category',
  })
  fileType: string;

  @Column({
    type: 'bigint',
    comment: 'File size in bytes',
  })
  fileSize: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Thumbnail URL for images',
  })
  thumbnailUrl?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of downloads',
  })
  downloadCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'File metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ForumPost, post => post.attachments)
  @JoinColumn({ name: 'postId' })
  post: ForumPost;
}

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('chat_files')
export class ChatFile extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  messageId: string;

  @Column({ type: 'varchar', length: 36 })
  uploadedBy: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Original filename',
  })
  originalName: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'File storage path/URL',
  })
  filePath: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'File MIME type',
  })
  mimeType: string;

  @Column({
    type: 'bigint',
    comment: 'File size in bytes',
  })
  fileSize: number;

  @Column({
    type: 'varchar',
    length: 50,
    comment: 'File extension',
  })
  fileExtension: string;

  @Column({
    type: 'enum',
    enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
    default: 'other',
    comment: 'File category',
  })
  fileCategory: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'File thumbnail URL for images/videos',
  })
  thumbnailUrl?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Duration for audio/video files in seconds',
  })
  duration?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'File metadata (dimensions, codec, etc.)',
  })
  metadata?: {
    width?: number;
    height?: number;
    codec?: string;
    bitrate?: number;
    resolution?: string;
    [key: string]: any;
  };

  @Column({
    type: 'enum',
    enum: ['uploading', 'processing', 'ready', 'failed', 'deleted'],
    default: 'uploading',
    comment: 'File processing status',
  })
  status: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Processing error message if failed',
  })
  errorMessage?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Download count',
  })
  downloadCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'File expiry date',
  })
  expiresAt?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is file public/shareable',
  })
  isPublic: boolean;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'File description/caption',
  })
  description?: string;

  // Relationships
  @ManyToOne(() => ChatMessage, message => message.files)
  @JoinColumn({ name: 'messageId' })
  message: ChatMessage;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'uploadedBy' })
  uploader: User;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt! <= new Date();
  }

  get formattedFileSize(): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

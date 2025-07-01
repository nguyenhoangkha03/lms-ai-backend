import { Entity, Column, Index, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { FileType, FileRelatedType } from '@/common/enums/course.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@Entity('file_uploads')
@Index(['uploaderId'])
@Index(['fileType'])
@Index(['relatedType'])
@Index(['relatedLessonId'])
@Index(['relatedCourseId'])
@Index(['isPublic'])
@Index(['uploadedAt'])
export class FileUpload extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID who uploaded the file',
  })
  uploaderId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Original filename',
  })
  originalName: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Stored filename (usually UUID + extension)',
  })
  storedName: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'File storage path',
  })
  filePath: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Full URL to access the file',
  })
  fileUrl: string;

  @Column({
    type: 'bigint',
    comment: 'File size in bytes',
  })
  fileSize: number;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'MIME type of the file',
  })
  mimeType: string;

  @Column({
    type: 'enum',
    enum: FileType,
    comment: 'File type category',
  })
  fileType: FileType;

  @Column({
    type: 'enum',
    enum: FileRelatedType,
    comment: 'What this file is related to',
  })
  relatedType: FileRelatedType;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of the related lesson entity',
  })
  relatedLessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of the related course entity',
  })
  relatedCourseId?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is file publicly accessible',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is file temporarily uploaded',
  })
  isTemporary: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'File extension',
  })
  extension?: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'File hash for duplicate detection',
  })
  fileHash?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Image/video metadata',
  })
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    fps?: number;
    codec?: string;
    bitrate?: number;
    thumbnail?: string;
    exif?: Record<string, any>;
  };

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times file was downloaded',
  })
  downloadCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last time file was accessed',
  })
  lastAccessedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'File expiration date for temporary files',
  })
  expiresAt?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Alt text for images',
  })
  altText?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'File description',
  })
  description?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'File tags for organization',
  })
  tags?: string[];

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Upload timestamp',
  })
  uploadedAt: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional file metadata',
  })
  additionalMetadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @ManyToOne(() => Course, course => course.files, { nullable: true })
  @JoinColumn({ name: 'relatedCourseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.files, { nullable: true })
  @JoinColumn({ name: 'relatedLessonId' })
  lesson?: Lesson;

  // Virtual properties
  get formattedFileSize(): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  get isImage(): boolean {
    return this.fileType === FileType.IMAGE;
  }

  get isVideo(): boolean {
    return this.fileType === FileType.VIDEO;
  }

  get isAudio(): boolean {
    return this.fileType === FileType.AUDIO;
  }

  get isDocument(): boolean {
    return this.fileType === FileType.DOCUMENT;
  }

  get isExpired(): boolean {
    return !!(this.expiresAt && new Date() > this.expiresAt);
  }

  get canAccess(): boolean {
    return !this.isExpired && (this.isPublic || !this.isTemporary);
  }

  get thumbnailUrl(): string | null {
    if (this.metadata?.thumbnail) {
      return this.metadata.thumbnail;
    }

    if (this.isImage) {
      return this.fileUrl;
    }

    return null;
  }

  // Hooks
  @BeforeInsert()
  setDefaults() {
    if (this.originalName && !this.extension) {
      const lastDot = this.originalName.lastIndexOf('.');
      if (lastDot > 0) {
        this.extension = this.originalName.substring(lastDot + 1).toLowerCase();
      }
    }

    // Set file type based on MIME type if not set
    if (!this.fileType && this.mimeType) {
      if (this.mimeType.startsWith('image/')) {
        this.fileType = FileType.IMAGE;
      } else if (this.mimeType.startsWith('video/')) {
        this.fileType = FileType.VIDEO;
      } else if (this.mimeType.startsWith('audio/')) {
        this.fileType = FileType.AUDIO;
      } else if (this.mimeType.includes('document') || this.mimeType.includes('pdf')) {
        this.fileType = FileType.DOCUMENT;
      } else {
        this.fileType = FileType.OTHER;
      }
    }

    this.uploadedAt = new Date();
  }
}

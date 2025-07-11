import { Entity, Column, Index, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { FileType, FileRelatedType } from '@/common/enums/course.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';
import { FileAccessLevel, ProcessingStatus } from '@/common/enums/file.enums';

@Entity('file_uploads')
@Index(['uploaderId'])
@Index(['fileType'])
@Index(['relatedType'])
@Index(['lessonId'])
@Index(['courseId'])
@Index(['isPublic'])
@Index(['uploadedAt'])
export class FileUpload extends BaseEntity {
  // === CORE FIELDS === //
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Lesson this file belongs to',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Course this file belongs to',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Original filename',
  })
  originalName: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Stored filename on disk',
  })
  storedName: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Relative file path from upload root',
  })
  filePath: string;

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
    comment: 'Category of file type',
  })
  fileType: FileType;

  @Column({
    type: 'enum',
    enum: FileAccessLevel,
    default: FileAccessLevel.ENROLLED_ONLY,
    comment: 'File access permission level',
  })
  accessLevel: FileAccessLevel;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether file is active and accessible',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether file is publicly accessible',
  })
  isPublic: boolean;

  // === MEDIA SPECIFIC FIELDS === //
  @Column({
    type: 'int',
    nullable: true,
    comment: 'Duration in seconds for video/audio files',
  })
  duration?: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Resolution for video/image files (e.g., 1920x1080)',
  })
  resolution?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Bitrate for video/audio files',
  })
  bitrate?: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL to optimized version of the file',
  })
  optimizedPath?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL to thumbnail image',
  })
  thumbnailPath?: string;

  // === PROCESSING STATUS === //
  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
    comment: 'File processing status',
  })
  processingStatus: ProcessingStatus;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Processing error message if failed',
  })
  processingError?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Array of processed file versions',
  })
  processedVersions?: string[];

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Processing start timestamp',
  })
  processingStartedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Processing completion timestamp',
  })
  processingCompletedAt?: Date;

  // === SECURITY & TRACKING === //

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'File checksum for integrity verification',
  })
  checksum?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times file has been downloaded',
  })
  downloadCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times file has been viewed/streamed',
  })
  viewCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last download timestamp',
  })
  lastDownloadedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last view timestamp',
  })
  lastViewedAt?: Date;

  // === CONTENT MODERATION === //
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether file has been flagged for review',
  })
  isFlagged: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Moderator who reviewed this file',
  })
  moderatedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Moderation timestamp',
  })
  moderatedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Moderation notes or reason',
  })
  moderationNotes?: string;

  // === METADATA === //
  @Column({
    type: 'json',
    nullable: true,
    comment: 'File-specific settings and configuration',
  })
  settings?: {
    allowDownload?: boolean;
    allowStreaming?: boolean;
    autoDelete?: boolean;
    autoDeleteDate?: Date;
    compressionQuality?: number;
    watermarkEnabled?: boolean;
    [key: string]: any;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional file metadata and properties',
  })
  metadata?: {
    description?: string;
    alt?: string;
    caption?: string;
    tags?: string[];
    exifData?: Record<string, any>;
    language?: string;
    transcoded?: boolean;
    virusScanResult?: 'clean' | 'infected' | 'suspicious' | 'pending';
    virusScanDate?: Date;
    [key: string]: any;
  };

  // UPDATE OLD //
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID who uploaded the file',
  })
  uploaderId: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Full URL to access the file',
  })
  fileUrl: string;

  @Column({
    type: 'enum',
    enum: FileRelatedType,
    comment: 'What this file is related to',
  })
  relatedType: FileRelatedType;

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
    type: 'timestamp',
    nullable: true,
    comment: 'File expiration date for temporary files',
  })
  expiresAt?: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Upload timestamp',
  })
  uploadedAt: Date;

  // Relationships
  @ManyToOne(() => User, user => user.id, { eager: false })
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @ManyToOne(() => Course, course => course.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'moderatedBy' })
  moderator?: User;

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

  get isProcessed(): boolean {
    return this.processingStatus === ProcessingStatus.COMPLETED;
  }

  get isExpired(): boolean {
    return !!(this.expiresAt && new Date() > this.expiresAt);
  }

  get isProcessing(): boolean {
    return this.processingStatus === ProcessingStatus.PROCESSING;
  }

  get hasProcessingFailed(): boolean {
    return this.processingStatus === ProcessingStatus.FAILED;
  }

  get canBeDownloaded(): boolean {
    return (
      this.isActive &&
      !this.isFlagged &&
      this.processingStatus !== ProcessingStatus.FAILED &&
      this.settings?.allowDownload !== false
    );
  }

  get canBeStreamed(): boolean {
    return (
      this.isActive &&
      !this.isFlagged &&
      (this.isVideo || this.isAudio) &&
      this.processingStatus === ProcessingStatus.COMPLETED &&
      this.settings?.allowStreaming !== false
    );
  }

  get fileExtension(): string {
    return this.originalName.split('.').pop()?.toLowerCase() || '';
  }

  get processingDuration(): number | null {
    if (!this.processingStartedAt) return null;

    const endTime = this.processingCompletedAt || new Date();
    return Math.round((endTime.getTime() - this.processingStartedAt.getTime()) / 1000);
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

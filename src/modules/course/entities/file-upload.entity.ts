import { Entity, Column, Index, ManyToOne, JoinColumn, BeforeInsert } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { FileType, FileRelatedType } from '@/common/enums/course.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';
import { FileAccessLevel, ProcessingStatus } from '@/common/enums/file.enums';
import { ModerationFlag } from '../services/content-moderation.service';

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
    comment: 'ID của bài học mà tệp này được đính kèm',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của khóa học mà tệp này được đính kèm',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên tệp gốc khi người dùng tải lên',
  })
  originalName: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên tệp đã được đổi tên để lưu trên máy chủ, tránh trùng lặp',
  })
  storedName: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Đường dẫn tương đối đến vị trí lưu tệp trên hệ thống lưu trữ (ví dụ: AWS S3)',
  })
  filePath?: string;

  @Column({
    type: 'bigint',
    comment: 'Kích thước của tệp',
  })
  fileSize: number;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Loại tệp chuẩn (ví dụ: video/mp4, application/pdf)',
  })
  mimeType: string;

  @Column({
    type: 'enum',
    enum: FileType,
    comment: 'Loại tệp chung (image, video, document).',
  })
  fileType: FileType;

  @Column({
    type: 'enum',
    enum: FileAccessLevel,
    default: FileAccessLevel.ENROLLED_ONLY,
    comment: 'Quyền truy cập tệp (enrolled_only - chỉ sinh viên đã đăng ký)',
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
    comment: 'Thời lượng (giây) cho các tệp video/audio',
  })
  duration?: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Độ phân giải (ví dụ: 1920x1080) cho các tệp video/ảnh',
  })
  resolution?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Tốc độ bit cho tệp video/âm thanh',
  })
  bitrate?: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL đến phiên bản đã được xử lý (nén, chuyển đổi định dạng) của tệp',
  })
  optimizedPath?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL đến ảnh thumbnail được tạo tự động cho tệp',
  })
  thumbnailPath?: string;

  // === PROCESSING STATUS === //
  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
    comment: 'Trạng thái xử lý tệp sau khi tải lên (pending, processing, completed)',
  })
  processingStatus: ProcessingStatus;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Xử lý thông báo lỗi nếu không thành công',
  })
  processingError?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Mảng các phiên bản tệp đã xử lý',
  })
  processedVersions?: string[];

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Dấu thời gian bắt đầu xử lý',
  })
  processingStartedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Đang xử lý dấu thời gian hoàn thành',
  })
  processingCompletedAt?: Date;

  // === SECURITY & TRACKING === //

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Một chuỗi hash (ví dụ: MD5, SHA256) để kiểm tra tính toàn vẹn của tệp',
  })
  checksum?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số lần tệp được tải xuống',
  })
  downloadCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số lần tệp được xem hoặc phát trực tuyến',
  })
  viewCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Dấu thời gian tải xuống lần cuối',
  })
  lastDownloadedAt?: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL để tải xuống tệp',
  })
  downloadUrl?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Dấu thời gian xem lần cuối',
  })
  lastViewedAt?: Date;

  // === CONTENT MODERATION === //
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Tệp đã được gắn cờ để xem xét chưa',
  })
  isFlagged: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Người kiểm duyệt đã xem xét tập tin này',
  })
  moderatedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Dấu thời gian kiểm duyệt',
  })
  moderatedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú hoặc lý do kiểm duyệt',
  })
  moderationNotes?: string;

  // === METADATA === //
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Cài đặt và cấu hình cụ thể cho từng tệp',
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
    comment: 'Siêu dữ liệu và thuộc tính tệp bổ sung',
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

    moderationResult?: {
      score: number;
      flags: ModerationFlag[];
      suggestions: string[];
      timestamp: string;
    };
  };

  // UPDATE OLD //
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID của người dùng đã tải tệp này lên',
  })
  uploaderId: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Đường dẫn URL đầy đủ để truy cập tệp',
  })
  fileUrl: string;

  @Column({
    type: 'enum',
    enum: FileRelatedType,
    comment:
      'xác định mục đích của tệp, ví dụ: course_thumbnail (ảnh bìa khóa học), lesson_video (video bài học), user_avatar (ảnh đại diện)',
  })
  relatedType: FileRelatedType;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) cho biết đây có phải là tệp được tải lên tạm thời và sẽ bị xóa sau một khoảng thời gian',
  })
  isTemporary: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Phần mở rộng tập tin',
  })
  extension?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm tệp tạm thời sẽ bị xóa',
  })
  expiresAt?: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Tải lên dấu thời gian',
  })
  uploadedAt: Date;

  // Relationships
  @ManyToOne(() => User, user => user.id, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @ManyToOne(() => Course, course => course.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;

  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
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

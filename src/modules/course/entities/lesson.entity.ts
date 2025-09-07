import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { LessonType } from '@/common/enums/course.enums';
import { Course } from './course.entity';
import { CourseSection } from './course-section.entity';
import { LessonProgress } from './lesson-progress.entity';
import { FileUpload } from './file-upload.entity';
import { ContentVersion } from './content-version.entity';
import { ContentModerationStatus, ContentStatus } from '@/common/enums/content.enums';
import { ModerationFlag } from '../services/content-moderation.service';
import { TutoringSession } from '@/modules/intelligent-tutoring/entities/tutoring-session.entity';
import { AdaptiveContent } from '@/modules/intelligent-tutoring/entities/adaptive-content.entity';

@Entity('lessons')
@Index(['courseId'])
@Index(['sectionId'])
@Index(['orderIndex'])
@Index(['lessonType'])
@Index(['isPreview'])
export class Lesson extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới courses.id',
  })
  courseId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Khóa ngoại liên kết tới course_sections.id',
  })
  sectionId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tiêu đề bài học',
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Tên phiên bản rút gọn của tiêu đề bài học, dùng để tạo đường dẫn URL',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả bài học',
  })
  description?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Nội dung văn bản của bài học, thường ở định dạng HTML hoặc Markdown',
  })
  content?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến video bài giảng (nếu có).',
  })
  videoUrl?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời lượng của video, tính bằng giây',
  })
  videoDuration?: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến file âm thanh (ví dụ: podcast)',
  })
  audioUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu danh sách các tài liệu liên quan đến bài học (slide, file mã nguồn, bài tập...)',
  })
  attachments?: {
    filename: string;
    url: string;
    fileSize: number;
    mimeType: string;
  }[];

  @Column({
    type: 'enum',
    enum: LessonType,
    default: LessonType.TEXT,
    comment:
      'Phân loại nội dung chính của bài học (video, text, quiz, live_session - buổi học trực tiếp).',
  })
  lessonType: LessonType;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số nguyên xác định vị trí của bài học trong một chương.',
  })
  orderIndex: number;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) cho phép người dùng chưa đăng ký khóa học có thể xem trước nội dung bài học này',
  })
  isPreview: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      ': Cờ (true/false) xác định sinh viên có bắt buộc phải hoàn thành bài học này để tiếp tục hay không',
  })
  isMandatory: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Trạng thái hoạt động của bài học',
  })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
    comment: 'Trạng thái của bài học (draft - bản nháp, published - đã xuất bản).',
  })
  status: ContentStatus;

  @Column({
    type: 'enum',
    enum: ContentModerationStatus,
    default: ContentModerationStatus.PENDING,
    comment: 'Trạng thái kiểm duyệt nội dung của admin (pending - đang chờ, approved - đã duyệt).',
  })
  moderationStatus: ContentModerationStatus;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của admin đã thực hiện kiểm duyệt',
  })
  moderatedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian nội dung được kiểm duyệt',
  })
  moderatedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú hoặc lý do của admin khi duyệt/từ chối',
  })
  moderationReason?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời gian ước tính (phút) để sinh viên hoàn thành bài học.',
  })
  estimatedDuration?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số điểm thành tích mà sinh viên nhận được khi hoàn thành bài học.',
  })
  points: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Có hiệu lực từ',
  })
  availableFrom?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Có hiệu lực đến',
  })
  availableUntil?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm bài học được công khai',
  })
  publishedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON liệt kê các mục tiêu học tập cần đạt được sau khi hoàn thành bài học',
  })
  objectives?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON liệt kê các bài học cần phải hoàn thành trước bài học này.',
  })
  prerequisites?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa cấu hình cho các yếu tố tương tác trong bài học.',
  })
  interactiveElements?: {
    quizzes?: any[];
    polls?: any[];
    discussions?: any[];
    exercises?: any[];
  };

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL ảnh thu nhỏ',
  })
  thumbnailUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON chứa bản ghi nội dung của video, phục vụ cho người khiếm thính và hỗ trợ tìm kiếm',
  })
  transcript?: {
    language: string;
    content: string;
    timestamps?: { time: number; text: string }[];
  }[];

  // === CONTENT VERSIONING === //
  @Column({
    type: 'int',
    default: 1,
    comment: 'Số hiệu của phiên bản nội dung đang được áp dụng.',
  })
  currentVersion: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết bài học có những thay đổi chưa được xuất bản hay không',
  })
  hasDraftChanges: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm nội dung bài học được chỉnh sửa lần cuối.',
  })
  lastContentUpdate?: Date;

  // === ANALYTICS & TRACKING === //
  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số lần bài học được xem',
  })
  viewCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số lần bài học được hoàn thành',
  })
  completionCount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Điểm đánh giá trung bình của bài học từ sinh viên.',
  })
  averageRating: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Thời gian trung bình (giây) mà sinh viên dành cho bài học.',
  })
  averageTimeSpent: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Tỷ lệ phần trăm sinh viên hoàn thành bài học sau khi đã bắt đầu.',
  })
  completionRate: number;

  // === SETTINGS & METADATA === //
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu trữ các cài đặt/tùy chọn riêng của bài học',
  })
  settings?: {
    allowComments?: boolean;
    showProgress?: boolean;
    allowDownload?: boolean;
    autoPlay?: boolean;
    showTranscript?: boolean;
    allowSpeedControl?: boolean;
    maxPlaybackSpeed?: number;
    watermarkEnabled?: boolean;
    [key: string]: any;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin mở rộng khác',
  })
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
    language?: string;
    subtitles?: string[];
    contentWarnings?: string[];
    accessibility?: {
      hasSubtitles?: boolean;
      hasTranscript?: boolean;
      hasAudioDescription?: boolean;
    };
    seo?: {
      metaTitle?: string;
      metaDescription?: string;
      keywords?: string[];
    };
    [key: string]: any;

    moderationResult?: {
      status: ContentModerationStatus;
      score: number;
      flags: ModerationFlag[];
      suggestions: string[];
      requiresManualReview: boolean;
    };
  };

  // Relationships
  @ManyToOne(() => Course, course => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToOne(() => CourseSection, section => section.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section?: CourseSection;

  @OneToMany(() => LessonProgress, progress => progress.lesson)
  progress?: LessonProgress[];

  @OneToMany(() => FileUpload, file => file.lesson)
  files?: FileUpload[];

  @OneToMany(() => ContentVersion, version => version.lesson)
  versions?: ContentVersion[];

  @OneToMany(() => TutoringSession, session => session.lesson)
  tutoringSessions: TutoringSession[];

  @OneToMany(() => AdaptiveContent, content => content.lesson, {
    cascade: true,
  })
  adaptiveContent: AdaptiveContent[];

  // Virtual properties
  get isPublished(): boolean {
    return this.status === ContentStatus.PUBLISHED;
  }

  get isModerated(): boolean {
    return this.moderationStatus === ContentModerationStatus.APPROVED;
  }

  get canBePublished(): boolean {
    return (
      this.moderationStatus === ContentModerationStatus.APPROVED ||
      this.moderationStatus === ContentModerationStatus.PENDING
    );
  }
  get formattedDuration(): string {
    if (!this.estimatedDuration) return '0 min';

    const hours = Math.floor(this.estimatedDuration / 60);
    const minutes = this.estimatedDuration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  get isAccessible(): boolean {
    if (!this.isActive || this.status !== ContentStatus.PUBLISHED) {
      return false;
    }

    const now = new Date();

    if (this.availableFrom && now < this.availableFrom) {
      return false;
    }

    if (this.availableUntil && now > this.availableUntil) {
      return false;
    }

    return true;
  }

  get isAvailable(): boolean {
    const now = new Date();

    if (this.availableFrom && now < this.availableFrom) {
      return false;
    }

    if (this.availableUntil && now > this.availableUntil) {
      return false;
    }

    return this.isActive;
  }

  get lessonTypeDisplay(): string {
    const typeMap = {
      [LessonType.VIDEO]: 'Video',
      [LessonType.TEXT]: 'Text',
      [LessonType.AUDIO]: 'Audio',
      [LessonType.INTERACTIVE]: 'Interactive',
      [LessonType.QUIZ]: 'Quiz',
      [LessonType.ASSIGNMENT]: 'Assignment',
      [LessonType.LIVE_SESSION]: 'Live Session',
      [LessonType.DOWNLOAD]: 'Download',
    };
    return typeMap[this.lessonType] || this.lessonType;
  }

  get hasAttachments(): boolean {
    return !!this.attachments?.length;
  }

  get hasTranscript(): boolean {
    return !!this.transcript?.length;
  }
}

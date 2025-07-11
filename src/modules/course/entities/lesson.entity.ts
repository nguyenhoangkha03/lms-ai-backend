import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { LessonType } from '@/common/enums/course.enums';
import { Course } from './course.entity';
import { CourseSection } from './course-section.entity';
import { LessonProgress } from './lesson-progress.entity';
import { FileUpload } from './file-upload.entity';
import { ContentVersion } from './content-version.entity';
import { ContentModerationStatus, ContentStatus } from '@/common/enums/content.enums';

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
    comment: 'Course ID this lesson belongs to',
  })
  courseId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Section ID this lesson belongs to',
  })
  sectionId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Lesson title',
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'URL-friendly slug',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Lesson description',
  })
  description?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Lesson content (HTML/Markdown)',
  })
  content?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Video URL for video lessons',
  })
  videoUrl?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Video duration in seconds',
  })
  videoDuration?: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Audio URL for audio lessons',
  })
  audioUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lesson attachments and resources',
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
    comment: 'Type of lesson content',
  })
  lessonType: LessonType;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Order within section or course',
  })
  orderIndex: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Allow preview without enrollment',
  })
  isPreview: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Lesson completion required to proceed',
  })
  isMandatory: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Lesson active status',
  })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
    comment: 'Content publication status',
  })
  status: ContentStatus;

  @Column({
    type: 'enum',
    enum: ContentModerationStatus,
    default: ContentModerationStatus.PENDING,
    comment: 'Content moderation status',
  })
  moderationStatus: ContentModerationStatus;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Moderator who reviewed this content',
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
    comment: 'Moderation reason/feedback',
  })
  moderationReason?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Estimated completion time in minutes',
  })
  estimatedDuration?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Points awarded for completion',
  })
  points: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Lesson availability start date',
  })
  availableFrom?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Lesson availability end date',
  })
  availableUntil?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Content published timestamp',
  })
  publishedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lesson learning objectives',
  })
  objectives?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Prerequisites for this lesson',
  })
  prerequisites?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Interactive elements configuration',
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
    comment: 'Lesson thumbnail image URL',
  })
  thumbnailUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Video transcript for accessibility',
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
    comment: 'Current content version number',
  })
  currentVersion: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether content has draft changes',
  })
  hasDraftChanges: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last content modification timestamp',
  })
  lastContentUpdate?: Date;

  // === ANALYTICS & TRACKING === //
  @Column({
    type: 'int',
    default: 0,
    comment: 'Total views count',
  })
  viewCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total completions count',
  })
  completionCount: number;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    comment: 'Average lesson rating',
  })
  averageRating: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Average time spent in seconds',
  })
  averageTimeSpent: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Lesson completion rate percentage',
  })
  completionRate: number;

  // === SETTINGS & METADATA === //
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lesson settings and preferences',
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
    comment: 'Additional lesson metadata',
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

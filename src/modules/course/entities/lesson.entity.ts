import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { LessonType } from '@/common/enums/course.enums';
import { Course } from './course.entity';
import { CourseSection } from './course-section.entity';
import { LessonProgress } from './lesson-progress.entity';
import { FileUpload } from './file-upload.entity';

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

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lesson settings and preferences',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional lesson metadata',
  })
  metadata?: Record<string, any>;

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

  // Virtual properties
  get formattedDuration(): string {
    if (this.lessonType === LessonType.VIDEO && this.videoDuration) {
      const hours = Math.floor(this.videoDuration / 3600);
      const minutes = Math.floor((this.videoDuration % 3600) / 60);
      const seconds = this.videoDuration % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    if (this.estimatedDuration) {
      return `${this.estimatedDuration} min`;
    }

    return 'Not specified';
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
    // return this.attachments && this.attachments.length > 0;
    return !!this.attachments?.length;
  }

  get hasTranscript(): boolean {
    // return this.transcript && this.transcript.length > 0;
    return !!this.transcript?.length;
  }
}

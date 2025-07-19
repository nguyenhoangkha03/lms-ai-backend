import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  CourseLevel,
  CourseStatus,
  CourseLanguage,
  CoursePricing,
} from '@/common/enums/course.enums';
import { User } from '../../user/entities/user.entity';
import { Category } from './category.entity';
import { CourseSection } from './course-section.entity';
import { Enrollment } from './enrollment.entity';
import { FileUpload } from './file-upload.entity';
import { TutoringSession } from '@/modules/intelligent-tutoring/entities/tutoring-session.entity';
import { AdaptiveContent } from '@/modules/intelligent-tutoring/entities/adaptive-content.entity';

@Entity('courses')
@Index(['teacherId'])
@Index(['categoryId'])
@Index(['level', 'status'])
@Index(['price', 'isFree'])
@Index(['rating', 'totalEnrollments'])
@Index(['publishedAt'])
@Index(['featured', 'status'])
export class Course extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Course title',
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
    comment: 'Course description',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Short course description for previews',
  })
  shortDescription?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Course thumbnail image URL',
  })
  thumbnailUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Course trailer video URL',
  })
  trailerVideoUrl?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Teacher/Instructor ID',
  })
  teacherId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Course category ID',
  })
  categoryId: string;

  @Column({
    type: 'enum',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
    comment: 'Course difficulty level',
  })
  level: CourseLevel;

  @Column({
    type: 'enum',
    enum: CourseLanguage,
    default: CourseLanguage.ENGLISH,
    comment: 'Course language',
  })
  language: CourseLanguage;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Estimated course duration in hours',
  })
  durationHours?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Estimated course duration in minutes',
  })
  durationMinutes?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Course price',
  })
  price: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Price currency code',
  })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Original price before discount',
  })
  originalPrice?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is course free',
  })
  isFree: boolean;

  @Column({
    type: 'enum',
    enum: CoursePricing,
    default: CoursePricing.FREE,
    comment: 'Course pricing model',
  })
  pricingModel: CoursePricing;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
    comment: 'Course status',
  })
  status: CourseStatus;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Maximum number of enrollments',
  })
  enrollmentLimit?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Course tags for categorization',
  })
  tags?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Course prerequisites',
  })
  requirements?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'What students will learn',
  })
  whatYouWillLearn?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Target audience description',
  })
  targetAudience?: string[];

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    comment: 'Average course rating',
  })
  rating: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of ratings',
  })
  totalRatings: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of enrollments',
  })
  totalEnrollments: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of completed enrollments',
  })
  totalCompletions: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total course reviews',
  })
  totalReviews: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of course sections',
  })
  totalSections: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of course lessons',
  })
  totalLessons: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total video duration in seconds',
  })
  totalVideoDuration: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Featured course status',
  })
  featured: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Bestseller badge',
  })
  bestseller: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'New course badge',
  })
  isNew: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Allow course reviews',
  })
  allowReviews: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Allow course discussions',
  })
  allowDiscussions: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Course completion certificate available',
  })
  hasCertificate: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Lifetime access to course',
  })
  lifetimeAccess: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Access duration in days (if not lifetime)',
  })
  accessDuration?: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Course available from',
  })
  availableFrom?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Course available until',
  })
  availableUntil?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Course published date',
  })
  publishedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last content update',
  })
  lastUpdatedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'SEO metadata',
  })
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Course settings and preferences',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional course metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id, { eager: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ManyToOne(() => Category, category => category.courses, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @OneToMany(() => CourseSection, section => section.course, { cascade: true })
  sections?: CourseSection[];

  @OneToMany(() => Enrollment, enrollment => enrollment.course)
  enrollments?: Enrollment[];

  @OneToMany(() => FileUpload, file => file.course)
  files?: FileUpload[];

  @OneToMany(() => TutoringSession, session => session.course)
  tutoringSessions: TutoringSession[];

  @OneToMany(() => AdaptiveContent, content => content.course, {
    cascade: true,
  })
  adaptiveContent: AdaptiveContent[];

  get formattedPrice(): string {
    if (this.isFree) return 'Free';
    return `${this.currency} ${this.price.toFixed(2)}`;
  }

  get completionRate(): number {
    if (this.totalEnrollments === 0) return 0;
    return (this.totalCompletions / this.totalEnrollments) * 100;
  }

  get averageRating(): number {
    return this.rating;
  }

  get isPublished(): boolean {
    return this.status === CourseStatus.PUBLISHED;
  }

  get isDraft(): boolean {
    return this.status === CourseStatus.DRAFT;
  }

  get estimatedDuration(): string {
    if (!this.durationHours && !this.durationMinutes) return 'Not specified';

    const hours = this.durationHours || 0;
    const minutes = this.durationMinutes || 0;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  get enrollmentStatus(): string {
    if (this.enrollmentLimit && this.totalEnrollments >= this.enrollmentLimit) {
      return 'Full';
    }
    return 'Open';
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateTimestamp() {
    this.lastUpdatedAt = new Date();
  }

  @BeforeInsert()
  setDefaults() {
    if (!this.slug && this.title) {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
  }
}

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
    comment: 'Tên chính thức của khóa học',
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Tên phiên bản rút gọn của tiêu đề, dùng để tạo đường dẫn URL',
  })
  slug: string;

  @Column({
    type: 'text',
    comment: 'Mô tả chi tiết về khóa học',
  })
  description: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Mô tả ngắn về khóa học',
  })
  shortDescription?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL hình ảnh thu nhỏ của khóa học',
  })
  thumbnailUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL video giới thiệu khóa học',
  })
  trailerVideoUrl?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định giảng viên phụ trách khóa học',
  })
  teacherId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới categories.id, xác định khóa học thuộc danh mục nào',
  })
  categoryId: string;

  @Column({
    type: 'enum',
    enum: CourseLevel,
    default: CourseLevel.BEGINNER,
    comment: 'Mức độ khó của khóa học (beginner, intermediate, advanced).',
  })
  level: CourseLevel;

  @Column({
    type: 'enum',
    enum: CourseLanguage,
    default: CourseLanguage.ENGLISH,
    comment: 'Ngôn ngữ giảng dạy của khóa học (en, vi).',
  })
  language: CourseLanguage;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời lượng khóa học ước tính tính bằng giờ',
  })
  durationHours?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời lượng khóa học ước tính tính bằng phút',
  })
  durationMinutes?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Giá khóa học',
  })
  price: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Mã tiền tệ giá khóa học',
  })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Giá gốc trước khi giảm giá',
  })
  originalPrice?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Giá học có miễn phí không',
  })
  isFree: boolean;

  @Column({
    type: 'enum',
    enum: CoursePricing,
    default: CoursePricing.FREE,
    comment: 'Mô hình định giá khóa học',
  })
  pricingModel: CoursePricing;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
    comment: 'Trạng thái khóa học (draft, published, archived).',
  })
  status: CourseStatus;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Số lượng đăng ký tối đa',
  })
  enrollmentLimit?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thẻ khóa học để phân loại khóa học',
  })
  tags?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Điều kiện tiên quyết của khóa học',
  })
  requirements?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Học sinh sẽ học được gì',
  })
  whatYouWillLearn?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Mô tả đối tượng mục tiêu',
  })
  targetAudience?: string[];

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    comment: 'Đánh giá khóa học trung bình',
  })
  rating: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số ratings',
  })
  totalRatings: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số lượt đăng ký',
  })
  totalEnrollments: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng đăng ký đã hoàn thành',
  })
  totalCompletions: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số reviews',
  })
  totalReviews: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số chương khóa học',
  })
  totalSections: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng bài học',
  })
  totalLessons: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng thời lượng video tính bằng giây',
  })
  totalVideoDuration: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Trạng thái khóa học nổi bật',
  })
  featured: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Huy hiệu bán chạy nhất',
  })
  bestseller: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Huy hiệu khóa học mới',
  })
  isNew: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cho phép đánh giá khóa học',
  })
  allowReviews: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cho phép thảo luận về khóa học',
  })
  allowDiscussions: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Có chứng nhận hoàn thành khóa học',
  })
  hasCertificate: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Truy cập khóa học trọn đời',
  })
  lifetimeAccess: boolean;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời gian truy cập tính bằng ngày (nếu không phải trọn đời)',
  })
  accessDuration?: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Khóa học có sẵn từ',
  })
  availableFrom?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Khóa học có sẵn cho đến khi',
  })
  availableUntil?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ngày xuất bản khóa học',
  })
  publishedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Cập nhật nội dung cuối cùng',
  })
  lastUpdatedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu metadata SEO',
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
    comment: 'Cài đặt và tùy chọn khóa học',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu khóa học bổ sung',
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

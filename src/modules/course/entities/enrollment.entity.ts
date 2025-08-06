import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EnrollmentStatus, PaymentStatus } from '@/common/enums/course.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from './course.entity';
import { LessonProgress } from './lesson-progress.entity';

@Entity('enrollments')
@Unique(['studentId', 'courseId'])
@Index(['studentId'])
@Index(['courseId'])
@Index(['status'])
@Index(['enrollmentDate'])
@Index(['paymentStatus'])
export class Enrollment extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định sinh viên nào đã đăng ký',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới courses.id, xác định khóa học được đăng ký',
  })
  courseId: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm sinh viên đăng ký khóa học',
  })
  enrollmentDate: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm sinh viên hoàn thành 100% khóa học',
  })
  completionDate?: Date;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ENROLLED,
    comment:
      'Trạng thái hiện tại của việc học (enrolled - đã đăng ký, in_progress - đang học, completed - đã hoàn thành, dropped - đã bỏ học).',
  })
  status: EnrollmentStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Tỷ lệ phần trăm hoàn thành khóa học của sinh viên',
  })
  progressPercentage: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm cuối cùng sinh viên truy cập vào khóa học này',
  })
  lastAccessedAt?: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    comment:
      'Quản lý trạng thái giao dịch cho các khóa học có phí (pending - đang chờ, paid - đã thanh toán, refunded - đã hoàn tiền).',
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Số tiền thực tế mà sinh viên đã trả cho khóa học',
  })
  paymentAmount: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Đơn vị tiền tệ của giao dịch (ví dụ: USD, VND)',
  })
  paymentCurrency: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mã giao dịch từ cổng thanh toán để đối soát',
  })
  paymentTransactionId?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm giao dịch thanh toán được thực hiện thành công',
  })
  paymentDate?: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến tệp chứng chỉ sau khi sinh viên hoàn thành khóa học',
  })
  certificateUrl?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm chứng chỉ được cấp',
  })
  certificateIssuedAt?: Date;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Điểm số (ví dụ: từ 1-5 sao) mà sinh viên đánh giá cho khóa học',
  })
  rating?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Nội dung bình luận, nhận xét của sinh viên về khóa học',
  })
  review?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm sinh viên gửi đánh giá',
  })
  reviewDate?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng thời gian (tính bằng giây) mà sinh viên đã dành cho khóa học này',
  })
  totalTimeSpent: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Đếm số bài học mà sinh viên đã hoàn thành trong khóa học',
  })
  lessonsCompleted: number;

  @Column({
    type: 'int',
    default: 0,
    comment:
      'Tổng số bài học của khóa học tại thời điểm sinh viên đăng ký (để tính toán tiến độ chính xác).',
  })
  totalLessons: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian hết hạn truy cập',
  })
  accessExpiresAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON để lưu thông tin về nguồn gốc của lượt đăng ký (ví dụ: từ quảng cáo Facebook, từ email marketing)',
  })
  source?: {
    channel?: string;
    campaign?: string;
    referrer?: string;
    couponCode?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu các tùy chọn cá nhân của sinh viên dành riêng cho khóa học này (ví dụ: cài đặt thông báo).',
  })
  preferences?: {
    playbackSpeed?: number;
    autoPlay?: boolean;
    notifications?: boolean;
    language?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin mở rộng khác liên quan đến lượt đăng ký',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course, course => course.enrollments)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @OneToMany(() => LessonProgress, progress => progress.enrollment)
  lessonProgress?: LessonProgress[];

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === EnrollmentStatus.COMPLETED;
  }

  get isActive(): boolean {
    return (
      this.status === EnrollmentStatus.IN_PROGRESS || this.status === EnrollmentStatus.ENROLLED
    );
  }

  get isPaid(): boolean {
    return this.paymentStatus === PaymentStatus.PAID;
  }

  get isAccessExpired(): boolean {
    return !!(this.accessExpiresAt && new Date() > this.accessExpiresAt);
  }

  get canAccess(): boolean {
    return this.isActive && !this.isAccessExpired && (this.isPaid || this.paymentAmount === 0);
  }

  get formattedTimeSpent(): string {
    const hours = Math.floor(this.totalTimeSpent / 3600);
    const minutes = Math.floor((this.totalTimeSpent % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  get completionRate(): number {
    if (this.totalLessons === 0) return 0;
    return (this.lessonsCompleted / this.totalLessons) * 100;
  }

  get daysEnrolled(): number {
    const now = new Date();
    const enrollmentDate = new Date(this.enrollmentDate);
    const diffTime = Math.abs(now.getTime() - enrollmentDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get averageDailyProgress(): number {
    const days = this.daysEnrolled;
    if (days === 0) return 0;
    return this.progressPercentage / days;
  }
}

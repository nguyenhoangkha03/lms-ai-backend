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
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Course ID',
  })
  courseId: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Enrollment date',
  })
  enrollmentDate: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Course completion date',
  })
  completionDate?: Date;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ENROLLED,
    comment: 'Enrollment status',
  })
  status: EnrollmentStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Course progress percentage',
  })
  progressPercentage: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last time student accessed the course',
  })
  lastAccessedAt?: Date;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    comment: 'Payment status for paid courses',
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Amount paid for the course',
  })
  paymentAmount: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Payment currency',
  })
  paymentCurrency: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Payment transaction ID',
  })
  paymentTransactionId?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Payment date',
  })
  paymentDate?: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Certificate URL when course is completed',
  })
  certificateUrl?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Certificate issue date',
  })
  certificateIssuedAt?: Date;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Student rating for the course',
  })
  rating?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Student review for the course',
  })
  review?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Review submission date',
  })
  reviewDate?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total time spent in seconds',
  })
  totalTimeSpent: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of lessons completed',
  })
  lessonsCompleted: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total lessons in course at enrollment time',
  })
  totalLessons: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Access expiry date for limited access courses',
  })
  accessExpiresAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Enrollment source and tracking data',
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
    comment: 'Student preferences for this course',
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
    comment: 'Additional enrollment metadata',
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

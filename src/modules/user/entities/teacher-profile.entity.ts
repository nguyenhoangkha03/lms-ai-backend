import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from './user.entity';

@Entity('teacher_profiles')
@Index(['userId'], { unique: true })
@Index(['isApproved', 'isActive'])
@Index(['specializations'])
@Index(['rating'])
export class TeacherProfile extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Reference to user ID',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    comment: 'Unique teacher code/ID',
  })
  teacherCode: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Teacher specializations and expertise',
  })
  specializations?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Educational qualifications',
  })
  qualifications?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Years of teaching experience',
  })
  yearsExperience: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Teaching style and methodology',
  })
  teachingStyle?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Office hours schedule',
  })
  officeHours?: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    comment: 'Average rating from students',
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
    comment: 'Total number of students taught',
  })
  totalStudents: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total courses created',
  })
  totalCourses: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total lessons created',
  })
  totalLessons: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total teaching hours',
  })
  totalTeachingHours: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Total earnings from courses',
  })
  totalEarnings: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Teacher approval status',
  })
  isApproved: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Teacher active status',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Featured teacher status',
  })
  isFeatured: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Verified teacher badge',
  })
  isVerified: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Who approved the teacher',
  })
  approvedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When teacher was approved',
  })
  approvedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Approval notes or comments',
  })
  approvalNotes?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Teaching license or certification number',
  })
  licenseNumber?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Educational institution affiliations',
  })
  affiliations?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Teaching subjects and topics',
  })
  subjects?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Languages teacher can instruct in',
  })
  teachingLanguages?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Available time slots for teaching',
  })
  availability?: Record<string, any>;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    comment: 'Hourly rate for private sessions',
  })
  hourlyRate?: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Currency for pricing',
  })
  currency: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Awards and recognitions',
  })
  awards?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Publications and research work',
  })
  publications?: string[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Professional summary',
  })
  professionalSummary?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'CV/Resume document URL',
  })
  resumeUrl?: string;
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Portfolio or demo reel URL',
  })
  portfolioUrl?: string;
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Accept new students',
  })
  acceptingStudents: boolean;
  @Column({
    type: 'int',
    nullable: true,
    comment: 'Maximum students per class',
  })
  maxStudentsPerClass?: number;
  @Column({
    type: 'boolean',
    default: true,
    comment: 'Allow students to rate and review',
  })
  allowReviews: boolean;
  @Column({
    type: 'boolean',
    default: true,
    comment: 'Receive email notifications',
  })
  emailNotifications: boolean;
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Teacher application date',
  })
  applicationDate: Date;
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last teaching activity',
  })
  lastTeachingAt?: Date;
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional teacher metadata',
  })
  metadata?: Record<string, any>;
  // Relationships
  @OneToOne(() => User, user => user.teacherProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get averageRating(): number {
    return this.rating;
  }
  get isActiveTeacher(): boolean {
    if (!this.lastTeachingAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.lastTeachingAt > thirtyDaysAgo && this.isActive && this.isApproved;
  }
  get experienceLevel(): string {
    if (this.yearsExperience >= 10) return 'Expert';
    if (this.yearsExperience >= 5) return 'Experienced';
    if (this.yearsExperience >= 2) return 'Intermediate';
    return 'Beginner';
  }
  get canTeach(): boolean {
    return this.isApproved && this.isActive && this.acceptingStudents;
  }
}

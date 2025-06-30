import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { LearningStyle, DifficultyLevel } from '@/common/enums/user.enums';
import { User } from './user.entity';

@Entity('student_profiles')
@Index(['userId'], { unique: true })
@Index(['educationLevel', 'fieldOfStudy'])
@Index(['enrollmentDate'])
export class StudentProfile extends BaseEntity {
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
    comment: 'Unique student code/ID',
  })
  studentCode: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Current education level',
  })
  educationLevel?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Field of study or major',
  })
  fieldOfStudy?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Institution or school name',
  })
  institution?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Expected graduation year',
  })
  graduationYear?: number;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Current GPA',
  })
  gpa?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Learning goals and objectives',
  })
  learningGoals?: string;

  @Column({
    type: 'enum',
    enum: LearningStyle,
    nullable: true,
    comment: 'Preferred learning style',
  })
  preferredLearningStyle?: LearningStyle;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Preferred study time',
  })
  studyTimePreference?: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER,
    comment: 'Preferred difficulty level',
  })
  difficultyPreference: DifficultyLevel;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Motivation factors',
  })
  motivationFactors?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total courses enrolled',
  })
  totalCoursesEnrolled: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total courses completed',
  })
  totalCoursesCompleted: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total certificates earned',
  })
  totalCertificates: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total study hours',
  })
  totalStudyHours: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Average course rating',
  })
  averageGrade: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Achievement points earned',
  })
  achievementPoints: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'Bronze',
    comment: 'Current achievement level',
  })
  achievementLevel: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Badges and achievements earned',
  })
  badges?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Learning preferences and settings',
  })
  learningPreferences?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Study schedule and availability',
  })
  studySchedule?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Learning analytics data',
  })
  analyticsData?: Record<string, any>;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Allow AI recommendations',
  })
  enableAIRecommendations: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Allow progress tracking',
  })
  enableProgressTracking: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Parent/guardian consent for minors',
  })
  parentalConsent: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Parent/guardian contact information',
  })
  parentContact?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Student enrollment date',
  })
  enrollmentDate: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last activity timestamp',
  })
  lastActivityAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional student metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @OneToOne(() => User, user => user.studentProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get completionRate(): number {
    if (this.totalCoursesEnrolled === 0) return 0;
    return (this.totalCoursesCompleted / this.totalCoursesEnrolled) * 100;
  }

  get isActiveStudent(): boolean {
    if (!this.lastActivityAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.lastActivityAt > thirtyDaysAgo;
  }

  get experienceLevel(): string {
    if (this.totalCoursesCompleted >= 20) return 'Expert';
    if (this.totalCoursesCompleted >= 10) return 'Advanced';
    if (this.totalCoursesCompleted >= 5) return 'Intermediate';
    return 'Beginner';
  }
}

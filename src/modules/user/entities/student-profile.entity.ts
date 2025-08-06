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
    comment: 'Tham chiếu ID người dùng',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    comment: 'Mã sinh viên',
  })
  studentCode: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Trình độ học vấn hiện tại',
  })
  educationLevel?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Chuyên ngành học',
  })
  fieldOfStudy?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Tên trường học hoặc tổ chức giáo dục',
  })
  institution?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Năm dự kiến tốt nghiệp',
  })
  graduationYear?: number;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Điểm trung bình tích lũy hiện tại của sinh viên',
  })
  gpa?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mục tiêu mà sinh viên tự đặt ra ',
  })
  learningGoals?: string;

  @Column({
    type: 'enum',
    enum: LearningStyle,
    nullable: true,
    comment: 'Phong cách học ưa thích',
  })
  preferredLearningStyle?: LearningStyle;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Thời gian học ưa thích',
  })
  studyTimePreference?: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER,
    comment: 'Độ khó ưa thích',
  })
  difficultyPreference: DifficultyLevel;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Những yếu tố giúp sinh viên có động lực học tập.',
  })
  motivationFactors?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng khóa học đã đăng ký',
  })
  totalCoursesEnrolled: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng khóa học đã hoàn thành',
  })
  totalCoursesCompleted: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng chứng chỉ',
  })
  totalCertificates: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng giờ học',
  })
  totalStudyHours: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Điểm trung bình',
  })
  averageGrade: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Điểm thành tích, điểm thưởng tích lũy qua các hoạt động học tập ',
  })
  achievementPoints: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'Bronze',
    comment: 'Cấp độ thành tích học tập',
  })
  achievementLevel: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu danh sách các huy hiệu đã đạt được',
  })
  badges?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu các cài đặt học tập chi tiết khác.',
  })
  learningPreferences?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu lịch học cá nhân của sinh viên',
  })
  studySchedule?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các dữ liệu phân tích học tập tổng hợp',
  })
  analyticsData?: Record<string, any>;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cài đặt cho phép sinh viên bật/tắt chức năng gợi ý của AI.',
  })
  enableAIRecommendations: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Bật/Tắt theo dõi tiến độ',
  })
  enableProgressTracking: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Sự đồng ý của phụ huynh',
  })
  parentalConsent: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Thông tin liên hệ phụ huynh',
  })
  parentContact?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Ngày sinh viên chính thức trở thành người học trên hệ thống.',
  })
  enrollmentDate: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm cuối cùng sinh viên có hoạt động trên hệ thống.',
  })
  lastActivityAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
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

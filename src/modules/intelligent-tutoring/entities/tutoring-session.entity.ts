import { Entity, Column, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { TutoringInteraction } from './tutoring-interaction.entity';
import { SessionStatus, TutoringMode, LearningStyleType } from '@/common/enums/tutoring.enums';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('tutoring_sessions')
@Index(['studentId', 'startedAt'])
@Index(['courseId', 'status'])
export class TutoringSession extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định ai đang tham gia phiên này.',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Khóa ngoại xác định bối cảnh của phiên gia sư (sinh viên đang hỏi về khóa học).',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment:
      'Khóa ngoại xác định bối cảnh của phiên gia sư (sinh viên đang hỏi về bài học cụ thể nào).',
  })
  lessonId?: string;

  @Column({
    type: 'enum',
    enum: TutoringMode,
    default: TutoringMode.ADAPTIVE,
    comment:
      'hế độ hoạt động của gia sư AI, quyết định chiến lược giảng dạy (adaptive - thích ứng, guided - có hướng dẫn, assessment - kiểm tra).',
  })
  mode: TutoringMode;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
    comment:
      'Trạng thái hiện tại của phiên (active - đang diễn ra, paused - tạm dừng, completed - đã kết thúc).',
  })
  status: SessionStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', comment: 'Thời gian bắt đầu' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Thời gian kết thúc' })
  endedAt?: Date;

  @Column({ type: 'int', default: 0, comment: 'Tổng thời gian (tính bằng giây) của phiên' })
  totalDuration: number; // in seconds

  @Column({ type: 'int', default: 0, comment: 'Đếm tổng số câu hỏi sinh viên đã hỏi' })
  questionsAsked: number;

  @Column({ type: 'int', default: 0, comment: 'Số gợi ý AI đã cung cấp trong phiên' })
  hintsProvided: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Đếm tổng số câu hỏi sinh viên đã hỏi và số gợi ý AI đã cung cấp trong phiên',
  })
  completionPercentage: number;

  @Column({
    type: 'enum',
    enum: LearningStyleType,
    nullable: true,
    comment: 'Phong cách học của sinh viên mà AI nhận diện được trong suốt phiên tương tác.',
  })
  detectedLearningStyle?: LearningStyleType;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'beginner',
    comment: 'Mức độ khó mà AI đang điều chỉnh để phù hợp với sinh viên.',
  })
  currentDifficultyLevel: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Mức độ khó mà AI đang điều chỉnh để phù hợp với sinh viên.',
  })
  sessionGoals: {
    type: 'mastery' | 'practice' | 'review' | 'exploration';
    topics: string[];
    targetAccuracy?: number;
    timeLimit?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa các cấu hình cho chế độ học tập thích ứng',
  })
  adaptiveSettings: {
    difficultyAdjustmentFactor: number;
    hintThreshold: number;
    masteryThreshold: number;
    strugglingThreshold: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON mô tả lộ trình các khái niệm được đề cập trong phiên.',
  })
  learningPath: {
    currentTopic: string;
    completedTopics: string[];
    recommendedNext: string[];
    skillGaps: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa các chỉ số đo lường hiệu suất của sinh viên trong phiên.',
  })
  performanceMetrics: {
    averageResponseTime: number;
    accuracyRate: number;
    conceptMastery: Record<string, number>;
    engagementScore: number;
  };

  @Column({
    type: 'text',
    nullable: true,
    comment:
      'Một đoạn văn bản tóm tắt lại nội dung và kết quả chính của phiên học, có thể do AI tự động tạo ra.',
  })
  sessionSummary?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin mở rộng khác.',
  })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => User, user => user.tutoringSessions)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course, course => course.tutoringSessions, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.tutoringSessions, { nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @OneToMany(() => TutoringInteraction, interaction => interaction.session, {
    cascade: true,
  })
  interactions: TutoringInteraction[];
}

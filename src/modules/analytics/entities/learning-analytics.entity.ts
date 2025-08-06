import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { PerformanceLevel, LearningPatternType } from '@/common/enums/analytics.enums';

@Entity('learning_analytics')
@Unique(['studentId', 'courseId', 'date'])
@Index(['studentId'])
@Index(['courseId'])
@Index(['date'])
@Index(['engagementScore'])
@Index(['performanceLevel'])
export class LearningAnalytics extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID của sinh viên được phân tích',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment:
      'ID của khóa học (nếu là phân tích cho một khóa học cụ thể) hoặc NULL (nếu là phân tích tổng thể)',
  })
  courseId?: string;

  @Column({
    type: 'date',
    comment: 'Ngày mà dữ liệu được tổng hợp',
  })
  date: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng thời gian học trong ngày đó, tính bằng giây',
  })
  totalTimeSpent: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số bài học đã hoàn thành trong ngày',
  })
  lessonsCompleted: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng bài kiểm tra đã thực hiện trong ngày',
  })
  assessmentsTaken: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Điểm trung bình của các bài kiểm tra trong ngày',
  })
  averageScore: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON theo dõi sự tiến bộ của các kỹ năng cụ thể',
  })
  skillProgress: Record<string, number>;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng bài kiểm tra đã làm',
  })
  quizzesAttempted: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số bài kiểm tra đã vượt qua',
  })
  quizzesPassed: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Tỷ lệ điểm bài kiểm tra trung bình',
  })
  averageQuizScore?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số phiên đăng nhập',
  })
  loginCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Thời gian xem video tính bằng giây',
  })
  videoWatchTime: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Thời gian đọc nội dung tính bằng giây',
  })
  readingTime: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng bài đăng/thảo luận trên diễn đàn',
  })
  discussionPosts: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng tin nhắn trò chuyện đã gửi',
  })
  chatMessages: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Giờ hoạt động mạnh nhất trong ngày (0-23)',
  })
  mostActiveHour?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các dấu hiệu của khó khăn trong học tập',
  })
  struggleIndicators?: {
    repeatedQuizFailures?: number;
    excessiveVideoRewinding?: number;
    incompleteAssignments?: number;
    longInactivityPeriods?: number;
    helpRequestsCount?: number;
  };

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Điểm tương tác tổng thể (0-100)',
  })
  engagementScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Tỷ lệ tiến độ học tập',
  })
  progressPercentage: number;

  @Column({
    type: 'enum',
    enum: PerformanceLevel,
    default: PerformanceLevel.AVERAGE,
    comment: 'Mức hiệu suất tổng thể',
  })
  performanceLevel: PerformanceLevel;

  @Column({
    type: 'enum',
    enum: LearningPatternType,
    nullable: true,
    comment: 'Mẫu học tập đã xác định',
  })
  learningPattern?: LearningPatternType;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Chỉ số tương tác chi tiết',
  })
  engagementMetrics?: {
    sessionDuration?: number;
    contentInteraction?: number;
    assessmentParticipation?: number;
    socialInteraction?: number;
    consistencyScore?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các số liệu về tốc độ và hiệu quả học tập',
  })
  learningVelocity?: {
    lessonsPerDay?: number;
    timePerLesson?: number;
    retentionRate?: number;
    masterySpeed?: number;
    difficultyProgression?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các chỉ số dự đoán',
  })
  predictiveIndicators?: {
    dropoutRisk?: number;
    successProbability?: number;
    recommendedPace?: string;
    nextBestAction?: string;
    motivationLevel?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Kỹ năng và năng lực đạt được',
  })
  skillsGained?: {
    newSkills?: string[];
    improvedSkills?: string[];
    masteredConcepts?: string[];
    weakAreas?: string[];
    strengthAreas?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các mô hình hành vi được quan sát',
  })
  behavioralPatterns?: {
    studyTimePreference?: string;
    learningStylePreference?: string;
    contentTypePreference?: string;
    pacingPreference?: string;
    socialLearningTendency?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu phân tích bổ sung',
  })
  metadata?: Record<string, any>;

  // Virtual properties
  get averageSessionDuration(): number {
    return this.loginCount > 0 ? this.totalTimeSpent / this.loginCount : 0;
  }

  get quizSuccessRate(): number {
    return this.quizzesAttempted > 0 ? (this.quizzesPassed / this.quizzesAttempted) * 100 : 0;
  }

  get isHighPerformer(): boolean {
    return (
      this.performanceLevel === PerformanceLevel.EXCELLENT ||
      this.performanceLevel === PerformanceLevel.GOOD
    );
  }

  get needsAttention(): boolean {
    return this.performanceLevel === PerformanceLevel.POOR || this.engagementScore < 30;
  }
}

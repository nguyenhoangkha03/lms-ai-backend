import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';

export enum OutcomeType {
  COURSE_COMPLETION = 'course_completion',
  SKILL_MASTERY = 'skill_mastery',
  ASSESSMENT_SCORE = 'assessment_score',
  CERTIFICATION = 'certification',
  TIME_TO_COMPLETION = 'time_to_completion',
  KNOWLEDGE_RETENTION = 'knowledge_retention',
}

@Entity('learning_outcome_forecasts')
@Index(['studentId', 'outcomeType'])
@Index(['courseId'])
@Index(['forecastDate'])
export class LearningOutcomeForecast extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định dự báo này dành cho ai',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Khóa ngoại liên kết tới courses.id, xác định ngữ cảnh của dự báo',
  })
  courseId?: string;

  @Column({
    type: 'enum',
    enum: OutcomeType,
    comment:
      'Cho biết AI đang dự báo về điều gì: course_completion (khả năng hoàn thành khóa học), skill_mastery (khả năng làm chủ kỹ năng), time_to_completion (thời gian cần để hoàn thành).',
  })
  outcomeType: OutcomeType;

  @Column({
    type: 'datetime',
    comment: 'Thời điểm mà dự báo được tạo ra',
  })
  forecastDate: Date;

  @Column({
    type: 'datetime',
    comment: 'Ngày trong tương lai mà dự báo nhắm tới',
  })
  targetDate: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Xác suất (tính bằng %) mà sinh viên sẽ đạt được kết quả mục tiêu',
  })
  successProbability: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm số hoặc phần trăm hoàn thành được dự đoán.',
  })
  predictedScore?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Số ngày ước tính mà sinh viên cần để hoàn thành mục tiêu',
  })
  estimatedDaysToCompletion?: number;

  @Column({
    type: 'json',
    comment:
      'Trường JSON mô tả các kịch bản dự báo khác nhau (ví dụ: "Nếu học 5 giờ/tuần, xác suất thành công là 80%. Nếu học 2 giờ/tuần, xác suất là 50%").',
  })
  scenarios: {
    optimistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
    realistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
    pessimistic: {
      probability: number;
      outcome: string;
      timeframe: number;
      conditions: string[];
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON dự báo các cột mốc quan trọng mà sinh viên có thể đạt được trên đường đi',
  })
  milestones?: {
    milestoneId: string;
    name: string;
    predictedCompletionDate: Date;
    probability: number;
    dependencies: string[];
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON dự báo các tài nguyên cần thiết (thời gian, bài tập) để đạt được mục tiêu',
  })
  resourceRequirements?: {
    studyHoursRequired: number;
    preferredStudyTimes: string[];
    recommendedResources: string[];
    supportNeeded: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON dự báo các khó khăn tiềm tàng và gợi ý giải pháp',
  })
  obstaclesAndSolutions?: {
    obstacle: string;
    probability: number;
    impact: string;
    solutions: string[];
  }[];

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Mức độ tự tin của AI về tính chính xác của toàn bộ dự báo',
  })
  confidenceLevel: number;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu lại một bản chụp (snapshot) của dữ liệu đã được dùng để tạo ra dự báo này',
  })
  baselineData?: {
    currentProgress: number;
    averagePerformance: number;
    engagementLevel: number;
    timeSpentLearning: number;
    completedActivities: number;
    skillLevel: string;
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết kết quả thực tế đã xảy ra hay chưa',
  })
  isRealized: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Kết quả thực tế, dùng để so sánh và đánh giá độ chính xác của AI',
  })
  actualOutcome?: number;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày hoàn thành thực tế, dùng để so sánh và đánh giá độ chính xác của AI',
  })
  actualCompletionDate?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu các chỉ số đo lường độ chính xác của dự báo sau khi đã có kết quả thực tế.',
  })
  accuracyMetrics?: {
    outcomeAccuracy: number;
    timeAccuracy: number;
    overallAccuracy: number;
    errorMargin: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu dự báo bổ sung',
  })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course?: Course;
}

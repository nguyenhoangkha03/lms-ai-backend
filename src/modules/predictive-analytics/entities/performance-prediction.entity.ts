import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';

export enum PredictionType {
  PERFORMANCE = 'performance',
  DROPOUT_RISK = 'dropout_risk',
  LEARNING_OUTCOME = 'learning_outcome',
  COMPLETION_TIME = 'completion_time',
  RESOURCE_USAGE = 'resource_usage',
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum InterventionType {
  MOTIVATION = 'motivation',
  CONTENT_REVIEW = 'content_review',
  STUDY_PLAN = 'study_plan',
  TUTOR_SUPPORT = 'tutor_support',
  PEER_SUPPORT = 'peer_support',
  TECHNICAL_SUPPORT = 'technical_support',
  ASSESSMENT_ADJUSTMENT = 'assessment_adjustment',
  LEARNING_PATH_CHANGE = 'learning_path_change',
}

@Entity('performance_predictions')
@Index(['studentId', 'predictionType'])
@Index(['courseId', 'predictionType'])
@Index(['predictionDate'])
@Index(['riskLevel'])
export class PerformancePrediction extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID sinh viên',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID khóa học (null cho dự đoán chung)',
  })
  courseId?: string;

  @Column({
    type: 'enum',
    enum: PredictionType,
    comment:
      'Cho biết AI đang dự đoán về cái gì (performance - điểm số, completion_time - thời gian hoàn thành).',
  })
  predictionType: PredictionType;

  @Column({
    type: 'datetime',
    comment: 'Thời điểm dự đoán được tạo ra',
  })
  predictionDate: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Thời điểm trong tương lai mà dự đoán nhắm tới',
  })
  targetDate?: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Kết quả dự đoán của AI (ví dụ: dự đoán điểm cuối kỳ là 8.5).',
  })
  predictedValue: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Mức độ tự tin của mô hình AI về dự đoán của nó',
  })
  confidenceScore: number;

  @Column({
    type: 'enum',
    enum: RiskLevel,
    comment: 'Đánh giá mức độ rủi ro',
  })
  riskLevel: RiskLevel;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON giải thích các yếu tố chính đã ảnh hưởng đến kết quả dự đoán',
  })
  contributingFactors?: {
    engagementLevel?: number;
    performanceHistory?: number;
    timeManagement?: number;
    contentDifficulty?: number;
    socialFactors?: number;
    technicalIssues?: number;
    motivationLevel?: number;
    priorKnowledge?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Phân tích dự đoán chi tiết',
  })
  predictionDetails?: {
    currentPerformance?: number;
    trendAnalysis?: string;
    comparisonToPeers?: number;
    seasonalFactors?: string[];
    behavioralPatterns?: string[];
    riskFactors?: string[];
    protectiveFactors?: string[];
  };

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Giá trị thực tế sau khi sự kiện xảy ra (ví dụ: điểm cuối kỳ thực tế là 8.7).',
  })
  actualValue?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'So sánh giữa predictedValue và actualValue để đo lường độ chính xác của mô hình',
  })
  accuracyScore?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết dự đoán đã được so sánh với kết quả thực tế hay chưa',
  })
  isValidated: boolean;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày dự đoán được xác thực',
  })
  validatedAt?: Date;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Phiên bản của mô hình AI đã được sử dụng để tạo ra dự đoán này',
  })
  modelVersion: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu dành riêng cho mô hình',
  })
  modelMetadata?: {
    algorithm?: string;
    features?: string[];
    trainingDataSize?: number;
    lastTrainingDate?: Date;
    hyperparameters?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu dự đoán bổ sung',
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

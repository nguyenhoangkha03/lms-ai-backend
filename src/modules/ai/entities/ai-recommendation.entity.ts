import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { RecommendationType, RecommendationStatus, Priority } from '@/common/enums/ai.enums';
import { User } from '../../user/entities/user.entity';

@Entity('ai_recommendations')
@Index(['studentId'])
@Index(['recommendationType'])
@Index(['status'])
@Index(['priority'])
@Index(['expiresAt'])
@Index(['confidenceScore'])
@Index(['createdAt'])
export class AIRecommendation extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định gợi ý này dành cho sinh viên nào',
  })
  studentId: string;

  @Column({
    type: 'enum',
    enum: RecommendationType,
    comment:
      'Phân loại mục đích của gợi ý, ví dụ: next_lesson (gợi ý bài học tiếp theo), review_content (ôn tập lại nội dung), course_recommendation (gợi ý khóa học mới), study_schedule (gợi ý lịch học)',
  })
  recommendationType: RecommendationType;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment:
      'ID Liên kết đến nội dung cụ thể được gợi ý (ID của một khóa học, bài học, hoặc bài kiểm tra).',
  })
  contentId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Loại nội dung cụ thể được gợi ý (ID của một khóa học, bài học, hoặc bài kiểm tra).',
  })
  contentType?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tiêu đề gợi ý',
  })
  title: string;

  @Column({
    type: 'text',
    comment: 'Mô tả đề xuất chi tiết',
  })
  description: string;

  @Column({
    type: 'text',
    comment:
      'Cột quan trọng, giải thích tại sao AI lại đưa ra gợi ý này (ví dụ: "Vì bạn đã làm sai 3/5 câu hỏi về chủ đề này trong bài quiz trước").',
  })
  reason: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.5,
    comment: 'Mức độ tự tin của AI (từ 0.0 đến 1.0) về tính hiệu quả của gợi ý',
  })
  confidenceScore: number;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
    comment: 'Mức độ khẩn cấp của gợi ý (low, medium, high, urgent)',
  })
  priority: Priority;

  @Column({
    type: 'enum',
    enum: RecommendationStatus,
    default: RecommendationStatus.PENDING,
    comment:
      'Vòng đời của một gợi ý (pending - đang chờ, accepted - người dùng chấp nhận, dismissed - người dùng bỏ qua)',
  })
  status: RecommendationStatus;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm mà gợi ý sẽ không còn phù hợp và tự động biến mất',
  })
  expiresAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ghi lại thời điểm người dùng tương tác với gợi ý',
  })
  interactedAt?: Date;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Ghi lại cách người dùng tương tác với gợi ý (viewed, clicked)',
  })
  interactionType?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu dành riêng cho đề xuất',
  })
  metadata?: {
    estimatedDuration?: number;
    difficultyLevel?: string;
    prerequisites?: string[];
    skills?: string[];
    tags?: string[];
    relatedContent?: string[];
    personalizedReason?: string;
    [key: string]: any;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thông tin mô hình AI',
  })
  modelInfo?: {
    modelVersion?: string;
    algorithmUsed?: string;
    trainingDate?: Date;
    features?: string[];
    weights?: Record<string, number>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Bối cảnh người dùng khi đề xuất được tạo ra',
  })
  userContext?: {
    currentCourse?: string;
    recentActivities?: string[];
    performanceMetrics?: Record<string, number>;
    learningGoals?: string[];
    preferences?: Record<string, any>;
    timeOfDay?: string;
    deviceType?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Kết quả mong đợi từ khuyến nghị này',
  })
  expectedOutcomes?: {
    skillImprovement?: string[];
    performanceBoost?: number;
    engagementIncrease?: number;
    timeToComplete?: number;
    successProbability?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thông tin thử nghiệm A/B',
  })
  abTestInfo?: {
    testId?: string;
    variant?: string;
    controlGroup?: boolean;
  };

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Đánh giá phản hồi của người dùng (1.0 - 5.0)',
  })
  userRating?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ý kiến phản hồi của người dùng',
  })
  userFeedback?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Khuyến nghị có hiệu quả hay không',
  })
  wasEffective?: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Chỉ số hiệu quả',
  })
  effectivenessMetrics?: {
    clickThroughRate?: number;
    completionRate?: number;
    timeToAction?: number;
    userSatisfaction?: number;
    learningOutcome?: number;
  };

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'studentId' })
  student: User;

  // Virtual properties
  get isActive(): boolean {
    return (
      this.status === RecommendationStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date())
    );
  }

  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt! <= new Date();
  }

  get isHighPriority(): boolean {
    return this.priority === Priority.HIGH || this.priority === Priority.URGENT;
  }

  get isHighConfidence(): boolean {
    return this.confidenceScore >= 0.8;
  }

  get hasBeenInteracted(): boolean {
    return this.interactedAt !== null;
  }
}

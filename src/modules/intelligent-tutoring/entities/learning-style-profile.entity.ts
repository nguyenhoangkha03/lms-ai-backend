import { Entity, Column, OneToOne, Index, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { LearningStyleType, LearningModalityType } from '@/common/enums/tutoring.enums';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('learning_style_profiles')
@Index(['userId'])
export class LearningStyleProfile extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định hồ sơ này thuộc về ai.',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: LearningStyleType,
    default: LearningStyleType.BALANCED,
    comment: 'Phong cách học chính (visual - nhìn, auditory - nghe, kinesthetic - vận động).',
  })
  primaryLearningStyle: LearningStyleType;

  @Column({
    type: 'enum',
    enum: LearningStyleType,
    nullable: true,
    comment: 'Phong cách học phụ (visual - nhìn, auditory - nghe, kinesthetic - vận động)',
  })
  secondaryLearningStyle?: LearningStyleType;

  @Column({
    type: 'enum',
    enum: LearningModalityType,
    default: LearningModalityType.MULTIMODAL,
    comment: 'Phương thức tiếp thu kiến thức mà sinh viên ưa thích nhất.',
  })
  preferredModality: LearningModalityType;

  @Column({
    type: 'json',
    comment:
      'Trường JSON chứa điểm số cho từng phong cách (ví dụ: {"visual": 0.8, "auditory": 0.3, ...})',
  })
  styleScores: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    readingWriting: number;
  };

  @Column({
    type: 'json',
    comment: 'Trường JSON lưu các tùy chọn học tập do người dùng thiết lập hoặc AI suy ra',
  })
  learningPreferences: {
    pacePreference: 'slow' | 'moderate' | 'fast';
    depthPreference: 'surface' | 'strategic' | 'deep';
    feedbackFrequency: 'immediate' | 'periodic' | 'minimal';
    challengeLevel: 'low' | 'moderate' | 'high';
    collaborationPreference: 'individual' | 'small_group' | 'large_group';
  };

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu các đặc điểm về nhận thức được AI suy luận (ví dụ: khả năng tập trung, trí nhớ ngắn hạn).',
  })
  cognitiveTraits: {
    processingSpeed: number; // 1-10 scale
    workingMemoryCapacity: number; // 1-10 scale
    attentionSpan: number; // minutes
    abstractReasoning: number; // 1-10 scale
    patternRecognition: number; // 1-10 scale
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu các yếu tố tạo động lực học tập cho sinh viên.',
  })
  motivationalFactors: {
    intrinsicMotivation: number; // 1-10 scale
    achievementOrientation: number; // 1-10 scale
    competitiveness: number; // 1-10 scale
    autonomyPreference: number; // 1-10 scale
    masteryOrientation: number; // 1-10 scale
  };

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Mức độ tự tin của AI về tính chính xác của hồ sơ mà nó đã tạo ra',
  })
  confidenceLevel: number; // How confident we are in this profile

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số hoạt động đã được dùng để phân tích và xây dựng hồ sơ này',
  })
  interactionsAnalyzed: number; // Number of interactions used to build this profile

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm cuối cùng hồ sơ được AI cập nhật.',
  })
  lastAnalyzedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON ghi lại lịch sử các lần hệ thống đã điều chỉnh (adapt) nội dung cho sinh viên này',
  })
  adaptationHistory: Array<{
    timestamp: Date;
    changeType: string;
    oldValue: any;
    newValue: any;
    trigger: string;
  }>;

  @Column({ type: 'json', nullable: true, comment: 'Dữ liệu metadata' })
  metadata: Record<string, any>;

  // Relations
  @OneToOne(() => User, user => user.learningStyleProfile)
  @JoinColumn({ name: 'userId' })
  user: User;
}

import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, Index } from 'typeorm';

export enum QualityDimension {
  CLARITY = 'clarity',
  COHERENCE = 'coherence',
  COMPLETENESS = 'completeness',
  ACCURACY = 'accuracy',
  ENGAGEMENT = 'engagement',
  ACCESSIBILITY = 'accessibility',
  STRUCTURE = 'structure',
  RELEVANCE = 'relevance',
}

export enum QualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  SATISFACTORY = 'satisfactory',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  POOR = 'poor',
}

@Entity('content_quality_assessments')
@Index(['contentType', 'contentId'])
@Index(['overallScore', 'assessedAt'])
@Index(['qualityLevel', 'isLatest'])
export class ContentQualityAssessment extends BaseEntity {
  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ['course', 'lesson'],
    comment: 'Xác định nội dung nào đang được đánh giá',
  })
  contentType: 'course' | 'lesson';

  @Column({ name: 'content_id', type: 'varchar', length: 36, comment: 'ID của bản ghi nội dung' })
  contentId: string;

  @Column({
    name: 'overall_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Điểm chất lượng tổng thể (0-100) mà AI chấm cho nội dung.',
  })
  overallScore: number;

  @Column({
    name: 'quality_level',
    type: 'enum',
    enum: QualityLevel,
    comment: 'Phân loại chất lượng (excellent, good, needs_improvement)',
  })
  qualityLevel: QualityLevel;

  @Column({ name: 'assessed_at', type: 'timestamp', nullable: true, comment: 'Thời điểm đánh giá' })
  assessedAt: Date;

  @Column({
    name: 'is_latest',
    type: 'boolean',
    default: true,
    comment:
      'Cờ (true/false) cho biết đây có phải là kết quả đánh giá cho phiên bản nội dung mới nhất hay không.',
  })
  isLatest: boolean;

  @Column({
    name: 'ai_model_version',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Mô hình AI đánh giá nội dung',
  })
  aiModelVersion?: string;

  @Column({
    type: 'json',
    comment:
      'Trường JSON chứa điểm số chi tiết cho từng tiêu chí (ví dụ: "Độ rõ ràng", "Tính tương tác", "Độ sâu chuyên môn").',
  })
  dimensionScores: {
    clarity: number;
    coherence: number;
    completeness: number;
    accuracy: number;
    engagement: number;
    accessibility: number;
    structure: number;
    relevance: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa các phân tích chi tiết của AI về điểm mạnh, điểm yếu của nội dung.',
  })
  analysis?: {
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[];
    readabilityScore?: number;
    complexityLevel?: string;
    targetAudienceMatch?: number;
    contentLength?: number;
    vocabularyLevel?: string;
    grammarScore?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Gợi ý cải thiện: Trường JSON chứa danh sách các gợi ý cụ thể để giảng viên ',
  })
  improvements?: {
    priority: 'high' | 'medium' | 'low';
    dimension: QualityDimension;
    suggestion: string;
    impact: number;
  }[];

  @Column({ type: 'json', nullable: true, comment: 'Cột metadata' })
  metadata?: {
    processingTime?: number;
    confidence?: number;
    textStatistics?: {
      wordCount: number;
      sentenceCount: number;
      paragraphCount: number;
      averageSentenceLength: number;
    };
  };
}

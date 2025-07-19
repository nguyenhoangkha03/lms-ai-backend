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
  @Column({ name: 'content_type', type: 'enum', enum: ['course', 'lesson'] })
  contentType: 'course' | 'lesson';

  @Column({ name: 'content_id', type: 'varchar', length: 36 })
  contentId: string;

  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2 })
  overallScore: number;

  @Column({
    name: 'quality_level',
    type: 'enum',
    enum: QualityLevel,
  })
  qualityLevel: QualityLevel;

  @Column({ name: 'assessed_at', type: 'timestamp', nullable: true })
  assessedAt: Date;

  @Column({ name: 'is_latest', type: 'boolean', default: true })
  isLatest: boolean;

  @Column({ name: 'ai_model_version', type: 'varchar', length: 50, nullable: true })
  aiModelVersion?: string;

  @Column({ type: 'json' })
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

  @Column({ type: 'json', nullable: true })
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

  @Column({ type: 'json', nullable: true })
  improvements?: {
    priority: 'high' | 'medium' | 'low';
    dimension: QualityDimension;
    suggestion: string;
    impact: number;
  }[];

  @Column({ type: 'json', nullable: true })
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

import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, Index } from 'typeorm';

export enum SimilarityType {
  SEMANTIC = 'semantic',
  STRUCTURAL = 'structural',
  TOPIC = 'topic',
  DIFFICULTY = 'difficulty',
  COMPREHENSIVE = 'comprehensive',
}

export enum SimilarityStatus {
  CALCULATED = 'calculated',
  PROCESSING = 'processing',
  FAILED = 'failed',
  OUTDATED = 'outdated',
}

@Entity('content_similarities')
@Index(['sourceContentType', 'sourceContentId'])
@Index(['targetContentType', 'targetContentId'])
@Index(['similarityType', 'similarityScore'])
@Index(['status', 'calculatedAt'])
export class ContentSimilarity extends BaseEntity {
  @Column({ name: 'source_content_type', type: 'enum', enum: ['course', 'lesson'] })
  sourceContentType: 'course' | 'lesson';

  @Column({ name: 'source_content_id', type: 'varchar', length: 36 })
  sourceContentId: string;

  @Column({ name: 'target_content_type', type: 'enum', enum: ['course', 'lesson'] })
  targetContentType: 'course' | 'lesson';

  @Column({ name: 'target_content_id', type: 'varchar', length: 36 })
  targetContentId: string;

  @Column({
    name: 'similarity_type',
    type: 'enum',
    enum: SimilarityType,
    default: SimilarityType.SEMANTIC,
  })
  similarityType: SimilarityType;

  @Column({ name: 'similarity_score', type: 'decimal', precision: 5, scale: 4 })
  similarityScore: number;

  @Column({
    type: 'enum',
    enum: SimilarityStatus,
    default: SimilarityStatus.CALCULATED,
  })
  status: SimilarityStatus;

  @Column({ name: 'calculated_at', type: 'timestamp', nullable: true })
  calculatedAt?: Date;

  @Column({ name: 'algorithm_version', type: 'varchar', length: 50, nullable: true })
  algorithmVersion?: string;

  @Column({ type: 'json', nullable: true })
  analysis?: {
    commonTopics?: string[];
    sharedKeywords?: string[];
    structuralSimilarity?: number;
    contentOverlap?: number;
    difficultyDifference?: number;
    recommendations?: string[];
    processingTime?: number;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: {
    vectorSimilarity?: number;
    textLength?: { source: number; target: number };
    languageDetected?: { source: string; target: string };
    qualityScore?: { source: number; target: number };
  };
}

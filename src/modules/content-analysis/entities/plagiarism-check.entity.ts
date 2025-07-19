import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, Index } from 'typeorm';

export enum PlagiarismStatus {
  PENDING = 'pending',
  SCANNING = 'scanning',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PlagiarismLevel {
  NONE = 'none',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  SEVERE = 'severe',
}

@Entity('plagiarism_checks')
@Index(['contentType', 'contentId'])
@Index(['plagiarismLevel', 'scanCompletedAt'])
@Index(['status', 'createdAt'])
export class PlagiarismCheck extends BaseEntity {
  @Column({ name: 'initiated_by', type: 'varchar', length: 36, nullable: true })
  initiatedBy?: string;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ['course', 'lesson', 'assignment', 'forum_post'],
  })
  contentType: 'course' | 'lesson' | 'assignment' | 'forum_post';

  @Column({ name: 'content_id', type: 'varchar', length: 36 })
  contentId: string;

  @Column({ name: 'content_hash', type: 'varchar', length: 64 })
  contentHash: string;

  @Column({
    type: 'enum',
    enum: PlagiarismStatus,
    default: PlagiarismStatus.PENDING,
  })
  status: PlagiarismStatus;

  @Column({ name: 'scan_started_at', type: 'timestamp', nullable: true })
  scanStartedAt?: Date;

  @Column({ name: 'scan_completed_at', type: 'timestamp', nullable: true })
  scanCompletedAt?: Date;

  @Column({ name: 'overall_similarity', type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallSimilarity?: number;

  @Column({
    name: 'plagiarism_level',
    type: 'enum',
    enum: PlagiarismLevel,
    nullable: true,
  })
  plagiarismLevel?: PlagiarismLevel;

  @Column({ name: 'sources_checked', type: 'int', default: 0 })
  sourcesChecked: number;

  @Column({ name: 'matches_found', type: 'int', default: 0 })
  matchesFound: number;

  @Column({ type: 'json', nullable: true })
  matches?: {
    sourceUrl?: string;
    sourceTitle?: string;
    similarity: number;
    matchedText: string;
    startPosition: number;
    endPosition: number;
    sourceType: 'web' | 'academic' | 'internal' | 'student_work';
    confidence: number;
  }[];

  @Column({ type: 'json', nullable: true })
  analysis?: {
    uniqueContentPercentage: number;
    paraphrasedContentPercentage: number;
    directCopyPercentage: number;
    citationAnalysis?: {
      hasCitations: boolean;
      citationCount: number;
      properlyAttributed: number;
    };
    recommendations: string[];
  };

  @Column({ type: 'json', nullable: true })
  scanConfiguration?: {
    checkWebSources: boolean;
    checkAcademicSources: boolean;
    checkInternalContent: boolean;
    checkStudentSubmissions: boolean;
    sensitivityLevel: 'low' | 'medium' | 'high';
    excludedSources?: string[];
  };

  @Column({ type: 'json', nullable: true })
  metadata?: {
    textLength: number;
    wordsAnalyzed: number;
    processingTime: number;
    scanProvider?: string;
    scanVersion?: string;
    confidence: number;
  };
}

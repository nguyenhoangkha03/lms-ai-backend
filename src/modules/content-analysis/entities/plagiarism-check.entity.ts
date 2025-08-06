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
  @Column({
    name: 'initiated_by',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID người dùng đã khởi tạo quá trình kiểm tra',
  })
  initiatedBy?: string;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ['course', 'lesson', 'assignment', 'forum_post'],
    comment: 'Loại nội dung được kiểm tra (lesson, assignment)',
  })
  contentType: 'course' | 'lesson' | 'assignment' | 'forum_post';

  @Column({
    name: 'content_id',
    type: 'varchar',
    length: 36,
    comment: 'ID của bản ghi nội dung được kiểm tra.',
  })
  contentId: string;

  @Column({
    name: 'content_hash',
    type: 'varchar',
    length: 64,
    comment:
      'Một chuỗi hash đại diện cho nội dung, giúp tránh quét lại nếu nội dung không thay đổi',
  })
  contentHash: string;

  @Column({
    type: 'enum',
    enum: PlagiarismStatus,
    default: PlagiarismStatus.PENDING,
    comment: 'Trạng thái của quá trình quét (pending, scanning, completed)',
  })
  status: PlagiarismStatus;

  @Column({
    name: 'scan_started_at',
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm bắt đầu quá trình kiểm tra đạo văn',
  })
  scanStartedAt?: Date;

  @Column({
    name: 'scan_completed_at',
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm quá trình kiểm tra đạo văn hoàn tất',
  })
  scanCompletedAt?: Date;

  @Column({
    name: 'overall_similarity',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Tỷ lệ phần trăm (%) tương đồng tổng thể được phát hiện',
  })
  overallSimilarity?: number;

  @Column({
    name: 'plagiarism_level',
    type: 'enum',
    enum: PlagiarismLevel,
    nullable: true,
    comment: 'Đánh giá mức độ đạo văn (low, moderate, high)',
  })
  plagiarismLevel?: PlagiarismLevel;

  @Column({
    name: 'sources_checked',
    type: 'int',
    default: 0,
    comment: 'Tổng số nguồn tài liệu đã được dùng để so sánh',
  })
  sourcesChecked: number;

  @Column({
    name: 'matches_found',
    type: 'int',
    default: 0,
    comment: 'Tổng số đoạn văn bản trùng khớp được tìm thấy',
  })
  matchesFound: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa danh sách chi tiết các nguồn và đoạn văn bản bị trùng lặp',
  })
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

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa các phân tích chi tiết khác từ công cụ kiểm tra',
  })
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

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Cấu hình được sử dụng cho quá trình quét đạo văn',
  })
  scanConfiguration?: {
    checkWebSources: boolean;
    checkAcademicSources: boolean;
    checkInternalContent: boolean;
    checkStudentSubmissions: boolean;
    sensitivityLevel: 'low' | 'medium' | 'high';
    excludedSources?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thông tin metadata bổ sung liên quan đến quá trình kiểm tra',
  })
  metadata?: {
    textLength: number;
    wordsAnalyzed: number;
    processingTime: number;
    scanProvider?: string;
    scanVersion?: string;
    confidence: number;
  };
}

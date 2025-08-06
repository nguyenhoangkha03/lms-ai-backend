import { Entity, Column, Index } from 'typeorm';
// import { Lesson } from '../../course/entities/lesson.entity';
// import { Course } from '../../course/entities/course.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum TagType {
  AUTO_GENERATED = 'auto_generated',
  MANUAL = 'manual',
  AI_SUGGESTED = 'ai_suggested',
  SYSTEM = 'system',
}

export enum TagCategory {
  TOPIC = 'topic',
  DIFFICULTY = 'difficulty',
  SKILL = 'skill',
  SUBJECT = 'subject',
  LEARNING_OBJECTIVE = 'learning_objective',
  CONTENT_TYPE = 'content_type',
  LANGUAGE = 'language',
}

@Entity('content_tags')
@Index(['contentType', 'contentId'])
@Index(['tag', 'category'])
@Index(['type', 'isActive'])
export class ContentTag extends BaseEntity {
  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ['course', 'lesson'],
    comment: 'Loại nội dung được gắn thẻ (course, lesson)',
  })
  contentType: 'course' | 'lesson';

  @Column({
    name: 'content_id',
    type: 'varchar',
    length: 36,
    comment: 'ID của bản ghi nội dung được gắn thẻ',
  })
  contentId: string;

  @Column({ type: 'varchar', length: 100, comment: 'ID của bản ghi nội dung được gắn thẻ' })
  tag: string;

  @Column({
    type: 'enum',
    enum: TagCategory,
    default: TagCategory.TOPIC,
    comment: 'Phân loại thẻ, ví dụ: topic (chủ đề), difficulty (độ khó), skill (kỹ năng)',
  })
  category: TagCategory;

  @Column({
    type: 'enum',
    enum: TagType,
    default: TagType.AUTO_GENERATED,
    comment:
      'Cho biết thẻ này được tạo ra như thế nào: manual (do người dùng tự nhập), ai_suggested (do AI gợi ý).',
  })
  type: TagType;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 1.0,
    comment: 'Mức độ tin cậy của AI khi gợi ý thẻ này (từ 0 đến 1).',
  })
  confidence: number;

  @Column({ type: 'text', nullable: true, comment: 'Mô tả thẻ' })
  description?: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    comment: 'Cờ (true/false) cho biết thẻ được hành động hay khóa',
  })
  isActive: boolean;

  @Column({
    name: 'is_verified',
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) cho biết thẻ do AI gợi ý đã được giảng viên xác nhận là chính xác hay chưa',
  })
  isVerified: boolean;

  @Column({
    name: 'verified_by',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người dùng đã xác minh thẻ',
  })
  verifiedBy?: string;

  @Column({
    name: 'verified_at',
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian thẻ được xác minh',
  })
  verifiedAt?: Date;

  // AI Analysis metadata
  @Column({
    name: 'ai_model_version',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Phiên bản của mô hình AI đã tạo ra thẻ này',
  })
  aiModelVersion?: string;

  @Column({
    name: 'extraction_method',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Phương pháp AI đã sử dụng để trích xuất thẻ',
  })
  extractionMethod?: string;

  @Column({ type: 'json', nullable: true, comment: 'Dữ liệu metadata' })
  metadata?: {
    keywords?: string[];
    context?: string;
    relevanceScore?: number;
    sourceText?: string;
    algorithmUsed?: string;
    processingTime?: number;
  };

  // Relations
  //   @ManyToOne(() => Course, { nullable: true })
  //   @JoinColumn({ name: 'content_id' })
  //   course?: Course;

  //   @ManyToOne(() => Lesson, { nullable: true })
  //   @JoinColumn({ name: 'content_id' })
  //   lesson?: Lesson;
}

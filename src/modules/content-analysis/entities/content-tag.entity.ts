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
  @Column({ name: 'content_type', type: 'enum', enum: ['course', 'lesson'] })
  contentType: 'course' | 'lesson';

  @Column({ name: 'content_id', type: 'varchar', length: 36 })
  contentId: string;

  @Column({ type: 'varchar', length: 100 })
  tag: string;

  @Column({
    type: 'enum',
    enum: TagCategory,
    default: TagCategory.TOPIC,
  })
  category: TagCategory;

  @Column({
    type: 'enum',
    enum: TagType,
    default: TagType.AUTO_GENERATED,
  })
  type: TagType;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 1.0 })
  confidence: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by', type: 'varchar', length: 36, nullable: true })
  verifiedBy?: string;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  // AI Analysis metadata
  @Column({ name: 'ai_model_version', type: 'varchar', length: 50, nullable: true })
  aiModelVersion?: string;

  @Column({ name: 'extraction_method', type: 'varchar', length: 100, nullable: true })
  extractionMethod?: string;

  @Column({ type: 'json', nullable: true })
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

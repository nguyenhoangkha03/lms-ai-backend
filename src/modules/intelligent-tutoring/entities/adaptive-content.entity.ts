import { Entity, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import {
  ContentType,
  DifficultyLevel,
  AdaptationType,
  LearningStyleType,
} from '@/common/enums/tutoring.enums';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('adaptive_content')
@Index(['courseId', 'difficultyLevel'])
@Index(['contentType', 'isActive'])
export class AdaptiveContent extends BaseEntity {
  @Column({ type: 'varchar', length: 36, nullable: true })
  courseId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  lessonId?: string;

  @Column({
    type: 'enum',
    enum: ContentType,
  })
  contentType: ContentType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
  })
  difficultyLevel: DifficultyLevel;

  @Column({
    type: 'enum',
    enum: AdaptationType,
  })
  adaptationType: AdaptationType;

  @Column({ type: 'json' })
  targetLearningStyles: LearningStyleType[];

  @Column({ type: 'json' })
  prerequisites: string[]; // concept IDs that should be mastered first

  @Column({ type: 'json' })
  conceptsCovered: string[]; // concepts this content teaches

  @Column({ type: 'int', default: 5 })
  estimatedDuration: number; // minutes

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  effectivenessScore: number; // Based on user feedback and performance

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  adaptationRules: {
    triggerConditions: string[];
    adaptationActions: string[];
    successCriteria: string[];
  };

  @Column({ type: 'json', nullable: true })
  mediaAssets: {
    images?: string[];
    videos?: string[];
    audio?: string[];
    documents?: string[];
  };

  @Column({ type: 'json', nullable: true })
  interactiveElements: {
    hasQuiz?: boolean;
    hasSimulation?: boolean;
    hasCodeEditor?: boolean;
    hasDragDrop?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Course, course => course.adaptiveContent, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.adaptiveContent, { nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;
}

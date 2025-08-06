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
  @Column({ type: 'varchar', length: 36, nullable: true, comment: 'Id khóa học' })
  courseId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true, comment: 'Id bài học' })
  lessonId?: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    comment: 'Loại nội dung (lesson, exercise, quiz, example).',
  })
  contentType: ContentType;

  @Column({ type: 'varchar', length: 255, comment: 'Tiêu đề của biến thể này.' })
  title: string;

  @Column({ type: 'text', comment: 'Nội dung của biến thể này.' })
  content: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    comment: 'Mức độ khó của biến thể này (very_easy, easy, medium...).',
  })
  difficultyLevel: DifficultyLevel;

  @Column({
    type: 'enum',
    enum: AdaptationType,
    comment:
      'Cho biết biến thể này được tạo ra nhằm mục đích gì: difficulty_adjustment (điều chỉnh độ khó), learning_style_adaptation (phù hợp phong cách học), remediation (củng cố kiến thức yếu).',
  })
  adaptationType: AdaptationType;

  @Column({
    type: 'json',
    comment:
      'Trường JSON chỉ định biến thể này phù hợp nhất với phong cách học nào (ví dụ: visual, auditory).',
  })
  targetLearningStyles: LearningStyleType[];

  @Column({
    type: 'json',
    comment: 'Trường JSON liệt kê các kiến thức cần có để hiểu được biến thể này.',
  })
  prerequisites: string[]; // concept IDs that should be mastered first

  @Column({
    type: 'json',
    comment: 'Trường JSON liệt kê các khái niệm chính được đề cập trong biến thể.',
  })
  conceptsCovered: string[]; // concepts this content teaches

  @Column({ type: 'int', default: 5, comment: 'Thoi gian ước tính' })
  estimatedDuration: number; // minutes

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Điểm số đánh giá mức độ hiệu quả của biến thể này dựa trên dữ liệu lịch sử.',
  })
  effectivenessScore: number; // Based on user feedback and performance

  @Column({ type: 'boolean', default: true, comment: 'Trạng thái hóa động' })
  isActive: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Điểm số đánh giá mức độ hiệu quả của biến thể này dựa trên dữ liệu lịch sử.',
  })
  adaptationRules: {
    triggerConditions: string[];
    adaptationActions: string[];
    successCriteria: string[];
  };

  @Column({ type: 'json', nullable: true, comment: 'Media cơ bản' })
  mediaAssets: {
    images?: string[];
    videos?: string[];
    audio?: string[];
    documents?: string[];
  };

  @Column({ type: 'json', nullable: true, comment: 'Phần tử tương tác' })
  interactiveElements: {
    hasQuiz?: boolean;
    hasSimulation?: boolean;
    hasCodeEditor?: boolean;
    hasDragDrop?: boolean;
  };

  @Column({ type: 'json', nullable: true, comment: 'Dữ liệu metadata' })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => Course, course => course.adaptiveContent, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.adaptiveContent, { nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;
}

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Lesson } from '../../course/entities/lesson.entity';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum QuizGenerationStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  FILL_IN_BLANK = 'fill_in_blank',
  MATCHING = 'matching',
  ORDERING = 'ordering',
}

@Entity('generated_quizzes')
@Index(['lessonId', 'status'])
@Index(['generatedBy', 'createdAt'])
@Index(['status', 'qualityScore'])
export class GeneratedQuiz extends BaseEntity {
  @Column({ name: 'generated_by', type: 'varchar', length: 36, nullable: true })
  generatedBy?: string;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 36, nullable: true })
  reviewedBy?: string;

  @Column({ name: 'lesson_id', type: 'varchar', length: 36 })
  lessonId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: QuizGenerationStatus,
    default: QuizGenerationStatus.PENDING,
  })
  status: QuizGenerationStatus;

  @Column({ name: 'question_count', type: 'int', default: 5 })
  questionCount: number;

  @Column({
    name: 'difficulty_level',
    type: 'enum',
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  })
  difficultyLevel: 'easy' | 'medium' | 'hard';

  @Column({ name: 'time_limit', type: 'int', nullable: true })
  timeLimit?: number;

  @Column({ name: 'ai_model_version', type: 'varchar', length: 50, nullable: true })
  aiModelVersion?: string;

  @Column({ name: 'generation_prompt', type: 'text', nullable: true })
  generationPrompt?: string;

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore?: number;

  @Column({ type: 'json' })
  questions: {
    id: string;
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    estimatedTime: number;
    keywords?: string[];
  }[];

  @Column({ type: 'json', nullable: true })
  review?: {
    qualityRating: number;
    feedback: string;
    suggestedChanges?: string[];
    reviewedAt: Date;
  };

  @Column({ type: 'json', nullable: true })
  generationAnalysis?: {
    sourceTextLength: number;
    keyConceptsExtracted: string[];
    difficultyAnalysis: string;
    coverageScore: number;
    generationTime: number;
    confidence: number;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: {
    targetLearningObjectives?: string[];
    bloomsTaxonomyLevels?: string[];
    estimatedCompletionTime?: number;
    languageComplexity?: string;
  };

  // Relations
  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'generated_by' })
  generator?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;
}

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { QuestionType, DifficultyLevel } from '@/common/enums/assessment.enums';
import { Assessment } from './assessment.entity';

@Entity('questions')
@Index(['assessmentId'])
@Index(['questionType'])
@Index(['difficulty'])
@Index(['orderIndex'])
@Index(['tags'])
export class Question extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Assessment ID',
  })
  assessmentId: string;

  @Column({
    type: 'text',
    comment: 'Question text/content',
  })
  questionText: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
    comment: 'Type of question',
  })
  questionType: QuestionType;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Question options for multiple choice questions',
  })
  options?: {
    id: string;
    text: string;
    isCorrect?: boolean;
    explanation?: string;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Correct answer(s) for the question',
  })
  correctAnswer?: any;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Explanation for the correct answer',
  })
  explanation?: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    comment: 'Points awarded for correct answer',
  })
  points: number;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.MEDIUM,
    comment: 'Question difficulty level',
  })
  difficulty: DifficultyLevel;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Display order in assessment',
  })
  orderIndex: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Question tags for categorization',
  })
  tags?: string[];

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Time limit for this question in seconds',
  })
  timeLimit?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Hint for the question',
  })
  hint?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Media attachments (images, audio, video)',
  })
  attachments?: {
    type: 'image' | 'audio' | 'video' | 'document';
    url: string;
    filename: string;
    size?: number;
    mimeType?: string;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Validation rules for answer checking',
  })
  validationRules?: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
    acceptedAnswers?: string[];
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Analytics data for this question',
  })
  analytics?: {
    totalAttempts?: number;
    correctAttempts?: number;
    averageTime?: number;
    difficultyRating?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional question metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => Assessment, assessment => assessment.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  // Virtual properties
  get isMultipleChoice(): boolean {
    return this.questionType === QuestionType.MULTIPLE_CHOICE;
  }

  get isEssay(): boolean {
    return this.questionType === QuestionType.ESSAY;
  }

  get requiresManualGrading(): boolean {
    return [QuestionType.ESSAY, QuestionType.SHORT_ANSWER].includes(this.questionType);
  }
}

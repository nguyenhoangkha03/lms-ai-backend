import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { QuestionType, DifficultyLevel } from '@/common/enums/assessment.enums';
import { Assessment } from './assessment.entity';

@Entity('questions')
// @Index(['assessmentId', 'orderIndex'])
@Index(['questionType', 'difficulty'])
@Index(['tags'])
export class Question extends BaseEntity {
  // Core Question Information
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Assessment ID',
    nullable: true,
  })
  assessmentId?: string | null;

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

  // Question Configuration
  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Question options for multiple choice questions',
  })
  options?: string | null;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Correct answer(s) for the question',
  })
  correctAnswer?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Question tags for categorization',
  })
  tags?: string | null;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'File attachments (JSON)',
  })
  attachments?: string | null;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Validation rules for answer checking',
  })
  validationRules?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Analytics data for this question',
  })
  analytics?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional question metadata',
  })
  metadata?: string | null;

  // Relationships
  @ManyToOne(() => Assessment, assessment => assessment.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  // Virtual properties
  get optionsJson() {
    return this.options ? JSON.parse(this.options) : [];
  }

  get correctAnswerJson() {
    return JSON.parse(this.correctAnswer!);
  }

  get tagsJson() {
    return this.tags ? JSON.parse(this.tags) : [];
  }

  get attachmentsJson() {
    return this.attachments ? JSON.parse(this.attachments) : [];
  }

  get validationRulesJson() {
    return this.validationRules ? JSON.parse(this.validationRules) : {};
  }

  get analyticsJson() {
    return this.analytics ? JSON.parse(this.analytics) : {};
  }

  get metadataJson() {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }
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

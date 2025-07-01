import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { AssessmentType, AssessmentStatus, GradingMethod } from '@/common/enums/assessment.enums';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { User } from '../../user/entities/user.entity';
import { Question } from './question.entity';
import { AssessmentAttempt } from './assessment-attempt.entity';

@Entity('assessments')
@Index(['courseId'])
@Index(['lessonId'])
@Index(['teacherId'])
@Index(['assessmentType'])
@Index(['status'])
@Index(['availableFrom'])
@Index(['availableUntil'])
export class Assessment extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Course ID if assessment is course-level',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Lesson ID if assessment is lesson-level',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Teacher/Creator ID',
  })
  teacherId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Assessment title',
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Assessment description',
  })
  description: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Detailed instructions for students',
  })
  instructions?: string;

  @Column({
    type: 'enum',
    enum: AssessmentType,
    default: AssessmentType.QUIZ,
    comment: 'Type of assessment',
  })
  assessmentType: AssessmentType;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
    comment: 'Assessment status',
  })
  status: AssessmentStatus;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Time limit in minutes',
  })
  timeLimit?: number;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Maximum number of attempts allowed',
  })
  maxAttempts: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 70.0,
    comment: 'Minimum score to pass (percentage)',
  })
  passingScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Total possible points',
  })
  totalPoints?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether to randomize question order',
  })
  randomizeQuestions: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether to randomize answer options',
  })
  randomizeAnswers: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether to show results immediately after submission',
  })
  showResults: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether to show correct answers after submission',
  })
  showCorrectAnswers: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this assessment is mandatory',
  })
  isMandatory: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is a proctored assessment',
  })
  isProctored: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Assessment available from date',
  })
  availableFrom?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Assessment available until date',
  })
  availableUntil?: Date;

  @Column({
    type: 'enum',
    enum: GradingMethod,
    default: GradingMethod.AUTOMATIC,
    comment: 'How this assessment should be graded',
  })
  gradingMethod: GradingMethod;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    comment: 'Weight of this assessment in final grade',
  })
  weight: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Assessment configuration settings',
  })
  settings?: {
    allowBackward?: boolean;
    oneQuestionPerPage?: boolean;
    showProgressBar?: boolean;
    lockdownBrowser?: boolean;
    webcamRequired?: boolean;
    autoSave?: boolean;
    saveInterval?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Anti-cheating configuration',
  })
  antiCheatSettings?: {
    preventCopyPaste?: boolean;
    preventRightClick?: boolean;
    preventTabSwitch?: boolean;
    blockExternalTools?: boolean;
    requireFullscreen?: boolean;
    detectMultipleFaces?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata for assessment',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => Course, course => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @OneToMany(() => Question, question => question.assessment)
  questions?: Question[];

  @OneToMany(() => AssessmentAttempt, attempt => attempt.assessment)
  attempts?: AssessmentAttempt[];

  // Virtual properties
  get isActive(): boolean {
    const now = new Date();
    const isPublished = this.status === AssessmentStatus.PUBLISHED;
    const isAvailable = !this.availableFrom || this.availableFrom <= now;
    const notExpired = !this.availableUntil || this.availableUntil > now;

    return isPublished && isAvailable && notExpired;
  }

  get duration(): string {
    if (!this.timeLimit) return 'Unlimited';
    const hours = Math.floor(this.timeLimit / 60);
    const minutes = this.timeLimit % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}

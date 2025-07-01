import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { LessonProgressStatus } from '@/common/enums/course.enums';
import { User } from '../../user/entities/user.entity';
import { Lesson } from './lesson.entity';
import { Enrollment } from './enrollment.entity';

@Entity('lesson_progress')
@Unique(['studentId', 'lessonId'])
@Index(['studentId'])
@Index(['lessonId'])
@Index(['enrollmentId'])
@Index(['status'])
@Index(['completionDate'])
export class LessonProgress extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Lesson ID',
  })
  lessonId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Enrollment ID',
  })
  enrollmentId: string;

  @Column({
    type: 'enum',
    enum: LessonProgressStatus,
    default: LessonProgressStatus.NOT_STARTED,
    comment: 'Lesson progress status',
  })
  status: LessonProgressStatus;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Lesson completion date',
  })
  completionDate?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Time spent on lesson in seconds',
  })
  timeSpent: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Last playback position in seconds (for videos)',
  })
  lastPosition: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times lesson was attempted',
  })
  attempts: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Score achieved (for quizzes/assignments)',
  })
  score?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Maximum possible score',
  })
  maxScore?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Progress percentage (0-100)',
  })
  progressPercentage: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'First time lesson was accessed',
  })
  firstAccessedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last time lesson was accessed',
  })
  lastAccessedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'User answers for quiz/assignment lessons',
  })
  answers?: {
    questionId: string;
    answer: any;
    isCorrect?: boolean;
    timeSpent?: number;
  }[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Student notes for this lesson',
  })
  notes?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Bookmarks/timestamps for video lessons',
  })
  bookmarks?: {
    time: number;
    title: string;
    note?: string;
    createdAt: Date;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Interaction data (pause points, rewinds, etc.)',
  })
  interactionData?: {
    pausePoints?: number[];
    rewindPoints?: number[];
    playbackSpeed?: number[];
    skipSegments?: { start: number; end: number }[];
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether lesson was skipped',
  })
  isSkipped: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Reason for skipping or feedback',
  })
  feedback?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional progress metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Lesson, lesson => lesson.progress)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => Enrollment, enrollment => enrollment.lessonProgress)
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === LessonProgressStatus.COMPLETED;
  }

  get isInProgress(): boolean {
    return this.status === LessonProgressStatus.IN_PROGRESS;
  }

  get isNotStarted(): boolean {
    return this.status === LessonProgressStatus.NOT_STARTED;
  }

  get formattedTimeSpent(): string {
    const hours = Math.floor(this.timeSpent / 3600);
    const minutes = Math.floor((this.timeSpent % 3600) / 60);
    const seconds = this.timeSpent % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  get scorePercentage(): number | null {
    if (this.score !== null && this.maxScore !== null && this.maxScore! > 0) {
      return (this.score! / this.maxScore!) * 100;
    }
    return null;
  }

  get hasBookmarks(): boolean {
    return !!(this.bookmarks && this.bookmarks.length > 0);
  }

  get hasNotes(): boolean {
    return Boolean(this.notes && this.notes.trim().length > 0);
  }

  get completionRate(): number {
    return this.progressPercentage;
  }

  get lastPositionFormatted(): string {
    const hours = Math.floor(this.lastPosition / 3600);
    const minutes = Math.floor((this.lastPosition % 3600) / 60);
    const seconds = this.lastPosition % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

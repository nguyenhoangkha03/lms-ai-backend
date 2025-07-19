import { Entity, Column, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { TutoringInteraction } from './tutoring-interaction.entity';
import { SessionStatus, TutoringMode, LearningStyleType } from '@/common/enums/tutoring.enums';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('tutoring_sessions')
@Index(['studentId', 'startedAt'])
@Index(['courseId', 'status'])
export class TutoringSession extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  studentId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  courseId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  lessonId?: string;

  @Column({
    type: 'enum',
    enum: TutoringMode,
    default: TutoringMode.ADAPTIVE,
  })
  mode: TutoringMode;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ type: 'int', default: 0 })
  totalDuration: number; // in seconds

  @Column({ type: 'int', default: 0 })
  questionsAsked: number;

  @Column({ type: 'int', default: 0 })
  hintsProvided: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionPercentage: number;

  @Column({
    type: 'enum',
    enum: LearningStyleType,
    nullable: true,
  })
  detectedLearningStyle?: LearningStyleType;

  @Column({ type: 'varchar', length: 50, default: 'beginner' })
  currentDifficultyLevel: string;

  @Column({ type: 'json', nullable: true })
  sessionGoals: {
    type: 'mastery' | 'practice' | 'review' | 'exploration';
    topics: string[];
    targetAccuracy?: number;
    timeLimit?: number;
  };

  @Column({ type: 'json', nullable: true })
  adaptiveSettings: {
    difficultyAdjustmentFactor: number;
    hintThreshold: number;
    masteryThreshold: number;
    strugglingThreshold: number;
  };

  @Column({ type: 'json', nullable: true })
  learningPath: {
    currentTopic: string;
    completedTopics: string[];
    recommendedNext: string[];
    skillGaps: string[];
  };

  @Column({ type: 'json', nullable: true })
  performanceMetrics: {
    averageResponseTime: number;
    accuracyRate: number;
    conceptMastery: Record<string, number>;
    engagementScore: number;
  };

  @Column({ type: 'text', nullable: true })
  sessionSummary?: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => User, user => user.tutoringSessions)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course, course => course.tutoringSessions, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.tutoringSessions, { nullable: true })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @OneToMany(() => TutoringInteraction, interaction => interaction.session, {
    cascade: true,
  })
  interactions: TutoringInteraction[];
}

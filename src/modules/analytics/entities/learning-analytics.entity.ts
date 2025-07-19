import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { PerformanceLevel, LearningPatternType } from '@/common/enums/analytics.enums';

@Entity('learning_analytics')
@Unique(['studentId', 'courseId', 'date'])
@Index(['studentId'])
@Index(['courseId'])
@Index(['date'])
@Index(['engagementScore'])
@Index(['performanceLevel'])
export class LearningAnalytics extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Student user ID',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Course ID (null for overall analytics)',
  })
  courseId?: string;

  @Column({
    type: 'date',
    comment: 'Analytics date',
  })
  date: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total time spent learning in seconds',
  })
  totalTimeSpent: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of lessons completed',
  })
  lessonsCompleted: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of assessments taken',
  })
  assessmentsTaken: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Average assessment score percentage',
  })
  averageScore: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Skill progress',
  })
  skillProgress: Record<string, number>;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of quizzes attempted',
  })
  quizzesAttempted: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of quizzes passed',
  })
  quizzesPassed: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Average quiz score percentage',
  })
  averageQuizScore?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of login sessions',
  })
  loginCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Time spent watching videos in seconds',
  })
  videoWatchTime: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Time spent reading content in seconds',
  })
  readingTime: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of forum posts/discussions',
  })
  discussionPosts: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of chat messages sent',
  })
  chatMessages: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Most active hour of the day (0-23)',
  })
  mostActiveHour?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Indicators of learning struggles',
  })
  struggleIndicators?: {
    repeatedQuizFailures?: number;
    excessiveVideoRewinding?: number;
    incompleteAssignments?: number;
    longInactivityPeriods?: number;
    helpRequestsCount?: number;
  };

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Overall engagement score (0-100)',
  })
  engagementScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Learning progress percentage',
  })
  progressPercentage: number;

  @Column({
    type: 'enum',
    enum: PerformanceLevel,
    default: PerformanceLevel.AVERAGE,
    comment: 'Overall performance level',
  })
  performanceLevel: PerformanceLevel;

  @Column({
    type: 'enum',
    enum: LearningPatternType,
    nullable: true,
    comment: 'Identified learning pattern',
  })
  learningPattern?: LearningPatternType;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Detailed engagement metrics',
  })
  engagementMetrics?: {
    sessionDuration?: number;
    contentInteraction?: number;
    assessmentParticipation?: number;
    socialInteraction?: number;
    consistencyScore?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Learning velocity and efficiency metrics',
  })
  learningVelocity?: {
    lessonsPerDay?: number;
    timePerLesson?: number;
    retentionRate?: number;
    masterySpeed?: number;
    difficultyProgression?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Predictive indicators',
  })
  predictiveIndicators?: {
    dropoutRisk?: number;
    successProbability?: number;
    recommendedPace?: string;
    nextBestAction?: string;
    motivationLevel?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Skills and competencies gained',
  })
  skillsGained?: {
    newSkills?: string[];
    improvedSkills?: string[];
    masteredConcepts?: string[];
    weakAreas?: string[];
    strengthAreas?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Behavioral patterns observed',
  })
  behavioralPatterns?: {
    studyTimePreference?: string;
    learningStylePreference?: string;
    contentTypePreference?: string;
    pacingPreference?: string;
    socialLearningTendency?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional analytics metadata',
  })
  metadata?: Record<string, any>;

  // Virtual properties
  get averageSessionDuration(): number {
    return this.loginCount > 0 ? this.totalTimeSpent / this.loginCount : 0;
  }

  get quizSuccessRate(): number {
    return this.quizzesAttempted > 0 ? (this.quizzesPassed / this.quizzesAttempted) * 100 : 0;
  }

  get isHighPerformer(): boolean {
    return (
      this.performanceLevel === PerformanceLevel.EXCELLENT ||
      this.performanceLevel === PerformanceLevel.GOOD
    );
  }

  get needsAttention(): boolean {
    return this.performanceLevel === PerformanceLevel.POOR || this.engagementScore < 30;
  }
}

import { Entity, Column, OneToOne, Index, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { LearningStyleType, LearningModalityType } from '@/common/enums/tutoring.enums';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('learning_style_profiles')
@Index(['userId'])
export class LearningStyleProfile extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({
    type: 'enum',
    enum: LearningStyleType,
    default: LearningStyleType.BALANCED,
  })
  primaryLearningStyle: LearningStyleType;

  @Column({
    type: 'enum',
    enum: LearningStyleType,
    nullable: true,
  })
  secondaryLearningStyle?: LearningStyleType;

  @Column({
    type: 'enum',
    enum: LearningModalityType,
    default: LearningModalityType.MULTIMODAL,
  })
  preferredModality: LearningModalityType;

  @Column({ type: 'json' })
  styleScores: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    readingWriting: number;
  };

  @Column({ type: 'json' })
  learningPreferences: {
    pacePreference: 'slow' | 'moderate' | 'fast';
    depthPreference: 'surface' | 'strategic' | 'deep';
    feedbackFrequency: 'immediate' | 'periodic' | 'minimal';
    challengeLevel: 'low' | 'moderate' | 'high';
    collaborationPreference: 'individual' | 'small_group' | 'large_group';
  };

  @Column({ type: 'json', nullable: true })
  cognitiveTraits: {
    processingSpeed: number; // 1-10 scale
    workingMemoryCapacity: number; // 1-10 scale
    attentionSpan: number; // minutes
    abstractReasoning: number; // 1-10 scale
    patternRecognition: number; // 1-10 scale
  };

  @Column({ type: 'json', nullable: true })
  motivationalFactors: {
    intrinsicMotivation: number; // 1-10 scale
    achievementOrientation: number; // 1-10 scale
    competitiveness: number; // 1-10 scale
    autonomyPreference: number; // 1-10 scale
    masteryOrientation: number; // 1-10 scale
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidenceLevel: number; // How confident we are in this profile

  @Column({ type: 'int', default: 0 })
  interactionsAnalyzed: number; // Number of interactions used to build this profile

  @Column({ type: 'timestamp', nullable: true })
  lastAnalyzedAt?: Date;

  @Column({ type: 'json', nullable: true })
  adaptationHistory: Array<{
    timestamp: Date;
    changeType: string;
    oldValue: any;
    newValue: any;
    trigger: string;
  }>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @OneToOne(() => User, user => user.learningStyleProfile)
  @JoinColumn({ name: 'userId' })
  user: User;
}

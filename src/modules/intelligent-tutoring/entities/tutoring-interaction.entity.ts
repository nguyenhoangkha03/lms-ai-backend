import { Entity, Column, ManyToOne, Index, JoinColumn, OneToMany } from 'typeorm';
import { TutoringSession } from './tutoring-session.entity';
import { InteractionType, ResponseType } from '@/common/enums/tutoring.enums';
import { HintGeneration } from './hint-generation.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('tutoring_interactions')
@Index(['sessionId', 'createdAt'])
@Index(['interactionType', 'createdAt'])
export class TutoringInteraction extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: InteractionType,
  })
  interactionType: InteractionType;

  @Column({ type: 'text' })
  userInput: string;

  @Column({ type: 'text' })
  aiResponse: string;

  @Column({
    type: 'enum',
    enum: ResponseType,
  })
  responseType: ResponseType;

  @Column({ type: 'int', default: 0 })
  responseTime: number; // milliseconds

  @Column({ type: 'boolean', default: false })
  wasHelpful: boolean;

  @Column({ type: 'boolean', default: false })
  isCorrectAnswer: boolean;

  @Column({ type: 'int', default: 0 })
  hintLevel: number; // 0 = no hint, 1-5 = increasing hint levels

  @Column({ type: 'varchar', length: 100, nullable: true })
  topicCovered?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  difficultyLevel?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore?: number;

  @Column({ type: 'json', nullable: true })
  contextData: {
    questionId?: string;
    conceptTags?: string[];
    prerequisitesCovered?: boolean;
    userStrugglePoints?: string[];
  };

  @Column({ type: 'json', nullable: true })
  adaptationTriggers: {
    difficultyAdjustment?: 'increase' | 'decrease' | 'maintain';
    hintGenerated?: boolean;
    pathRedirection?: boolean;
    conceptReinforcement?: boolean;
  };

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => TutoringSession, session => session.interactions)
  @JoinColumn({ name: 'sessionId' })
  session: TutoringSession;

  @OneToMany(() => HintGeneration, hint => hint.interaction, {
    cascade: true,
  })
  hintGenerations: HintGeneration[];
}

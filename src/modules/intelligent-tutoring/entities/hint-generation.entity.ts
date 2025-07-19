import { Entity, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { TutoringInteraction } from './tutoring-interaction.entity';
import { HintType, HintTrigger, LearningStyleType } from '@/common/enums/tutoring.enums';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('hint_generations')
@Index(['interactionId'])
@Index(['hintType', 'createdAt'])
export class HintGeneration extends BaseEntity {
  @Column({ type: 'varchar', length: 36 })
  interactionId: string;

  @Column({
    type: 'enum',
    enum: HintType,
  })
  hintType: HintType;

  @Column({
    type: 'enum',
    enum: HintTrigger,
  })
  trigger: HintTrigger;

  @Column({ type: 'int', default: 1 })
  hintLevel: number; // 1-5, increasing specificity

  @Column({ type: 'text' })
  hintContent: string;

  @Column({ type: 'boolean', default: false })
  wasUsed: boolean;

  @Column({ type: 'boolean', nullable: true })
  wasHelpful?: boolean; // User feedback

  @Column({ type: 'int', default: 0 })
  timesToGenerate: number; // How long it took to generate this hint

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  relevanceScore: number; // AI confidence in hint relevance

  @Column({ type: 'json', nullable: true })
  contextAnalysis: {
    userStrugglePoints: string[];
    conceptDifficulty: number;
    priorKnowledge: string[];
    similarMistakes: string[];
  };

  @Column({ type: 'json', nullable: true })
  adaptationData: {
    learningStyle: LearningStyleType;
    preferredHintType: HintType[];
    effectivenessHistory: number[];
  };

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => TutoringInteraction, interaction => interaction.hintGenerations)
  @JoinColumn({ name: 'interactionId' })
  interaction: TutoringInteraction;
}

import { Entity, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { TutoringInteraction } from './tutoring-interaction.entity';
import { HintType, HintTrigger, LearningStyleType } from '@/common/enums/tutoring.enums';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('hint_generations')
@Index(['interactionId'])
@Index(['hintType', 'createdAt'])
export class HintGeneration extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment:
      'Khóa ngoại liên kết tới một bản ghi tương tác cụ thể (ví dụ: một lần trả lời sai câu hỏi quiz).',
  })
  interactionId: string;

  @Column({
    type: 'enum',
    enum: HintType,
    comment:
      'Phân loại gợi ý (strategic - gợi ý chiến lược, conceptual - gợi ý về khái niệm, motivational - động viên).',
  })
  hintType: HintType;

  @Column({
    type: 'enum',
    enum: HintTrigger,
    comment:
      'Lý do tại sao gợi ý được tạo ra (user_request - do người dùng yêu cầu, struggle_detection - do hệ thống phát hiện khó khăn).',
  })
  trigger: HintTrigger;

  @Column({
    type: 'int',
    default: 1,
    comment:
      'Cấp độ chi tiết của gợi ý (ví dụ: cấp 1 chỉ gợi ý chung, cấp 3 chỉ ra lỗi sai cụ thể).',
  })
  hintLevel: number; // 1-5, increasing specificity

  @Column({ type: 'text', comment: 'Nội dung của gợi ý được hiển thị cho sinh viên' })
  hintContent: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết sinh viên có xem gợi ý này hay không.',
  })
  wasUsed: boolean;

  @Column({
    type: 'boolean',
    nullable: true,
    comment: 'Cờ (true/false) do sinh viên đánh giá, cho biết gợi ý có hữu ích hay không',
  })
  wasHelpful?: boolean; // User feedback

  @Column({ type: 'int', default: 0, comment: 'Số lần gợi ý được tạo ra' })
  timesToGenerate: number; // How long it took to generate this hint

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Điểm số đánh giá mức độ phù hợp của gợi ý với ngữ cảnh hiện tại.',
  })
  relevanceScore: number; // AI confidence in hint relevance

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu lại phân tích của AI về tình huống của sinh viên tại thời điểm tạo gợi ý.',
  })
  contextAnalysis: {
    userStrugglePoints: string[];
    conceptDifficulty: number;
    priorKnowledge: string[];
    similarMistakes: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Dữ liệu thích ứng của người học, bao gồm kiểu học, loại gợi ý ưu tiên và lịch sử hiệu quả',
  })
  adaptationData: {
    learningStyle: LearningStyleType;
    preferredHintType: HintType[];
    effectivenessHistory: number[];
  };

  @Column({ type: 'json', nullable: true, comment: 'Dữ liệu metadata' })
  metadata: Record<string, any>;

  // Relations
  @ManyToOne(() => TutoringInteraction, interaction => interaction.hintGenerations)
  @JoinColumn({ name: 'interactionId' })
  interaction: TutoringInteraction;
}

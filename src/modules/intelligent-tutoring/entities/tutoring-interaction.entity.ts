import { Entity, Column, ManyToOne, Index, JoinColumn, OneToMany } from 'typeorm';
import { TutoringSession } from './tutoring-session.entity';
import { InteractionType, ResponseType } from '@/common/enums/tutoring.enums';
import { HintGeneration } from './hint-generation.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('tutoring_interactions')
@Index(['sessionId', 'createdAt'])
@Index(['interactionType', 'createdAt'])
export class TutoringInteraction extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment:
      'Khóa ngoại liên kết tới tutoring_sessions.id, cho biết tương tác này thuộc về phiên nào.',
  })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: InteractionType,
    comment:
      'Phân loại hành động của sinh viên (question - đặt câu hỏi, hint_request - yêu cầu gợi ý).',
  })
  interactionType: InteractionType;

  @Column({ type: 'text', comment: 'Nội dung chính xác mà sinh viên đã gõ.' })
  userInput: string;

  @Column({ type: 'text', comment: 'Nội dung chính xác mà AI đã trả lời.' })
  aiResponse: string;

  @Column({
    type: 'enum',
    enum: ResponseType,
    comment:
      'Phân loại chiến lược sư phạm mà AI sử dụng (direct_answer - trả lời trực tiếp, socratic_question - đặt câu hỏi gợi mở, hint - đưa ra gợi ý).',
  })
  responseType: ResponseType;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Thời gian (tính bằng mili giây) AI cần để xử lý và trả lời.',
  })
  responseTime: number; // milliseconds

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) do sinh viên đánh giá, cho biết câu trả lời của AI có hữu ích không.',
  })
  wasHelpful: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) cho biết liệu userInput của sinh viên có phải là một câu trả lời đúng cho câu hỏi trước đó của AI hay không.',
  })
  isCorrectAnswer: boolean;

  @Column({ type: 'int', default: 0, comment: 'Cấp độ chi tiết của gợi ý mà AI cung cấp.' })
  hintLevel: number; // 0 = no hint, 1-5 = increasing hint levels

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Chủ đề của câu hỏi/câu trả lời tại thời điểm tương tác.',
  })
  topicCovered?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Độ khó của câu hỏi/câu trả lời tại thời điểm tương tác.',
  })
  difficultyLevel?: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Mức độ tự tin của AI về câu trả lời của chính nó.',
  })
  confidenceScore?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu lại ngữ cảnh (ví dụ: các tương tác trước đó) mà AI đã sử dụng để đưa ra câu trả lời.',
  })
  contextData: {
    questionId?: string;
    conceptTags?: string[];
    prerequisitesCovered?: boolean;
    userStrugglePoints?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON ghi lại yếu tố nào đã khiến AI quyết định thay đổi chiến lược phản hồi.',
  })
  adaptationTriggers: {
    difficultyAdjustment?: 'increase' | 'decrease' | 'maintain';
    hintGenerated?: boolean;
    pathRedirection?: boolean;
    conceptReinforcement?: boolean;
  };

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Nội dung phản hồi chi tiết từ sinh viên về câu trả lời của AI',
  })
  feedback?: string;

  @Column({ type: 'json', nullable: true, comment: 'Dữ liệu metadata' })
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

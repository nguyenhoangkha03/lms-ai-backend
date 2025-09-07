import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Grade } from './grade.entity';
import { Question } from '../../assessment/entities/question.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum FeedbackCategory {
  CONTENT = 'content',
  STRUCTURE = 'structure',
  GRAMMAR = 'grammar',
  LOGIC = 'logic',
  CREATIVITY = 'creativity',
  TECHNICAL = 'technical',
}

export enum FeedbackSeverity {
  INFO = 'info',
  SUGGESTION = 'suggestion',
  WARNING = 'warning',
  ERROR = 'error',
}

@Entity('feedbacks')
@Index(['gradeId', 'questionId'])
@Index(['authorId', 'createdAt'])
@Index(['category', 'severity'])
export class Feedback extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID bản chấm điểm liên quan',
  })
  gradeId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID câu hỏi cụ thể (nếu feedback gắn với 1 câu)',
  })
  questionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID người tạo feedback (AI hoặc người dùng)',
  })
  authorId: string;

  @Column({
    type: 'enum',
    enum: FeedbackCategory,
    comment: 'Loại góp ý: nội dung, cấu trúc, logic, ngữ pháp...',
  })
  category: FeedbackCategory;

  @Column({
    type: 'enum',
    enum: FeedbackSeverity,
    default: FeedbackSeverity.INFO,
    comment: 'Mức độ nghiêm trọng: info, cảnh báo, lỗi...',
  })
  severity: FeedbackSeverity;

  @Column({
    type: 'text',
    comment: 'Nội dung góp ý chính',
  })
  content: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Gợi ý cải thiện (nếu có)',
  })
  suggestion: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Đánh dấu nếu được tạo bởi AI',
  })
  isAiGenerated: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Mức độ tự tin của AI (0.0 - 1.0)',
  })
  aiConfidence: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Vị trí bắt đầu của đoạn văn được góp ý (theo index)',
  })
  startPosition: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Vị trí kết thúc của đoạn văn được góp ý (theo index)',
  })
  endPosition: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Đoạn văn bản cụ thể bị góp ý (highlight)',
  })
  highlightedText: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Đánh giá độ hữu ích (1–5) từ người học hoặc giảng viên',
  })
  helpfulnessRating: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Người dùng có đánh dấu feedback này là hữu ích không',
  })
  isMarkedHelpful: boolean;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Thông tin bổ sung linh hoạt (metadata)',
  })
  metadata: string;

  @ManyToOne(() => Grade, { lazy: true })
  @JoinColumn({ name: 'gradeId' })
  grade: Promise<Grade>;

  @ManyToOne(() => Question, { lazy: true })
  @JoinColumn({ name: 'questionId' })
  question: Promise<Question>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'authorId' })
  author: Promise<User>;
}

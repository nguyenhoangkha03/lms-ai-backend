import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { QuestionType, DifficultyLevel } from '@/common/enums/assessment.enums';
import { Assessment } from './assessment.entity';

@Entity('questions')
@Index(['assessmentId', 'orderIndex'])
@Index(['questionType', 'difficulty'])
@Index(['tags'])
export class Question extends BaseEntity {
  // Core Question Information
  @Column({
    type: 'varchar',
    length: 36,
    comment:
      'Khóa ngoại liên kết tới assessments.id, xác định câu hỏi này thuộc về bài kiểm tra nào',
    nullable: true,
  })
  assessmentId?: string | null;

  @Column({
    type: 'text',
    comment: 'Nội dung chính của câu hỏi',
  })
  questionText: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
    comment:
      'Phân loại câu hỏi (multiple_choice - trắc nghiệm, essay - tự luận, fill_in_the_blank - điền vào chỗ trống...)',
  })
  questionType: QuestionType;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Phần giải thích chi tiết cho đáp án đúng',
  })
  explanation?: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    comment: 'Số điểm được trao cho câu trả lời đúng',
  })
  points: number;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.MEDIUM,
    comment: 'Mức độ khó của câu hỏi (easy, medium, hard)',
  })
  difficulty: DifficultyLevel;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Vị trí của câu hỏi trong bài kiểm tra',
  })
  orderIndex: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời gian giới hạn cho câu hỏi này tính bằng giây',
  })
  timeLimit?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Gợi ý cho sinh viên (nếu có).',
  })
  hint?: string;

  // Question Configuration
  @Column({
    type: 'longtext',
    nullable: true,
    comment:
      'Trường JSON chứa danh sách các lựa chọn cho câu hỏi trắc nghiệm, bao gồm cả thông tin lựa chọn nào là đúng',
  })
  options?: string | null;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON chứa đáp án đúng (dùng cho các loại câu hỏi không phải trắc nghiệm)',
  })
  correctAnswer?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON chứa đáp án đúng (dùng cho các loại câu hỏi không phải trắc nghiệm).',
  })
  tags?: string | null;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON chứa các tệp đính kèm cho câu hỏi (ví dụ: hình ảnh, âm thanh).',
  })
  attachments?: string | null;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Quy tắc xác thực để kiểm tra câu trả lời',
  })
  validationRules?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu phân tích cho câu hỏi này',
  })
  analytics?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Siêu dữ liệu câu hỏi bổ sung',
  })
  metadata?: string | null;

  // Relationships
  @ManyToOne(() => Assessment, assessment => assessment.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  // Virtual properties
  get optionsJson() {
    return this.options ? JSON.parse(this.options) : [];
  }

  get correctAnswerJson() {
    return JSON.parse(this.correctAnswer!);
  }

  get tagsJson() {
    return this.tags ? JSON.parse(this.tags) : [];
  }

  get attachmentsJson() {
    return this.attachments ? JSON.parse(this.attachments) : [];
  }

  get validationRulesJson() {
    return this.validationRules ? JSON.parse(this.validationRules) : {};
  }

  get analyticsJson() {
    return this.analytics ? JSON.parse(this.analytics) : {};
  }

  get metadataJson() {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }
  get isMultipleChoice(): boolean {
    return this.questionType === QuestionType.MULTIPLE_CHOICE;
  }

  get isEssay(): boolean {
    return this.questionType === QuestionType.ESSAY;
  }

  get requiresManualGrading(): boolean {
    return [QuestionType.ESSAY, QuestionType.SHORT_ANSWER].includes(this.questionType);
  }
}

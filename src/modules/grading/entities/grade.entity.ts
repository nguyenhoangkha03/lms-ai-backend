import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AssessmentAttempt } from '../../assessment/entities/assessment-attempt.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum GradeStatus {
  PENDING = 'pending',
  GRADED = 'graded',
  UNDER_REVIEW = 'under_review',
  FINALIZED = 'finalized',
}

export enum FeedbackType {
  OVERALL = 'overall',
  QUESTION_SPECIFIC = 'question_specific',
  AI_GENERATED = 'ai_generated',
  MANUAL = 'manual',
}

@Entity('grades')
@Index(['studentId', 'assessmentId'])
@Index(['graderId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Grade extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID học viên được chấm',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID bài đánh giá (ví dụ: bài kiểm tra)',
  })
  assessmentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID lần làm bài (để phân biệt các lần thử)',
  })
  attemptId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID người chấm bài (có thể là giảng viên hoặc hệ thống AI)',
  })
  graderId: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Điểm số thực tế học viên đạt được',
  })
  score: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Điểm tối đa có thể đạt được trong bài',
  })
  maxScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Tỷ lệ phần trăm = score / maxScore * 100',
  })
  percentage: number;

  @Column({
    type: 'enum',
    enum: GradeStatus,
    default: GradeStatus.PENDING,
    comment: 'Trạng thái chấm điểm: pending, graded, under_review, finalized',
  })
  status: GradeStatus;

  @Column({
    type: 'enum',
    enum: FeedbackType,
    default: FeedbackType.MANUAL,
    comment: 'Loại phản hồi: thủ công, AI, tổng quát hay theo câu hỏi',
  })
  feedbackType: FeedbackType;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Danh sách điểm từng câu hỏi dưới dạng JSON',
  })
  questionScores: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Phản hồi tổng quát cho bài làm',
  })
  overallFeedback: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú thêm của người chấm bài',
  })
  comments: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm bài được chấm xong',
  })
  gradedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm điểm số được công bố cho học viên',
  })
  publishedAt: Date | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Đã công bố cho học viên xem chưa',
  })
  isPublished: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Bài này có được chấm bằng AI không',
  })
  isAiGraded: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Độ tự tin của AI khi chấm điểm (0.0 - 1.0)',
  })
  aiConfidence: number;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID người đã review lại bài (giám sát, kiểm tra lại)',
  })
  reviewedBy: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm bài được review lại',
  })
  reviewedAt: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú/nhận xét của người review',
  })
  reviewComments: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Bảng tiêu chí chấm điểm (rubric) sử dụng để chấm bài này',
  })
  gradingRubric: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu phân tích về bài làm (ví dụ: thời gian làm bài, hành vi)',
  })
  analytics: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu bổ sung, linh hoạt (metadata)',
  })
  metadata: string;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'studentId' })
  student: Promise<User>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'graderId' })
  grader: Promise<User>;

  @ManyToOne(() => Assessment, { lazy: true })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Promise<Assessment>;

  @ManyToOne(() => AssessmentAttempt, { lazy: true })
  @JoinColumn({ name: 'attemptId' })
  attempt: Promise<AssessmentAttempt>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: Promise<User>;

  get letterGrade(): string {
    if (this.percentage >= 90) return 'A';
    if (this.percentage >= 80) return 'B';
    if (this.percentage >= 70) return 'C';
    if (this.percentage >= 60) return 'D';
    return 'F';
  }

  get isPassing(): boolean {
    return this.percentage >= 60;
  }
}

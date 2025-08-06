import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { AttemptStatus, GradingStatus } from '@/common/enums/assessment.enums';
import { Assessment } from './assessment.entity';
import { User } from '../../user/entities/user.entity';

@Entity('assessment_attempts')
@Index(['attemptNumber'])
@Index(['status'])
@Index(['startedAt'])
@Index(['studentId', 'assessmentId'])
@Index(['gradingStatus', 'submittedAt'])
export class AssessmentAttempt extends BaseEntity {
  // Attempt Information
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Siêu dữ liệu câu hỏi bổ sung',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới assessments.id',
  })
  assessmentId: string;

  @Column({
    type: 'int',
    comment: 'Số thứ tự của lần làm bài (1, 2, 3...)',
  })
  attemptNumber: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm sinh viên bắt đầu',
  })
  startedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm sinh viên nộp bài',
  })
  submittedAt?: Date;

  @Column({
    type: 'enum',
    enum: GradingStatus,
    default: GradingStatus.PENDING,
    comment: 'Trạng thái của việc chấm điểm (pending - đang chờ, graded - đã chấm)',
  })
  gradingStatus: GradingStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm đạt được trong lần thử này',
  })
  score?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm tối đa có thể',
  })
  maxScore?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Tỷ lệ điểm đạt trong lần thử',
  })
  percentage?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời gian hoàn thành tính bằng giây',
  })
  timeTaken?: number;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
    comment:
      'Trạng thái của chính lượt làm bài đó (in_progress - đang làm, submitted - đã nộp, timed_out - hết giờ)',
  })
  status: AttemptStatus;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Cột rất quan trọng, trường JSON lưu lại tất cả câu trả lời mà sinh viên đã chọn/nhập',
  })
  answers?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Phản hồi tổng quát của giảng viên hoặc hệ thống cho lượt làm bài này',
  })
  feedback?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người đã chấm bài',
  })
  gradedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm chấm bài',
  })
  gradedAt?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) nếu hệ thống phát hiện hành vi đáng ngờ',
  })
  isFlagged: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Lý do nếu hệ thống phát hiện hành vi đáng ngờ',
  })
  flagReason?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON lưu dữ liệu từ hệ thống giám sát thi (nếu có)',
  })
  proctoringData?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu theo dõi phiên',
  })
  sessionData?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu phân tích học tập',
  })
  analyticsData?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Siêu dữ liệu của lần thử bổ sung',
  })
  metadata?: string;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Assessment, assessment => assessment.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'gradedBy' })
  grader?: User;

  // Parse JSON fields
  get answersJson() {
    return this.answers ? JSON.parse(this.answers) : {};
  }

  get feedbackJson() {
    return this.feedback ? JSON.parse(this.feedback) : {};
  }

  get proctoringDataJson() {
    return this.proctoringData ? JSON.parse(this.proctoringData) : {};
  }

  get sessionDataJson() {
    return this.sessionData ? JSON.parse(this.sessionData) : {};
  }

  get analyticsDataJson() {
    return this.analyticsData ? JSON.parse(this.analyticsData) : {};
  }

  get metadataJson() {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  // Virtual properties
  get duration(): number | null {
    if (!this.submittedAt) return null;
    return Math.floor((this.submittedAt.getTime() - this.startedAt.getTime()) / 1000);
  }

  get isCompleted(): boolean {
    return this.status === AttemptStatus.SUBMITTED;
  }

  get isPassed(): boolean {
    if (!this.percentage || !this.assessment) return false;
    return this.percentage >= this.assessment.passingScore;
  }

  get durationFormatted(): string {
    if (!this.timeTaken) return 'N/A';
    const hours = Math.floor(this.timeTaken / 3600);
    const minutes = Math.floor((this.timeTaken % 3600) / 60);
    const seconds = this.timeTaken % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

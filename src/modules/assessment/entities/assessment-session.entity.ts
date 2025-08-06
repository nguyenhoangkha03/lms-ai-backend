import { Entity, Column, ManyToOne, JoinColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Assessment } from './assessment.entity';
import { User } from '../../user/entities/user.entity';
import { AssessmentAttempt } from './assessment-attempt.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum SessionStatus {
  PREPARING = 'preparing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum SecurityEvent {
  TAB_SWITCH = 'tab_switch',
  WINDOW_BLUR = 'window_blur',
  COPY_DETECTED = 'copy_detected',
  PASTE_DETECTED = 'paste_detected',
  RIGHT_CLICK = 'right_click',
  FULLSCREEN_EXIT = 'fullscreen_exit',
  NETWORK_INTERRUPTION = 'network_interruption',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

@Entity('assessment_sessions')
@Index(['studentId', 'assessmentId', 'status'])
@Index(['sessionToken'])
@Index(['expiresAt'])
export class AssessmentSession extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment:
      'Một chuỗi token duy nhất để xác thực các hành động trong phiên làm bài mà không cần gửi lại thông tin đăng nhập',
  })
  sessionToken: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.PREPARING,
    comment:
      'Trạng thái hiện tại của phiên (active - đang làm, paused - tạm dừng, completed - đã hoàn thành).',
  })
  status: SessionStatus;

  @Column({ type: 'timestamp', comment: 'Ghi lại thời điểm bắt đầu', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Ghi lại thời điểm kết thúc' })
  endedAt?: Date;

  @Column({ type: 'timestamp', comment: 'Thời điểm phiên sẽ tự động hết hạn.', nullable: true })
  expiresAt: Date;

  @Column({ type: 'int', nullable: true, comment: 'Số giây còn lại cho đến khi hết giờ làm bài' })
  timeRemaining?: number;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment:
      'Thời điểm cuối cùng hệ thống ghi nhận một hành động từ sinh viên (ví dụ: trả lời câu hỏi)',
  })
  lastActivityAt: Date;

  @Column({ type: 'int', default: 0, comment: 'Vị trí câu hỏi hiện tại, ' })
  currentQuestionIndex: number;

  @Column({ type: 'int', default: 0, comment: 'Số câu đã trả lời.' })
  questionsAnswered: number;

  @Column({ type: 'int', comment: 'Tổng số câu hỏi' })
  totalQuestions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0, comment: 'Phần trăm tiến độ' })
  progressPercentage: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment:
      'Trường JSON lưu tạm thời các câu trả lời của sinh viên, được tự động lưu (auto-save) định kỳ',
  })
  currentAnswers?: string;

  @Column({ type: 'timestamp', nullable: true, comment: 'Dấu thời gian tự động lưu cuối cùng' })
  lastAutoSaveAt?: Date;

  @Column({ type: 'int', default: 30, comment: 'Khoảng thời gian tự động lưu tính bằng giây' })
  autoSaveInterval: number;

  // Security and Proctoring
  @Column({ type: 'longtext', nullable: true, comment: 'Nhật ký sự kiện bảo mật (JSON)' })
  securityEvents?: string;

  @Column({ type: 'int', default: 0, comment: 'Số lượng vi phạm an ninh' })
  securityViolationsCount: number;

  @Column({
    type: 'tinyint',
    default: false,
    comment: 'Cờ (true/false) nếu phiên làm bài bị đánh dấu là đáng ngờ',
  })
  isFlagged: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Lý do nếu phiên làm bài bị đánh dấu là đáng ngờ',
  })
  flagReason?: string;

  @Column({ type: 'longtext', nullable: true, comment: 'Ghi lại thông tin trình duyệt' })
  browserInfo?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Độ phân giải màn hình' })
  screenResolution?: string;

  @Column({ type: 'tinyint', default: false, comment: 'Trạng thái toàn màn hình' })
  isFullscreen: boolean;

  @Column({ type: 'int', default: 0, comment: 'Đếm số lần chuyển tab để phát hiện gian lận' })
  tabSwitchCount: number;

  @Column({ type: 'int', default: 0, comment: 'Số lần mất kết nối' })
  connectionInterruptions: number;

  @Column({ type: 'timestamp', nullable: true, comment: 'Dấu thời gian ping cuối cùng' })
  lastPingAt?: Date;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Điểm chất lượng mạng',
  })
  networkQuality?: number;

  @Column({ type: 'longtext', nullable: true, comment: 'Cấu hình phiên' })
  sessionConfig?: string;

  @Column({ type: 'longtext', nullable: true, comment: 'Thứ tự câu hỏi ngẫu nhiên' })
  questionsOrder?: string;

  @Column({ type: 'longtext', nullable: true, comment: 'Siêu dữ liệu bổ sung' })
  metadata?: string;

  // Relationships
  @Column({ type: 'varchar', length: 36, comment: 'Id sinh viên' })
  studentId: string;

  @Column({ type: 'varchar', length: 36, comment: 'Id kiểm tra' })
  assessmentId: string;

  @Column({ type: 'varchar', length: 36, nullable: true, comment: 'Id lần làm bài' })
  attemptId?: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Assessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @ManyToOne(() => AssessmentAttempt, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt?: AssessmentAttempt;

  // Virtual Properties
  get isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt || this.status === SessionStatus.EXPIRED;
  }

  get remainingTimeInSeconds(): number {
    if (this.isExpired || this.status === SessionStatus.COMPLETED) return 0;
    return Math.max(0, Math.floor((this.expiresAt.getTime() - Date.now()) / 1000));
  }

  get durationInSeconds(): number {
    const end = this.endedAt || new Date();
    return Math.floor((end.getTime() - this.startedAt.getTime()) / 1000);
  }

  // Parse JSON fields
  get currentAnswersJson() {
    return this.currentAnswers ? JSON.parse(this.currentAnswers) : {};
  }

  get securityEventsJson() {
    return this.securityEvents ? JSON.parse(this.securityEvents) : [];
  }

  get browserInfoJson() {
    return this.browserInfo ? JSON.parse(this.browserInfo) : {};
  }

  get sessionConfigJson() {
    return this.sessionConfig ? JSON.parse(this.sessionConfig) : {};
  }

  get questionsOrderJson() {
    return this.questionsOrder ? JSON.parse(this.questionsOrder) : [];
  }

  get metadataJson() {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }

  @BeforeInsert()
  @BeforeUpdate()
  updateProgress() {
    if (this.totalQuestions > 0) {
      this.progressPercentage = (this.questionsAnswered / this.totalQuestions) * 100;
    }
  }
}

import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { LessonProgressStatus } from '@/common/enums/course.enums';
import { User } from '../../user/entities/user.entity';
import { Lesson } from './lesson.entity';
import { Enrollment } from './enrollment.entity';

@Entity('lesson_progress')
@Unique(['studentId', 'lessonId'])
@Index(['studentId'])
@Index(['lessonId'])
@Index(['enrollmentId'])
@Index(['status'])
@Index(['completionDate'])
export class LessonProgress extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới lessons.id',
  })
  lessonId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment:
      'Khóa ngoại liên kết tới enrollments.id, giúp nhóm các tiến độ bài học theo một lượt đăng ký cụ thể',
  })
  enrollmentId: string;

  @Column({
    type: 'enum',
    enum: LessonProgressStatus,
    default: LessonProgressStatus.NOT_STARTED,
    comment:
      'Trạng thái của bài học đối với sinh viên (not_started - chưa bắt đầu, in_progress - đang học, completed - đã hoàn thành).',
  })
  status: LessonProgressStatus;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm sinh viên hoàn thành bài học.',
  })
  completionDate?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng thời gian (giây) sinh viên đã dành cho bài học này',
  })
  timeSpent: number;

  @Column({
    type: 'int',
    default: 0,
    comment:
      'Vị trí cuối cùng (tính bằng giây) mà sinh viên đã xem trong một bài học video, giúp họ có thể tiếp tục xem lại lần sau',
  })
  lastPosition: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lần sinh viên đã cố gắng hoàn thành bài học (hữu ích cho các bài quiz)',
  })
  attempts: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm số đạt được (nếu bài học là một bài quiz/bài tập).',
  })
  score?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm số tối đa có thể đạt được',
  })
  maxScore?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Phần trăm hoàn thành của bài học (hữu ích cho các bài học dài hoặc có nhiều phần).',
  })
  progressPercentage: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm sinh viên truy cập bài học lần đầu tiên',
  })
  firstAccessedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm sinh viên truy cập bài học lần gần nhất',
  })
  lastAccessedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu các câu trả lời của sinh viên cho bài quiz/bài tập trong bài học',
  })
  answers?: {
    questionId: string;
    answer: any;
    isCorrect?: boolean;
    timeSpent?: number;
  }[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú cá nhân của sinh viên cho bài học này',
  })
  notes?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu các mốc thời gian quan trọng mà sinh viên đã đánh dấu trong video',
  })
  bookmarks?: {
    time: number;
    title: string;
    note?: string;
    createdAt: Date;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON ghi lại các hành vi chi tiết như tạm dừng, tua lại video, giúp AI phân tích những điểm mà sinh viên có thể đang gặp khó khăn',
  })
  interactionData?: {
    pausePoints?: number[];
    rewindPoints?: number[];
    playbackSpeed?: number[];
    skipSegments?: { start: number; end: number }[];
  };

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết sinh viên có bỏ qua bài học này hay không',
  })
  isSkipped: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Lý do sinh viên bỏ qua bài học hoặc các phản hồi khác',
  })
  feedback?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin tiến độ mở rộng khác',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Lesson, lesson => lesson.progress)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => Enrollment, enrollment => enrollment.lessonProgress)
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: Enrollment;

  // Virtual properties
  get isCompleted(): boolean {
    return this.status === LessonProgressStatus.COMPLETED;
  }

  get isInProgress(): boolean {
    return this.status === LessonProgressStatus.IN_PROGRESS;
  }

  get isNotStarted(): boolean {
    return this.status === LessonProgressStatus.NOT_STARTED;
  }

  get formattedTimeSpent(): string {
    const hours = Math.floor(this.timeSpent / 3600);
    const minutes = Math.floor((this.timeSpent % 3600) / 60);
    const seconds = this.timeSpent % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  get scorePercentage(): number | null {
    if (this.score !== null && this.maxScore !== null && this.maxScore! > 0) {
      return (this.score! / this.maxScore!) * 100;
    }
    return null;
  }

  get hasBookmarks(): boolean {
    return !!(this.bookmarks && this.bookmarks.length > 0);
  }

  get hasNotes(): boolean {
    return Boolean(this.notes && this.notes.trim().length > 0);
  }

  get completionRate(): number {
    return this.progressPercentage;
  }

  get lastPositionFormatted(): string {
    const hours = Math.floor(this.lastPosition / 3600);
    const minutes = Math.floor((this.lastPosition % 3600) / 60);
    const seconds = this.lastPosition % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

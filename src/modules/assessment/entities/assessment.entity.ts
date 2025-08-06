import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { AssessmentType, AssessmentStatus, GradingMethod } from '@/common/enums/assessment.enums';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { User } from '../../user/entities/user.entity';
import { Question } from './question.entity';
import { AssessmentAttempt } from './assessment-attempt.entity';

@Entity('assessments')
@Index(['courseId', 'status'])
@Index(['teacherId', 'assessmentType'])
@Index(['lessonId'])
@Index(['availableFrom', 'availableUntil'])
export class Assessment extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Khóa ngoại cho biết bài kiểm tra này thuộc về cả khóa học nào',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Khóa ngoại cho biết bài kiểm tra này thuộc về bài học nào',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định người tạo bài kiểm tra',
  })
  teacherId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên của bài kiểm tra',
  })
  title: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Mô tả chi tiết về bài kiểm tra',
  })
  description: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Hướng dẫn chi tiết về bài kiểm tra',
  })
  instructions?: string;

  @Column({
    type: 'enum',
    enum: AssessmentType,
    default: AssessmentType.QUIZ,
    comment: 'Phân loại hình thức kiểm tra (quiz, exam, survey - khảo sát, project - dự án).',
  })
  assessmentType: AssessmentType;

  @Column({
    type: 'enum',
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
    comment: 'Trạng thái của bài kiểm tra (draft, published, archived).',
  })
  status: AssessmentStatus;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời gian tối đa (tính bằng phút) để hoàn thành bài kiểm tra.',
  })
  timeLimit?: number;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Thời gian tối đa (tính bằng phút) để hoàn thành bài kiểm tra.',
  })
  maxAttempts: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 70.0,
    comment: 'Tỷ lệ phần trăm điểm số tối thiểu để được tính là "Đạt".',
  })
  passingScore: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Tổng số điểm của bài kiểm tra.',
  })
  totalPoints?: number;

  // Randomization Settings
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho phép tự động xáo trộn thứ tự câu hỏi để chống gian lận',
  })
  randomizeQuestions: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho phép tự động xáo trộn thứ tự trả lời để chống gian lận',
  })
  randomizeAnswers: boolean;

  // Display Settings
  @Column({
    type: 'boolean',
    default: true,
    comment:
      'Cờ (true/false) để cấu hình việc có hiển thị kết quả ngay sau khi sinh viên nộp bài hay không',
  })
  showResults: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) để cấu hình việc có hiển thị đáp án đúng ngay sau khi sinh viên nộp bài hay không',
  })
  showCorrectAnswers: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) xác định đây có phải là bài kiểm tra bắt buộc hay không',
  })
  isMandatory: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết bài thi có được giám sát từ xa (proctoring) hay không',
  })
  isProctored: boolean;

  // Scheduling
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian mở đề: Khoảng thời gian mà sinh viên được phép bắt đầu làm bài',
  })
  availableFrom?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian đóng đề',
  })
  availableUntil?: Date;

  // Grading Configuration
  @Column({
    type: 'enum',
    enum: GradingMethod,
    default: GradingMethod.AUTOMATIC,
    comment: 'Cách thức chấm điểm (automatic - tự động, manual - thủ công, hybrid - kết hợp).',
  })
  gradingMethod: GradingMethod;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    comment: 'Trọng số của bài kiểm tra này trong tổng điểm cuối kỳ của khóa học',
  })
  weight: number;

  // Advanced Settings
  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Cài đặt cấu hình đánh giá',
  })
  //   settings?: {
  //     allowBackward?: boolean;
  //     oneQuestionPerPage?: boolean;
  //     showProgressBar?: boolean;
  //     lockdownBrowser?: boolean;
  //     webcamRequired?: boolean;
  //     autoSave?: boolean;
  //     saveInterval?: number;
  //   };
  settings?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Cấu hình chống gian lận',
  })
  //   antiCheatSettings?: {
  //     preventCopyPaste?: boolean;
  //     preventRightClick?: boolean;
  //     preventTabSwitch?: boolean;
  //     blockExternalTools?: boolean;
  //     requireFullscreen?: boolean;
  //     detectMultipleFaces?: boolean;
  //   };
  antiCheatSettings?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Siêu dữ liệu bổ sung để đánh giá',
  })
  //   metadata?: Record<string, any>;
  metadata?: string;

  // Relationships
  @ManyToOne(() => Course, course => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @OneToMany(() => Question, question => question.assessment)
  questions?: Question[];

  @OneToMany(() => AssessmentAttempt, attempt => attempt.assessment)
  attempts?: AssessmentAttempt[];

  // Virtual properties
  get questionsCount(): number {
    return this.questions?.length || 0;
  }

  get isActive(): boolean {
    const now = new Date();
    const isPublished = this.status === AssessmentStatus.PUBLISHED;
    const isAvailable = !this.availableFrom || this.availableFrom <= now;
    const notExpired = !this.availableUntil || this.availableUntil > now;

    return isPublished && isAvailable && notExpired;
  }

  get isAvailable(): boolean {
    const now = new Date();
    if (this.availableFrom && now < this.availableFrom) return false;
    if (this.availableUntil && now > this.availableUntil) return false;
    return this.isActive;
  }

  get duration(): string {
    if (!this.timeLimit) return 'Unlimited';
    const hours = Math.floor(this.timeLimit / 60);
    const minutes = this.timeLimit % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  // Parse JSON fields
  get settingsJson() {
    return this.settings ? JSON.parse(this.settings) : {};
  }

  get antiCheatSettingsJson() {
    return this.antiCheatSettings ? JSON.parse(this.antiCheatSettings) : {};
  }

  get metadataJson() {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }
}

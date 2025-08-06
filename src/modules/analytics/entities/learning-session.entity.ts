import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { SessionStatus, DeviceType } from '@/common/enums/analytics.enums';
import { LearningActivity } from './learning-activity.entity';

@Entity('learning_sessions')
@Index(['studentId'])
@Index(['startTime'])
@Index(['endTime'])
@Index(['duration'])
@Index(['status'])
export class LearningSession extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định chủ nhân của phiên học này',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Mã định danh duy nhất cho phiên làm việc này',
  })
  sessionId: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm bắt đầu của phiên',
  })
  startTime: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm kết thúc của phiên',
  })
  endTime?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Tổng thời gian của phiên, tính bằng giây.',
  })
  duration?: number;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
    comment:
      'Trạng thái của phiên (active - đang hoạt động, completed - đã hoàn thành, abandoned - bị bỏ dở).',
  })
  status: SessionStatus;

  @Column({
    type: 'int',
    default: 0,
    comment:
      'Trạng thái của phiên (active - đang hoạt động, completed - đã hoàn thành, abandoned - bị bỏ dở).',
  })
  pageViews: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số hoạt động (learning_activities) đã được ghi lại trong phiên',
  })
  activitiesCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các khóa học được truy cập trong phiên này',
  })
  coursesAccessed?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các bài học được truy cập trong phiên này',
  })
  lessonsAccessed?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Đánh giá được thực hiện trong phiên này',
  })
  assessmentsTaken?: string[];

  @Column({
    type: 'enum',
    enum: DeviceType,
    nullable: true,
    comment: 'Loại thiết bị chính được sử dụng trong phiên',
  })
  deviceType?: DeviceType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Trình duyệt được sử dụng trong phiên',
  })
  browser?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Hệ điều hành được sử dụng trong phiên',
  })
  operatingSystem?: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Địa chỉ IP được sử dụng trong phiên',
  })
  ipAddress?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu định vị địa lý cho phiên',
  })
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Số liệu tương tác của phiên',
  })
  engagementMetrics?: {
    scrollDepth?: number;
    clickCount?: number;
    keystrokeCount?: number;
    idleTime?: number;
    focusTime?: number;
    tabSwitches?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Kết quả học tập từ buổi học này',
  })
  learningOutcomes?: {
    lessonsCompleted?: number;
    quizzesCompleted?: number;
    averageQuizScore?: number;
    newSkillsLearned?: string[];
    certificatesEarned?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Chỉ số chất lượng phiên',
  })
  qualityIndicators?: {
    completionRate?: number;
    engagementScore?: number;
    focusScore?: number;
    interactionQuality?: number;
    learningEfficiency?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu phiên bổ sung',
  })
  metadata?: Record<string, any>;

  // Relationships
  @OneToMany(() => LearningActivity, activity => activity.sessionId)
  activities?: LearningActivity[];

  // Virtual properties
  get isActive(): boolean {
    return this.status === SessionStatus.ACTIVE;
  }

  get durationFormatted(): string {
    if (!this.duration) return 'N/A';
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { InterventionType, PerformancePrediction } from './performance-prediction.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';

export enum InterventionStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred',
}

export enum InterventionOutcome {
  SUCCESSFUL = 'successful',
  PARTIALLY_SUCCESSFUL = 'partially_successful',
  UNSUCCESSFUL = 'unsuccessful',
  TOO_EARLY = 'too_early',
  NO_RESPONSE = 'no_response',
}

@Entity('intervention_recommendations')
@Index(['studentId', 'status'])
@Index(['interventionType'])
@Index(['priority'])
@Index(['scheduledDate'])
export class InterventionRecommendation extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Id sinh viên',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Id khóa học',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Khóa ngoại liên kết tới bản ghi dự đoán đã gây ra sự can thiệp này',
  })
  predictionId?: string;

  @Column({
    type: 'enum',
    enum: InterventionType,
    comment:
      'Phân loại hành động can thiệp (motivation - động viên, tutor_support - hỗ trợ từ gia sư',
  })
  interventionType: InterventionType;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tiêu đề can thiệp',
  })
  title: string;

  @Column({
    type: 'text',
    comment: 'Mô tả can thiệp chi tiết',
  })
  description: string;

  @Column({
    type: 'int',
    comment: 'Mức độ ưu tiên (1-10, 10 là cao nhất)',
  })
  priority: number;

  @Column({
    type: 'enum',
    enum: InterventionStatus,
    default: InterventionStatus.PENDING,
    comment: 'Trạng thái thực hiện của kế hoạch (pending, in_progress, completed).',
  })
  status: InterventionStatus;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày can thiệp được đề xuất',
  })
  recommendedDate?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày can thiệp dự kiến',
  })
  scheduledDate?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày bắt đầu can thiệp thực tế',
  })
  startedAt?: Date;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày hoàn thành can thiệp',
  })
  completedAt?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời lượng ước tính tính bằng phút',
  })
  estimatedDuration?: number;

  @Column({
    type: 'json',
    comment: 'Các thông số và cài đặt can thiệp',
  })
  parameters: {
    targetMetrics?: string[];
    customContent?: string;
    resourceLinks?: string[];
    communicationMethod?: string;
    followUpRequired?: boolean;
    groupIntervention?: boolean;
    automatedIntervention?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Tiêu chí can thiệp thành công',
  })
  successCriteria?: {
    metric: string;
    targetValue: number;
    timeframe: number; // days
    measurementMethod: string;
  }[];

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID giáo viên/gia sư được chỉ định',
  })
  assignedToId?: string;

  @Column({
    type: 'enum',
    enum: InterventionOutcome,
    nullable: true,
    comment: 'Kết quả của sự can thiệp (successful - thành công, unsuccessful - không thành công).',
  })
  outcome?: InterventionOutcome;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Đánh giá mức độ hiệu quả của sự can thiệp (0-100).',
  })
  effectivenessScore?: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Phản hồi từ sinh viên',
  })
  studentFeedback?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú của giảng viên về quá trình can thiệp',
  })
  instructorNotes?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các trường JSON lưu lại các chỉ số học tập của sinh viên trước',
  })
  preInterventionMetrics?: Record<string, number>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các trường JSON lưu lại các chỉ số học tập của sinh sau khi can thiệp',
  })
  postInterventionMetrics?: Record<string, number>;

  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Ngày dự kiến theo dõi',
  })
  followUpDate?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Có cần theo dõi không',
  })
  followUpRequired: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Can thiệp liên quan',
  })
  relatedInterventions?: {
    interventionId: string;
    relationship: 'prerequisite' | 'followup' | 'alternative' | 'complementary';
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu can thiệp bổ sung',
  })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assignedToId' })
  assignedTo?: User;

  @ManyToOne(() => PerformancePrediction)
  @JoinColumn({ name: 'predictionId' })
  prediction?: PerformancePrediction;
}

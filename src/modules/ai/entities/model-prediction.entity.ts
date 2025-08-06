import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { PredictionStatus } from '@/common/enums/ai.enums';
import { ModelVersion } from './model-version.entity';
import { User } from '../../user/entities/user.entity';

@Entity('model_predictions')
@Index(['modelVersionId'])
@Index(['userId'])
@Index(['predictionType'])
@Index(['status'])
@Index(['createdAt'])
export class ModelPrediction extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới ml_models.id, cho biết mô hình nào đã được sử dụng.',
  })
  modelId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment:
      'hóa ngoại liên kết tới model_versions.id, cho biết phiên bản cụ thể nào của mô hình đã được dùng.',
  })
  modelVersionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người dùng mà dự đoán này nhắm tới (nếu có).',
  })
  userId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Phân loại dự đoán (ví dụ: dropout_risk, performance).',
  })
  predictionType: string;

  @Column({
    type: 'json',
    comment: 'Trường JSON lưu lại chính xác dữ liệu đã được gửi đến mô hình để tạo ra dự đoán',
  })
  inputData: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa kết quả mà mô hình đã trả về',
  })
  prediction?: Record<string, any>;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: 'Mức độ tự tin của mô hình về dự đoán của nó.',
  })
  confidence?: number;

  @Column({
    type: 'enum',
    enum: PredictionStatus,
    default: PredictionStatus.PENDING,
    comment:
      'Trạng thái của quá trình dự đoán (processing - đang xử lý, completed - hoàn thành, failed - thất bại).',
  })
  status: PredictionStatus;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Nội dung lỗi nếu quá trình dự đoán thất bại.',
  })
  errorMessage?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời gian (tính bằng mili giây) mà mô hình cần để đưa ra dự đoán.',
  })
  processingTime?: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Một mã định danh để theo dõi yêu cầu dự đoán này qua các hệ thống.',
  })
  requestId?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu lại kết quả thực tế sau khi sự kiện xảy ra, dùng để so sánh với dự đoán.',
  })
  actualOutcome?: Record<string, any>;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) đánh dấu liệu dự đoán có chính xác hay không sau khi đã so sánh với kết quả thực tế.',
  })
  wasCorrect?: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm yêu cầu dự đoán được gửi đi',
  })
  requestedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm nhận được kết quả.',
  })
  completedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin mở rộng khác',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ModelVersion, version => version.predictions)
  @JoinColumn({ name: 'modelId' })
  model: ModelVersion;

  @ManyToOne(() => ModelVersion, version => version.predictions)
  @JoinColumn({ name: 'modelVersionId' })
  modelVersion: ModelVersion;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user?: User;

  // Virtual properties
  get responseTime(): number | undefined {
    if (this.requestedAt && this.completedAt) {
      return this.completedAt.getTime() - this.requestedAt.getTime();
    }
    return undefined;
  }

  get isCompleted(): boolean {
    return this.status === PredictionStatus.COMPLETED;
  }

  get hasFailed(): boolean {
    return this.status === PredictionStatus.FAILED;
  }
}

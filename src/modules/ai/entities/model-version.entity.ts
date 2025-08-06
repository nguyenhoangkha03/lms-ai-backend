import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ModelVersionStatus } from '@/common/enums/ai.enums';
import { MLModel } from './ml-model.entity';
import { ModelPrediction } from './model-prediction.entity';

@Entity('model_versions')
@Index(['modelId'])
@Index(['version'])
@Index(['status'])
@Index(['createdAt'])
export class ModelVersion extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới ml_models.id, cho biết phiên bản này thuộc về mô hình nào.',
  })
  modelId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Tên định danh của phiên bản (ví dụ: v1.0.0, 2025-07-28).',
  })
  version: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'ID của tác vụ chạy nền đã thực hiện việc huấn luyện cho phiên bản này.',
  })
  jobId?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả phiên bản',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ModelVersionStatus,
    default: ModelVersionStatus.TRAINING,
    comment: 'Trạng thái của riêng phiên bản này (training, completed, failed, deployed).',
  })
  status: ModelVersionStatus;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến tệp tin của mô hình đã được huấn luyện (ví dụ: đường dẫn trên S3).',
  })
  modelPath?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Tên của Docker image chứa phiên bản mô hình này, sẵn sàng để triển khai',
  })
  dockerImage?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Số liệu đào tạo cho phiên bản này',
  })
  trainingMetrics?: {
    trainingAccuracy?: number;
    validationAccuracy?: number;
    trainingLoss?: number;
    validationLoss?: number;
    epochs?: number;
    trainingTime?: number; // seconds
    convergence?: boolean;
    bestEpoch?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Kết quả đánh giá mô hình',
  })
  evaluationResults?: {
    testAccuracy?: number;
    testLoss?: number;
    confusionMatrix?: number[][];
    classificationReport?: Record<string, any>;
    featureImportance?: Record<string, number>;
    crossValidationScore?: number[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa thông tin về các tệp tin và tài nguyên khác liên quan đến phiên bản',
  })
  artifacts?: {
    modelFile?: string;
    weightsFile?: string;
    configFile?: string;
    preprocessorFile?: string;
    vocabFile?: string;
    labelEncoder?: string;
    requirements?: string;
    dockerfile?: string;
  };

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Người dùng đã tạo ra phiên bản này',
  })
  createdBy: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm bắt đầu quá trình huấn luyện.',
  })
  trainingStartedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm kết thúc quá trình huấn luyện.',
  })
  trainingCompletedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Cấu hình dành riêng cho phiên bản',
  })
  configuration?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON so sánh hiệu suất của phiên bản này với phiên bản trước đó.',
  })
  performanceComparison?: {
    previousVersion?: string;
    improvementMetrics?: Record<string, number>;
    regressionMetrics?: Record<string, number>;
    isImprovement?: boolean;
  };

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) cho biết đây có phải là phiên bản đang được sử dụng trong môi trường production hay không',
  })
  isActive: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu bổ sung',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => MLModel, model => model.versions)
  @JoinColumn({ name: 'modelId' })
  model: MLModel;

  @OneToMany(() => ModelPrediction, prediction => prediction.modelVersion)
  predictions: ModelPrediction[];

  // Virtual properties
  get trainingDuration(): number | undefined {
    if (this.trainingStartedAt && this.trainingCompletedAt) {
      return this.trainingCompletedAt.getTime() - this.trainingStartedAt.getTime();
    }
    return undefined;
  }

  get isDeployable(): boolean {
    return (
      this.status === ModelVersionStatus.COMPLETED &&
      this.evaluationResults !== null &&
      this.modelPath !== null
    );
  }
}

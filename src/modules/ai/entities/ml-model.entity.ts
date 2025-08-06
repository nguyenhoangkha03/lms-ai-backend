import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ModelType, ModelStatus, ModelFramework } from '@/common/enums/ai.enums';
import { User } from '../../user/entities/user.entity';
import { ModelVersion } from './model-version.entity';

@Entity('ml_models')
@Index(['name'])
@Index(['modelType'])
@Index(['status'])
@Index(['isActive'])
export class MLModel extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên duy nhất của mô hình dùng trong code (ví dụ: course_recommender).',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên mô hình hiển thị trên giao diện quản lý (ví dụ: "Hệ thống Gợi ý Khóa học").',
  })
  displayName: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả mục đích và chức năng của mô hình',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ModelType,
    comment:
      'Phân loại kỹ thuật của mô hình (recommendation - gợi ý, classification - phân loại, nlp - xử lý ngôn ngữ tự nhiên)',
  })
  modelType: ModelType;

  @Column({
    type: 'enum',
    enum: ModelFramework,
    comment: 'Nền tảng/thư viện được dùng để xây dựng mô hình (tensorflow, pytorch...).',
  })
  framework: ModelFramework;

  @Column({
    type: 'enum',
    enum: ModelStatus,
    default: ModelStatus.DEVELOPMENT,
    comment:
      'Vòng đời của mô hình (development - đang phát triển, training - đang huấn luyện, production - đang hoạt động).',
  })
  status: ModelStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Người dùng đã tạo mô hình này',
  })
  createdBy: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Số hiệu của phiên bản đang được sử dụng chính thức',
  })
  currentVersion?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment:
      'Địa chỉ URL của API nơi mô hình đang được triển khai và sẵn sàng nhận yêu cầu dự đoán',
  })
  serviceEndpoint?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu các siêu tham số (hyperparameters) và cấu hình của mô hình.',
  })
  configuration?: {
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    hyperparameters?: Record<string, any>;
    trainingConfig?: Record<string, any>;
    deployment?: {
      replicas?: number;
      resources?: {
        cpu?: string;
        memory?: string;
        gpu?: string;
      };
      autoScaling?: {
        enabled?: boolean;
        minReplicas?: number;
        maxReplicas?: number;
        targetCPU?: number;
      };
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON lưu các chỉ số đánh giá hiệu suất của mô hình (ví dụ: độ chính xác, F1-score).',
  })
  metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    mse?: number;
    mae?: number;
    r2Score?: number;
    auc?: number;
    customMetrics?: Record<string, number>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON mô tả về tập dữ liệu đã được dùng để huấn luyện mô hình.',
  })
  trainingData?: {
    datasetName?: string;
    datasetSize?: number;
    features?: string[];
    trainingDate?: Date;
    validationSplit?: number;
    testSplit?: number;
  };

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Liệu mô hình có đang hoạt động hay không',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) cho biết mô hình có đang được triển khai trong môi trường production hay không.',
  })
  isDeployed: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm mô hình được huấn luyện',
  })
  lastTrainedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm mô hình được triển khai lần cuối.',
  })
  deployedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Cấu hình thử nghiệm A/B',
  })
  abTestConfig?: {
    enabled?: boolean;
    trafficSplit?: number; // 0-100 percentage
    controlModel?: string;
    testGroups?: string[];
    startDate?: Date;
    endDate?: Date;
    successMetrics?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Model tags and metadata',
  })
  tags?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @OneToMany(() => ModelVersion, version => version.model)
  versions: ModelVersion[];

  // Virtual properties
  get latestVersion(): string | undefined {
    return this.currentVersion;
  }

  get isProductionReady(): boolean {
    return this.status === ModelStatus.PRODUCTION && this.isDeployed;
  }

  get hasActiveABTest(): boolean {
    return (this.abTestConfig?.enabled &&
      this.abTestConfig.startDate &&
      this.abTestConfig.endDate &&
      new Date() >= this.abTestConfig.startDate &&
      new Date() <= this.abTestConfig.endDate)!;
  }
}

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
    comment: 'Model name identifier',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Human-readable display name',
  })
  displayName: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Model description and purpose',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ModelType,
    comment: 'Type of ML model',
  })
  modelType: ModelType;

  @Column({
    type: 'enum',
    enum: ModelFramework,
    comment: 'ML framework used',
  })
  framework: ModelFramework;

  @Column({
    type: 'enum',
    enum: ModelStatus,
    default: ModelStatus.DEVELOPMENT,
    comment: 'Current model status',
  })
  status: ModelStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User who created this model',
  })
  createdBy: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Current active version',
  })
  currentVersion?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Python service endpoint URL',
  })
  serviceEndpoint?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Model configuration and hyperparameters',
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
    comment: 'Model performance metrics',
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
    comment: 'Training dataset information',
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
    comment: 'Whether model is active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether model is deployed in production',
  })
  isDeployed: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When model was last trained',
  })
  lastTrainedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When model was deployed',
  })
  deployedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'A/B testing configuration',
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

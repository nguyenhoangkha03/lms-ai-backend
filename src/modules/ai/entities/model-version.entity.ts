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
    comment: 'Reference to ML model',
  })
  modelId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Version identifier (e.g., v1.0.0, 2024-01-15)',
  })
  version: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'ID of the training job in the background queue',
  })
  jobId?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Version description and changes',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ModelVersionStatus,
    default: ModelVersionStatus.TRAINING,
    comment: 'Version status',
  })
  status: ModelVersionStatus;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Model file path or artifact URL',
  })
  modelPath?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Docker image for this version',
  })
  dockerImage?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Training metrics for this version',
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
    comment: 'Model evaluation results',
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
    comment: 'Model artifacts information',
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
    comment: 'User who created this version',
  })
  createdBy: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When training started',
  })
  trainingStartedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When training completed',
  })
  trainingCompletedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Version-specific configuration',
  })
  configuration?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Performance comparison with previous versions',
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
    comment: 'Whether this version is currently active',
  })
  isActive: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
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

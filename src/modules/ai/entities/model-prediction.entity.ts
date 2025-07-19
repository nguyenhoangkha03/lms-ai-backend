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
    comment: 'Reference to model used',
  })
  modelId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Reference to model version used',
  })
  modelVersionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User this prediction is for',
  })
  userId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Type of prediction',
  })
  predictionType: string;

  @Column({
    type: 'json',
    comment: 'Input data used for prediction',
  })
  inputData: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Model prediction output',
  })
  prediction?: Record<string, any>;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: 'Prediction confidence score',
  })
  confidence?: number;

  @Column({
    type: 'enum',
    enum: PredictionStatus,
    default: PredictionStatus.PENDING,
    comment: 'Prediction processing status',
  })
  status: PredictionStatus;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if prediction failed',
  })
  errorMessage?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Processing time in milliseconds',
  })
  processingTime?: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Request ID for tracking',
  })
  requestId?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Actual outcome for evaluation',
  })
  actualOutcome?: Record<string, any>;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether prediction was correct',
  })
  wasCorrect?: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When prediction was requested',
  })
  requestedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When prediction was completed',
  })
  completedAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional prediction metadata',
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

import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ABTestStatus } from '@/common/enums/ai.enums';
import { MLModel } from './ml-model.entity';
import { ABTestResult } from './ab-test-result.entity';

@Entity('ab_tests')
@Index(['name'])
@Index(['status'])
@Index(['startDate'])
@Index(['endDate'])
export class ABTest extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'A/B test name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Test description and hypothesis',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Control model ID',
  })
  controlModelId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Test model ID',
  })
  testModelId: string;

  @Column({
    type: 'enum',
    enum: ABTestStatus,
    default: ABTestStatus.PLANNED,
    comment: 'Test status',
  })
  status: ABTestStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 50.0,
    comment: 'Traffic split percentage for test model',
  })
  trafficSplit: number;

  @Column({
    type: 'timestamp',
    comment: 'Test start date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startDate: Date;

  @Column({
    type: 'timestamp',
    comment: 'Test end date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  endDate: Date;

  @Column({
    type: 'json',
    comment: 'Success metrics to track',
  })
  successMetrics: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Test configuration and parameters',
  })
  configuration?: {
    minimumSampleSize?: number;
    confidenceLevel?: number;
    significanceThreshold?: number;
    allowEarlyStop?: boolean;
    targetUsers?: string[];
    excludeUsers?: string[];
  };

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User who created this test',
  })
  createdBy: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Test results summary',
  })
  results?: {
    controlPerformance?: Record<string, number>;
    testPerformance?: Record<string, number>;
    statisticalSignificance?: Record<string, number>;
    winner?: 'control' | 'test' | 'inconclusive';
    confidence?: number;
  };

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether test is active',
  })
  isActive: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => MLModel, model => model.id)
  @JoinColumn({ name: 'controlModelId' })
  controlModel: MLModel;

  @ManyToOne(() => MLModel, model => model.id)
  @JoinColumn({ name: 'testModelId' })
  testModel: MLModel;

  @OneToMany(() => ABTestResult, result => result.test)
  testResults: ABTestResult[];

  // Virtual properties
  get isRunning(): boolean {
    return (
      this.status === ABTestStatus.RUNNING &&
      new Date() >= this.startDate &&
      new Date() <= this.endDate
    );
  }

  get isCompleted(): boolean {
    return this.status === ABTestStatus.COMPLETED || new Date() > this.endDate;
  }

  get duration(): number {
    return this.endDate.getTime() - this.startDate.getTime();
  }
}

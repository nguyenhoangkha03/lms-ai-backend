import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ABTest } from './ab-test.entity';
import { User } from '../../user/entities/user.entity';

@Entity('ab_test_results')
@Index(['testId'])
@Index(['userId'])
@Index(['modelVariant'])
@Index(['createdAt'])
export class ABTestResult extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Reference to A/B test',
  })
  testId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User who triggered this result',
  })
  userId?: string;

  @Column({
    type: 'enum',
    enum: ['control', 'test'],
    comment: 'Which model variant was used',
  })
  modelVariant: 'control' | 'test';

  @Column({
    type: 'json',
    comment: 'Metric values recorded',
  })
  metricValues: Record<string, number>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional context data',
  })
  contextData?: Record<string, any>;

  @Column({
    type: 'timestamp',
    comment: 'When result was recorded',
    default: () => 'CURRENT_TIMESTAMP',
  })
  recordedAt: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ABTest, test => test.testResults)
  @JoinColumn({ name: 'testId' })
  test: ABTest;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user?: User;
}

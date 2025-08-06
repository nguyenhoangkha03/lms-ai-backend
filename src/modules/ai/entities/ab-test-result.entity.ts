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
    comment: 'Khóa ngoại liên kết tới ab_tests.id, cho biết kết quả này thuộc về thử nghiệm nào.',
  })
  testId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người dùng đã tham gia vào tương tác này.',
  })
  userId?: string;

  @Column({
    type: 'enum',
    enum: ['control', 'test'],
    comment: 'Cho biết người dùng đã được tiếp xúc với mô hình nào (control - cũ hay test - mới).',
  })
  modelVariant: 'control' | 'test';

  @Column({
    type: 'json',
    comment:
      'Trường JSON ghi lại các giá trị của chỉ số thành công (successMetrics) tại thời điểm tương tác.',
  })
  metricValues: Record<string, number>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON chứa các thông tin ngữ cảnh bổ sung tại thời điểm ghi nhận kết quả.',
  })
  contextData?: Record<string, any>;

  @Column({
    type: 'timestamp',
    comment: 'Thời gian chính xác khi kết quả được ghi lại.',
    default: () => 'CURRENT_TIMESTAMP',
  })
  recordedAt: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu bổ sung',
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

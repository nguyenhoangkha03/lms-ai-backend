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
    comment: 'Tên của thử nghiệm A/B.',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Tên của thử nghiệm A/B.',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới ml_models.id, xác định mô ',
  })
  controlModelId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới ml_models.id, xác định mô hình mới (phiên bản B).',
  })
  testModelId: string;

  @Column({
    type: 'enum',
    enum: ABTestStatus,
    default: ABTestStatus.PLANNED,
    comment:
      'Trạng thái của thử nghiệm (planned - đã lên kế hoạch, running - đang chạy, completed - đã hoàn thành).',
  })
  status: ABTestStatus;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 50.0,
    comment: 'Tỷ lệ phần trăm người dùng sẽ được tiếp xúc với mô hình mới (testModelId).',
  })
  trafficSplit: number;

  @Column({
    type: 'timestamp',
    comment: 'Thời gian bắt đầu',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startDate: Date;

  @Column({
    type: 'timestamp',
    comment: 'Thời gian kết thúc',
    default: () => 'CURRENT_TIMESTAMP',
  })
  endDate: Date;

  @Column({
    type: 'json',
    comment:
      'Trường JSON định nghĩa các chỉ số được dùng để đo lường và so sánh hiệu suất (ví dụ: tỷ lệ hoàn thành khóa học, điểm trung bình).',
  })
  successMetrics: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON mô tả nhóm người dùng sẽ tham gia vào thử nghiệm.',
  })
  targetAudience?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Cấu hình và thông số thử nghiệm',
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
    comment: 'Người dùng đã tạo bài kiểm tra này',
  })
  createdBy: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON tóm tắt kết quả cuối cùng của thử nghiệm sau khi hoàn thành.',
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
    comment: 'Kiểm tra có đang hoạt động hay không',
  })
  isActive: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu bổ sung',
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

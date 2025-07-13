import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum RubricType {
  HOLISTIC = 'holistic',
  ANALYTIC = 'analytic',
  SINGLE_POINT = 'single_point',
}

@Entity('grading_rubrics')
@Index(['assessmentId'])
@Index(['createdBy', 'isTemplate'])
export class GradingRubric extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID bài đánh giá liên kết (nếu có)',
  })
  assessmentId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tiêu đề của rubric (tên rubric)',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả chi tiết về rubric (tùy chọn)',
  })
  description: string;

  @Column({
    type: 'enum',
    enum: RubricType,
    default: RubricType.ANALYTIC,
    comment:
      'Loại rubric: holistic (tổng thể), analytic (chi tiết theo tiêu chí), single_point (điểm chuẩn đơn)',
  })
  type: RubricType;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Đánh dấu rubric này là mẫu để tái sử dụng',
  })
  isTemplate: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Rubric có đang được kích hoạt hay không',
  })
  isActive: boolean;

  @Column({
    type: 'longtext',
    comment:
      'Cấu trúc rubric dạng JSON: danh sách tiêu chí, mô tả, trọng số, và các mức điểm (levels)',
  })
  criteria: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Tổng điểm tối đa của rubric',
  })
  maxScore: number;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Phiên bản của rubric (hỗ trợ cập nhật và versioning)',
  })
  version: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lần rubric này được sử dụng để chấm điểm',
  })
  usageCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm rubric được sử dụng gần nhất',
  })
  lastUsedAt: Date;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Thông tin bổ sung dạng JSON (metadata tuỳ chỉnh)',
  })
  metadata: string;

  @ManyToOne(() => Assessment, { lazy: true })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Promise<Assessment>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'createdBy' })
  creator: Promise<User>;
}

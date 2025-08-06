import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

export enum ResourceType {
  CONTENT = 'content',
  INSTRUCTOR_TIME = 'instructor_time',
  SYSTEM_RESOURCES = 'system_resources',
  STUDY_MATERIALS = 'study_materials',
  ASSESSMENT_SLOTS = 'assessment_slots',
  SUPPORT_SERVICES = 'support_services',
}

@Entity('resource_optimizations')
@Index(['resourceType', 'optimizationDate'])
export class ResourceOptimization extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ResourceType,
    comment:
      'Phân loại tài nguyên đang được phân tích để tối ưu (content - nội dung, instructor_time - thời gian của giảng viên).',
  })
  resourceType: ResourceType;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'ID của tài nguyên cụ thể đang được phân tích',
  })
  resourceId: string;

  @Column({
    type: 'datetime',
    comment: 'Thời điểm phân tích tối ưu hóa được thực hiện',
  })
  optimizationDate: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Điểm số (0-100) đánh giá hiệu quả sử dụng của tài nguyên ở thời điểm hiện tại',
  })
  currentEfficiency: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Điểm số hiệu quả dự đoán sau khi áp dụng các gợi ý tối ưu',
  })
  predictedEfficiency: number;

  @Column({
    type: 'json',
    comment: 'Trường JSON mô tả cách tài nguyên đang được sử dụng',
  })
  currentUsage: {
    utilizationRate: number;
    peakHours: string[];
    averageSessionDuration: number;
    userSatisfaction: number;
    bottlenecks: string[];
  };

  @Column({
    type: 'json',
    comment: 'Trường JSON chứa danh sách các hành động cụ thể được AI gợi ý để cải thiện hiệu quả',
  })
  recommendations: {
    action: string;
    impact: number;
    effort: number;
    timeline: string;
    dependencies: string[];
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON mô tả các kết quả tích cực dự kiến sau khi thực hiện tối ưu',
  })
  predictedOutcomes?: {
    costSavings: number;
    performanceImprovement: number;
    userExperienceImprovement: number;
    implementationCost: number;
    riskLevel: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Kế hoạch thực hiện',
  })
  implementationPlan?: {
    phase: string;
    actions: string[];
    timeline: string;
    resources: string[];
    milestones: string[];
  }[];

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết các gợi ý tối ưu đã được áp dụng hay chưa',
  })
  isImplemented: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm số hiệu quả thực tế sau khi đã áp dụng các thay đổi',
  })
  actualEfficiency?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Kết quả thực hiện',
  })
  implementationResults?: {
    successRate: number;
    unexpectedIssues: string[];
    additionalBenefits: string[];
    lessonsLearned: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu tối ưu hóa bổ sung',
  })
  metadata?: Record<string, any>;
}

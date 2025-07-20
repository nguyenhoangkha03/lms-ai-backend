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
    comment: 'Type of resource being optimized',
  })
  resourceType: ResourceType;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Resource identifier',
  })
  resourceId: string;

  @Column({
    type: 'datetime',
    comment: 'Optimization analysis date',
  })
  optimizationDate: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Current efficiency score (0-100)',
  })
  currentEfficiency: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Predicted efficiency with optimization (0-100)',
  })
  predictedEfficiency: number;

  @Column({
    type: 'json',
    comment: 'Current usage patterns',
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
    comment: 'Optimization recommendations',
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
    comment: 'Predicted outcomes',
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
    comment: 'Implementation plan',
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
    comment: 'Whether optimization has been implemented',
  })
  isImplemented: boolean;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Actual efficiency after implementation',
  })
  actualEfficiency?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Implementation results',
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
    comment: 'Additional optimization metadata',
  })
  metadata?: Record<string, any>;
}

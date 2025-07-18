import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EmailAutomationWorkflow } from './email-automation-workflow.entity';
import { NotificationTemplate } from './notification-template.entity';

export enum StepType {
  EMAIL = 'email',
  DELAY = 'delay',
  CONDITION = 'condition',
  ACTION = 'action',
  SPLIT_TEST = 'split_test',
  GOAL = 'goal',
}

export enum StepStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
}

@Entity('email_automation_steps')
@Index(['workflowId'])
@Index(['stepType'])
@Index(['orderIndex'])
@Index(['isActive'])
export class EmailAutomationStep extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Workflow ID this step belongs to',
  })
  workflowId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Step name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Step description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: StepType,
    comment: 'Type of automation step',
  })
  stepType: StepType;

  @Column({
    type: 'enum',
    enum: StepStatus,
    default: StepStatus.ACTIVE,
    comment: 'Current step status',
  })
  status: StepStatus;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether step is active',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    comment: 'Order of step in workflow',
  })
  orderIndex: number;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Template ID for email steps',
  })
  templateId?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Step configuration based on step type',
  })
  config?: {
    // For EMAIL steps
    email?: {
      subject?: string;
      fromEmail?: string;
      fromName?: string;
      replyToEmail?: string;
      customContent?: string;
      personalizeSubject?: boolean;
      personalizeContent?: boolean;
    };

    // For DELAY steps
    delay?: {
      amount: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
      respectBusinessHours?: boolean;
      respectUserTimezone?: boolean;
    };

    // For CONDITION steps
    condition?: {
      type: 'user_property' | 'behavior' | 'engagement' | 'custom';
      field: string;
      operator:
        | 'equals'
        | 'not_equals'
        | 'greater_than'
        | 'less_than'
        | 'contains'
        | 'not_contains';
      value: any;
      timeframe?: {
        amount: number;
        unit: 'minutes' | 'hours' | 'days' | 'weeks';
      };
      trueStepId?: string;
      falseStepId?: string;
    };

    // For ACTION steps
    action?: {
      type:
        | 'add_tag'
        | 'remove_tag'
        | 'update_field'
        | 'trigger_webhook'
        | 'add_to_course'
        | 'remove_from_course';
      parameters: Record<string, any>;
    };

    // For SPLIT_TEST steps
    splitTest?: {
      variants: Array<{
        name: string;
        percentage: number;
        stepId: string;
      }>;
      winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate';
      testDuration?: {
        amount: number;
        unit: 'hours' | 'days' | 'weeks';
      };
    };

    // For GOAL steps
    goal?: {
      type: 'course_completion' | 'lesson_completion' | 'purchase' | 'custom_event';
      parameters: Record<string, any>;
      conversionWindow?: {
        amount: number;
        unit: 'hours' | 'days' | 'weeks';
      };
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Step execution conditions',
  })
  executionConditions?: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: 'AND' | 'OR';
  }>;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times step was executed',
  })
  executionCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of successful executions',
  })
  successCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of failed executions',
  })
  failureCount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Open rate for email steps',
  })
  openRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Click rate for email steps',
  })
  clickRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Conversion rate for goal steps',
  })
  conversionRate: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Step analytics and performance data',
  })
  analytics?: {
    deliveryStats?: {
      sent: number;
      delivered: number;
      bounced: number;
      failed: number;
    };
    engagementStats?: {
      opens: number;
      clicks: number;
      unsubscribes: number;
      complaints: number;
    };
    conversionStats?: {
      conversions: number;
      revenue?: number;
      avgTimeToConversion?: number;
    };
    segmentPerformance?: Record<
      string,
      {
        executions: number;
        successes: number;
        openRate: number;
        clickRate: number;
      }
    >;
  };

  @ManyToOne(() => EmailAutomationWorkflow, workflow => workflow.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowId' })
  workflow: EmailAutomationWorkflow;

  @ManyToOne(() => NotificationTemplate, { nullable: true })
  @JoinColumn({ name: 'templateId' })
  template?: NotificationTemplate;
}

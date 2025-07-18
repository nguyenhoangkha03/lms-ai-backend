import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EmailAutomationStep } from './email-automation-step.entity';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum TriggerType {
  USER_REGISTRATION = 'user_registration',
  COURSE_ENROLLMENT = 'course_enrollment',
  COURSE_COMPLETION = 'course_completion',
  LESSON_COMPLETION = 'lesson_completion',
  ASSESSMENT_SUBMISSION = 'assessment_submission',
  INACTIVITY = 'inactivity',
  BIRTHDAY = 'birthday',
  COURSE_DEADLINE = 'course_deadline',
  CUSTOM_EVENT = 'custom_event',
  TIME_BASED = 'time_based',
  BEHAVIOR_TRIGGER = 'behavior_trigger',
}

@Entity('email_automation_workflows')
@Index(['status'])
@Index(['triggerType'])
@Index(['isActive'])
@Index(['createdBy'])
export class EmailAutomationWorkflow extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Workflow name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Workflow description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.DRAFT,
    comment: 'Current workflow status',
  })
  status: WorkflowStatus;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether workflow is active',
  })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User who created the workflow',
  })
  createdBy: string;

  @Column({
    type: 'enum',
    enum: TriggerType,
    comment: 'What triggers this workflow',
  })
  triggerType: TriggerType;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trigger configuration and conditions',
  })
  triggerConfig?: {
    // For course-related triggers
    courseIds?: string[];
    categoryIds?: string[];

    // For user-related triggers
    userTypes?: string[];
    userTags?: string[];

    // For time-based triggers
    schedule?: {
      type: 'once' | 'recurring';
      cron?: string;
      timezone?: string;
      startDate?: Date;
      endDate?: Date;
    };

    // For behavior triggers
    behaviorConditions?: Array<{
      event: string;
      operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
      value: any;
      timeframe?: {
        amount: number;
        unit: 'minutes' | 'hours' | 'days' | 'weeks';
      };
    }>;

    // For inactivity triggers
    inactivityPeriod?: {
      amount: number;
      unit: 'days' | 'weeks' | 'months';
    };

    // Custom event data
    customEventName?: string;
    customEventData?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Audience targeting criteria',
  })
  targetAudience?: {
    userTypes?: string[];
    courseIds?: string[];
    tags?: string[];
    customQuery?: string;
    excludeUserIds?: string[];
    includeUserIds?: string[];
    segmentIds?: string[];
    behaviorCriteria?: Array<{
      event: string;
      operator: string;
      value: any;
      timeframe?: {
        amount: number;
        unit: string;
      };
    }>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Workflow settings and configuration',
  })
  settings?: {
    // Execution settings
    maxExecutionsPerUser?: number;
    cooldownPeriod?: {
      amount: number;
      unit: 'minutes' | 'hours' | 'days';
    };

    // Timing settings
    timezone?: string;
    respectUserTimezone?: boolean;
    businessHoursOnly?: boolean;
    businessHours?: {
      start: string;
      end: string;
      days: number[];
    };

    // Anti-spam settings
    frequencyCapping?: {
      maxEmailsPerDay?: number;
      maxEmailsPerWeek?: number;
      maxEmailsPerMonth?: number;
    };

    // A/B testing
    abTesting?: {
      enabled: boolean;
      variants: Array<{
        name: string;
        percentage: number;
        steps: string[];
      }>;
    };

    // Exit conditions
    exitConditions?: Array<{
      event: string;
      operator: string;
      value: any;
    }>;
  };

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When workflow becomes active',
  })
  activeFrom?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When workflow becomes inactive',
  })
  activeUntil?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of times workflow was triggered',
  })
  totalExecutions: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of successful executions',
  })
  successfulExecutions: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of failed executions',
  })
  failedExecutions: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Average open rate across all emails in workflow',
  })
  averageOpenRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Average click rate across all emails in workflow',
  })
  averageClickRate: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Workflow performance analytics',
  })
  analytics?: {
    conversionRate?: number;
    unsubscribeRate?: number;
    engagementScore?: number;
    revenuePergeneratedw?: number;
    goalCompletions?: number;
    segmentPerformance?: Record<
      string,
      {
        openRate: number;
        clickRate: number;
        conversionRate: number;
      }
    >;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Workflow error logs',
  })
  errorLogs?: Array<{
    timestamp: Date;
    step: string;
    error: string;
    details?: any;
  }>;

  @OneToMany(() => EmailAutomationStep, step => step.workflow, {
    cascade: true,
  })
  steps: EmailAutomationStep[];
}

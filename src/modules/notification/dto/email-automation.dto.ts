import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsBoolean,
  IsDate,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowStatus, TriggerType } from '../entities/email-automation-workflow.entity';
import { StepType } from '../entities/email-automation-step.entity';

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TriggerType, description: 'What triggers this workflow' })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiPropertyOptional({ description: 'Trigger configuration' })
  @IsOptional()
  @IsObject()
  triggerConfig?: {
    courseIds?: string[];
    categoryIds?: string[];
    userTypes?: string[];
    userTags?: string[];
    schedule?: {
      type: 'once' | 'recurring';
      cron?: string;
      timezone?: string;
      startDate?: Date;
      endDate?: Date;
    };
    behaviorConditions?: Array<{
      event: string;
      operator: string;
      value: any;
      timeframe?: {
        amount: number;
        unit: string;
      };
    }>;
    inactivityPeriod?: {
      amount: number;
      unit: string;
    };
    customEventName?: string;
    customEventData?: Record<string, any>;
  };

  @ApiPropertyOptional({ description: 'Target audience criteria' })
  @IsOptional()
  @IsObject()
  targetAudience?: {
    userTypes?: string[];
    courseIds?: string[];
    tags?: string[];
    customQuery?: string;
    excludeUserIds?: string[];
    includeUserIds?: string[];
    segmentIds?: string[];
  };

  @ApiPropertyOptional({ description: 'Workflow settings' })
  @IsOptional()
  @IsObject()
  settings?: {
    maxExecutionsPerUser?: number;
    cooldownPeriod?: {
      amount: number;
      unit: string;
    };
    timezone?: string;
    respectUserTimezone?: boolean;
    businessHoursOnly?: boolean;
    businessHours?: {
      start: string;
      end: string;
      days: number[];
    };
    frequencyCapping?: {
      maxEmailsPerDay?: number;
      maxEmailsPerWeek?: number;
      maxEmailsPerMonth?: number;
    };
    abTesting?: {
      enabled: boolean;
      variants: Array<{
        name: string;
        percentage: number;
        steps: string[];
      }>;
    };
    exitConditions?: Array<{
      event: string;
      operator: string;
      value: any;
    }>;
  };

  @ApiPropertyOptional({ description: 'When workflow becomes active' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  activeFrom?: Date;

  @ApiPropertyOptional({ description: 'When workflow becomes inactive' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  activeUntil?: Date;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ description: 'Workflow name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Workflow description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Trigger configuration' })
  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Target audience criteria' })
  @IsOptional()
  @IsObject()
  targetAudience?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Workflow settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'When workflow becomes active' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  activeFrom?: Date;

  @ApiPropertyOptional({ description: 'When workflow becomes inactive' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  activeUntil?: Date;
}

export class CreateStepDto {
  @ApiProperty({ description: 'Step name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: StepType, description: 'Type of automation step' })
  @IsEnum(StepType)
  stepType: StepType;

  @ApiProperty({ description: 'Order of step in workflow', minimum: 0 })
  @IsNumber()
  @Min(0)
  orderIndex: number;

  @ApiPropertyOptional({ description: 'Template ID for email steps' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Step configuration based on type' })
  @IsOptional()
  @IsObject()
  config?: {
    email?: {
      subject?: string;
      fromEmail?: string;
      fromName?: string;
      replyToEmail?: string;
      customContent?: string;
      personalizeSubject?: boolean;
      personalizeContent?: boolean;
    };
    delay?: {
      amount: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
      respectBusinessHours?: boolean;
      respectUserTimezone?: boolean;
    };
    condition?: {
      type: string;
      field: string;
      operator: string;
      value: any;
      timeframe?: {
        amount: number;
        unit: string;
      };
      trueStepId?: string;
      falseStepId?: string;
    };
    action?: {
      type: string;
      parameters: Record<string, any>;
    };
    splitTest?: {
      variants: Array<{
        name: string;
        percentage: number;
        stepId: string;
      }>;
      winnerCriteria: string;
      testDuration?: {
        amount: number;
        unit: string;
      };
    };
    goal?: {
      type: string;
      parameters: Record<string, any>;
      conversionWindow?: {
        amount: number;
        unit: string;
      };
    };
  };

  @ApiPropertyOptional({ description: 'Step execution conditions' })
  @IsOptional()
  @IsArray()
  executionConditions?: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: 'AND' | 'OR';
  }>;
}

export class UpdateStepDto {
  @ApiPropertyOptional({ description: 'Step name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Step description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Order of step in workflow' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'Template ID for email steps' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Step configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Step execution conditions' })
  @IsOptional()
  @IsArray()
  executionConditions?: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: 'AND' | 'OR';
  }>;
}

export class TriggerWorkflowDto {
  @ApiProperty({ description: 'User ID to trigger workflow for' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Additional trigger data' })
  @IsOptional()
  @IsObject()
  triggerData?: Record<string, any>;
}

export class WorkflowFilterDto {
  @ApiPropertyOptional({ enum: WorkflowStatus, description: 'Filter by workflow status' })
  @IsOptional()
  @IsEnum(WorkflowStatus)
  status?: WorkflowStatus;

  @ApiPropertyOptional({ enum: TriggerType, description: 'Filter by trigger type' })
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @ApiPropertyOptional({ description: 'Filter by creator user ID' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Search in name or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

export class WorkflowTestDto {
  @ApiProperty({ description: 'Test user ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Test data to use' })
  @IsOptional()
  @IsObject()
  testData?: Record<string, any>;

  @ApiPropertyOptional({ description: "Run in test mode (don't send actual emails)" })
  @IsOptional()
  @IsBoolean()
  testMode?: boolean = true;
}

// Response DTOs
export class StepResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ enum: StepType })
  stepType: StepType;

  @ApiProperty()
  orderIndex: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  executionCount: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty()
  openRate: number;

  @ApiProperty()
  clickRate: number;

  @ApiProperty()
  conversionRate: number;
}

export class StepStatisticsDto {
  @ApiProperty()
  stepId: string;

  @ApiProperty()
  stepName: string;

  @ApiProperty()
  executionCount: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty()
  openRate?: number;

  @ApiProperty()
  clickRate?: number;

  @ApiProperty()
  conversionRate?: number;
}

export class WorkflowResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ enum: WorkflowStatus })
  status: WorkflowStatus;

  @ApiProperty({ enum: TriggerType })
  triggerType: TriggerType;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  totalExecutions: number;

  @ApiProperty()
  successfulExecutions: number;

  @ApiProperty()
  failedExecutions: number;

  @ApiProperty()
  averageOpenRate: number;

  @ApiProperty()
  averageClickRate: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  activeFrom?: Date;

  @ApiProperty()
  activeUntil?: Date;

  @ApiProperty({ type: [StepResponseDto] })
  steps?: StepResponseDto[];
}

export class WorkflowStatisticsResponseDto {
  @ApiProperty()
  totalExecutions: number;

  @ApiProperty()
  successfulExecutions: number;

  @ApiProperty()
  failedExecutions: number;

  @ApiProperty()
  averageCompletionTime: number;

  @ApiProperty({ type: [StepStatisticsDto] })
  stepStatistics: StepStatisticsDto[];
}

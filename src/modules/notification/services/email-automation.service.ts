import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EmailAutomationWorkflow,
  WorkflowStatus,
  TriggerType,
} from '../entities/email-automation-workflow.entity';
import { EmailAutomationStep, StepType } from '../entities/email-automation-step.entity';
import { User } from '../../user/entities/user.entity';
import { EmailSuppressionService } from './email-suppression.service';
import { SmtpProviderService } from './smtp-provider.service';
import { NotificationTemplateService } from './notification-template.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto/email-automation.dto';

interface WorkflowExecution {
  workflowId: string;
  userId: string;
  triggerData: Record<string, any>;
  currentStepIndex: number;
  variables: Record<string, any>;
  startedAt: Date;
  executionId: string;
}

@Injectable()
export class EmailAutomationService {
  private readonly logger = new Logger(EmailAutomationService.name);
  private activeExecutions = new Map<string, WorkflowExecution>();

  constructor(
    @InjectRepository(EmailAutomationWorkflow)
    private workflowRepository: Repository<EmailAutomationWorkflow>,

    @InjectRepository(EmailAutomationStep)
    private stepRepository: Repository<EmailAutomationStep>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectQueue('email-automation')
    private automationQueue: Queue,

    private emailSuppressionService: EmailSuppressionService,
    private smtpProviderService: SmtpProviderService,
    private templateService: NotificationTemplateService,
  ) {}

  async createWorkflow(
    createWorkflowDto: CreateWorkflowDto,
    createdBy: string,
  ): Promise<EmailAutomationWorkflow> {
    const workflow = this.workflowRepository.create({
      ...createWorkflowDto,
      createdBy,
      status: WorkflowStatus.DRAFT,
    } as EmailAutomationWorkflow);

    const savedWorkflow = await this.workflowRepository.save(workflow);
    this.logger.log(`Email automation workflow created: ${savedWorkflow.id}`);

    return savedWorkflow;
  }

  async findAllWorkflows(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: WorkflowStatus;
      triggerType?: TriggerType;
      createdBy?: string;
      search?: string;
    },
  ): Promise<{ workflows: EmailAutomationWorkflow[]; total: number }> {
    const queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .leftJoinAndSelect('workflow.steps', 'steps')
      .orderBy('steps.orderIndex', 'ASC');

    if (filters?.status) {
      queryBuilder.andWhere('workflow.status = :status', { status: filters.status });
    }

    if (filters?.triggerType) {
      queryBuilder.andWhere('workflow.triggerType = :triggerType', {
        triggerType: filters.triggerType,
      });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('workflow.createdBy = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere('(workflow.name LIKE :search OR workflow.description LIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    queryBuilder
      .orderBy('workflow.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [workflows, total] = await queryBuilder.getManyAndCount();
    return { workflows, total };
  }

  async findOneWorkflow(id: string): Promise<EmailAutomationWorkflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id },
      relations: ['steps'],
      order: { steps: { orderIndex: 'ASC' } },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async updateWorkflow(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<EmailAutomationWorkflow> {
    const workflow = await this.findOneWorkflow(id);

    if (workflow.status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Cannot update active workflows');
    }

    await this.workflowRepository.update(id, updateWorkflowDto);
    return this.findOneWorkflow(id);
  }

  async deleteWorkflow(id: string): Promise<void> {
    const workflow = await this.findOneWorkflow(id);

    if (workflow.status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active workflows');
    }

    await this.workflowRepository.delete(id);
    this.logger.log(`Email automation workflow deleted: ${id}`);
  }

  async activateWorkflow(id: string): Promise<EmailAutomationWorkflow> {
    const workflow = await this.findOneWorkflow(id);

    if (workflow.status === WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is already active');
    }

    // Validate workflow has at least one step
    if (!workflow.steps || workflow.steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step');
    }

    // Validate all steps are properly configured
    for (const step of workflow.steps) {
      await this.validateStep(step);
    }

    await this.workflowRepository.update(id, {
      status: WorkflowStatus.ACTIVE,
      isActive: true,
    });

    this.logger.log(`Workflow ${id} activated`);
    return this.findOneWorkflow(id);
  }

  async deactivateWorkflow(id: string): Promise<EmailAutomationWorkflow> {
    const workflow = await this.findOneWorkflow(id);

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is not active');
    }

    await this.workflowRepository.update(id, {
      status: WorkflowStatus.PAUSED,
      isActive: false,
    });

    // Cancel any pending executions
    const jobs = await this.automationQueue.getJobs(['delayed', 'waiting']);
    for (const job of jobs) {
      if (job.data.workflowId === id) {
        await job.remove();
      }
    }

    this.logger.log(`Workflow ${id} deactivated`);
    return this.findOneWorkflow(id);
  }

  async triggerWorkflow(
    workflowId: string,
    userId: string,
    triggerData: Record<string, any> = {},
  ): Promise<string | null> {
    const workflow = await this.findOneWorkflow(workflowId);

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException('Workflow is not active');
    }

    // Check if user matches target audience
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const matchesAudience = await this.checkTargetAudience(user, workflow.targetAudience);
    if (!matchesAudience) {
      this.logger.debug(`User ${userId} does not match target audience for workflow ${workflowId}`);
      return null;
    }

    // Check frequency capping and cooldown
    const canExecute = await this.checkExecutionLimits(workflowId, userId, workflow.settings);
    if (!canExecute) {
      this.logger.debug(`Execution limits exceeded for user ${userId} and workflow ${workflowId}`);
      return null;
    }

    // Create execution ID and start workflow
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: WorkflowExecution = {
      workflowId,
      userId,
      triggerData,
      currentStepIndex: 0,
      variables: {
        ...triggerData,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
        },
        workflow: {
          id: workflow.id,
          name: workflow.name,
        },
      },
      startedAt: new Date(),
      executionId,
    };

    this.activeExecutions.set(executionId, execution);

    // Queue first step execution
    await this.automationQueue.add(
      'execute-step',
      {
        executionId,
        stepIndex: 0,
      },
      {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    // Update workflow statistics
    await this.workflowRepository.update(workflowId, {
      totalExecutions: () => 'totalExecutions + 1',
    });

    this.logger.log(
      `Workflow ${workflowId} triggered for user ${userId} - Execution: ${executionId}`,
    );
    return executionId;
  }

  async executeStep(executionId: string, stepIndex: number): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.error(`Execution ${executionId} not found`);
      return;
    }

    const workflow = await this.findOneWorkflow(execution.workflowId);
    const step = workflow.steps[stepIndex];

    if (!step) {
      this.logger.error(`Step ${stepIndex} not found in workflow ${workflow.id}`);
      await this.completeExecution(executionId, false);
      return;
    }

    try {
      // Check execution conditions
      if (
        step.executionConditions &&
        !this.evaluateConditions(step.executionConditions, execution.variables)
      ) {
        this.logger.debug(`Step ${step.id} conditions not met, skipping`);
        await this.executeNextStep(executionId, stepIndex + 1);
        return;
      }

      // Execute step based on type
      switch (step.stepType) {
        case StepType.EMAIL:
          await this.executeEmailStep(execution, step);
          break;
        case StepType.DELAY:
          await this.executeDelayStep(execution, step, stepIndex);
          break;
        case StepType.CONDITION:
          await this.executeConditionStep(execution, step, stepIndex);
          break;
        case StepType.ACTION:
          await this.executeActionStep(execution, step);
          break;
        case StepType.GOAL:
          await this.executeGoalStep(execution, step);
          break;
        default:
          this.logger.error(`Unknown step type: ${step.stepType}`);
          await this.completeExecution(executionId, false);
          return;
      }

      // Update step statistics
      await this.stepRepository.update(step.id, {
        executionCount: () => 'executionCount + 1',
        successCount: () => 'successCount + 1',
      });

      // Continue to next step if not handled by step-specific logic
      if (step.stepType === StepType.EMAIL || step.stepType === StepType.ACTION) {
        await this.executeNextStep(executionId, stepIndex + 1);
      }
    } catch (error) {
      this.logger.error(`Step execution failed:`, error);

      // Update step statistics
      await this.stepRepository.update(step.id, {
        executionCount: () => 'executionCount + 1',
        failureCount: () => 'failureCount + 1',
      });

      await this.completeExecution(executionId, false);
    }
  }

  private async executeEmailStep(
    execution: WorkflowExecution,
    step: EmailAutomationStep,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: execution.userId } });

    // Check if email is suppressed
    const isSuppressed = await this.emailSuppressionService.isEmailSuppressed(
      user!.email,
      'marketing',
    );

    if (isSuppressed) {
      this.logger.debug(`Email suppressed for ${user!.email}`);
      return;
    }

    // Get template or use step configuration
    let emailContent;
    if (step.templateId) {
      const template = await this.templateService.findOne(step.templateId);
      emailContent = await this.templateService.renderTemplate(template, execution.variables);
    } else {
      emailContent = {
        subject: this.replaceVariables(step.config?.email?.subject || '', execution.variables),
        body: this.replaceVariables(step.config?.email?.customContent || '', execution.variables),
        htmlBody: this.replaceVariables(
          step.config?.email?.customContent || '',
          execution.variables,
        ),
      };
    }

    // Send email
    const result = await this.smtpProviderService.sendEmail({
      to: user!.email,
      from: (step.config?.email?.fromEmail || process.env.EMAIL_FROM_ADDRESS)!,
      fromName: step.config?.email?.fromName,
      replyTo: step.config?.email?.replyToEmail,
      subject: emailContent.subject,
      text: emailContent.body,
      html: emailContent.htmlBody,
      headers: {
        'X-Workflow-ID': execution.workflowId,
        'X-Execution-ID': execution.executionId,
        'X-Step-ID': step.id,
      },
    });

    if (result.success) {
      this.logger.log(`Email sent to ${user!.email} for step ${step.id}`);
    } else {
      throw new Error(`Email send failed: ${result.error}`);
    }
  }

  private async executeDelayStep(
    execution: WorkflowExecution,
    step: EmailAutomationStep,
    stepIndex: number,
  ): Promise<void> {
    const delayConfig = step.config?.delay;
    if (!delayConfig) {
      throw new Error('Delay step missing configuration');
    }

    let delayMs = 0;
    switch (delayConfig.unit) {
      case 'minutes':
        delayMs = delayConfig.amount * 60 * 1000;
        break;
      case 'hours':
        delayMs = delayConfig.amount * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = delayConfig.amount * 24 * 60 * 60 * 1000;
        break;
      case 'weeks':
        delayMs = delayConfig.amount * 7 * 24 * 60 * 60 * 1000;
        break;
    }

    // Schedule next step execution
    await this.automationQueue.add(
      'execute-step',
      {
        executionId: execution.executionId,
        stepIndex: stepIndex + 1,
      },
      {
        delay: delayMs,
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Delay step scheduled: ${delayConfig.amount} ${delayConfig.unit}`);
  }

  private async executeConditionStep(
    execution: WorkflowExecution,
    step: EmailAutomationStep,
    stepIndex: number,
  ): Promise<void> {
    const conditionConfig = step.config?.condition;
    if (!conditionConfig) {
      throw new Error('Condition step missing configuration');
    }

    const conditionMet = this.evaluateCondition(conditionConfig, execution.variables);

    // Determine next step based on condition result
    let nextStepIndex = stepIndex + 1;
    if (conditionConfig.trueStepId && conditionMet) {
      nextStepIndex = this.findStepIndexById(execution.workflowId, conditionConfig.trueStepId);
    } else if (conditionConfig.falseStepId && !conditionMet) {
      nextStepIndex = this.findStepIndexById(execution.workflowId, conditionConfig.falseStepId);
    }

    await this.executeNextStep(execution.executionId, nextStepIndex);
  }

  private async executeActionStep(
    execution: WorkflowExecution,
    step: EmailAutomationStep,
  ): Promise<void> {
    const actionConfig = step.config?.action;
    if (!actionConfig) {
      throw new Error('Action step missing configuration');
    }

    switch (actionConfig.type) {
      case 'add_tag':
        await this.addUserTag(execution.userId, actionConfig.parameters.tag);
        break;
      case 'remove_tag':
        await this.removeUserTag(execution.userId, actionConfig.parameters.tag);
        break;
      case 'update_field':
        await this.updateUserField(execution.userId, actionConfig.parameters);
        break;
      case 'trigger_webhook':
        await this.triggerWebhook(actionConfig.parameters, execution.variables);
        break;
      case 'add_to_course':
        await this.addUserToCourse(execution.userId, actionConfig.parameters.courseId);
        break;
      case 'remove_from_course':
        await this.removeUserFromCourse(execution.userId, actionConfig.parameters.courseId);
        break;
      default:
        this.logger.warn(`Unknown action type: ${actionConfig.type}`);
    }
  }

  private async executeGoalStep(
    execution: WorkflowExecution,
    step: EmailAutomationStep,
  ): Promise<void> {
    const goalConfig = step.config?.goal;
    if (!goalConfig) {
      throw new Error('Goal step missing configuration');
    }

    // Goal steps typically mark conversion points
    // This would integrate with analytics to track conversions
    this.logger.log(`Goal reached: ${goalConfig.type} for execution ${execution.executionId}`);

    // Update step conversion rate
    await this.stepRepository.update(step.id, {
      conversionRate: () => 'conversionRate + 1',
    });

    // Complete execution as goal is reached
    await this.completeExecution(execution.executionId, true);
  }

  private async executeNextStep(executionId: string, nextStepIndex: number): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return;
    }

    const workflow = await this.findOneWorkflow(execution.workflowId);

    if (nextStepIndex >= workflow.steps.length) {
      // Workflow completed
      await this.completeExecution(executionId, true);
      return;
    }

    // Update execution state
    execution.currentStepIndex = nextStepIndex;

    // Queue next step
    await this.automationQueue.add(
      'execute-step',
      {
        executionId,
        stepIndex: nextStepIndex,
      },
      {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );
  }

  private async completeExecution(executionId: string, success: boolean): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return;
    }

    // Update workflow statistics
    const updateData = success
      ? { successfulExecutions: () => 'successfulExecutions + 1' }
      : { failedExecutions: () => 'failedExecutions + 1' };

    await this.workflowRepository.update(execution.workflowId, updateData);

    // Clean up execution
    this.activeExecutions.delete(executionId);

    this.logger.log(`Execution ${executionId} completed: ${success ? 'success' : 'failed'}`);
  }

  private evaluateConditions(conditions: any[], variables: Record<string, any>): boolean {
    return conditions.every(condition => this.evaluateCondition(condition, variables));
  }

  private evaluateCondition(condition: any, variables: Record<string, any>): boolean {
    const value = this.getVariableValue(condition.field, variables);
    const targetValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return value === targetValue;
      case 'not_equals':
        return value !== targetValue;
      case 'greater_than':
        return Number(value) > Number(targetValue);
      case 'less_than':
        return Number(value) < Number(targetValue);
      case 'contains':
        return String(value).includes(String(targetValue));
      case 'not_contains':
        return !String(value).includes(String(targetValue));
      default:
        return false;
    }
  }

  private getVariableValue(path: string, variables: Record<string, any>): any {
    return path.split('.').reduce((obj, key) => obj?.[key], variables);
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  private findStepIndexById(_workflowId: string, _stepId: string): number {
    // This would need to be implemented to find step index by ID
    // For now, return next step
    return -1;
  }

  private async checkTargetAudience(user: User, targetAudience: any): Promise<boolean> {
    if (!targetAudience) {
      return true;
    }

    // Check user types
    if (targetAudience.userTypes?.length > 0) {
      if (!targetAudience.userTypes.includes(user.userType)) {
        return false;
      }
    }

    // Check include/exclude lists
    if (targetAudience.includeUserIds?.length > 0) {
      if (!targetAudience.includeUserIds.includes(user.id)) {
        return false;
      }
    }

    if (targetAudience.excludeUserIds?.length > 0) {
      if (targetAudience.excludeUserIds.includes(user.id)) {
        return false;
      }
    }

    return true;
  }

  private async checkExecutionLimits(
    _workflowId: string,
    _userId: string,
    _settings: any,
  ): Promise<boolean> {
    // Implement frequency capping and cooldown logic
    // This would check database for recent executions
    return true;
  }

  private async validateStep(step: EmailAutomationStep): Promise<void> {
    switch (step.stepType) {
      case StepType.EMAIL:
        if (!step.templateId && !step.config?.email?.customContent) {
          throw new BadRequestException(`Email step ${step.id} missing template or content`);
        }
        break;
      case StepType.DELAY:
        if (!step.config?.delay?.amount || !step.config?.delay?.unit) {
          throw new BadRequestException(`Delay step ${step.id} missing delay configuration`);
        }
        break;
      case StepType.CONDITION:
        if (!step.config?.condition?.field || !step.config?.condition?.operator) {
          throw new BadRequestException(
            `Condition step ${step.id} missing condition configuration`,
          );
        }
        break;
    }
  }

  // Helper methods for action steps
  private async addUserTag(userId: string, tag: string): Promise<void> {
    // Implementation would update user tags
    this.logger.debug(`Adding tag ${tag} to user ${userId}`);
  }

  private async removeUserTag(userId: string, tag: string): Promise<void> {
    // Implementation would remove user tag
    this.logger.debug(`Removing tag ${tag} from user ${userId}`);
  }

  private async updateUserField(userId: string, parameters: any): Promise<void> {
    // Implementation would update user field
    this.logger.debug(`Updating user ${userId} field: ${JSON.stringify(parameters)}`);
  }

  private async triggerWebhook(parameters: any, _variables: Record<string, any>): Promise<void> {
    // Implementation would trigger external webhook
    this.logger.debug(`Triggering webhook: ${JSON.stringify(parameters)}`);
  }

  private async addUserToCourse(userId: string, courseId: string): Promise<void> {
    // Implementation would enroll user in course
    this.logger.debug(`Adding user ${userId} to course ${courseId}`);
  }

  private async removeUserFromCourse(userId: string, courseId: string): Promise<void> {
    // Implementation would unenroll user from course
    this.logger.debug(`Removing user ${userId} from course ${courseId}`);
  }

  // Scheduled job to trigger time-based workflows
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledWorkflows(): Promise<void> {
    const workflows = await this.workflowRepository.find({
      where: {
        status: WorkflowStatus.ACTIVE,
        triggerType: TriggerType.TIME_BASED,
      },
    });

    for (const workflow of workflows) {
      try {
        await this.processTimeBasedWorkflow(workflow);
      } catch (error) {
        this.logger.error(`Failed to process time-based workflow ${workflow.id}:`, error);
      }
    }
  }

  private async processTimeBasedWorkflow(workflow: EmailAutomationWorkflow): Promise<void> {
    const schedule = workflow.triggerConfig?.schedule;
    if (!schedule || !schedule.cron) {
      return;
    }

    // Check if it's time to trigger based on cron expression
    // This would need a proper cron parser implementation
    const shouldTrigger = this.shouldTriggerBasedOnCron(schedule.cron);

    if (shouldTrigger) {
      // Get users matching target audience
      const users = await this.getUsersForWorkflow(workflow);

      for (const user of users) {
        await this.triggerWorkflow(workflow.id, user.id, {
          triggerType: 'scheduled',
          triggerTime: new Date(),
        });
      }
    }
  }

  private shouldTriggerBasedOnCron(_cronExpression: string): boolean {
    // Implementation would use a cron parser library
    // For now, return false
    return false;
  }

  private async getUsersForWorkflow(_workflow: EmailAutomationWorkflow): Promise<User[]> {
    // Implementation would build query based on target audience
    // For now, return empty array
    return [];
  }

  async getWorkflowStatistics(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageCompletionTime: number;
    stepStatistics: Array<{
      stepId: string;
      stepName: string;
      executionCount: number;
      successCount: number;
      failureCount: number;
      openRate?: number;
      clickRate?: number;
      conversionRate?: number;
    }>;
  }> {
    const workflow = await this.findOneWorkflow(workflowId);

    const stepStats = workflow.steps.map(step => ({
      stepId: step.id,
      stepName: step.name,
      executionCount: step.executionCount,
      successCount: step.successCount,
      failureCount: step.failureCount,
      openRate: step.openRate,
      clickRate: step.clickRate,
      conversionRate: step.conversionRate,
    }));

    return {
      totalExecutions: workflow.totalExecutions,
      successfulExecutions: workflow.successfulExecutions,
      failedExecutions: workflow.failedExecutions,
      averageCompletionTime: 0, // Would calculate from execution logs
      stepStatistics: stepStats,
    };
  }
}

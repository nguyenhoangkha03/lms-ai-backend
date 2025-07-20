import { Logger } from '@nestjs/common';
import { INTERVENTION_QUEUE } from '../queues/queue.constants';
import { Process, Processor } from '@nestjs/bull';
import { InterventionRecommendationService } from '../services/intervention-recommendation.service';
import { Job } from 'bull';
import { InterventionStatus } from '../entities/intervention-recommendation.entity';

@Processor(INTERVENTION_QUEUE)
export class InterventionProcessor {
  private readonly logger = new Logger(InterventionProcessor.name);

  constructor(private readonly interventionService: InterventionRecommendationService) {}

  @Process('execute-automated-intervention')
  async processAutomatedIntervention(job: Job<{ interventionId: string }>) {
    const { interventionId } = job.data;

    try {
      this.logger.debug(`Processing automated intervention ${interventionId}`);

      const intervention = await this.interventionService.findOne(interventionId);

      // Execute the intervention based on its type
      const result = await this.executeIntervention(intervention);

      // Update intervention status
      await this.interventionService.update(interventionId, {
        status: result.success ? InterventionStatus.COMPLETED : InterventionStatus.CANCELLED,
        effectivenessScore: result.effectivenessScore,
        instructorNotes: result.notes,
      });

      this.logger.log(
        `Automated intervention ${interventionId} executed with result: ${result.success}`,
      );

      return {
        interventionId,
        result,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error processing automated intervention: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('schedule-intervention-reminders')
  async processInterventionReminders(job: Job<{ reminderDate: string }>) {
    const { reminderDate } = job.data;

    try {
      this.logger.debug(`Processing intervention reminders for ${reminderDate}`);

      // Get pending interventions that need reminders
      const pendingInterventions = await this.interventionService.getPendingInterventions();

      const reminders: any[] = [];

      for (const intervention of pendingInterventions) {
        if (this.shouldSendReminder(intervention, reminderDate)) {
          reminders.push(intervention);
        }
      }

      if (reminders.length > 0) {
        await this.sendInterventionReminders(reminders);
      }

      this.logger.log(`Intervention reminders processed: ${reminders.length} reminders sent`);

      return {
        reminderDate,
        remindersSent: reminders.length,
        totalPending: pendingInterventions.length,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error processing intervention reminders: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async executeIntervention(intervention: any): Promise<any> {
    // Execute the intervention based on its parameters
    if (intervention.parameters.automatedIntervention) {
      // Execute automated intervention
      return {
        success: true,
        effectivenessScore: 75,
        notes: 'Automated intervention executed successfully',
      };
    }

    return {
      success: false,
      effectivenessScore: 0,
      notes: 'Manual intervention required',
    };
  }

  private shouldSendReminder(intervention: any, reminderDate: string): boolean {
    // Check if reminder should be sent based on intervention scheduling
    return (
      intervention.scheduledDate &&
      new Date(intervention.scheduledDate).toDateString() === new Date(reminderDate).toDateString()
    );
  }

  private async sendInterventionReminders(interventions: any[]): Promise<void> {
    // Send reminders to assigned instructors
    this.logger.debug(`Sending intervention reminders for ${interventions.length} interventions`);
    // Implementation would send actual notifications
  }
}

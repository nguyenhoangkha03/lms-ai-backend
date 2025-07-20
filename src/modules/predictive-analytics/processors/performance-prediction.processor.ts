import { Process, Processor } from '@nestjs/bull';
import { PERFORMANCE_PREDICTION_QUEUE } from '../queues/queue.constants';
import { Logger } from '@nestjs/common';
import { PerformancePredictionService } from '../services/performance-prediction.service';
import { Job } from 'bull';

@Processor(PERFORMANCE_PREDICTION_QUEUE)
export class PerformancePredictionProcessor {
  private readonly logger = new Logger(PerformancePredictionProcessor.name);

  constructor(private readonly performancePredictionService: PerformancePredictionService) {}

  @Process('generate-batch-predictions')
  async processBatchPredictions(job: Job<{ studentIds: string[]; courseId?: string }>) {
    const { studentIds, courseId } = job.data;

    try {
      this.logger.debug(`Processing batch predictions for ${studentIds.length} students`);

      let processed = 0;
      const total = studentIds.length;
      const results: any = [];

      for (const studentId of studentIds) {
        try {
          const prediction = await this.performancePredictionService.generatePrediction(
            studentId,
            courseId,
          );

          results.push({
            studentId,
            predictionId: prediction.id,
            status: 'success',
          });

          processed++;
          await job.progress(Math.round((processed / total) * 100));
        } catch (error) {
          this.logger.warn(
            `Failed to generate prediction for student ${studentId}: ${error.message}`,
          );
          results.push({
            studentId,
            status: 'failed',
            error: error.message,
          });
        }
      }

      this.logger.log(`Batch predictions completed: ${processed}/${total} successful`);

      return {
        processed,
        total,
        results,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error processing batch predictions: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('update-prediction-accuracies')
  async processUpdatePredictionAccuracies(job: Job<{ predictionIds: string[] }>) {
    const { predictionIds } = job.data;

    try {
      this.logger.debug(`Processing accuracy updates for ${predictionIds.length} predictions`);

      let updated = 0;

      for (const predictionId of predictionIds) {
        try {
          // Get actual outcome and update prediction accuracy
          const prediction = await this.performancePredictionService.findOne(predictionId);

          if (prediction.targetDate && prediction.targetDate <= new Date()) {
            // Calculate actual outcome and update
            const actualValue = await this.calculateActualOutcome(prediction);

            if (actualValue !== null) {
              await this.performancePredictionService.update(predictionId, { actualValue });
              updated++;
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to update accuracy for prediction ${predictionId}: ${error.message}`,
          );
        }
      }

      this.logger.log(`Prediction accuracy updates completed: ${updated} predictions updated`);

      return {
        updated,
        total: predictionIds.length,
        completedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error processing prediction accuracy updates: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async calculateActualOutcome(_prediction: any): Promise<number | null> {
    // Calculate actual outcome based on prediction type
    // This would integrate with actual student performance data
    return Math.random() * 100; // Placeholder
  }
}

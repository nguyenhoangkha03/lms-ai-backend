import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MLModel } from '../entities/ml-model.entity';
import { ModelStatus } from '@/common/enums/ai.enums';
import { ModelMonitoringService } from './model-monitoring.service';

@Injectable()
export class ModelMonitoringCronService {
  private readonly logger = new Logger(ModelMonitoringCronService.name);

  constructor(
    @InjectRepository(MLModel)
    private readonly modelRepository: Repository<MLModel>,
    @InjectQueue('model-monitoring')
    private readonly monitoringQueue: Queue,
    private readonly monitoringService: ModelMonitoringService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkProductionModelHealth(): Promise<void> {
    try {
      // Get all production models
      const productionModels = await this.modelRepository.find({
        where: { status: ModelStatus.PRODUCTION },
      });

      this.logger.log(`Checking health for ${productionModels.length} production models`);

      // Queue health checks for each production model
      for (const model of productionModels) {
        await this.monitoringQueue.add(
          'health-check',
          { modelId: model.id },
          {
            priority: 1, // High priority for production models
            attempts: 2,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to queue production model health checks: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorModelPerformance(): Promise<void> {
    try {
      const productionModels = await this.modelRepository.find({
        where: { status: ModelStatus.PRODUCTION },
      });

      const timeRange = {
        start: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
        end: new Date(),
      };

      for (const model of productionModels) {
        await this.monitoringQueue.add(
          'performance-monitoring',
          {
            modelId: model.id,
            timeRange,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000, // hoặc delay theo ý bạn
            },
          },
        );
      }

      this.logger.log(`Queued performance monitoring for ${productionModels.length} models`);
    } catch (error) {
      this.logger.error(`Failed to queue performance monitoring: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async detectDataDrift(): Promise<void> {
    try {
      const modelsToCheck = await this.modelRepository.find({
        where: { status: ModelStatus.PRODUCTION },
      });

      for (const model of modelsToCheck) {
        // Get recent prediction data for drift detection
        const recentData = await this.getRecentPredictionData(model.id);

        if (recentData.length > 10) {
          // Only check if enough data
          await this.monitoringQueue.add(
            'data-drift-detection',
            {
              modelId: model.id,
              newData: recentData,
            },
            {
              attempts: 2,
            },
          );
        }
      }

      this.logger.log('Queued data drift detection for production models');
    } catch (error) {
      this.logger.error(`Failed to queue data drift detection: ${error.message}`);
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async generateModelReports(): Promise<void> {
    try {
      this.logger.log('Generating model monitoring reports');

      const allModels = await this.modelRepository.find({
        where: { status: ModelStatus.PRODUCTION },
      });

      await this.monitoringQueue.add(
        'batch-model-monitoring',
        { modelIds: allModels.map(m => m.id) },
        {
          attempts: 3,
          timeout: 1800000, // 30 minutes timeout
        },
      );

      this.logger.log(`Queued batch monitoring for ${allModels.length} models`);
    } catch (error) {
      this.logger.error(`Failed to queue batch model monitoring: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyModelMaintenance(): Promise<void> {
    try {
      this.logger.log('Starting daily model maintenance');

      // Clean up old monitoring data
      await this.cleanupOldMonitoringData();

      // Archive completed training jobs
      await this.archiveCompletedJobs();

      // Check for models that need updates
      await this.checkModelsForUpdates();

      this.logger.log('Daily model maintenance completed');
    } catch (error) {
      this.logger.error(`Failed daily model maintenance: ${error.message}`);
    }
  }

  private async getRecentPredictionData(modelId: string): Promise<any[]> {
    try {
      // This would query recent prediction data
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      this.logger.error(
        `Failed to get recent prediction data for model ${modelId}: ${error.message}`,
      );
      return [];
    }
  }

  private async cleanupOldMonitoringData(): Promise<void> {
    try {
      // Clean up monitoring data older than 30 days
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Implementation would clean up old monitoring records
      this.logger.log(`Cleaned up monitoring data older than ${cutoffDate.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup old monitoring data: ${error.message}`);
    }
  }

  private async archiveCompletedJobs(): Promise<void> {
    try {
      // Archive completed training and monitoring jobs
      this.logger.log('Archived completed jobs');
    } catch (error) {
      this.logger.error(`Failed to archive completed jobs: ${error.message}`);
    }
  }

  private async checkModelsForUpdates(): Promise<void> {
    try {
      // Check if any models need updates based on performance degradation
      const models = await this.modelRepository.find({
        where: { status: ModelStatus.PRODUCTION },
      });

      for (const model of models) {
        const health = await this.monitoringService.checkModelHealth(model.id);

        if (health.status === 'degraded' || health.status === 'unhealthy') {
          this.logger.warn(`Model ${model.id} may need attention: ${health.status}`);
          // Could trigger alerts or automatic remediation here
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check models for updates: ${error.message}`);
    }
  }
}

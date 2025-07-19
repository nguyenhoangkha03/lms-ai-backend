import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ModelMonitoringService } from '../services/model-monitoring.service';

@Processor('model-monitoring')
export class ModelMonitoringProcessor {
  private readonly logger = new Logger(ModelMonitoringProcessor.name);

  constructor(private readonly monitoringService: ModelMonitoringService) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing monitoring job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, _result: any) {
    this.logger.log(`Completed monitoring job ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Failed monitoring job ${job.id}: ${err.message}`);
  }

  @Process('health-check')
  async performHealthCheck(job: Job<{ modelId: string }>) {
    const { modelId } = job.data;

    try {
      const healthStatus = await this.monitoringService.checkModelHealth(modelId);

      return {
        success: true,
        modelId,
        healthStatus,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Health check failed for model ${modelId}: ${error.message}`);
      throw error;
    }
  }

  @Process('performance-monitoring')
  async monitorPerformance(job: Job<{ modelId: string; timeRange: any }>) {
    const { modelId, timeRange } = job.data;

    try {
      const metrics = await this.monitoringService.collectPerformanceMetrics(modelId, timeRange);

      // Check for performance degradation
      const alerts = await this.monitoringService.checkPerformanceAlerts(modelId, metrics);

      return {
        success: true,
        modelId,
        metrics,
        alerts,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Performance monitoring failed for model ${modelId}: ${error.message}`);
      throw error;
    }
  }

  @Process('data-drift-detection')
  async detectDataDrift(job: Job<{ modelId: string; newData: any }>) {
    const { modelId, newData } = job.data;

    try {
      const driftAnalysis = await this.monitoringService.detectDataDrift(modelId, newData);

      return {
        success: true,
        modelId,
        driftDetected: driftAnalysis.hasDrift,
        driftScore: driftAnalysis.driftScore,
        recommendations: driftAnalysis.recommendations,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Data drift detection failed for model ${modelId}: ${error.message}`);
      throw error;
    }
  }

  @Process('batch-model-monitoring')
  async batchModelMonitoring(job: Job<{ modelIds: string[] }>) {
    const { modelIds } = job.data;

    try {
      const results: {
        modelId: string;
        health?: any;
        error?: string;
        status: 'success' | 'failed';
      }[] = [];

      for (const modelId of modelIds) {
        try {
          const health = await this.monitoringService.checkModelHealth(modelId);
          results.push({ modelId, health, status: 'success' });
        } catch (error) {
          results.push({ modelId, error: error.message, status: 'failed' });
        }
      }

      return {
        success: true,
        totalModels: modelIds.length,
        results,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Batch model monitoring failed: ${error.message}`);
      throw error;
    }
  }
}

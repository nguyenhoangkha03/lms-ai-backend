// import { Processor, Process } from '@nestjs/bull';
// import { Logger } from '@nestjs/common';
// import { Job } from 'bull';
// import { ModelMonitoringService } from '../services/model-monitoring.service';

// export interface ModelHealthCheckJob {
//   modelIds: string[];
// }

// export interface ModelMetricsCollectionJob {
//   modelId: string;
//   timeRange: { start: Date; end: Date };
// }

// @Processor('model-monitoring')
// export class ModelMonitoringProcessor {
//   private readonly logger = new Logger(ModelMonitoringProcessor.name);

//   constructor(private readonly monitoringService: ModelMonitoringService) {}

//   @Process('health-check')
//   async handleHealthCheck(job: Job<ModelHealthCheckJob>) {
//     this.logger.log(`Processing health check for ${job.data.modelIds.length} models`);

//     let processed = 0;
//     for (const modelId of job.data.modelIds) {
//       try {
//         await this.monitoringService.performHealthCheck(modelId);
//         processed++;
//         await job.progress(Math.round((processed / job.data.modelIds.length) * 100));
//       } catch (error) {
//         this.logger.warn(`Health check failed for model ${modelId}:`, error);
//       }
//     }

//     this.logger.log(`Health check completed for ${processed}/${job.data.modelIds.length} models`);
//   }

//   @Process('collect-metrics')
//   async handleMetricsCollection(job: Job<ModelMetricsCollectionJob>) {
//     this.logger.log(`Collecting metrics for model: ${job.data.modelId}`);

//     try {
//       await this.monitoringService.collectModelMetrics(job.data.modelId, job.data.timeRange);

//       this.logger.log(`Metrics collection completed for model: ${job.data.modelId}`);
//     } catch (error) {
//       this.logger.error(`Metrics collection failed for model ${job.data.modelId}:`, error);
//       throw error;
//     }
//   }
// }

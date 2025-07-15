// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { InjectQueue } from '@nestjs/bull';
// import { Queue } from 'bull';
// import { MLModelService } from './ml-model.service';
// import { ModelMonitoringService } from './model-monitoring.service';

// @Injectable()
// export class ModelMonitoringCronService {
//   private readonly logger = new Logger(ModelMonitoringCronService.name);

//   constructor(
//     @InjectQueue('model-monitoring') private readonly monitoringQueue: Queue,
//     private readonly modelService: MLModelService,
//     private readonly monitoringService: ModelMonitoringService,
//   ) {}

//   @Cron(CronExpression.EVERY_5_MINUTES)
//   async performHealthChecks() {
//     this.logger.log('Starting scheduled health checks for active models');

//     try {
//       const activeModels = await this.modelService.getActiveModels();
//       const modelIds = activeModels.map(model => model.id);

//       if (modelIds.length > 0) {
//         await this.monitoringQueue.add(
//           'health-check',
//           { modelIds },
//           {
//             priority: 10,
//             attempts: 2,
//           },
//         );

//         this.logger.log(`Queued health checks for ${modelIds.length} models`);
//       }
//     } catch (error) {
//       this.logger.error('Failed to queue health checks:', error);
//     }
//   }

//   @Cron(CronExpression.EVERY_HOUR)
//   async collectModelMetrics() {
//     this.logger.log('Starting scheduled metrics collection');

//     try {
//       const activeModels = await this.modelService.getActiveModels();
//       const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
//       const now = new Date();

//       for (const model of activeModels) {
//         await this.monitoringQueue.add(
//           'collect-metrics',
//           {
//             modelId: model.id,
//             timeRange: { start: oneHourAgo, end: now },
//           },
//           {
//             priority: 5,
//             attempts: 3,
//           },
//         );
//       }

//       this.logger.log(`Queued metrics collection for ${activeModels.length} models`);
//     } catch (error) {
//       this.logger.error('Failed to queue metrics collection:', error);
//     }
//   }

//   @Cron(CronExpression.EVERY_DAY_AT_2AM)
//   async performDailyModelAnalysis() {
//     this.logger.log('Starting daily model performance analysis');

//     try {
//       const activeModels = await this.modelService.getActiveModels();

//       for (const model of activeModels) {
//         // Analyze model drift
//         await this.monitoringService.analyzeModelDrift(model.id);

//         // Check for performance degradation
//         await this.monitoringService.checkPerformanceDegradation(model.id);

//         // Update model health status
//         await this.monitoringService.updateModelHealthStatus(model.id);
//       }

//       this.logger.log(`Daily analysis completed for ${activeModels.length} models`);
//     } catch (error) {
//       this.logger.error('Failed to perform daily model analysis:', error);
//     }
//   }

//   @Cron(CronExpression.EVERY_WEEK)
//   async generateWeeklyReports() {
//     this.logger.log('Generating weekly model performance reports');

//     try {
//       const activeModels = await this.modelService.getActiveModels();

//       for (const model of activeModels) {
//         await this.monitoringService.generateWeeklyReport(model.id);
//       }

//       this.logger.log(`Weekly reports generated for ${activeModels.length} models`);
//     } catch (error) {
//       this.logger.error('Failed to generate weekly reports:', error);
//     }
//   }
// }

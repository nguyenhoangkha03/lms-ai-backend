// import { Processor, Process } from '@nestjs/bull';
// import { Logger } from '@nestjs/common';
// import { Job } from 'bull';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { MLModel } from '../entities/ml-model.entity';
// import { ModelVersion } from '../entities/model-version.entity';
// import { PythonAIServiceService } from '../services/python-ai-service.service';
// import { ModelStatus, ModelVersionStatus } from '@/common/enums/ai.enums';

// export interface ModelTrainingJob {
//   modelId: string;
//   versionId: string;
//   trainingConfig: any;
// }

// export interface ModelDeploymentJob {
//   modelId: string;
//   version: string;
//   environment: string;
//   deploymentConfig: any;
// }

// @Processor('model-training')
// export class ModelTrainingProcessor {
//   private readonly logger = new Logger(ModelTrainingProcessor.name);

//   constructor(
//     @InjectRepository(MLModel)
//     private readonly modelRepository: Repository<MLModel>,
//     @InjectRepository(ModelVersion)
//     private readonly versionRepository: Repository<ModelVersion>,
//     private readonly pythonAIService: PythonAIServiceService,
//   ) {}

//   @Process('train-model')
//   async handleModelTraining(job: Job<ModelTrainingJob>) {
//     this.logger.log(`Processing model training job for model: ${job.data.modelId}`);

//     try {
//       // Update model status to training
//       await this.modelRepository.update(job.data.modelId, {
//         status: ModelStatus.TRAINING,
//         lastTrainedAt: new Date(),
//       });

//       // Update version status
//       await this.versionRepository.update(job.data.versionId, {
//         status: ModelVersionStatus.TRAINING,
//         trainingStartedAt: new Date(),
//       });

//       // Call Python training service
//       const trainingResult = await this.pythonAIService.trainModel({
//         modelId: job.data.modelId,
//         ...job.data.trainingConfig,
//       });

//       // Update progress
//       await job.progress(50);

//       // Wait for training completion (simplified - in real implementation,
//       // this would poll the Python service for status)
//       await this.waitForTrainingCompletion(trainingResult.trainingJobId);

//       // Update model and version with results
//       await this.modelRepository.update(job.data.modelId, {
//         status: ModelStatus.TRAINED,
//       });

//       await this.versionRepository.update(job.data.versionId, {
//         status: ModelVersionStatus.COMPLETED,
//         trainingCompletedAt: new Date(),
//         // trainingMetrics would be updated with actual results
//       });

//       await job.progress(100);

//       this.logger.log(`Model training completed successfully for: ${job.data.modelId}`);
//     } catch (error) {
//       this.logger.error(`Model training failed for ${job.data.modelId}:`, error);

//       // Update status to failed
//       await this.modelRepository.update(job.data.modelId, {
//         status: ModelStatus.FAILED,
//       });

//       await this.versionRepository.update(job.data.versionId, {
//         status: ModelVersionStatus.FAILED,
//       });

//       throw error;
//     }
//   }

//   @Process('deploy-model')
//   async handleModelDeployment(job: Job<ModelDeploymentJob>) {
//     this.logger.log(`Processing model deployment job for model: ${job.data.modelId}`);

//     try {
//       const deploymentResult = await this.pythonAIService.deployModel(job.data);

//       await job.progress(50);

//       // Wait for deployment completion
//       await this.waitForDeploymentCompletion(deploymentResult.deploymentId);

//       // Update model status
//       await this.modelRepository.update(job.data.modelId, {
//         status: ModelStatus.PRODUCTION,
//         isDeployed: true,
//         deployedAt: new Date(),
//       });

//       await job.progress(100);

//       this.logger.log(`Model deployment completed successfully for: ${job.data.modelId}`);
//     } catch (error) {
//       this.logger.error(`Model deployment failed for ${job.data.modelId}:`, error);
//       throw error;
//     }
//   }

//   private async waitForTrainingCompletion(jobId: string): Promise<void> {
//     // Simplified implementation - in reality, this would poll the Python service
//     return new Promise(resolve => setTimeout(resolve, 5000));
//   }

//   private async waitForDeploymentCompletion(deploymentId: string): Promise<void> {
//     // Simplified implementation
//     return new Promise(resolve => setTimeout(resolve, 3000));
//   }
// }

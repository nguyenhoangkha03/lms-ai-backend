import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MlModelService } from '../services/ml-model.service';

@Processor('model-training')
export class ModelTrainingProcessor {
  private readonly logger = new Logger(ModelTrainingProcessor.name);

  constructor(private readonly mlModelService: MlModelService) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing model training job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, _result: any) {
    this.logger.log(`Completed model training job ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Failed model training job ${job.id}: ${err.message}`);
  }

  @Process('train-model')
  async trainModel(
    job: Job<{
      modelId: string;
      versionId: string;
      trainingData: any;
    }>,
  ) {
    const { modelId, versionId, trainingData } = job.data;

    try {
      this.logger.log(`Starting model training: ${modelId}/${versionId}`);

      const result = await this.mlModelService.trainModel(modelId, versionId, trainingData);

      return {
        success: true,
        modelId,
        versionId,
        trainingJobId: result.jobId,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Model training failed: ${error.message}`);
      throw error;
    }
  }

  @Process('validate-model')
  async validateModel(
    job: Job<{
      modelId: string;
      versionId: string;
      validationData: any;
    }>,
  ) {
    const { modelId, versionId, validationData } = job.data;

    try {
      this.logger.log(`Starting model validation: ${modelId}/${versionId}`);

      const result = await this.mlModelService.validateModel(modelId, versionId, validationData);

      return {
        success: true,
        modelId,
        versionId,
        validationResults: result,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Model validation failed: ${error.message}`);
      throw error;
    }
  }

  @Process('optimize-model')
  async optimizeModel(
    job: Job<{
      modelId: string;
      versionId: string;
      optimizationConfig: any;
    }>,
  ): Promise<{
    success: boolean;
    modelId: string;
    versionId: string;
    optimizedVersionId: string;
    improvements: any[];
    timestamp: Date;
  }> {
    const { modelId, versionId, optimizationConfig } = job.data;

    try {
      this.logger.log(`Starting model optimization: ${modelId}/${versionId}`);

      const result = (await this.mlModelService.optimizeModel(
        modelId,
        versionId,
        optimizationConfig,
      )) as any;

      return {
        success: true,
        modelId,
        versionId,
        optimizedVersionId: result.optimizedVersionId,
        improvements: result.improvements,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Model optimization failed: ${error.message}`);
      throw error;
    }
  }
}

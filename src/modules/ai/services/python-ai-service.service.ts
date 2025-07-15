// // src/modules/ai/services/python-ai-service.service.ts
// import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { HttpService } from '@nestjs/axios';
// import { ConfigService } from '@nestjs/config';
// import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
// import { MLModel } from '../entities/ml-model.entity';
// import { ModelVersion } from '../entities/model-version.entity';
// import { ModelPrediction } from '../entities/model-prediction.entity';
// import { ABTest } from '../entities/ab-test.entity';
// import { CacheService } from '@/common/services/cache.service';
// import {
//   CreatePredictionDto,
//   BatchPredictionDto,
//   ModelTrainingDto,
//   ModelDeploymentDto,
//   ModelHealthCheckDto,
//   PredictionResponseDto,
//   ModelExplanationRequestDto,
//   ModelExplanationResponseDto,
// } from '../dto/ml-model.dto';
// import { PredictionStatus, ModelStatus, ABTestStatus } from '@/common/enums/ai.enums';

// export interface PythonServiceConfig {
//   baseUrl: string;
//   timeout: number;
//   retryAttempts: number;
//   authToken?: string;
//   apiVersion: string;
// }

// export interface ModelServiceEndpoint {
//   predict: string;
//   batchPredict: string;
//   train: string;
//   evaluate: string;
//   deploy: string;
//   healthCheck: string;
//   explain: string;
//   status: string;
// }

// @Injectable()
// export class PythonAIServiceService {
//   private readonly logger = new Logger(PythonAIServiceService.name);
//   private readonly serviceConfig: PythonServiceConfig;
//   private readonly endpoints: ModelServiceEndpoint;

//   constructor(
//     @InjectRepository(MLModel)
//     private readonly modelRepository: Repository<MLModel>,
//     @InjectRepository(ModelVersion)
//     private readonly versionRepository: Repository<ModelVersion>,
//     @InjectRepository(ModelPrediction)
//     private readonly predictionRepository: Repository<ModelPrediction>,
//     @InjectRepository(ABTest)
//     private readonly abTestRepository: Repository<ABTest>,
//     private readonly httpService: HttpService,
//     private readonly configService: ConfigService,
//     private readonly cacheService: CacheService,
//   ) {
//     this.serviceConfig = {
//       baseUrl: this.configService.get<string>('PYTHON_AI_SERVICE_URL', 'http://localhost:8000'),
//       timeout: this.configService.get<number>('PYTHON_AI_SERVICE_TIMEOUT', 30000),
//       retryAttempts: this.configService.get<number>('PYTHON_AI_SERVICE_RETRY', 3),
//       authToken: this.configService.get<string>('PYTHON_AI_SERVICE_TOKEN'),
//       apiVersion: this.configService.get<string>('PYTHON_AI_SERVICE_API_VERSION', 'v1'),
//     };

//     this.endpoints = {
//       predict: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/predict`,
//       batchPredict: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/batch-predict`,
//       train: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/train`,
//       evaluate: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/evaluate`,
//       deploy: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/deploy`,
//       healthCheck: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/health`,
//       explain: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/explain`,
//       status: `/api/${this.serviceConfig.apiVersion}/models/{modelId}/status`,
//     };
//   }

//   // ================== REAL-TIME PREDICTION ENDPOINTS ==================
//   async predict(request: CreatePredictionDto): Promise<PredictionResponseDto> {
//     this.logger.log(`Making prediction with model: ${request.modelId}`);

//     // Check if prediction is cached
//     if (request.enableCache) {
//       const cacheKey = this.generateCacheKey(request);
//       const cachedResult = await this.cacheService.get<PredictionResponseDto>(cacheKey);
//       if (cachedResult) {
//         this.logger.debug(`Returning cached prediction for key: ${cacheKey}`);
//         return cachedResult;
//       }
//     }

//     // Get model configuration
//     const model = await this.getModelWithVersion(request.modelId, request.version);
//     if (!model) {
//       throw new HttpException('Model not found', HttpStatus.NOT_FOUND);
//     }

//     // Check if model is deployed and healthy
//     await this.ensureModelHealthy(model);

//     // Create prediction record
//     const prediction = await this.createPredictionRecord(request, model);

//     try {
//       // Check for A/B testing
//       const selectedModel = await this.selectModelForABTest(model, request.userId);

//       // Make prediction request to Python service
//       const result = await this.callPythonService('predict', selectedModel, {
//         input_data: request.inputData,
//         prediction_type: request.predictionType,
//         user_id: request.userId,
//         request_id: prediction.id,
//         timeout: request.timeout || this.serviceConfig.timeout,
//         metadata: request.metadata,
//       });

//       // Update prediction record with results
//       await this.updatePredictionRecord(prediction.id, result, PredictionStatus.COMPLETED);

//       const response: PredictionResponseDto = {
//         id: prediction.id,
//         modelId: selectedModel.id,
//         version: selectedModel.currentVersion || 'latest',
//         predictionType: request.predictionType,
//         prediction: result.prediction,
//         confidence: result.confidence || 0,
//         processingTime: result.processing_time || 0,
//         requestedAt: prediction.createdAt,
//         completedAt: new Date(),
//         metadata: result.metadata,
//       };

//       // Cache result if enabled
//       if (request.enableCache) {
//         const cacheKey = this.generateCacheKey(request);
//         const cacheTTL = this.getCacheTTL(request.predictionType);
//         await this.cacheService.set(cacheKey, response, cacheTTL);
//       }

//       return response;
//     } catch (error) {
//       await this.updatePredictionRecord(
//         prediction.id,
//         { error: error.message },
//         PredictionStatus.FAILED,
//       );
//       throw error;
//     }
//   }

//   async batchPredict(request: BatchPredictionDto): Promise<PredictionResponseDto[]> {
//     this.logger.log(
//       `Making batch prediction with model: ${request.modelId}, batch size: ${request.inputDataList.length}`,
//     );

//     const model = await this.getModelWithVersion(request.modelId, request.version);
//     if (!model) {
//       throw new HttpException('Model not found', HttpStatus.NOT_FOUND);
//     }

//     await this.ensureModelHealthy(model);

//     // Create prediction records for batch
//     const predictions = await Promise.all(
//       request.inputDataList.map(async (inputData, index) => {
//         return this.createPredictionRecord(
//           {
//             modelId: request.modelId,
//             version: request.version,
//             predictionType: request.predictionType,
//             inputData,
//             metadata: { batchIndex: index, batchId: `batch_${Date.now()}` },
//           },
//           model,
//         );
//       }),
//     );

//     try {
//       // Make batch prediction request
//       const result = await this.callPythonService('batchPredict', model, {
//         input_data_list: request.inputDataList,
//         prediction_type: request.predictionType,
//         batch_options: request.batchOptions,
//         request_ids: predictions.map(p => p.id),
//       });

//       // Update prediction records with results
//       const responses = await Promise.all(
//         result.predictions.map(async (predResult: any, index: number) => {
//           const prediction = predictions[index];
//           await this.updatePredictionRecord(prediction.id, predResult, PredictionStatus.COMPLETED);

//           return {
//             id: prediction.id,
//             modelId: model.id,
//             version: model.currentVersion || 'latest',
//             predictionType: request.predictionType,
//             prediction: predResult.prediction,
//             confidence: predResult.confidence || 0,
//             processingTime: predResult.processing_time || 0,
//             requestedAt: prediction.createdAt,
//             completedAt: new Date(),
//             metadata: predResult.metadata,
//           };
//         }),
//       );

//       return responses;
//     } catch (error) {
//       // Mark all predictions as failed
//       await Promise.all(
//         predictions.map(p =>
//           this.updatePredictionRecord(p.id, { error: error.message }, PredictionStatus.FAILED),
//         ),
//       );
//       throw error;
//     }
//   }

//   // ================== MODEL TRAINING & DEPLOYMENT ==================
//   async trainModel(request: ModelTrainingDto): Promise<{ trainingJobId: string; status: string }> {
//     this.logger.log(`Starting training for model: ${request.modelId}`);

//     const model = await this.modelRepository.findOne({
//       where: { id: request.modelId },
//     });

//     if (!model) {
//       throw new HttpException('Model not found', HttpStatus.NOT_FOUND);
//     }

//     // Update model status to training
//     await this.modelRepository.update(request.modelId, {
//       status: ModelStatus.TRAINING,
//       lastTrainedAt: new Date(),
//     });

//     try {
//       const result = await this.callPythonService('train', model, {
//         dataset_config: request.datasetConfig,
//         training_config: request.trainingConfig,
//         hyperparameters: request.hyperparameters,
//         cross_validation: request.crossValidation,
//         compute_config: request.computeConfig,
//       });

//       return {
//         trainingJobId: result.job_id,
//         status: result.status,
//       };
//     } catch (error) {
//       // Update model status to failed
//       await this.modelRepository.update(request.modelId, {
//         status: ModelStatus.FAILED,
//       });
//       throw error;
//     }
//   }

//   async deployModel(
//     request: ModelDeploymentDto,
//   ): Promise<{ deploymentId: string; status: string }> {
//     this.logger.log(`Deploying model: ${request.modelId} version: ${request.version}`);

//     const model = await this.getModelWithVersion(request.modelId, request.version);
//     if (!model) {
//       throw new HttpException('Model or version not found', HttpStatus.NOT_FOUND);
//     }

//     try {
//       const result = await this.callPythonService('deploy', model, {
//         version: request.version,
//         environment: request.environment,
//         deployment_config: request.deploymentConfig,
//       });

//       // Update model deployment status
//       await this.modelRepository.update(request.modelId, {
//         isDeployed: true,
//         deployedAt: new Date(),
//         status: ModelStatus.PRODUCTION,
//       });

//       return {
//         deploymentId: result.deployment_id,
//         status: result.status,
//       };
//     } catch (error) {
//       // Update model status to failed
//       await this.modelRepository.update(request.modelId, {
//         status: ModelStatus.FAILED,
//       });
//       throw error;
//     }
//   }
// }

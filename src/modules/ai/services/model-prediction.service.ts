import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { ModelPrediction } from '../entities/model-prediction.entity';
import { MLModel } from '../entities/ml-model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { PredictionStatus, ModelVersionStatus } from '@/common/enums/ai.enums';
import { CacheService } from '@/cache/cache.service';
import { CreatePredictionDto, BatchPredictionDto } from '../dto/model-prediction.dto';

export interface PredictionAnalytics {
  totalPredictions: number;
  successRate: number;
  averageResponseTime: number;
  averageConfidence: number;
  predictions: ModelPrediction[];
}

export interface ModelPerformanceMetrics {
  modelId: string;
  totalPredictions: number;
  successRate: number;
  averageConfidence: number;
  averageResponseTime: number;
  errorRate: number;
}

@Injectable()
export class ModelPredictionService {
  private readonly logger = new Logger(ModelPredictionService.name);

  constructor(
    @InjectRepository(ModelPrediction)
    private readonly predictionRepository: Repository<ModelPrediction>,
    @InjectRepository(MLModel)
    private readonly modelRepository: Repository<MLModel>,
    @InjectRepository(ModelVersion)
    private readonly modelVersionRepository: Repository<ModelVersion>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Tạo prediction mới
   */
  async createPrediction(createPredictionDto: CreatePredictionDto): Promise<ModelPrediction> {
    const {
      modelId,
      version,
      predictionType,
      inputData,
      userId,
      timeout: requestTimeout,
      enableCache,
      metadata,
    } = createPredictionDto;

    try {
      // Lấy model và version
      const model = await this.modelRepository.findOne({
        where: { id: modelId, isActive: true },
        relations: ['versions'],
      });

      if (!model) {
        throw new NotFoundException(`Model with ID ${modelId} not found or inactive`);
      }

      // Lấy model version
      let modelVersion: ModelVersion | null;
      if (version) {
        modelVersion = await this.modelVersionRepository.findOne({
          where: { modelId, version, status: ModelVersionStatus.DEPLOYED },
        });
      } else {
        modelVersion = await this.modelVersionRepository.findOne({
          where: { modelId, isActive: true, status: ModelVersionStatus.DEPLOYED },
          order: { createdAt: 'DESC' },
        });
      }

      if (!modelVersion) {
        throw new NotFoundException(`No deployed version found for model ${modelId}`);
      }

      // Tạo prediction entity
      const prediction = this.predictionRepository.create({
        modelId,
        modelVersionId: modelVersion.id,
        userId,
        predictionType,
        inputData,
        status: PredictionStatus.PENDING,
        requestedAt: new Date(),
        metadata,
      });

      const savedPrediction = await this.predictionRepository.save(prediction);

      // Thực hiện prediction async
      this.processPredictionAsync(
        savedPrediction,
        model,
        modelVersion,
        requestTimeout,
        enableCache,
      );

      return savedPrediction;
    } catch (error) {
      this.logger.error(`Error creating prediction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async makePrediction(
    _modelId: string,
    _inputData: any,
    _predictionType: string,
    _userId: string,
    _metadata?: any,
  ) {}

  /**
   * Xử lý prediction bất đồng bộ
   */
  private async processPredictionAsync(
    prediction: ModelPrediction,
    model: MLModel,
    modelVersion: ModelVersion,
    requestTimeout?: number,
    enableCache?: boolean,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Cập nhật status thành processing
      await this.predictionRepository.update(prediction.id, {
        status: PredictionStatus.PROCESSING,
      });

      // Kiểm tra cache nếu enabled
      let result: any = null;
      if (enableCache) {
        const cacheKey = this.generateCacheKey(prediction.inputData, modelVersion.id);
        result = await this.cacheService.get(cacheKey);
      }

      if (!result) {
        // Gọi Python AI service
        result = await this.callPythonService(model, prediction.inputData, requestTimeout);

        // Cache result nếu enabled
        if (enableCache && result) {
          const cacheKey = this.generateCacheKey(prediction.inputData, modelVersion.id);
          await this.cacheService.set(cacheKey, result, 3600); // Cache 1 hour
        }
      }

      const processingTime = Date.now() - startTime;

      // Cập nhật prediction với kết quả
      await this.predictionRepository.update(prediction.id, {
        prediction: result.prediction,
        confidence: result.confidence,
        status: PredictionStatus.COMPLETED,
        processingTime,
        completedAt: new Date(),
      });

      this.logger.log(`Prediction ${prediction.id} completed successfully in ${processingTime}ms`);
    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Cập nhật prediction với lỗi
      await this.predictionRepository.update(prediction.id, {
        status: PredictionStatus.FAILED,
        errorMessage: error.message,
        processingTime,
        completedAt: new Date(),
      });

      this.logger.error(`Prediction ${prediction.id} failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Gọi Python AI service
   */
  private async callPythonService(
    model: MLModel,
    inputData: any,
    requestTimeout?: number,
  ): Promise<any> {
    if (!model.serviceEndpoint) {
      throw new BadRequestException(`Model ${model.id} has no service endpoint configured`);
    }

    const timeoutMs = requestTimeout || this.configService.get<number>('AI_SERVICE_TIMEOUT', 30000);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(model.serviceEndpoint, {
            model_id: model.id,
            input_data: inputData,
          })
          .pipe(
            timeout(timeoutMs),
            retry(2),
            catchError(error => {
              this.logger.error(`Python service call failed: ${error.message}`);
              throw new InternalServerErrorException(`AI service unavailable: ${error.message}`);
            }),
          ),
      );

      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to call Python AI service: ${error.message}`);
    }
  }

  /**
   * Batch prediction
   */
  async createBatchPrediction(batchPredictionDto: BatchPredictionDto): Promise<ModelPrediction[]> {
    const { modelId, version, predictionType, inputDataList, batchOptions } = batchPredictionDto;

    const predictions: ModelPrediction[] = [];

    for (const inputData of inputDataList) {
      const prediction = await this.createPrediction({
        modelId,
        version,
        predictionType,
        inputData,
        timeout: batchOptions?.timeout,
        enableCache: true,
      });
      predictions.push(prediction);
    }

    return predictions;
  }

  /**
   * Lấy prediction theo ID
   */
  async findById(id: string): Promise<ModelPrediction | null> {
    return this.predictionRepository.findOne({
      where: { id },
      relations: ['modelVersion', 'modelVersion.model', 'user'],
    });
  }

  async getPredictionById(id: string): Promise<ModelPrediction> {
    const prediction = await this.findById(id);

    if (!prediction) {
      throw new NotFoundException(`Prediction with ID ${id} not found`);
    }

    return prediction;
  }

  async makeBatchPredictions(
    _modelId: string,
    _inputDataList: any[],
    _predictionType: string,
    _userId: string,
    _metadata?: any,
  ): Promise<any> {}

  async getBatchPredictionStatus(_batchId: string): Promise<any> {}

  /**
   * Lấy predictions của user
   */
  async getUserPredictions(
    userId: string,
    options: {
      modelId?: string;
      type?: string;
      predictionType?: string;
      limit?: number;
      offset?: number;
    },
    _pagination: { page: number; limit: number } = { page: 1, limit: 10 },
  ): Promise<{
    predictions: ModelPrediction[];
    total: number;
  }> {
    const queryBuilder = this.predictionRepository
      .createQueryBuilder('prediction')
      .leftJoinAndSelect('prediction.modelVersion', 'version')
      .leftJoinAndSelect('version.model', 'model')
      .where('prediction.userId = :userId', { userId });

    if (options.modelId) {
      queryBuilder.andWhere('prediction.modelId = :modelId', { modelId: options.modelId });
    }

    if (options.type) {
      queryBuilder.andWhere('prediction.predictionType = :type', { type: options.type });
    }

    const total = await queryBuilder.getCount();

    const predictions = await queryBuilder
      .orderBy('prediction.createdAt', 'DESC')
      .skip(options.offset)
      .take(options.limit)
      .getMany();

    return { predictions, total };
  }

  /**
   * Lấy analytics hiệu suất
   */
  async getPerformanceAnalytics(
    modelId?: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<PredictionAnalytics> {
    const queryBuilder = this.predictionRepository
      .createQueryBuilder('prediction')
      .leftJoinAndSelect('prediction.modelVersion', 'version')
      .leftJoinAndSelect('version.model', 'model');

    if (modelId) {
      queryBuilder.where('prediction.modelId = :modelId', { modelId });
    }

    if (timeRange) {
      queryBuilder.andWhere('prediction.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      });
    }

    const predictions = await queryBuilder.getMany();

    const totalPredictions = predictions.length;
    const successfulPredictions = predictions.filter(
      p => p.status === PredictionStatus.COMPLETED,
    ).length;
    const successRate = totalPredictions > 0 ? (successfulPredictions / totalPredictions) * 100 : 0;

    const responseTimes = predictions.filter(p => p.processingTime).map(p => p.processingTime!);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const confidenceScores = predictions.filter(p => p.confidence).map(p => p.confidence!);
    const averageConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
        : 0;

    return {
      totalPredictions,
      successRate,
      averageResponseTime,
      averageConfidence,
      predictions,
    };
  }

  /**
   * Lấy metrics hiệu suất model
   */
  async getModelPerformanceMetrics(modelId: string): Promise<ModelPerformanceMetrics> {
    const predictions = await this.predictionRepository.find({
      where: { modelId },
      order: { createdAt: 'DESC' },
      take: 1000, // Lấy 1000 predictions gần nhất
    });

    const totalPredictions = predictions.length;
    const successfulPredictions = predictions.filter(
      p => p.status === PredictionStatus.COMPLETED,
    ).length;
    const failedPredictions = predictions.filter(p => p.status === PredictionStatus.FAILED).length;

    const successRate = totalPredictions > 0 ? (successfulPredictions / totalPredictions) * 100 : 0;
    const errorRate = totalPredictions > 0 ? (failedPredictions / totalPredictions) * 100 : 0;

    const responseTimes = predictions.filter(p => p.processingTime).map(p => p.processingTime!);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const confidenceScores = predictions.filter(p => p.confidence).map(p => p.confidence!);
    const averageConfidence =
      confidenceScores.length > 0
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
        : 0;

    return {
      modelId,
      totalPredictions,
      successRate,
      averageConfidence,
      averageResponseTime,
      errorRate,
    };
  }

  /**
   * Cập nhật actual outcome cho evaluation
   */
  async updateActualOutcome(
    predictionId: string,
    actualOutcome: Record<string, any>,
  ): Promise<ModelPrediction | null> {
    const prediction = await this.findById(predictionId);
    if (!prediction) {
      throw new NotFoundException(`Prediction ${predictionId} not found`);
    }

    // Tính toán wasCorrect dựa trên prediction và actual outcome
    const wasCorrect = this.evaluatePrediction(prediction.prediction, actualOutcome);

    await this.predictionRepository.update(predictionId, {
      actualOutcome,
      wasCorrect,
    });

    return this.findById(predictionId);
  }

  /**
   * Đánh giá prediction có đúng không
   */
  private evaluatePrediction(prediction: any, actualOutcome: any): boolean {
    // Logic đánh giá tùy thuộc vào loại prediction
    // Ví dụ đơn giản: so sánh kết quả dự đoán với kết quả thực tế
    if (prediction && actualOutcome) {
      if (typeof prediction.result === 'string' && typeof actualOutcome.result === 'string') {
        return prediction.result === actualOutcome.result;
      }

      if (typeof prediction.score === 'number' && typeof actualOutcome.score === 'number') {
        const threshold = 0.1; // 10% threshold
        const accuracy = Math.abs(prediction.score - actualOutcome.score) / actualOutcome.score;
        return accuracy <= threshold;
      }
    }

    return false;
  }

  /**
   * Xóa predictions cũ
   */
  async cleanupOldPredictions(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.predictionRepository.delete({
      createdAt: LessThan(cutoffDate),
      status: In([PredictionStatus.COMPLETED, PredictionStatus.FAILED]),
    });

    this.logger.log(`Cleaned up ${result.affected} old predictions`);
    return result.affected || 0;
  }

  /**
   * Generate cache key cho prediction
   */
  private generateCacheKey(inputData: any, modelVersionId: string): string {
    const dataHash = Buffer.from(JSON.stringify(inputData)).toString('base64');
    return `prediction:${modelVersionId}:${dataHash}`;
  }

  /**
   * Lấy prediction statistics
   */
  async getPredictionStatistics(timeRange?: { start: Date; end: Date }): Promise<{
    totalPredictions: number;
    successRate: number;
    averageResponseTime: number;
    predictionsByModel: Record<string, number>;
    predictionsByType: Record<string, number>;
    predictionsByStatus: Record<string, number>;
  }> {
    const queryBuilder = this.predictionRepository.createQueryBuilder('prediction');

    if (timeRange) {
      queryBuilder.where('prediction.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      });
    }

    const predictions = await queryBuilder.getMany();

    const totalPredictions = predictions.length;
    const successfulPredictions = predictions.filter(
      p => p.status === PredictionStatus.COMPLETED,
    ).length;
    const successRate = totalPredictions > 0 ? (successfulPredictions / totalPredictions) * 100 : 0;

    const responseTimes = predictions.filter(p => p.processingTime).map(p => p.processingTime!);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Group by model
    const predictionsByModel = predictions.reduce(
      (acc, prediction) => {
        acc[prediction.modelId] = (acc[prediction.modelId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by type
    const predictionsByType = predictions.reduce(
      (acc, prediction) => {
        acc[prediction.predictionType] = (acc[prediction.predictionType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by status
    const predictionsByStatus = predictions.reduce(
      (acc, prediction) => {
        acc[prediction.status] = (acc[prediction.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalPredictions,
      successRate,
      averageResponseTime,
      predictionsByModel,
      predictionsByType,
      predictionsByStatus,
    };
  }
}

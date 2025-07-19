import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, MoreThan, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { MLModel } from '../entities/ml-model.entity';
import { ModelVersion } from '../entities/model-version.entity';
import { ModelPrediction } from '../entities/model-prediction.entity';
import { ABTest } from '../entities/ab-test.entity';
import {
  ModelType,
  ModelStatus,
  ModelFramework,
  ModelVersionStatus,
  DeploymentEnvironment,
  ABTestStatus,
} from '@/common/enums/ai.enums';
import { CacheService } from '@/cache/cache.service';
import {
  CreateMLModelDto,
  UpdateMLModelDto,
  //   CreateModelVersionDto,
  //   ModelTrainingDto,
  ModelDeploymentDto,
  //   ModelHealthCheckDto,
} from '../dto/ml-model.dto';
import { CreateModelVersionDto } from '../dto/model-version.dto';
import { ModelTrainingDto } from '../dto/model-training.dto';
import { ModelHealthCheckDto } from '../dto/model-monitoring.dto';

export interface ModelStatistics {
  totalModels: number;
  activeModels: number;
  productionModels: number;
  modelsByType: Record<string, number>;
  modelsByFramework: Record<string, number>;
  modelsByStatus: Record<string, number>;
}

export interface ModelPerformance {
  modelId: string;
  totalPredictions: number;
  successRate: number;
  averageResponseTime: number;
  averageConfidence: number;
  lastTrainedAt?: Date;
  lastPredictionAt?: Date;
}

@Injectable()
export class MlModelService {
  private readonly logger = new Logger(MlModelService.name);

  constructor(
    @InjectRepository(MLModel)
    private readonly modelRepository: Repository<MLModel>,
    @InjectRepository(ModelVersion)
    private readonly modelVersionRepository: Repository<ModelVersion>,
    @InjectRepository(ModelPrediction)
    private readonly predictionRepository: Repository<ModelPrediction>,
    @InjectRepository(ABTest)
    private readonly abTestRepository: Repository<ABTest>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly _cacheService: CacheService,
  ) {}

  /**
   * Tạo model mới
   */
  async createModel(createModelDto: CreateMLModelDto): Promise<MLModel> {
    // Kiểm tra model name đã tồn tại chưa
    const existingModel = await this.modelRepository.findOne({
      where: { name: createModelDto.name },
    });

    if (existingModel) {
      throw new ConflictException(`Model with name '${createModelDto.name}' already exists`);
    }

    const model = this.modelRepository.create({
      ...createModelDto,
      status: ModelStatus.DEVELOPMENT,
      isActive: true,
      isDeployed: false,
    });

    const savedModel = await this.modelRepository.save(model);

    this.logger.log(`Created new model: ${savedModel.name} (${savedModel.id})`);
    return savedModel;
  }

  /**
   * Cập nhật model
   */
  async updateModel(id: string, updateModelDto: UpdateMLModelDto): Promise<MLModel | null> {
    const model = await this.findById(id);
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    // Kiểm tra name conflict nếu có thay đổi name
    if (updateModelDto.name && updateModelDto.name !== model.name) {
      const existingModel = await this.modelRepository.findOne({
        where: { name: updateModelDto.name, id: Not(id) },
      });

      if (existingModel) {
        throw new ConflictException(`Model with name '${updateModelDto.name}' already exists`);
      }
    }

    await this.modelRepository.update(id, updateModelDto);

    const updatedModel = await this.findById(id);
    this.logger.log(`Updated model: ${updatedModel?.name} (${id})`);

    return updatedModel;
  }

  /**
   * Lấy model theo ID
   */
  async findById(id: string): Promise<MLModel | null> {
    return this.modelRepository.findOne({
      where: { id },
      relations: ['creator', 'versions'],
    });
  }

  async deployModel(_id: string, _versionId: string, _deploymentDto: ModelDeploymentDto) {}

  async getModelPerformanceMetrics(_id: string, _versionId?: string, _timeRange?: any) {}

  async validateModel(_id: string, _versionId: string, _validationData: any) {}

  async monitorModelHealth(_id: string) {}

  async getModelUsageStatistics(_id: string, _timeRange: any) {}

  async optimizeModel(_id: string, _versionId: string, _optimizationConfig: any) {}

  /**
   * Lấy model theo name
   */
  async findByName(name: string): Promise<MLModel | null> {
    return this.modelRepository.findOne({
      where: { name },
      relations: ['creator', 'versions'],
    });
  }

  /**
   * Lấy danh sách models
   */
  async findAll(
    options: {
      type?: ModelType;
      status?: ModelStatus;
      framework?: ModelFramework;
      isActive?: boolean;
      isDeployed?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{
    models: MLModel[];
    total: number;
  }> {
    const queryBuilder = this.modelRepository
      .createQueryBuilder('model')
      .leftJoinAndSelect('model.creator', 'creator')
      .leftJoinAndSelect('model.versions', 'versions');

    if (options.type) {
      queryBuilder.andWhere('model.modelType = :type', { type: options.type });
    }

    if (options.status) {
      queryBuilder.andWhere('model.status = :status', { status: options.status });
    }

    if (options.framework) {
      queryBuilder.andWhere('model.framework = :framework', { framework: options.framework });
    }

    if (options.isActive !== undefined) {
      queryBuilder.andWhere('model.isActive = :isActive', { isActive: options.isActive });
    }

    if (options.isDeployed !== undefined) {
      queryBuilder.andWhere('model.isDeployed = :isDeployed', { isDeployed: options.isDeployed });
    }

    const total = await queryBuilder.getCount();

    if (options.limit) {
      queryBuilder.take(options.limit);
    }

    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    const models = await queryBuilder.orderBy('model.createdAt', 'DESC').getMany();

    return { models, total };
  }

  /**
   * Tạo model version mới
   */
  async createModelVersion(
    _id: string = '1',
    createVersionDto: CreateModelVersionDto,
  ): Promise<ModelVersion> {
    const model = await this.findById(createVersionDto.modelId);
    if (!model) {
      throw new NotFoundException(`Model with ID ${createVersionDto.modelId} not found`);
    }

    // Kiểm tra version đã tồn tại chưa
    const existingVersion = await this.modelVersionRepository.findOne({
      where: {
        modelId: createVersionDto.modelId,
        version: createVersionDto.version,
      },
    });

    if (existingVersion) {
      throw new ConflictException(
        `Version ${createVersionDto.version} already exists for model ${createVersionDto.modelId}`,
      );
    }

    const version = this.modelVersionRepository.create({
      ...createVersionDto,
      status: ModelVersionStatus.TRAINING,
      isActive: false,
    });

    const savedVersion = await this.modelVersionRepository.save(version);

    this.logger.log(`Created new version: ${savedVersion.version} for model ${model.name}`);
    return savedVersion;
  }

  /**
   * Lấy model versions
   */
  async getModelVersions(modelId: string): Promise<ModelVersion[]> {
    return this.modelVersionRepository.find({
      where: { modelId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lấy latest version của model
   */
  async getLatestVersion(modelId: string): Promise<ModelVersion | null> {
    return this.modelVersionRepository.findOne({
      where: { modelId, status: ModelVersionStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });
  }

  async getModelById(id: string, _includeVersions: boolean = false): Promise<MLModel> {
    const model = await this.modelRepository.findOne({
      where: { id },
      relations: ['creator', 'versions'],
    });

    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    return model;
  }

  /**
   * Deploy model version
   */
  async deployModelVersion(
    modelId: string,
    version: string,
    deploymentDto: ModelDeploymentDto,
  ): Promise<ModelVersion | null> {
    const modelVersion = await this.modelVersionRepository.findOne({
      where: { modelId, version },
    });

    if (!modelVersion) {
      throw new NotFoundException(`Version ${version} not found for model ${modelId}`);
    }

    if (modelVersion.status !== ModelVersionStatus.COMPLETED) {
      throw new BadRequestException(`Version ${version} is not ready for deployment`);
    }

    try {
      // Gọi Python service để deploy model
      await this.deployToPythonService(modelId, version, deploymentDto);

      // Deactivate previous active versions
      await this.modelVersionRepository.update(
        { modelId, isActive: true },
        { isActive: false, status: ModelVersionStatus.DEPRECATED },
      );

      // Activate new version
      await this.modelVersionRepository.update(modelVersion.id, {
        status: ModelVersionStatus.DEPLOYED,
        isActive: true,
      });

      // Update model status
      await this.modelRepository.update(modelId, {
        currentVersion: version,
        isDeployed: true,
        deployedAt: new Date(),
        status:
          deploymentDto.environment === DeploymentEnvironment.PRODUCTION
            ? ModelStatus.PRODUCTION
            : ModelStatus.TESTING,
      });

      this.logger.log(
        `Deployed model ${modelId} version ${version} to ${deploymentDto.environment}`,
      );

      return this.modelVersionRepository.findOne({ where: { id: modelVersion.id } });
    } catch (error) {
      this.logger.error(`Failed to deploy model ${modelId} version ${version}: ${error.message}`);
      throw new BadRequestException(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Deploy model tới Python service
   */
  private async deployToPythonService(
    modelId: string,
    version: string,
    deploymentDto: ModelDeploymentDto,
  ): Promise<void> {
    const pythonServiceUrl = this.configService.get<string>('PYTHON_AI_SERVICE_URL');

    if (!pythonServiceUrl) {
      throw new BadRequestException('Python AI service URL not configured');
    }

    const deploymentPayload = {
      model_id: modelId,
      version: version,
      environment: deploymentDto.environment,
      config: deploymentDto.deploymentConfig,
    };

    try {
      await firstValueFrom(
        this.httpService.post(`${pythonServiceUrl}/deploy`, deploymentPayload).pipe(
          timeout(60000), // 60 second timeout
          retry(2),
          catchError(error => {
            this.logger.error(`Python service deployment failed: ${error.message}`);
            throw error;
          }),
        ),
      );
    } catch (error) {
      throw new Error(`Failed to deploy to Python service: ${error.message}`);
    }
  }

  /**
   * Undeploy model
   */
  async undeployModel(modelId: string, _versionId: string): Promise<void> {
    const model = await this.findById(modelId);
    if (!model) {
      throw new NotFoundException(`Model with ID ${modelId} not found`);
    }

    try {
      // Gọi Python service để undeploy
      await this.undeployFromPythonService(modelId);

      // Update model status
      await this.modelRepository.update(modelId, {
        isDeployed: false,
        status: ModelStatus.DEVELOPMENT,
      });

      // Deactivate versions
      await this.modelVersionRepository.update({ modelId, isActive: true }, { isActive: false });

      this.logger.log(`Undeployed model ${modelId}`);
    } catch (error) {
      this.logger.error(`Failed to undeploy model ${modelId}: ${error.message}`);
      throw new BadRequestException(`Undeploy failed: ${error.message}`);
    }
  }

  /**
   * Undeploy model từ Python service
   */
  private async undeployFromPythonService(modelId: string): Promise<void> {
    const pythonServiceUrl = this.configService.get<string>('PYTHON_AI_SERVICE_URL');

    if (!pythonServiceUrl) {
      throw new BadRequestException('Python AI service URL not configured');
    }

    try {
      await firstValueFrom(
        this.httpService.post(`${pythonServiceUrl}/undeploy`, { model_id: modelId }).pipe(
          timeout(30000),
          retry(2),
          catchError(error => {
            this.logger.error(`Python service undeploy failed: ${error.message}`);
            throw error;
          }),
        ),
      );
    } catch (error) {
      throw new Error(`Failed to undeploy from Python service: ${error.message}`);
    }
  }

  /**
   * Train model
   */
  async trainModel(
    modelId: string,
    _versionId: string,
    trainingDto: ModelTrainingDto,
  ): Promise<ModelVersion> {
    const model = await this.findById(modelId);
    if (!model) {
      throw new NotFoundException(`Model with ID ${modelId} not found`);
    }

    // Tạo version mới cho training
    const version = await this.createModelVersion('temp', {
      modelId,
      version: trainingDto.version || `v${Date.now()}`,
      description: trainingDto.description || 'Training version',
      createdBy: trainingDto.trainedBy,
      configuration: trainingDto.trainingConfig,
    });

    try {
      // Bắt đầu training
      await this.modelVersionRepository.update(version.id, {
        status: ModelVersionStatus.TRAINING,
        trainingStartedAt: new Date(),
      });

      // Gọi Python service để train
      await this.startTrainingInPythonService(modelId, version.version, trainingDto);

      this.logger.log(`Started training for model ${modelId} version ${version.version}`);
      return version;
    } catch (error) {
      // Cập nhật status thành failed
      await this.modelVersionRepository.update(version.id, {
        status: ModelVersionStatus.FAILED,
        trainingCompletedAt: new Date(),
      });

      this.logger.error(`Training failed for model ${modelId}: ${error.message}`);
      throw new BadRequestException(`Training failed: ${error.message}`);
    }
  }

  /**
   * Bắt đầu training trong Python service
   */
  private async startTrainingInPythonService(
    modelId: string,
    version: string,
    trainingDto: ModelTrainingDto,
  ): Promise<void> {
    const pythonServiceUrl = this.configService.get<string>('PYTHON_AI_SERVICE_URL');

    if (!pythonServiceUrl) {
      throw new BadRequestException('Python AI service URL not configured');
    }

    const trainingPayload = {
      model_id: modelId,
      version: version,
      training_config: trainingDto.trainingConfig,
      dataset_config: trainingDto.datasetConfig,
      hyperparameters: trainingDto.hyperparameters,
    };

    try {
      await firstValueFrom(
        this.httpService.post(`${pythonServiceUrl}/train`, trainingPayload).pipe(
          timeout(120000), // 2 minute timeout for training start
          retry(1),
          catchError(error => {
            this.logger.error(`Python service training failed: ${error.message}`);
            throw error;
          }),
        ),
      );
    } catch (error) {
      throw new Error(`Failed to start training in Python service: ${error.message}`);
    }
  }

  /**
   * Cập nhật training progress
   */
  async updateTrainingProgress(
    modelId: string,
    version: string,
    progress: {
      status: ModelVersionStatus;
      trainingMetrics?: any;
      evaluationResults?: any;
      modelPath?: string;
      artifacts?: any;
    },
  ): Promise<void> {
    const modelVersion = await this.modelVersionRepository.findOne({
      where: { modelId, version },
    });

    if (!modelVersion) {
      throw new NotFoundException(`Version ${version} not found for model ${modelId}`);
    }

    const updateData: any = {
      status: progress.status,
    };

    if (progress.trainingMetrics) {
      updateData.trainingMetrics = progress.trainingMetrics;
    }

    if (progress.evaluationResults) {
      updateData.evaluationResults = progress.evaluationResults;
    }

    if (progress.modelPath) {
      updateData.modelPath = progress.modelPath;
    }

    if (progress.artifacts) {
      updateData.artifacts = progress.artifacts;
    }

    if (
      progress.status === ModelVersionStatus.COMPLETED ||
      progress.status === ModelVersionStatus.FAILED
    ) {
      updateData.trainingCompletedAt = new Date();
    }

    await this.modelVersionRepository.update(modelVersion.id, updateData);

    // Cập nhật model nếu training completed thành công
    if (progress.status === ModelVersionStatus.COMPLETED) {
      await this.modelRepository.update(modelId, {
        lastTrainedAt: new Date(),
        metrics: progress.evaluationResults,
      });
    }

    this.logger.log(
      `Updated training progress for model ${modelId} version ${version}: ${progress.status}`,
    );
  }

  async getModels(_filters: any, _pagination: any): Promise<any> {}

  /**
   * Health check model
   */
  async healthCheck(modelId: string): Promise<ModelHealthCheckDto> {
    const model = await this.findById(modelId);
    if (!model) {
      throw new NotFoundException(`Model with ID ${modelId} not found`);
    }

    if (!model.isDeployed || !model.serviceEndpoint) {
      return {
        modelId,
        status: 'not_deployed',
        timestamp: new Date(),
        healthy: false,
        message: 'Model is not deployed',
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${model.serviceEndpoint}/health`).pipe(
          timeout(10000),
          catchError(error => {
            throw error;
          }),
        ),
      );

      return {
        modelId,
        status: 'healthy',
        timestamp: new Date(),
        healthy: true,
        responseTime: response.headers['response-time'],
        version: model.currentVersion,
        ...response.data,
      };
    } catch (error) {
      this.logger.error(`Health check failed for model ${modelId}: ${error.message}`);
      return {
        modelId,
        status: 'unhealthy',
        timestamp: new Date(),
        healthy: false,
        message: error.message,
      };
    }
  }

  /**
   * Xóa model
   */
  async deleteModel(id: string, _force: boolean): Promise<void> {
    const model = await this.findById(id);
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    if (model.isDeployed) {
      throw new BadRequestException('Cannot delete deployed model. Undeploy first.');
    }

    // Kiểm tra có đang có A/B test không
    const activeABTests = await this.abTestRepository.count({
      where: [
        { controlModelId: id, status: ABTestStatus.RUNNING },
        { testModelId: id, status: ABTestStatus.RUNNING },
      ],
    });

    if (activeABTests > 0) {
      throw new BadRequestException('Cannot delete model with active A/B tests');
    }

    // Xóa predictions
    await this.predictionRepository.delete({ modelId: id });

    // Xóa versions
    await this.modelVersionRepository.delete({ modelId: id });

    // Xóa model
    await this.modelRepository.delete(id);

    this.logger.log(`Deleted model ${id}`);
  }

  /**
   * Lấy model statistics
   */
  async getModelStatistics(): Promise<ModelStatistics> {
    const models = await this.modelRepository.find();

    const totalModels = models.length;
    const activeModels = models.filter(m => m.isActive).length;
    const productionModels = models.filter(m => m.status === ModelStatus.PRODUCTION).length;

    const modelsByType = models.reduce(
      (acc, model) => {
        acc[model.modelType] = (acc[model.modelType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const modelsByFramework = models.reduce(
      (acc, model) => {
        acc[model.framework] = (acc[model.framework] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const modelsByStatus = models.reduce(
      (acc, model) => {
        acc[model.status] = (acc[model.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalModels,
      activeModels,
      productionModels,
      modelsByType,
      modelsByFramework,
      modelsByStatus,
    };
  }

  /**
   * Lấy model performance
   */
  async getModelPerformance(modelId: string): Promise<ModelPerformance> {
    const model = await this.findById(modelId);
    if (!model) {
      throw new NotFoundException(`Model with ID ${modelId} not found`);
    }

    // Lấy predictions trong 30 ngày gần nhất
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const predictions = await this.predictionRepository.find({
      where: {
        modelId,
        createdAt: MoreThan(thirtyDaysAgo),
      },
      order: { createdAt: 'DESC' },
    });

    const totalPredictions = predictions.length;
    const successfulPredictions = predictions.filter(p => p.status === 'completed').length;
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

    const lastPrediction = predictions[0];

    return {
      modelId,
      totalPredictions,
      successRate,
      averageResponseTime,
      averageConfidence,
      lastTrainedAt: model.lastTrainedAt,
      lastPredictionAt: lastPrediction?.createdAt,
    };
  }

  /**
   * Archive model
   */
  async archiveModel(id: string): Promise<MLModel | null> {
    const model = await this.findById(id);
    if (!model) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    if (model.isDeployed) {
      throw new BadRequestException('Cannot archive deployed model. Undeploy first.');
    }

    await this.modelRepository.update(id, {
      status: ModelStatus.ARCHIVED,
      isActive: false,
    });

    this.logger.log(`Archived model ${id}`);
    return this.findById(id);
  }

  /**
   * Clone model
   */
  async cloneModel(id: string, newName: string, clonedBy: string): Promise<MLModel> {
    const originalModel = await this.findById(id);
    if (!originalModel) {
      throw new NotFoundException(`Model with ID ${id} not found`);
    }

    // Kiểm tra name conflict
    const existingModel = await this.modelRepository.findOne({
      where: { name: newName },
    });

    if (existingModel) {
      throw new ConflictException(`Model with name '${newName}' already exists`);
    }

    const clonedModel = this.modelRepository.create({
      name: newName,
      displayName: `${originalModel.displayName} (Clone)`,
      description: `Cloned from ${originalModel.name}`,
      modelType: originalModel.modelType,
      framework: originalModel.framework,
      configuration: originalModel.configuration,
      createdBy: clonedBy,
      status: ModelStatus.DEVELOPMENT,
      isActive: true,
      isDeployed: false,
      tags: originalModel.tags,
      metadata: {
        ...originalModel.metadata,
        clonedFrom: originalModel.id,
        clonedAt: new Date(),
      },
    });

    const savedModel = await this.modelRepository.save(clonedModel);

    this.logger.log(`Cloned model ${originalModel.name} to ${newName} (${savedModel.id})`);
    return savedModel;
  }

  /**
   * Compare model versions
   */
  async compareVersions(
    modelId: string,
    version1: string,
    version2: string,
  ): Promise<{
    version1: ModelVersion;
    version2: ModelVersion;
    comparison: {
      trainingMetrics?: any;
      evaluationResults?: any;
      performanceImprovement?: Record<string, number>;
    };
  }> {
    const [v1, v2] = await Promise.all([
      this.modelVersionRepository.findOne({ where: { modelId, version: version1 } }),
      this.modelVersionRepository.findOne({ where: { modelId, version: version2 } }),
    ]);

    if (!v1 || !v2) {
      throw new NotFoundException('One or both versions not found');
    }

    const comparison: any = {};

    if (v1.trainingMetrics && v2.trainingMetrics) {
      comparison.trainingMetrics = {
        version1: v1.trainingMetrics,
        version2: v2.trainingMetrics,
      };
    }

    if (v1.evaluationResults && v2.evaluationResults) {
      comparison.evaluationResults = {
        version1: v1.evaluationResults,
        version2: v2.evaluationResults,
      };

      // Tính performance improvement
      comparison.performanceImprovement = this.calculatePerformanceImprovement(
        v1.evaluationResults,
        v2.evaluationResults,
      );
    }

    return {
      version1: v1,
      version2: v2,
      comparison,
    };
  }

  /**
   * Tính performance improvement giữa 2 versions
   */
  private calculatePerformanceImprovement(metrics1: any, metrics2: any): Record<string, number> {
    const improvement: Record<string, number> = {};

    const commonMetrics = ['accuracy', 'precision', 'recall', 'f1Score', 'auc'];

    for (const metric of commonMetrics) {
      if (metrics1[metric] && metrics2[metric]) {
        const diff = metrics2[metric] - metrics1[metric];
        const percentChange = (diff / metrics1[metric]) * 100;
        improvement[metric] = parseFloat(percentChange.toFixed(2));
      }
    }

    return improvement;
  }

  /**
   * Cleanup inactive models
   */
  async cleanupInactiveModels(retentionDays: number = 180): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const inactiveModels = await this.modelRepository.find({
      where: {
        isActive: false,
        status: In([ModelStatus.ARCHIVED, ModelStatus.DEPRECATED]),
        updatedAt: LessThan(cutoffDate),
      },
    });

    let deletedCount = 0;

    for (const model of inactiveModels) {
      try {
        await this.deleteModel(model.id, true);
        deletedCount++;
      } catch (error) {
        this.logger.warn(`Failed to delete inactive model ${model.id}: ${error.message}`);
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} inactive models`);
    return deletedCount;
  }
}

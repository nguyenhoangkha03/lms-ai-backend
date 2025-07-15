import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelPrediction } from '../entities/model-prediction.entity';
import { PredictionStatus } from '@/common/enums/ai.enums';

@Injectable()
export class ModelPredictionService {
  private readonly logger = new Logger(ModelPredictionService.name);

  constructor(
    @InjectRepository(ModelPrediction)
    private readonly predictionRepository: Repository<ModelPrediction>,
  ) {}

  async findById(id: string): Promise<ModelPrediction | null> {
    return this.predictionRepository.findOne({
      where: { id },
      relations: ['modelVersion', 'modelVersion.model', 'user'],
    });
  }

  async getUserPredictions(
    userId: string,
    options: {
      modelId?: string;
      type?: string;
      limit: number;
      offset: number;
    },
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
      queryBuilder.andWhere('model.id = :modelId', { modelId: options.modelId });
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

  async getPerformanceAnalytics(
    modelId?: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<{
    totalPredictions: number;
    successRate: number;
    avgProcessingTime: number;
    errorRate: number;
    predictionsByType: Record<string, number>;
    performanceTrend: Array<{
      date: string;
      count: number;
      avgTime: number;
      errors: number;
    }>;
  }> {
    const queryBuilder = this.predictionRepository.createQueryBuilder('prediction');

    if (modelId) {
      queryBuilder
        .leftJoin('prediction.modelVersion', 'version')
        .leftJoin('version.model', 'model')
        .andWhere('model.id = :modelId', { modelId });
    }

    if (timeRange) {
      queryBuilder.andWhere('prediction.createdAt BETWEEN :start AND :end', {
        start: timeRange.start,
        end: timeRange.end,
      });
    }

    // Get basic metrics
    const totalPredictions = await queryBuilder.getCount();

    const successfulPredictions = await queryBuilder
      .clone()
      .andWhere('prediction.status = :status', { status: PredictionStatus.COMPLETED })
      .getCount();

    const failedPredictions = await queryBuilder
      .clone()
      .andWhere('prediction.status = :status', { status: PredictionStatus.FAILED })
      .getCount();

    // Get average processing time
    const avgTimeResult = await queryBuilder
      .clone()
      .select('AVG(prediction.processingTime)', 'avgTime')
      .andWhere('prediction.processingTime IS NOT NULL')
      .getRawOne();

    // Get predictions by type
    const predictionsByType = await queryBuilder
      .clone()
      .select('prediction.predictionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('prediction.predictionType')
      .getRawMany();

    const predictionsByTypeMap = predictionsByType.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {});

    // Get performance trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendData = await queryBuilder
      .clone()
      .select('DATE(prediction.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(prediction.processingTime)', 'avgTime')
      .addSelect('SUM(CASE WHEN prediction.status = "failed" THEN 1 ELSE 0 END)', 'errors')
      .where('prediction.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .groupBy('DATE(prediction.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      totalPredictions,
      successRate: totalPredictions > 0 ? successfulPredictions / totalPredictions : 0,
      avgProcessingTime: parseFloat(avgTimeResult?.avgTime || '0'),
      errorRate: totalPredictions > 0 ? failedPredictions / totalPredictions : 0,
      predictionsByType: predictionsByTypeMap,
      performanceTrend: trendData.map(item => ({
        date: item.date,
        count: parseInt(item.count),
        avgTime: parseFloat(item.avgTime || '0'),
        errors: parseInt(item.errors),
      })),
    };
  }
}

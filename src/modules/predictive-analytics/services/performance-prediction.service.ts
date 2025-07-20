import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import {
  PerformancePrediction,
  PredictionType,
  RiskLevel,
} from '../entities/performance-prediction.entity';
import {
  CreatePerformancePredictionDto,
  UpdatePerformancePredictionDto,
  PerformancePredictionQueryDto,
} from '../dto/performance-prediction.dto';
import { LearningAnalytics } from '@/modules/analytics/entities/learning-analytics.entity';
import { LearningActivity } from '@/modules/analytics/entities/learning-activity.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PerformancePredictionService {
  private readonly logger = new Logger(PerformancePredictionService.name);

  constructor(
    @InjectRepository(PerformancePrediction)
    private readonly predictionRepository: Repository<PerformancePrediction>,
    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreatePerformancePredictionDto): Promise<PerformancePrediction> {
    try {
      const prediction = this.predictionRepository.create({
        ...dto,
        predictionDate: new Date(),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      });

      const savedPrediction = await this.predictionRepository.save(prediction);

      this.logger.log(
        `Created performance prediction ${savedPrediction.id} for student ${dto.studentId}`,
      );
      return savedPrediction;
    } catch (error) {
      this.logger.error(`Error creating performance prediction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: PerformancePredictionQueryDto): Promise<PerformancePrediction[]> {
    try {
      const queryBuilder = this.predictionRepository
        .createQueryBuilder('prediction')
        .leftJoinAndSelect('prediction.student', 'student')
        .leftJoinAndSelect('prediction.course', 'course');

      if (query.studentId) {
        queryBuilder.andWhere('prediction.studentId = :studentId', { studentId: query.studentId });
      }

      if (query.courseId) {
        queryBuilder.andWhere('prediction.courseId = :courseId', { courseId: query.courseId });
      }

      if (query.predictionType) {
        queryBuilder.andWhere('prediction.predictionType = :predictionType', {
          predictionType: query.predictionType,
        });
      }

      if (query.riskLevel) {
        queryBuilder.andWhere('prediction.riskLevel = :riskLevel', { riskLevel: query.riskLevel });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('prediction.predictionDate BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      if (query.minConfidence) {
        queryBuilder.andWhere('prediction.confidenceScore >= :minConfidence', {
          minConfidence: query.minConfidence,
        });
      }

      if (query.validated !== undefined) {
        queryBuilder.andWhere('prediction.isValidated = :validated', {
          validated: query.validated,
        });
      }

      queryBuilder.orderBy('prediction.predictionDate', 'DESC');

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error finding predictions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<PerformancePrediction> {
    try {
      const prediction = await this.predictionRepository.findOne({
        where: { id },
        relations: ['student', 'course'],
      });

      if (!prediction) {
        throw new NotFoundException(`Performance prediction with ID ${id} not found`);
      }

      return prediction;
    } catch (error) {
      this.logger.error(`Error finding prediction ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, dto: UpdatePerformancePredictionDto): Promise<PerformancePrediction> {
    try {
      const prediction = await this.findOne(id);

      Object.assign(prediction, dto);

      if (dto.actualValue !== undefined) {
        prediction.isValidated = true;
        prediction.validatedAt = new Date();

        // Calculate accuracy score
        const accuracy = 100 - Math.abs(prediction.predictedValue - dto.actualValue);
        prediction.accuracyScore = Math.max(0, accuracy);
      }

      const updatedPrediction = await this.predictionRepository.save(prediction);

      this.logger.log(`Updated performance prediction ${id}`);
      return updatedPrediction;
    } catch (error) {
      this.logger.error(`Error updating prediction ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const _prediction = await this.findOne(id);
      await this.predictionRepository.softDelete(id);

      this.logger.log(`Removed performance prediction ${id}`);
    } catch (error) {
      this.logger.error(`Error removing prediction ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generatePrediction(
    studentId: string,
    courseId?: string,
    predictionType: PredictionType = PredictionType.PERFORMANCE,
  ): Promise<PerformancePrediction> {
    try {
      this.logger.log(`Generating ${predictionType} prediction for student ${studentId}`);

      // Collect student learning data
      const learningData = await this.collectLearningData(studentId, courseId);

      // Call AI service for prediction
      const aiPrediction = await this.callAiPredictionService(learningData, predictionType);

      // Create prediction record
      const predictionDto: CreatePerformancePredictionDto = {
        studentId,
        courseId,
        predictionType,
        predictedValue: aiPrediction.predictedValue,
        confidenceScore: aiPrediction.confidenceScore,
        riskLevel: aiPrediction.riskLevel,
        contributingFactors: aiPrediction.contributingFactors,
        modelVersion: aiPrediction.modelVersion,
        modelMetadata: aiPrediction.modelMetadata,
      };

      return await this.create(predictionDto);
    } catch (error) {
      this.logger.error(`Error generating prediction: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validatePredictions(): Promise<void> {
    try {
      this.logger.log('Starting prediction validation process');

      const unvalidatedPredictions = await this.predictionRepository.find({
        where: {
          isValidated: false,
          targetDate: LessThan(new Date()),
        },
      });

      for (const prediction of unvalidatedPredictions) {
        try {
          const actualValue = await this.getActualOutcome(prediction);

          if (actualValue !== null) {
            await this.update(prediction.id, { actualValue });
          }
        } catch (error) {
          this.logger.warn(`Failed to validate prediction ${prediction.id}: ${error.message}`);
        }
      }

      this.logger.log(`Validated ${unvalidatedPredictions.length} predictions`);
    } catch (error) {
      this.logger.error(`Error in validation process: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPerformanceTrends(studentId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const predictions = await this.predictionRepository.find({
        where: {
          studentId,
          predictionDate: MoreThan(startDate),
        },
        order: { predictionDate: 'ASC' },
      });

      const trends = this.analyzeTrends(predictions);

      return {
        studentId,
        period: `${days} days`,
        trends,
        summary: {
          totalPredictions: predictions.length,
          averageConfidence:
            predictions.reduce((sum, p) => sum + p.confidenceScore, 0) / predictions.length,
          riskDistribution: this.calculateRiskDistribution(predictions),
          trendDirection: trends.direction,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting performance trends: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async collectLearningData(studentId: string, courseId?: string): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // Last 90 days

    // Get learning analytics
    const analyticsQuery: any = {
      studentId,
      date: Between(startDate, endDate),
    };

    if (courseId) {
      analyticsQuery.courseId = courseId;
    }

    const analytics = await this.analyticsRepository.find({
      where: analyticsQuery,
      order: { date: 'DESC' },
    });

    // Get learning activities
    const activities = await this.activityRepository.find({
      where: {
        studentId,
        createdAt: Between(startDate, endDate),
        ...(courseId && { courseId }),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      studentId,
      courseId,
      analytics,
      activities,
      timeframe: { startDate, endDate },
    };
  }

  private async callAiPredictionService(
    learningData: any,
    predictionType: PredictionType,
  ): Promise<any> {
    try {
      const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
      const apiKey = this.configService.get<string>('AI_SERVICE_API_KEY');

      const response = await firstValueFrom(
        this.httpService.post(
          `${aiServiceUrl}/predict/performance`,
          {
            learningData,
            predictionType,
            modelVersion: 'v2.1.0',
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`AI service call failed: ${error.message}`);

      // Fallback to rule-based prediction
      return this.generateRuleBasedPrediction(learningData, predictionType);
    }
  }

  private generateRuleBasedPrediction(learningData: any, predictionType: PredictionType): any {
    const { analytics, activities } = learningData;

    const _latestAnalytics = analytics[0];
    const avgEngagement =
      analytics.reduce((sum: number, a: any) => sum + a.engagementScore, 0) / analytics.length;
    const avgPerformance =
      analytics.reduce((sum: number, a: any) => sum + (a.averageQuizScore || 0), 0) /
      analytics.length;

    let predictedValue = 0;
    let riskLevel = RiskLevel.MEDIUM;
    const confidenceScore = 70;

    switch (predictionType) {
      case PredictionType.PERFORMANCE:
        predictedValue = avgEngagement * 0.4 + avgPerformance * 0.6;
        break;
      case PredictionType.DROPOUT_RISK:
        predictedValue =
          100 - (avgEngagement * 0.5 + avgPerformance * 0.3 + activities.length * 0.2);
        break;
      default:
        predictedValue = avgPerformance;
    }

    // Determine risk level
    if (predictedValue >= 80) riskLevel = RiskLevel.VERY_LOW;
    else if (predictedValue >= 70) riskLevel = RiskLevel.LOW;
    else if (predictedValue >= 60) riskLevel = RiskLevel.MEDIUM;
    else if (predictedValue >= 50) riskLevel = RiskLevel.HIGH;
    else riskLevel = RiskLevel.VERY_HIGH;

    return {
      predictedValue: Math.round(predictedValue),
      confidenceScore,
      riskLevel,
      contributingFactors: {
        engagementLevel: avgEngagement,
        performanceHistory: avgPerformance,
        activityLevel: activities.length,
      },
      modelVersion: 'rule-based-v1.0',
      modelMetadata: {
        algorithm: 'rule-based',
        fallback: true,
      },
    };
  }

  private async getActualOutcome(prediction: PerformancePrediction): Promise<number | null> {
    try {
      const targetDate = prediction.targetDate || new Date();

      switch (prediction.predictionType) {
        case PredictionType.PERFORMANCE:
          return await this.getActualPerformance(
            prediction.studentId,
            targetDate,
            prediction.courseId,
          );
        case PredictionType.DROPOUT_RISK:
          return await this.getActualDropoutStatus(
            prediction.studentId,
            targetDate,
            prediction.courseId,
          );
        default:
          return null;
      }
    } catch (error) {
      this.logger.warn(`Failed to get actual outcome: ${error.message}`);
      return null;
    }
  }

  private async getActualPerformance(
    studentId: string,
    targetDate: Date,
    courseId?: string,
  ): Promise<number | null> {
    const analytics = await this.analyticsRepository.findOne({
      where: {
        studentId,
        ...(courseId && { courseId }),
        date: targetDate,
      },
    });

    return analytics?.averageScore || null;
  }

  private async getActualDropoutStatus(
    studentId: string,
    targetDate: Date,
    courseId?: string,
  ): Promise<number | null> {
    // Check if student is still active after target date
    const recentActivity = await this.activityRepository.findOne({
      where: {
        studentId,
        ...(courseId && { courseId }),
        createdAt: MoreThan(targetDate),
      },
    });

    return recentActivity ? 0 : 100; // 0 = no dropout, 100 = dropped out
  }

  private analyzeTrends(predictions: PerformancePrediction[]): any {
    if (predictions.length < 2) {
      return { direction: 'insufficient_data', slope: 0 };
    }

    const values = predictions.map(p => p.predictedValue);
    const n = values.length;

    // Simple linear regression
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    let direction = 'stable';
    if (slope > 2) direction = 'improving';
    else if (slope < -2) direction = 'declining';

    return {
      direction,
      slope: Math.round(slope * 100) / 100,
      confidence: Math.min(100, n * 10), // More data = higher confidence
    };
  }

  private calculateRiskDistribution(predictions: PerformancePrediction[]): any {
    const distribution = {
      [RiskLevel.VERY_LOW]: 0,
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 0,
      [RiskLevel.HIGH]: 0,
      [RiskLevel.VERY_HIGH]: 0,
    };

    predictions.forEach(p => {
      distribution[p.riskLevel]++;
    });

    const total = predictions.length;
    Object.keys(distribution).forEach(key => {
      distribution[key] = Math.round((distribution[key] / total) * 100);
    });

    return distribution;
  }
}

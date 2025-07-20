import { LearningOutcomeForecast, OutcomeType } from '../entities/learning-outcome-forecast.entity';
import {
  CreateLearningOutcomeForecastDto,
  UpdateLearningOutcomeForecastDto,
  LearningOutcomeQueryDto,
} from '../dto/learning-outcome-forecast.dto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LearningAnalytics } from '@/modules/analytics/entities/learning-analytics.entity';
import { Between, Repository } from 'typeorm';
import { LearningActivity } from '@/modules/analytics/entities/learning-activity.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LearningOutcomeForecastService {
  private readonly logger = new Logger(LearningOutcomeForecastService.name);

  constructor(
    @InjectRepository(LearningOutcomeForecast)
    private readonly forecastRepository: Repository<LearningOutcomeForecast>,
    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateLearningOutcomeForecastDto): Promise<LearningOutcomeForecast> {
    try {
      const forecast = this.forecastRepository.create({
        ...dto,
        forecastDate: new Date(),
        targetDate: new Date(dto.targetDate),
      });

      const savedForecast = await this.forecastRepository.save(forecast);

      this.logger.log(
        `Created learning outcome forecast ${savedForecast.id} for student ${dto.studentId}`,
      );
      return savedForecast;
    } catch (error) {
      this.logger.error(`Error creating learning outcome forecast: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: LearningOutcomeQueryDto): Promise<LearningOutcomeForecast[]> {
    try {
      const queryBuilder = this.forecastRepository
        .createQueryBuilder('forecast')
        .leftJoinAndSelect('forecast.student', 'student')
        .leftJoinAndSelect('forecast.course', 'course');

      if (query.studentId) {
        queryBuilder.andWhere('forecast.studentId = :studentId', { studentId: query.studentId });
      }

      if (query.courseId) {
        queryBuilder.andWhere('forecast.courseId = :courseId', { courseId: query.courseId });
      }

      if (query.outcomeType) {
        queryBuilder.andWhere('forecast.outcomeType = :outcomeType', {
          outcomeType: query.outcomeType,
        });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('forecast.forecastDate BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      if (query.minSuccessProbability) {
        queryBuilder.andWhere('forecast.successProbability >= :minSuccessProbability', {
          minSuccessProbability: query.minSuccessProbability,
        });
      }

      if (query.realized !== undefined) {
        queryBuilder.andWhere('forecast.isRealized = :realized', { realized: query.realized });
      }

      queryBuilder.orderBy('forecast.targetDate', 'ASC');

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error finding forecasts: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<LearningOutcomeForecast> {
    try {
      const forecast = await this.forecastRepository.findOne({
        where: { id },
        relations: ['student', 'course'],
      });

      if (!forecast) {
        throw new NotFoundException(`Learning outcome forecast with ID ${id} not found`);
      }

      return forecast;
    } catch (error) {
      this.logger.error(`Error finding forecast ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateLearningOutcomeForecastDto,
  ): Promise<LearningOutcomeForecast> {
    try {
      const forecast = await this.findOne(id);
      Object.assign(forecast, dto);

      if (dto.actualOutcome !== undefined) {
        forecast.isRealized = true;

        // Calculate accuracy metrics
        const outcomeAccuracy = 100 - Math.abs(forecast.successProbability - dto.actualOutcome);

        let timeAccuracy = 100;
        if (forecast.actualCompletionDate && dto.actualCompletionDate) {
          const predictedDate = forecast.targetDate.getTime();
          const actualDate = new Date(dto.actualCompletionDate).getTime();
          const daysDifference = Math.abs(actualDate - predictedDate) / (1000 * 60 * 60 * 24);
          timeAccuracy = Math.max(0, 100 - daysDifference);
        }

        forecast.accuracyMetrics = {
          outcomeAccuracy: Math.round(outcomeAccuracy),
          timeAccuracy: Math.round(timeAccuracy),
          overallAccuracy: Math.round((outcomeAccuracy + timeAccuracy) / 2),
          errorMargin: Math.abs(forecast.successProbability - dto.actualOutcome),
        };
      }

      const updatedForecast = await this.forecastRepository.save(forecast);

      this.logger.log(`Updated learning outcome forecast ${id}`);
      return updatedForecast;
    } catch (error) {
      this.logger.error(`Error updating forecast ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.findOne(id);
      await this.forecastRepository.softDelete(id);

      this.logger.log(`Removed learning outcome forecast ${id}`);
    } catch (error) {
      this.logger.error(`Error removing forecast ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateForecast(
    studentId: string,
    courseId: string,
    outcomeType: OutcomeType,
    targetDate: Date,
  ): Promise<LearningOutcomeForecast> {
    try {
      this.logger.log(`Generating ${outcomeType} forecast for student ${studentId}`);

      // Collect comprehensive learning data
      const learningData = await this.collectLearningData(studentId, courseId);

      // Generate forecast using AI service
      const forecastData = await this.callForecastingService(learningData, outcomeType, targetDate);

      // Create forecast record
      const forecastDto: CreateLearningOutcomeForecastDto = {
        studentId,
        courseId,
        outcomeType,
        targetDate: targetDate.toISOString(),
        successProbability: forecastData.successProbability,
        predictedScore: forecastData.predictedScore,
        estimatedDaysToCompletion: forecastData.estimatedDaysToCompletion,
        scenarios: forecastData.scenarios,
        confidenceLevel: forecastData.confidenceLevel,
        baselineData: forecastData.baselineData,
      };

      return await this.create(forecastDto);
    } catch (error) {
      this.logger.error(`Error generating forecast: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getForecastSummary(studentId: string, courseId?: string): Promise<any> {
    try {
      const query: LearningOutcomeQueryDto = { studentId };
      if (courseId) query.courseId = courseId;

      const forecasts = await this.findAll(query);

      const summary = {
        totalForecasts: forecasts.length,
        avgSuccessProbability: 0,
        avgConfidenceLevel: 0,
        outcomeDistribution: {},
        upcomingTargets: [] as Partial<LearningOutcomeForecast>[],
        realizedForecasts: 0 as number,
        avgAccuracy: 0,
      };

      if (forecasts.length > 0) {
        summary.avgSuccessProbability = Math.round(
          forecasts.reduce((sum, f) => sum + f.successProbability, 0) / forecasts.length,
        );

        summary.avgConfidenceLevel = Math.round(
          forecasts.reduce((sum, f) => sum + f.confidenceLevel, 0) / forecasts.length,
        );

        // Calculate outcome distribution
        const distribution = {};
        forecasts.forEach(f => {
          distribution[f.outcomeType] = (distribution[f.outcomeType] || 0) + 1;
        });
        summary.outcomeDistribution = distribution;

        // Get upcoming targets (next 30 days)
        const upcoming = forecasts.filter(f => {
          const daysUntilTarget =
            (f.targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
          return daysUntilTarget > 0 && daysUntilTarget <= 30;
        });
        summary.upcomingTargets = upcoming.map(f => ({
          id: f.id,
          outcomeType: f.outcomeType,
          targetDate: f.targetDate,
          successProbability: f.successProbability,
        }));

        // Calculate accuracy for realized forecasts
        const realized = forecasts.filter(f => f.isRealized && f.accuracyMetrics);
        if (realized.length > 0) {
          summary.realizedForecasts = realized.length;
          summary.avgAccuracy = Math.round(
            realized.reduce((sum, f) => sum + f.accuracyMetrics!.overallAccuracy, 0) /
              realized.length,
          );
        }
      }

      return summary;
    } catch (error) {
      this.logger.error(`Error getting forecast summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async collectLearningData(studentId: string, courseId: string): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60); // Last 60 days

    const analytics = await this.analyticsRepository.find({
      where: {
        studentId,
        courseId,
        date: Between(startDate, endDate),
      },
      order: { date: 'DESC' },
    });

    const activities = await this.activityRepository.find({
      where: {
        studentId,
        courseId,
        createdAt: Between(startDate, endDate),
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

  private async callForecastingService(
    learningData: any,
    outcomeType: OutcomeType,
    targetDate: Date,
  ): Promise<any> {
    try {
      const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
      const apiKey = this.configService.get<string>('AI_SERVICE_API_KEY');

      const response = await firstValueFrom(
        this.httpService.post(
          `${aiServiceUrl}/forecast/outcome`,
          {
            learningData,
            outcomeType,
            targetDate,
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
      this.logger.error(`AI forecasting service call failed: ${error.message}`);

      // Fallback to rule-based forecasting
      return this.generateRuleBasedForecast(learningData, outcomeType, targetDate);
    }
  }

  private generateRuleBasedForecast(
    learningData: any,
    outcomeType: OutcomeType,
    _targetDate: Date,
  ): any {
    const { analytics, activities } = learningData;

    const avgEngagement =
      analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length;
    const avgPerformance =
      analytics.reduce((sum, a) => sum + (a.averageQuizScore || 0), 0) / analytics.length;
    const activityLevel = activities.length;

    let successProbability = 50;
    let predictedScore = 70;
    let estimatedDays = 30;

    switch (outcomeType) {
      case OutcomeType.COURSE_COMPLETION:
        successProbability = Math.min(
          95,
          avgEngagement * 0.4 + avgPerformance * 0.4 + activityLevel * 0.2,
        );
        estimatedDays = Math.max(7, 45 - Math.floor(avgEngagement / 5));
        break;
      case OutcomeType.SKILL_MASTERY:
        successProbability = Math.min(90, avgPerformance + avgEngagement * 0.3);
        estimatedDays = Math.max(14, 60 - Math.floor(avgPerformance / 3));
        break;
      case OutcomeType.ASSESSMENT_SCORE:
        predictedScore = Math.min(100, avgPerformance + avgEngagement * 0.2);
        successProbability = predictedScore > 70 ? 80 : 60;
        break;
      default:
        successProbability = (avgEngagement + avgPerformance) / 2;
    }

    return {
      successProbability: Math.round(successProbability),
      predictedScore: Math.round(predictedScore),
      estimatedDaysToCompletion: estimatedDays,
      confidenceLevel: 65,
      scenarios: {
        optimistic: {
          probability: Math.min(95, successProbability + 15),
          outcome: 'Excellent completion with high scores',
          timeframe: Math.max(1, estimatedDays - 10),
          conditions: ['Maintains current engagement', 'No major obstacles'],
        },
        realistic: {
          probability: successProbability,
          outcome: 'Successful completion with good understanding',
          timeframe: estimatedDays,
          conditions: ['Current progress continues', 'Normal study conditions'],
        },
        pessimistic: {
          probability: Math.max(20, successProbability - 20),
          outcome: 'Completion with basic understanding',
          timeframe: estimatedDays + 15,
          conditions: ['Reduced engagement', 'Additional support needed'],
        },
      },
      baselineData: {
        currentProgress: avgPerformance,
        averagePerformance: avgPerformance,
        engagementLevel: avgEngagement,
        timeSpentLearning: analytics.reduce((sum, a) => sum + a.totalTimeSpent, 0),
        completedActivities: activityLevel,
        skillLevel:
          avgPerformance > 80 ? 'advanced' : avgPerformance > 60 ? 'intermediate' : 'beginner',
      },
    };
  }
}

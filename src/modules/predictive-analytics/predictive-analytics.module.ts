import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';

// Entities
import { PerformancePrediction } from './entities/performance-prediction.entity';
import { DropoutRiskAssessment } from './entities/dropout-risk-assessment.entity';
import { LearningOutcomeForecast } from './entities/learning-outcome-forecast.entity';
import { InterventionRecommendation } from './entities/intervention-recommendation.entity';
import { ResourceOptimization } from './entities/resource-optimization.entity';

// Analytics entities
import { LearningAnalytics } from '@/modules/analytics/entities/learning-analytics.entity';
import { LearningActivity } from '@/modules/analytics/entities/learning-activity.entity';

// Services
import { PerformancePredictionService } from './services/performance-prediction.service';
import { DropoutRiskAssessmentService } from './services/dropout-risk-assessment.service';
import { LearningOutcomeForecastService } from './services/learning-outcome-forecast.service';
import { InterventionRecommendationService } from './services/intervention-recommendation.service';
import { ResourceOptimizationService } from './services/resource-optimization.service';
import { PredictiveAnalyticsService } from './services/predictive-analytics.service';

// Controllers
import { PerformancePredictionController } from './controllers/performance-prediction.controller';
import { DropoutRiskAssessmentController } from './controllers/dropout-risk-assessment.controller';
import { LearningOutcomeForecastController } from './controllers/learning-outcome-forecast.controller';
import { InterventionRecommendationController } from './controllers/intervention-recommendation.controller';
import { ResourceOptimizationController } from './controllers/resource-optimization.controller';
import { PredictiveAnalyticsController } from './controllers/predictive-analytics.controller';

// Processors
import { PredictiveAnalyticsProcessor } from './processors/predictive-analytics.processor';
import { PerformancePredictionProcessor } from './processors/performance-prediction.processor';
import { DropoutRiskProcessor } from './processors/dropout-risk.processor';
import { InterventionProcessor } from './processors/intervention.processor';

// Queues
import {
  PREDICTIVE_ANALYTICS_QUEUE,
  PERFORMANCE_PREDICTION_QUEUE,
  DROPOUT_RISK_QUEUE,
  INTERVENTION_QUEUE,
} from './queues/queue.constants';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([
      // Predictive Analytics entities
      PerformancePrediction,
      DropoutRiskAssessment,
      LearningOutcomeForecast,
      InterventionRecommendation,
      ResourceOptimization,
      // Analytics entities
      LearningAnalytics,
      LearningActivity,
    ]),
    BullModule.registerQueue(
      { name: PREDICTIVE_ANALYTICS_QUEUE },
      { name: PERFORMANCE_PREDICTION_QUEUE },
      { name: DROPOUT_RISK_QUEUE },
      { name: INTERVENTION_QUEUE },
    ),
    AuthModule,
    HttpModule,
    ConfigModule,
  ],
  controllers: [
    PerformancePredictionController,
    DropoutRiskAssessmentController,
    LearningOutcomeForecastController,
    InterventionRecommendationController,
    ResourceOptimizationController,
    PredictiveAnalyticsController,
  ],
  providers: [
    // Services
    PerformancePredictionService,
    DropoutRiskAssessmentService,
    LearningOutcomeForecastService,
    InterventionRecommendationService,
    ResourceOptimizationService,
    PredictiveAnalyticsService,
    // Processors
    PredictiveAnalyticsProcessor,
    PerformancePredictionProcessor,
    DropoutRiskProcessor,
    InterventionProcessor,
  ],
  exports: [
    PerformancePredictionService,
    DropoutRiskAssessmentService,
    LearningOutcomeForecastService,
    InterventionRecommendationService,
    ResourceOptimizationService,
    PredictiveAnalyticsService,
  ],
})
export class PredictiveAnalyticsModule {}

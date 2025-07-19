import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

// Entities
import { AIRecommendation } from './entities/ai-recommendation.entity';
import { MLModel } from './entities/ml-model.entity';
import { ModelVersion } from './entities/model-version.entity';
import { ModelPrediction } from './entities/model-prediction.entity';
import { ABTest } from './entities/ab-test.entity';
import { ABTestResult } from './entities/ab-test-result.entity';

// Controllers
import { AiController } from './controllers/ai.controller';
import { RecommendationController } from './controllers/recommendation.controller';
import { MlModelController } from './controllers/ml-model.controller';
import { ModelPredictionController } from './controllers/model-prediction.controller';
import { AbTestController } from './controllers/ab-test.controller';

// Services
import { AiService } from './services/ai.service';
import { RecommendationService } from './services/recommendation.service';
import { ContentSimilarityService } from './services/content-similarity.service';
import { CollaborativeFilteringService } from './services/collaborative-filtering.service';
import { LearningPathService } from './services/learning-path.service';
import { DifficultyAdjustmentService } from './services/difficulty-adjustment.service';
import { PythonAiServiceService } from './services/python-ai-service.service';
import { MlModelService } from './services/ml-model.service';
import { ModelPredictionService } from './services/model-prediction.service';
import { AbTestService } from './services/ab-test.service';
import { ModelMonitoringService } from './services/model-monitoring.service';

// Cron Services
import { RecommendationCronService } from './services/recommendation-cron.service';
import { ModelMonitoringCronService } from './services/model-monitoring-cron.service';

// Processors
import { RecommendationProcessor } from './processors/recommendation.processor';
import { ModelTrainingProcessor } from './processors/model-training.processor';
import { ModelMonitoringProcessor } from './processors/model-monitoring.processor';

// External modules
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { CustomCacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIRecommendation,
      MLModel,
      ModelVersion,
      ModelPrediction,
      ABTest,
      ABTestResult,
    ]),
    BullModule.registerQueue(
      {
        name: 'recommendation',
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'model-training',
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'model-monitoring',
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      },
    ),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(),
    CustomCacheModule,
    forwardRef(() => UserModule),
    forwardRef(() => CourseModule),
    forwardRef(() => AssessmentModule),
    forwardRef(() => AnalyticsModule),
    AuthModule,
  ],
  controllers: [
    AiController,
    RecommendationController,
    MlModelController,
    ModelPredictionController,
    AbTestController,
  ],
  providers: [
    // Core Services
    AiService,
    RecommendationService,
    ContentSimilarityService,
    CollaborativeFilteringService,
    LearningPathService,
    DifficultyAdjustmentService,
    PythonAiServiceService,
    MlModelService,
    ModelPredictionService,
    AbTestService,
    ModelMonitoringService,

    // Cron Services
    RecommendationCronService,
    ModelMonitoringCronService,

    // Processors
    RecommendationProcessor,
    ModelTrainingProcessor,
    ModelMonitoringProcessor,
  ],
  exports: [
    TypeOrmModule,
    AiService,
    RecommendationService,
    ContentSimilarityService,
    CollaborativeFilteringService,
    LearningPathService,
    DifficultyAdjustmentService,
    PythonAiServiceService,
    MlModelService,
    ModelPredictionService,
    AbTestService,
    ModelMonitoringService,
  ],
})
export class AiModule {}

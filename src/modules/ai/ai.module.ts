import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
// import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CourseModule } from '../course/course.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { HttpModule } from '@nestjs/axios';

// Entities
import { AIRecommendation } from './entities/ai-recommendation.entity';
import { MLModel } from './entities/ml-model.entity';
import { ModelVersion } from './entities/model-version.entity';
import { ModelPrediction } from './entities/model-prediction.entity';
import { ABTest } from './entities/ab-test.entity';
import { ABTestResult } from './entities/ab-test-result.entity';
// import { LearningActivity } from '../analytics/entities/learning-activity.entity';
// import { LearningAnalytics } from '../analytics/entities/learning-analytics.entity';
// import { LearningSession } from '../analytics/entities/learning-session.entity';
// import { Course } from '../course/entities/course.entity';
// import { Lesson } from '../course/entities/lesson.entity';
// import { Assessment } from '../assessment/entities/assessment.entity';
// import { User } from '../user/entities/user.entity';
// import { Enrollment } from '../course/entities/enrollment.entity';

// Services
import { AiService } from './services/ai.service';
import { RecommendationService } from './services/recommendation.service';
import { ContentSimilarityService } from './services/content-similarity.service';
import { CollaborativeFilteringService } from './services/collaborative-filtering.service';
import { RecommendationCronService } from './services/recommendation-cron.service';
import { LearningPathService } from './services/learning-path.service';
import { DifficultyAdjustmentService } from './services/difficulty-adjustment.service';
// import { PythonAiServiceService } from './services/python-ai-service.service';

// Controllers
import { AiController } from './ai.controller';
import { RecommendationController } from './controllers/recommendation.controller';
// import { MlModelController } from './controllers/ml-model.controller';
// import { ModelPredictionController } from './controllers/model-prediction.controller';
// import { AbTestController } from './controllers/ab-test.controller';
// import { ModelServingController } from './controllers/model-serving.controller';
// import { ModelRegistryController } from './controllers/model-registry.controller';

// Processors
// import { RecommendationProcessor } from './processors/recommendation.processor';

// Common modules
import { CustomCacheModule as CacheModule } from '@/cache/cache.module';
import { ScheduleModule } from '@nestjs/schedule';
// import { MlModelService } from './services/ml-model.service';
import { ModelPredictionService } from './services/model-prediction.service';
// import { ModelMonitoringCronService } from './services/model-monitoring-cron.service';

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
    CacheModule,
    AnalyticsModule,
    CourseModule,
    AssessmentModule,
    UserModule,
    AuthModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
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
    ScheduleModule.forRoot(),
  ],
  controllers: [
    AiController,
    RecommendationController,
    // MlModelController,
    // ModelPredictionController,
    // AbTestController,
    // ModelServingController,
    // ModelRegistryController,
  ],
  providers: [
    AiService,
    RecommendationService,
    ContentSimilarityService,
    CollaborativeFilteringService,
    RecommendationCronService,
    LearningPathService,
    DifficultyAdjustmentService,
    // MlModelService,
    ModelPredictionService,
    // ModelMonitoringCronService,
    // PythonAiServiceService,
  ],
  exports: [
    TypeOrmModule,
    // AIService,
    RecommendationService,
    ContentSimilarityService,
    CollaborativeFilteringService,
    // PythonAIServiceService,
    // MLModelService,
    // ModelPredictionService,
    // ABTestService,
    // ModelServingService,
    // ModelRegistryService,
  ],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
// import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CourseModule } from '../course/course.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

// Entities
import { AIRecommendation } from './entities/ai-recommendation.entity';
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

// Controllers
import { AiController } from './ai.controller';
import { RecommendationController } from './controllers/recommendation.controller';

// Processors
// import { RecommendationProcessor } from './processors/recommendation.processor';

// Common modules
import { CustomCacheModule as CacheModule } from '@/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIRecommendation]),
    CacheModule,
    AnalyticsModule,
    CourseModule,
    AssessmentModule,
    UserModule,
    AuthModule,
    BullModule.registerQueue({
      name: 'recommendation',
    }),
  ],
  controllers: [AiController, RecommendationController],
  providers: [
    AiService,
    RecommendationService,
    ContentSimilarityService,
    CollaborativeFilteringService,
    RecommendationCronService,
    LearningPathService,
    DifficultyAdjustmentService,
  ],
  exports: [TypeOrmModule],
})
export class AiModule {}

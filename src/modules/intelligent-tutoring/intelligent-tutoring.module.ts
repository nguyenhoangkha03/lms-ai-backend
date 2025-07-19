import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { TutoringSession } from './entities/tutoring-session.entity';
import { TutoringInteraction } from './entities/tutoring-interaction.entity';
import { LearningStyleProfile } from './entities/learning-style-profile.entity';
import { AdaptiveContent } from './entities/adaptive-content.entity';
import { HintGeneration } from './entities/hint-generation.entity';

// Controllers
import { TutoringController } from './controllers/tutoring.controller';

// Services
import { TutoringSessionService } from './services/tutoring-session.service';
import { QuestionAnsweringService } from './services/question-answering.service';
import { LearningStyleRecognitionService } from './services/learning-style-recognition.service';
import { AdaptiveContentService } from './services/adaptive-content.service';
import { HintGenerationService } from './services/hint-generation.service';
import { PersonalizedLearningPathService } from './services/personalized-learning-path.service';

// Processors
import { TutoringAnalyticsProcessor } from './processors/tutoring-analytics.processor';
import { LearningStyleAnalysisProcessor } from './processors/learning-style-analysis.processor';

// Gateways
import { TutoringGateway } from './gateways/tutoring.gateway';

// External modules
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { CustomCacheModule } from '../../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutoringSession,
      TutoringInteraction,
      LearningStyleProfile,
      AdaptiveContent,
      HintGeneration,
    ]),
    BullModule.registerQueue(
      {
        name: 'tutoring-analytics',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'learning-style-analysis',
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 25,
          attempts: 2,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        },
      },
    ),
    ScheduleModule.forRoot(),
    forwardRef(() => UserModule),
    forwardRef(() => CourseModule),
    forwardRef(() => AiModule),
    forwardRef(() => AnalyticsModule),
    AuthModule,
    CustomCacheModule,
  ],
  controllers: [TutoringController],
  providers: [
    // Core Services
    TutoringSessionService,
    QuestionAnsweringService,
    LearningStyleRecognitionService,
    AdaptiveContentService,
    HintGenerationService,
    PersonalizedLearningPathService,

    // Background Processors
    TutoringAnalyticsProcessor,
    LearningStyleAnalysisProcessor,

    // Real-time Gateway
    TutoringGateway,
  ],
  exports: [
    TutoringSessionService,
    QuestionAnsweringService,
    LearningStyleRecognitionService,
    AdaptiveContentService,
    HintGenerationService,
    PersonalizedLearningPathService,
    TutoringGateway,
  ],
})
export class IntelligentTutoringModule {}

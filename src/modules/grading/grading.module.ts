import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Grade } from './entities/grade.entity';
import { Feedback } from './entities/feedback.entity';
import { Gradebook } from './entities/gradebook.entity';
import { GradingRubric } from './entities/grading-rubric.entity';

// Services
import { GradingService } from './services/grading.service';
import { AiEssayGradingService } from './services/ai-essay-grading.service';
import { FeedbackService } from './services/feedback.service';
import { GradebookService } from './services/gradebook.service';

// Controllers
import { GradingController } from './controllers/grading.controller';
import { GradebookController } from './controllers/gradebook.controller';
import { ManualGradingController } from './controllers/manual-grading.controller';

// Event Listeners
import { GradingEventListener } from './listeners/grading-event.listener';

// External Modules
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { CustomCacheModule as CacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Grade, Feedback, Gradebook, GradingRubric]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => CourseModule),
    forwardRef(() => AssessmentModule),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    CacheModule,
    WinstonModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.registerQueue({
      name: 'grading-processing',
    }),
  ],
  controllers: [GradingController, GradebookController, ManualGradingController],
  providers: [
    GradingService,
    AiEssayGradingService,
    FeedbackService,
    GradebookService,
    GradingEventListener,
  ],
  exports: [
    TypeOrmModule,
    GradingService,
    AiEssayGradingService,
    FeedbackService,
    GradebookService,
  ],
})
export class GradingModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Assessment } from './entities/assessment.entity';
import { Question } from './entities/question.entity';
import { AssessmentAttempt } from './entities/assessment-attempt.entity';
import { AssessmentSession } from './entities/assessment-session.entity';

// Services
import { AssessmentService } from './services/assessment.service';
import { QuestionBankService } from './services/question-bank.service';
import { AssessmentRandomizationService } from './services/assessment-randomization.service';
import { TimeManagementService } from './services/time-management.service';
import { ProctoringService } from './services/proctoring.service';
import { AssessmentTakingService } from './services/assessment-taking.service';

// Controllers
import { AssessmentController } from './controllers/assessment.controller';
import { AssessmentTakingController } from './controllers/assessment-taking.controller';

// Gateways
import { AssessmentSessionGateway } from './gateways/assessment-session.gateway';

// External Modules
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { SystemModule } from '../system/system.module';
import { CustomCacheModule as CacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assessment, Question, AssessmentAttempt, AssessmentSession]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => CourseModule),
    forwardRef(() => SystemModule),
    CacheModule,
    WinstonModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.registerQueue({
      name: 'assessment-processing',
    }),
  ],
  controllers: [AssessmentController, AssessmentTakingController],
  providers: [
    AssessmentService,
    QuestionBankService,
    AssessmentRandomizationService,
    AssessmentTakingService,
    TimeManagementService,
    ProctoringService,
    AssessmentSessionGateway,
  ],
  exports: [
    TypeOrmModule,
    AssessmentService,
    QuestionBankService,
    AssessmentRandomizationService,
    AssessmentTakingService,
    TimeManagementService,
    ProctoringService,
  ],
})
export class AssessmentModule {}

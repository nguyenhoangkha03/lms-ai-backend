import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Entities
import { Assessment } from './entities/assessment.entity';
import { Question } from './entities/question.entity';
import { AssessmentAttempt } from './entities/assessment-attempt.entity';

// Services
import { AssessmentService } from './services/assessment.service';
import { QuestionBankService } from './services/question-bank.service';
import { AssessmentRandomizationService } from './services/assessment-randomization.service';

// Controllers
import { AssessmentController } from './controllers/assessment.controller';

// External Modules
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { SystemModule } from '../system/system.module';
import { CustomCacheModule as CacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assessment, Question, AssessmentAttempt]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => CourseModule),
    forwardRef(() => SystemModule),
    CacheModule,
    WinstonModule,
    BullModule.registerQueue({
      name: 'assessment-processing',
    }),
  ],
  controllers: [AssessmentController],
  providers: [AssessmentService, QuestionBankService, AssessmentRandomizationService],
  exports: [TypeOrmModule, AssessmentService, QuestionBankService, AssessmentRandomizationService],
})
export class AssessmentModule {}

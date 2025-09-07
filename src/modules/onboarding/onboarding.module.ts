import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingController } from './controllers/onboarding.controller';
import { OnboardingService } from './services/onboarding.service';
import { SkillAssessmentService } from './services/skill-assessment.service';
import { LearningPathService } from './services/learning-path.service';
import { StudentProfile } from '../user/entities/student-profile.entity';
import { User } from '../user/entities/user.entity';
import { Assessment } from '../assessment/entities/assessment.entity';
import { AssessmentAttempt } from '../assessment/entities/assessment-attempt.entity';
import { Question } from '../assessment/entities/question.entity';
import { Enrollment } from '../course/entities/enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { Category } from '../course/entities/category.entity';
import { AIRecommendation } from '../ai/entities/ai-recommendation.entity';
import { WinstonModule } from '@/logger/winston.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      StudentProfile,
      User,
      Assessment,
      AssessmentAttempt,
      Question,
      Enrollment,
      Course,
      Category,
      AIRecommendation,
    ]),
    WinstonModule,
    AuthModule,
    UserModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, SkillAssessmentService, LearningPathService],
  exports: [OnboardingService, SkillAssessmentService, LearningPathService],
})
export class OnboardingModule {}
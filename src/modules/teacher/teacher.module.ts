import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherController } from './controllers/teacher.controller';
import { TeacherDashboardController } from './controllers/teacher-dashboard.controller';
import { TeacherAnalyticsController } from './controllers/teacher-analytics.controller';
import { TeacherLiveSessionsController } from './controllers/teacher-live-sessions.controller';
import { TeacherAssignmentsController } from './controllers/teacher-assignments.controller';
import { TeacherMessagesController } from './controllers/teacher-messages.controller';
import { TeacherService } from './services/teacher.service';
import { TeacherDashboardService } from './services/teacher-dashboard.service';
import { TeacherAnalyticsService } from './services/teacher-analytics.service';
import { TeacherLiveSessionsRealService } from './services/teacher-live-sessions-real.service';
import { TeacherAssignmentsService } from './services/teacher-assignments.service';
import { TeacherMessagesService } from './services/teacher-messages.service';
import { User } from '@/modules/user/entities/user.entity';
import { TeacherProfile } from '@/modules/user/entities/teacher-profile.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { Enrollment } from '@/modules/course/entities/enrollment.entity';
import { LessonProgress } from '@/modules/course/entities/lesson-progress.entity';
import { Lesson } from '@/modules/course/entities/lesson.entity';
import { Assessment } from '@/modules/assessment/entities/assessment.entity';
import { AssessmentAttempt } from '@/modules/assessment/entities/assessment-attempt.entity';
import { LearningActivity } from '@/modules/analytics/entities/learning-activity.entity';
import { LearningSession } from '@/modules/analytics/entities/learning-session.entity';
import { CourseSection } from '@/modules/course/entities/course-section.entity';
import { ContentQualityAssessment } from '@/modules/content-analysis/entities/content-quality-assessment.entity';
import { UserModule } from '@/modules/user/user.module';
import { CourseModule } from '@/modules/course/course.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { AiModule } from '@/modules/ai/ai.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { WinstonModule } from '@/logger/winston.module';
import { GradingModule } from '@/modules/grading/grading.module';
import { AssessmentModule } from '@/modules/assessment/assessment.module';
import { VideoSession } from '../communication/entities/video-session.entity';
import { VideoParticipant } from '../communication/entities/video-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      TeacherProfile,
      Course,
      Enrollment,
      LessonProgress,
      Lesson,
      Assessment,
      AssessmentAttempt,
      LearningActivity,
      LearningSession,
      CourseSection,
      ContentQualityAssessment,
      VideoSession,
      VideoParticipant,
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    CourseModule,
    AnalyticsModule,
    AiModule,
    WinstonModule,
    GradingModule,
    AssessmentModule,
    WinstonModule,
  ],
  controllers: [
    TeacherController,
    TeacherDashboardController,
    TeacherAnalyticsController,
    TeacherLiveSessionsController,
    TeacherAssignmentsController,
    TeacherMessagesController,
  ],
  providers: [
    TeacherService,
    TeacherDashboardService,
    TeacherAnalyticsService,
    TeacherLiveSessionsRealService,
    TeacherAssignmentsService,
    TeacherMessagesService,
  ],
  exports: [TeacherService, TeacherDashboardService],
})
export class TeacherModule {}

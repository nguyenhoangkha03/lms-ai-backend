import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '@/config/configuration';
import performanceConfig from '@/config/performance.config';
import privacyConfig from '@/config/privacy.config';
import securityConfig from '@/config/security.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from '@/logger/winston.module';
import { DatabaseModule } from './database/database.module';
import { CustomCacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseController } from './database/database.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { CourseModule } from './modules/course/course.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SystemModule } from './modules/system/system.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { FileManagementModule } from './modules/file-management/file-management.module';
import { GradingModule } from './modules/grading/grading.module';
import { BullModule } from '@nestjs/bull';
import { ForumModule } from './modules/forum/forum.module';
import { CollaborativeLearningModule } from './modules/collaborative-learning/collaborative-learning.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { IntelligentTutoringModule } from './modules/intelligent-tutoring/intelligent-tutoring.module';
import { ContentAnalysisModule } from './modules/content-analysis/content-analysis.module';
import { PredictiveAnalyticsModule } from './modules/predictive-analytics/predictive-analytics.module';
import { CachingModule } from './modules/caching/caching.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { SecurityModule } from './modules/security/security.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration, performanceConfig, privacyConfig, securityConfig], // truyền vào hàm trả về đối tượng, không truyền thẳng đối tượng vì sẽ load trước
      isGlobal: true, // các module khác sử dụng k cần import
      cache: true, //sẽ chỉ chạy hàm configuration và đọc các tệp .env một lần duy nhất khi ứng dụng khởi động. Kết quả sẽ được lưu vào bộ nhớ đệm (cache).
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),

    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('security.rateLimit.ttl', 60000),
            limit: configService.get<number>('security.rateLimit.limit', 10),
          },
        ],
      }),
    }),

    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT!) || 6379,
      },
    }),

    // Core modules
    WinstonModule,
    DatabaseModule,
    CustomCacheModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UserModule,
    TeacherModule,
    CourseModule,
    AssessmentModule,
    AnalyticsModule,
    AiModule,
    CommunicationModule,
    NotificationModule,
    SystemModule,
    ChatbotModule,
    FileManagementModule,
    GradingModule,
    ForumModule,
    CollaborativeLearningModule,
    RealtimeModule,
    IntelligentTutoringModule,
    ContentAnalysisModule,
    PredictiveAnalyticsModule,
    CachingModule,
    PerformanceModule,
    SecurityModule,
    PrivacyModule,
    AdminModule,
    UploadModule,
    OnboardingModule,
    PaymentModule,
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule {}
// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer
//       .apply(PerformanceMonitoringMiddleware, CompressionMiddleware, ResponseOptimizationMiddleware)
//       .forRoutes('*');
//   }
// }

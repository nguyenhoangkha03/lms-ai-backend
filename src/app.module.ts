import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '@/config/configuration';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from '@/logger/winston.module';
import { DatabaseModule } from './database/database.module';
import { CustomCacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseController } from './database/database.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
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
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration], // truyền vào hàm trả về đối tượng, không truyền thẳng đối tượng vì sẽ load trước
      isGlobal: true, // các module khác sử dụng k cần import
      cache: true, //sẽ chỉ chạy hàm configuration và đọc các tệp .env một lần duy nhất khi ứng dụng khởi động. Kết quả sẽ được lưu vào bộ nhớ đệm (cache).
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),

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
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule {}

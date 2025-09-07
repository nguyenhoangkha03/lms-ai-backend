import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { ChatRoom } from './entities/chat-room.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageThread } from './entities/chat-message-thread.entity';
import { ChatFile } from './entities/chat-file.entity';
import { ChatMessageReaction } from './entities/chat-message-reaction.entity';
import { ChatModeration } from './entities/chat-moderation.entity';
import { VideoSession } from './entities/video-session.entity';
import { VideoParticipant } from './entities/video-participant.entity';

// Controllers
import { ChatController } from './controllers/chat.controller';
import { ChatRoomController } from './controllers/chat-room.controller';
import { ChatModerationController } from './controllers/chat-moderation.controller';
import { VideoSessionController } from './controllers/video-session.controller';

// Services
import { ChatService } from './services/chat.service';
import { ChatRoomService } from './services/chat-room.service';
import { ChatMessageService } from './services/chat-message.service';
import { ChatModerationService } from './services/chat-moderation.service';
import { ChatFileService } from './services/chat-file.service';
import { ChatNotificationService } from './services/chat-notification.service';
import { ChatContactService } from './services/chat-contact.service';
import { UserService } from '../user/services/user.service';
import { NotificationService } from '../notification/services/notification.service';
import { WebRTCService } from './services/webrtc.service';
import { ZoomIntegrationService } from './services/zoom-integration.service';
import { VideoSessionService } from './services/video-session.service';
import { VideoRecordingService } from './services/video-recording.service';
import { AttendanceTrackingService } from './services/attendance-tracking.service';
import { BreakoutRoomService } from './services/breakout-room.service';
import { VideoAnalyticsService } from './services/video-analytics.service';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';
import { CourseEnrollmentListener } from './listeners/course-enrollment.listener';

// Processors
import { ChatMessageProcessor } from './processors/chat-message.processor';
import { ChatModerationProcessor } from './processors/chat-moderation.processor';

// Guards & Interceptors
import { ChatRoomAccessGuard } from './guards/chat-room-access.guard';
import { ChatModerationGuard } from './guards/chat-moderation.guard';

// Other modules
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { FileManagementModule } from '../file-management/file-management.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { CollaborativeLearningModule } from '../collaborative-learning/collaborative-learning.module';
import { CustomCacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';
import { HttpModule } from '@nestjs/axios';
import { VideoRecordingProcessor } from './processors/video-recording.processor';
import { VideoAnalyticsProcessor } from './processors/video-analytics.processor';
import { VideoSessionAccessGuard } from './guards/video-session-access.guard';
import { VideoGateway } from './gateways/video.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Chat Entities
      ChatRoom,
      ChatParticipant,
      ChatMessage,
      ChatMessageThread,
      ChatFile,
      ChatMessageReaction,
      ChatModeration,
      // Video Entities
      VideoSession,
      VideoParticipant,
    ]),
    BullModule.registerQueue(
      { name: 'chat-message' },
      { name: 'chat-moderation' },
      { name: 'chat-notification' },
      { name: 'video-recording' },
      { name: 'video-analytics' },
      { name: 'video-notification' },
    ),
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
    HttpModule.register({
      timeout: 30000,
    }),
    JwtModule.register({}),
    CacheModule.register({
      ttl: 300, // 5 minutes
    }),
    UserModule,
    CourseModule,
    FileManagementModule,
    NotificationModule,
    AuthModule,
    CollaborativeLearningModule,
    CustomCacheModule,
    WinstonModule,
  ],
  controllers: [
    // Chat Controllers
    ChatController,
    ChatRoomController,
    ChatModerationController,
    VideoSessionController,
  ],
  providers: [
    // Others
    NotificationService,
    UserService,
    // Chat Services
    ChatService,
    ChatRoomService,
    ChatMessageService,
    ChatModerationService,
    ChatFileService,
    ChatNotificationService,
    ChatContactService,
    // Video Services
    VideoSessionService,
    ZoomIntegrationService,
    WebRTCService,
    VideoRecordingService,
    BreakoutRoomService,
    AttendanceTrackingService,
    VideoAnalyticsService,
    // Gateways
    ChatGateway,
    VideoGateway,
    // Listeners
    CourseEnrollmentListener,
    // Processors
    ChatMessageProcessor,
    ChatModerationProcessor,
    VideoRecordingProcessor,
    VideoAnalyticsProcessor,
    // Guards
    ChatRoomAccessGuard,
    ChatModerationGuard,
    VideoSessionAccessGuard,
  ],
  exports: [
    TypeOrmModule,
    ChatService,
    ChatRoomService,
    ChatMessageService,
    ChatContactService,
    ChatGateway,
    VideoSessionService,
    VideoGateway,
    AttendanceTrackingService,
  ],
})
export class CommunicationModule {}

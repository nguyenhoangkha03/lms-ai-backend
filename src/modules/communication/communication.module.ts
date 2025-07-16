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
import { CommunicationController } from './controllers/communication.controller';

// Services
import { ChatService } from './services/chat.service';
import { ChatRoomService } from './services/chat-room.service';
import { ChatMessageService } from './services/chat-message.service';
import { ChatModerationService } from './services/chat-moderation.service';
import { ChatFileService } from './services/chat-file.service';
import { ChatNotificationService } from './services/chat-notification.service';
import { CommunicationService } from './services/communication.service';
import { UserService } from '../user/services/user.service';
import { NotificationService } from '../notification/notification.service';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';

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
import { CustomCacheModule } from '@/cache/cache.module';
import { WinstonModule } from '@/logger/winston.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatParticipant,
      ChatMessage,
      ChatMessageThread,
      ChatFile,
      ChatMessageReaction,
      ChatModeration,
      VideoSession,
      VideoParticipant,
    ]),
    BullModule.registerQueue(
      { name: 'chat-message' },
      { name: 'chat-moderation' },
      { name: 'chat-notification' },
    ),
    MulterModule.register({
      dest: './uploads/chat',
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
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
    CustomCacheModule,
    WinstonModule,
  ],
  controllers: [
    CommunicationController,
    ChatController,
    ChatRoomController,
    ChatModerationController,
  ],
  providers: [
    CommunicationService,
    ChatMessageService,
    ChatModerationService,
    ChatFileService,
    ChatService,
    ChatRoomService,
    ChatNotificationService,
    NotificationService,
    UserService,
    ChatGateway,
    ChatMessageProcessor,
    ChatModerationProcessor,
    ChatRoomAccessGuard,
    ChatModerationGuard,
  ],
  exports: [TypeOrmModule, ChatService, ChatRoomService, ChatMessageService, ChatGateway],
})
export class CommunicationModule {}

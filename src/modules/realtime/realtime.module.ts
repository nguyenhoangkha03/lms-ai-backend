import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { RealtimeEvent } from './entities/realtime-event.entity';
import { ActivityFeed } from './entities/activity-feed.entity';
import { UserPresence } from './entities/user-presence.entity';

// Controllers
import { RealtimeController } from './controllers/realtime.controller';

// Services
import { RealtimeEventService } from './services/realtime-event.service';
import { UserPresenceService } from './services/user-presence.service';
import { ActivityFeedService } from './services/activity-feed.service';

// Gateways
import { RealtimeGateway } from './gateways/realtime.gateway';

// Processors
import { RealtimeEventProcessor } from './processors/realtime-event.processor';

// External modules
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RealtimeEvent, ActivityFeed, UserPresence]),
    BullModule.registerQueue({
      name: 'realtime-events',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
    UserModule,
    AuthModule,
    forwardRef(() => NotificationModule),
    forwardRef(() => CommunicationModule),
  ],
  controllers: [RealtimeController],
  providers: [
    // Services
    RealtimeEventService,
    UserPresenceService,
    ActivityFeedService,

    // Gateways
    RealtimeGateway,

    // Processors
    RealtimeEventProcessor,
  ],
  exports: [RealtimeEventService, UserPresenceService, ActivityFeedService, RealtimeGateway],
})
export class RealtimeModule {}

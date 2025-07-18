import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';

// Entities
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationSubscription } from './entities/notification-subscription.entity';

// Controllers
import { NotificationController } from './controllers/notification.controller';
import { NotificationPreferenceController } from './controllers/notification-preference.controller';
import { NotificationTemplateController } from './controllers/notification-template.controller';
import { NotificationSubscriptionController } from './controllers/notification-subscription.controller';

// Services
import { NotificationService } from './services/notification.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { EmailNotificationService } from './services/email-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { SmsNotificationService } from './services/sms-notification.service';
import { NotificationTemplateService } from './services/notification-template.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationSubscriptionService } from './services/notification-subscription.service';
import { NotificationAnalyticsService } from './services/notification-analytics.service';

// Processors
import { NotificationDeliveryProcessor } from './processors/notification-delivery.processor';

// External modules
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      NotificationTemplate,
      NotificationDelivery,
      NotificationSubscription,
    ]),
    BullModule.registerQueue(
      { name: 'notification-delivery' },
      { name: 'notification-analytics' },
      { name: 'notification-cleanup' },
    ),
    ConfigModule,
    UserModule,
    AuthModule,
  ],
  controllers: [
    NotificationController,
    NotificationPreferenceController,
    NotificationTemplateController,
    NotificationSubscriptionController,
  ],
  providers: [
    // Core services
    NotificationService,
    NotificationDeliveryService,
    NotificationPreferenceService,
    NotificationTemplateService,
    NotificationSubscriptionService,
    NotificationAnalyticsService,

    // Channel services
    EmailNotificationService,
    PushNotificationService,
    SmsNotificationService,

    // Processors
    NotificationDeliveryProcessor,
  ],
  exports: [
    TypeOrmModule,
    NotificationService,
    NotificationDeliveryService,
    EmailNotificationService,
    PushNotificationService,
    SmsNotificationService,
  ],
})
export class NotificationModule {}

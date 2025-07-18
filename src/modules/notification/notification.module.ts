import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Entities
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { NotificationSubscription } from './entities/notification-subscription.entity';
// Mail
import { EmailCampaign } from './entities/email-campaign.entity';
import { EmailCampaignRecipient } from './entities/email-campaign-recipient.entity';
import { EmailCampaignAnalytics } from './entities/email-campaign-analytics.entity';
import { EmailAutomationWorkflow } from './entities/email-automation-workflow.entity';
import { EmailAutomationStep } from './entities/email-automation-step.entity';
import { EmailSuppressionList } from './entities/email-suppression-list.entity';

// Controllers
import { NotificationController } from './controllers/notification.controller';
import { NotificationPreferenceController } from './controllers/notification-preference.controller';
import { NotificationTemplateController } from './controllers/notification-template.controller';
import { NotificationSubscriptionController } from './controllers/notification-subscription.controller';
import { EmailCampaignController } from './controllers/email-campaign.controller';
import { EmailAutomationController } from './controllers/email-automation.controller';
import { EmailTrackingController } from './controllers/email-tracking.controller';

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
// Mail
import { EmailCampaignService } from './services/email-campaign.service';
import { EmailAutomationService } from './services/email-automation.service';
import { EmailAnalyticsService } from './services/email-analytics.service';
import { EmailSuppressionService } from './services/email-suppression.service';
import { SmtpProviderService } from './services/smtp-provider.service';
import { SendGridService } from './services/sendgrid.service';
import { MailgunService } from './services/mailgun.service';

// Processors
import { NotificationDeliveryProcessor } from './processors/notification-delivery.processor';
import { EmailCampaignProcessor } from './processors/email-campaign.processor';

// External modules
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      NotificationTemplate,
      NotificationDelivery,
      NotificationSubscription,
      // Mail
      EmailCampaign,
      EmailCampaignRecipient,
      EmailCampaignAnalytics,
      EmailAutomationWorkflow,
      EmailAutomationStep,
      EmailSuppressionList,
    ]),
    // BullModule.registerQueue(
    //   { name: 'notification-delivery' },
    //   { name: 'notification-analytics' },
    //   { name: 'notification-cleanup' },
    // ),
    BullModule.registerQueue(
      {
        name: 'notification-delivery',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
      {
        name: 'email-campaign',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: 'email-automation',
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      },
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
    // Mail
    EmailCampaignController,
    EmailAutomationController,
    EmailTrackingController,
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

    // Mail
    EmailCampaignService,
    EmailAutomationService,
    EmailAnalyticsService,
    EmailSuppressionService,
    SmtpProviderService,
    SendGridService,
    MailgunService,

    // Processors
    NotificationDeliveryProcessor,
    EmailCampaignProcessor,
  ],
  exports: [
    TypeOrmModule,
    NotificationService,
    NotificationDeliveryService,
    EmailNotificationService,
    PushNotificationService,
    SmsNotificationService,
    // Mail
    EmailCampaignService,
    EmailAutomationService,
    EmailAnalyticsService,
    EmailSuppressionService,
    SmtpProviderService,
  ],
})
export class NotificationModule {}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Notification } from '../entities/notification.entity';
import { NotificationDelivery } from '../entities/notification-delivery.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationSubscription } from '../entities/notification-subscription.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { EmailNotificationService } from './email-notification.service';
import { PushNotificationService } from './push-notification.service';
import { SmsNotificationService } from './sms-notification.service';
import {
  DeliveryChannel,
  DeliveryStatus,
  NotificationPriority,
  NotificationType,
} from '@/common/enums/notification.enums';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationDelivery)
    private deliveryRepository: Repository<NotificationDelivery>,
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(NotificationSubscription)
    private subscriptionRepository: Repository<NotificationSubscription>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectQueue('notification-delivery')
    private deliveryQueue: Queue,
    private emailService: EmailNotificationService,
    private pushService: PushNotificationService,
    private smsService: SmsNotificationService,
  ) {}

  async deliverNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user'],
    });

    if (!notification) {
      this.logger.error(`Notification not found: ${notificationId}`);
      return;
    }

    const preferences = await this.preferenceRepository.find({
      where: { userId: notification.userId },
    });

    const enabledChannels = await this.getEnabledChannels(notification, preferences);

    for (const channel of enabledChannels) {
      await this.deliveryQueue.add(
        'deliver-single-channel',
        {
          notificationId,
          channel,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          delay: this.getChannelDelay(channel),
        },
      );
    }
  }

  async deliverToChannel(notificationId: string, channel: DeliveryChannel): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user'],
    });

    if (!notification) {
      this.logger.error(`Notification not found: ${notificationId}`);
      return;
    }

    // Create delivery record
    const delivery = await this.createDeliveryRecord(notification, channel);

    try {
      const template = await this.getTemplate(notification.type, channel);
      const variables = this.extractTemplateVariables(notification);

      let success = false;

      switch (channel) {
        case DeliveryChannel.EMAIL:
          success = await this.deliverEmail(notification, template, variables, delivery);
          break;
        case DeliveryChannel.PUSH:
          success = await this.deliverPush(notification, template, variables, delivery);
          break;
        case DeliveryChannel.SMS:
          success = await this.deliverSms(notification, template, variables, delivery);
          break;
        case DeliveryChannel.IN_APP:
          success = await this.deliverInApp(notification, delivery);
          break;
        default:
          this.logger.warn(`Unsupported delivery channel: ${channel}`);
      }

      // Update delivery status
      await this.updateDeliveryStatus(
        delivery.id,
        success ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
      );

      // Update notification delivery status
      await this.updateNotificationDeliveryStatus(notification, channel, success);
    } catch (error) {
      this.logger.error(
        `Delivery failed for notification ${notificationId} on channel ${channel}:`,
        error,
      );
      await this.updateDeliveryStatus(delivery.id, DeliveryStatus.FAILED, error.message);
    }
  }

  private async getEnabledChannels(
    notification: Notification,
    preferences: NotificationPreference[],
  ): Promise<DeliveryChannel[]> {
    const channels: DeliveryChannel[] = [];

    const preference = preferences.find(p => p.notificationType === notification.type);

    if (!preference) {
      // Default channels if no preference set
      channels.push(DeliveryChannel.IN_APP);
      return channels;
    }

    // Check quiet hours
    if (this.isInQuietHours(preference)) {
      // Only allow urgent notifications during quiet hours
      if (notification.priority !== NotificationPriority.URGENT) {
        channels.push(DeliveryChannel.IN_APP);
        return channels;
      }
    }

    if (preference.emailEnabled) channels.push(DeliveryChannel.EMAIL);
    if (preference.pushEnabled) channels.push(DeliveryChannel.PUSH);
    if (preference.smsEnabled) channels.push(DeliveryChannel.SMS);
    if (preference.inAppEnabled) channels.push(DeliveryChannel.IN_APP);

    return channels;
  }

  private isInQuietHours(preference: NotificationPreference): boolean {
    if (!preference.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentDay = now.getDay();

    const { startTime, endTime, weekdays } = preference.quietHours;

    // Check if current day is in quiet days
    if (weekdays && !weekdays.includes(currentDay)) {
      return false;
    }

    // Check if current time is in quiet hours
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async deliverEmail(
    notification: Notification,
    template: NotificationTemplate,
    variables: Record<string, any>,
    delivery: NotificationDelivery,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: notification.userId },
    });

    if (!user?.email) {
      this.logger.warn(`No email address for user ${notification.userId}`);
      return false;
    }

    const success = await this.emailService.sendEmail(
      notification,
      template,
      user.email,
      variables,
    );

    if (success) {
      await this.deliveryRepository.update(delivery.id, {
        recipientAddress: user.email,
        sentAt: new Date(),
      });
    }

    return success;
  }

  private async deliverPush(
    notification: Notification,
    template: NotificationTemplate,
    variables: Record<string, any>,
    delivery: NotificationDelivery,
  ): Promise<boolean> {
    const subscriptions = await this.subscriptionRepository.find({
      where: {
        userId: notification.userId,
        channel: DeliveryChannel.PUSH,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      this.logger.warn(`No push subscriptions for user ${notification.userId}`);
      return false;
    }

    let successCount = 0;

    for (const subscription of subscriptions) {
      try {
        const success = await this.pushService.sendWebPush(
          notification,
          template,
          subscription,
          variables,
        );
        if (success) {
          successCount++;
          await this.subscriptionRepository.update(subscription.id, {
            lastDeliveryAt: new Date(),
            failureCount: 0,
          });
        } else {
          await this.subscriptionRepository.increment({ id: subscription.id }, 'failureCount', 1);
        }
      } catch (error) {
        this.logger.error(`Push delivery failed for subscription ${subscription.id}:`, error);
        await this.subscriptionRepository.increment({ id: subscription.id }, 'failureCount', 1);
      }
    }

    const success = successCount > 0;

    if (success) {
      await this.deliveryRepository.update(delivery.id, {
        sentAt: new Date(),
      });
    }

    return success;
  }

  private async deliverSms(
    notification: Notification,
    template: NotificationTemplate,
    variables: Record<string, any>,
    delivery: NotificationDelivery,
  ): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: notification.userId },
      relations: ['profile'],
    });

    const phoneNumber = user?.phone;

    if (!phoneNumber) {
      this.logger.warn(`No phone number for user ${notification.userId}`);
      return false;
    }

    const success = await this.smsService.sendSms(notification, template, phoneNumber, variables);

    if (success) {
      await this.deliveryRepository.update(delivery.id, {
        recipientAddress: phoneNumber,
        sentAt: new Date(),
      });
    }

    return success;
  }

  private async deliverInApp(
    notification: Notification,
    delivery: NotificationDelivery,
  ): Promise<boolean> {
    // In-app notifications are already stored in the database
    // Just mark as delivered
    await this.deliveryRepository.update(delivery.id, {
      sentAt: new Date(),
      deliveredAt: new Date(),
    });

    return true;
  }

  private async createDeliveryRecord(
    notification: Notification,
    channel: DeliveryChannel,
  ): Promise<NotificationDelivery> {
    const delivery = this.deliveryRepository.create({
      notificationId: notification.id,
      channel,
      status: DeliveryStatus.PENDING,
    });

    return this.deliveryRepository.save(delivery);
  }

  private async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: any = { status };

    if (status === DeliveryStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === DeliveryStatus.FAILED && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.deliveryRepository.update(deliveryId, updateData);
  }

  private async updateNotificationDeliveryStatus(
    notification: Notification,
    channel: DeliveryChannel,
    success: boolean,
  ): Promise<void> {
    const deliveryStatus = notification.deliveryStatus || {};

    deliveryStatus[channel] = {
      sent: success,
      deliveredAt: success ? new Date() : undefined,
    };

    await this.notificationRepository.update(notification.id, {
      deliveryStatus,
    });
  }

  private async getTemplate(
    notificationType: string,
    channel: DeliveryChannel,
  ): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: {
        type: notificationType as NotificationType,
        channel,
        isActive: true,
      },
    });

    if (!template) {
      // Return default template
      return this.createDefaultTemplate(notificationType, channel);
    }

    return template;
  }

  private createDefaultTemplate(
    notificationType: string,
    channel: DeliveryChannel,
  ): NotificationTemplate {
    const template = new NotificationTemplate();
    template.type = notificationType as any;
    template.channel = channel;
    template.subject = '{{title}}';
    template.body = '{{message}}';
    template.isDefault = true;

    return template;
  }

  private extractTemplateVariables(notification: Notification): Record<string, any> {
    return {
      title: notification.title,
      message: notification.message,
      userFirstName: notification.user?.firstName || '',
      userLastName: notification.user?.lastName || '',
      actionUrl: notification.actionUrl || '',
      priority: notification.priority,
      category: notification.category,
      createdAt: notification.createdAt,
      ...notification.metadata,
    };
  }

  private getChannelDelay(channel: DeliveryChannel): number {
    // Stagger deliveries to avoid overwhelming services
    switch (channel) {
      case DeliveryChannel.IN_APP:
        return 0; // Immediate
      case DeliveryChannel.PUSH:
        return 1000; // 1 second delay
      case DeliveryChannel.EMAIL:
        return 2000; // 2 second delay
      case DeliveryChannel.SMS:
        return 5000; // 5 second delay
      default:
        return 1000;
    }
  }

  async scheduleNotification(notificationId: string, scheduledFor: Date): Promise<void> {
    const delay = scheduledFor.getTime() - Date.now();

    if (delay <= 0) {
      // Deliver immediately if scheduled time has passed
      await this.deliverNotification(notificationId);
    } else {
      await this.deliveryQueue.add('deliver-notification', { notificationId }, { delay });
    }
  }

  async retryFailedDeliveries(): Promise<void> {
    const failedDeliveries = await this.deliveryRepository.find({
      where: {
        status: DeliveryStatus.FAILED,
        retryCount: { $lt: 3 } as any,
      },
      relations: ['notification'],
    });

    for (const delivery of failedDeliveries) {
      const retryDelay = Math.pow(2, delivery.retryCount) * 60000; // Exponential backoff in minutes

      await this.deliveryQueue.add(
        'retry-delivery',
        {
          deliveryId: delivery.id,
        },
        {
          delay: retryDelay,
        },
      );

      await this.deliveryRepository.update(delivery.id, {
        retryCount: delivery.retryCount + 1,
        nextRetryAt: new Date(Date.now() + retryDelay),
      });
    }
  }
}

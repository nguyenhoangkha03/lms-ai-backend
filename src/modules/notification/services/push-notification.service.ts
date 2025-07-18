import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import * as admin from 'firebase-admin';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationSubscription } from '../entities/notification-subscription.entity';
import { NotificationPriority } from '@/common/enums/notification.enums';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp?: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeServices();
  }

  private initializeServices() {
    this.initializeWebPush();
    this.initializeFirebase();
  }

  private initializeWebPush() {
    const vapidPublicKey = this.configService.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.configService.get('VAPID_PRIVATE_KEY');
    const vapidEmail = this.configService.get('VAPID_EMAIL');

    if (vapidPublicKey && vapidPrivateKey && vapidEmail) {
      webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
    }
  }

  private initializeFirebase() {
    const firebaseConfig = this.configService.get('FIREBASE_CONFIG');

    if (firebaseConfig) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: this.configService.get('FIREBASE_PROJECT_ID'),
            clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
            privateKey: this.configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
          }),
        });
      } catch (error) {
        this.logger.error('Failed to initialize Firebase:', error);
      }
    }
  }

  async sendWebPush(
    notification: Notification,
    template: NotificationTemplate,
    subscription: NotificationSubscription,
    variables: Record<string, any> = {},
  ): Promise<boolean> {
    try {
      const title = this.renderTemplate(template.subject, variables);
      const body = this.renderTemplate(template.body, variables);

      const payload = {
        title,
        body,
        icon: notification.iconUrl || '/icons/notification-icon.png',
        image: notification.imageUrl,
        badge: '/icons/badge-icon.png',
        data: {
          notificationId: notification.id,
          actionUrl: notification.actionUrl,
          type: notification.type,
          timestamp: Date.now(),
        },
        actions:
          notification.actions?.map(action => ({
            action: action.id,
            title: action.label,
          })) || [],
        requireInteraction: notification.priority === NotificationPriority.URGENT,
        silent: notification.priority === NotificationPriority.LOW,
      };

      if (subscription.config?.pushSubscription) {
        await webpush.sendNotification(
          subscription.config.pushSubscription,
          JSON.stringify(payload),
        );
      }

      this.logger.log(`Web push sent successfully to subscription ${subscription.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send web push:`, error);
      return false;
    }
  }

  async sendFirebasePush(
    notification: Notification,
    template: NotificationTemplate,
    deviceToken: string,
    variables: Record<string, any> = {},
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      this.logger.error('Firebase not initialized');
      return false;
    }

    try {
      const title = this.renderTemplate(template.subject, variables);
      const body = this.renderTemplate(template.body, variables);

      const message = {
        token: deviceToken,
        notification: {
          title,
          body,
          imageUrl: notification.imageUrl,
        },
        data: {
          notificationId: notification.id,
          actionUrl: notification.actionUrl || '',
          type: notification.type,
          relatedId: notification.relatedId || '',
          relatedType: notification.relatedType || '',
        },
        android: {
          priority: NotificationPriority.HIGH as 'high',
          notification: {
            icon: 'notification_icon',
            color: '#4285f4',
            sound: 'default',
            channelId: notification.category,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.log(`Firebase push sent successfully to ${deviceToken}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Firebase push:`, error);
      return false;
    }
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  async sendBulkPush(
    notifications: Array<{
      notification: Notification;
      template: NotificationTemplate;
      subscription: NotificationSubscription;
      variables: Record<string, any>;
    }>,
  ): Promise<{ successful: number; failed: number }> {
    const results = await Promise.allSettled(
      notifications.map(({ notification, template, subscription, variables }) =>
        this.sendWebPush(notification, template, subscription, variables),
      ),
    );

    const successful = results.filter(
      result => result.status === 'fulfilled' && result.value === true,
    ).length;
    const failed = results.length - successful;

    this.logger.log(`Bulk push completed: ${successful} successful, ${failed} failed`);

    return { successful, failed };
  }
}

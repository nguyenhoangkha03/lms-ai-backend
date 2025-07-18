import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name);
  private twilioClient: Twilio;

  constructor(private configService: ConfigService) {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = new Twilio(accountSid, authToken);
    }
  }

  async sendSms(
    notification: Notification,
    template: NotificationTemplate,
    phoneNumber: string,
    variables: Record<string, any> = {},
  ): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.error('Twilio client not initialized');
      return false;
    }

    try {
      const message = this.renderTemplate(template.body, variables);
      const fromNumber = this.configService.get('TWILIO_PHONE_NUMBER');

      await this.twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: phoneNumber,
      });

      this.logger.log(`SMS sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
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

  async sendBulkSms(
    notifications: Array<{
      notification: Notification;
      template: NotificationTemplate;
      phoneNumber: string;
      variables: Record<string, any>;
    }>,
  ): Promise<{ successful: number; failed: number }> {
    const results = await Promise.allSettled(
      notifications.map(({ notification, template, phoneNumber, variables }) =>
        this.sendSms(notification, template, phoneNumber, variables),
      ),
    );

    const successful = results.filter(
      result => result.status === 'fulfilled' && result.value === true,
    ).length;
    const failed = results.length - successful;

    this.logger.log(`Bulk SMS completed: ${successful} successful, ${failed} failed`);

    return { successful, failed };
  }

  async verifyPhoneNumber(phoneNumber: string): Promise<boolean> {
    if (!this.twilioClient) {
      return false;
    }

    try {
      const lookup = await this.twilioClient.lookups.v1.phoneNumbers(phoneNumber).fetch();
      return lookup.phoneNumber !== undefined;
    } catch (error) {
      this.logger.error(`Phone number verification failed for ${phoneNumber}:`, error);
      return false;
    }
  }
}

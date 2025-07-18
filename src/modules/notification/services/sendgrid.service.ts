import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import { EmailMessage, DeliveryResult } from './smtp-provider.service';

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('SENDGRID_API_KEY');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid service initialized');
    } else {
      this.logger.warn('SendGrid API key not found in configuration');
    }
  }

  async sendEmail(message: EmailMessage): Promise<DeliveryResult> {
    try {
      const emailData = {
        to: message.to,
        from: {
          email: message.from,
          name: message.fromName || undefined,
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        attachments: message.attachments?.map(att => ({
          filename: att.filename,
          content: att.content?.toString('base64') || '',
          type: att.contentType || 'application/octet-stream',
          disposition: 'attachment',
          contentId: att.cid,
        })),
        headers: message.headers,
        categories: message.tags,
        trackingSettings: {
          clickTracking: {
            enable: this.configService.get('SENDGRID_CLICK_TRACKING', 'true') === 'true',
          },
          openTracking: {
            enable: this.configService.get('SENDGRID_OPEN_TRACKING', 'true') === 'true',
          },
          subscriptionTracking: {
            enable: this.configService.get('SENDGRID_SUBSCRIPTION_TRACKING', 'true') === 'true',
          },
        },
      } as sgMail.MailDataRequired;

      const response = await sgMail.send(emailData);
      const messageId = response[0]?.headers?.['x-message-id'] || 'unknown';

      return {
        success: true,
        messageId,
        provider: 'sendgrid',
        timestamp: new Date(),
        recipientCount: 0, // Will be set by caller
      };
    } catch (error) {
      this.logger.error('SendGrid email send failed:', error);

      return {
        success: false,
        error: error.message || 'SendGrid send failed',
        provider: 'sendgrid',
        timestamp: new Date(),
        recipientCount: 0,
      };
    }
  }

  async sendBulkEmail(messages: EmailMessage[]): Promise<DeliveryResult[]> {
    try {
      const emailsData = messages.map(message => ({
        to: message.to,
        from: {
          email: message.from,
          name: message.fromName || undefined,
        },
        subject: message.subject,
        text: message.text, // ✅ đảm bảo có ít nhất text hoặc html
        html: message.html,
        cc: message.cc,
        bcc: message.bcc,
        replyTo: message.replyTo,
        headers: message.headers,
        categories: message.tags,
        trackingSettings: {
          clickTracking: {
            enable: this.configService.get('SENDGRID_CLICK_TRACKING', 'true') === 'true',
          },
          openTracking: {
            enable: this.configService.get('SENDGRID_OPEN_TRACKING', 'true') === 'true',
          },
          subscriptionTracking: {
            enable: this.configService.get('SENDGRID_SUBSCRIPTION_TRACKING', 'true') === 'true',
          },
        },
      })) as sgMail.MailDataRequired[];

      const response = await sgMail.send(emailsData);

      return messages.map((_, index) => {
        const res = response[index];
        const messageId =
          res && typeof res === 'object' && 'headers' in res && res.headers?.['x-message-id']
            ? res.headers['x-message-id']
            : 'unknown';

        return {
          success: true,
          messageId,
          provider: 'sendgrid',
          timestamp: new Date(),
          recipientCount: 1,
        };
      });
    } catch (error) {
      this.logger.error('SendGrid bulk email send failed:', error);

      return messages.map(() => ({
        success: false,
        error: error.message || 'SendGrid bulk send failed',
        provider: 'sendgrid',
        timestamp: new Date(),
        recipientCount: 1,
      }));
    }
  }

  async verifyConfiguration(): Promise<boolean> {
    try {
      // Test SendGrid configuration by getting account details
      const apiKey = this.configService.get('SENDGRID_API_KEY');
      if (!apiKey) {
        return false;
      }

      // Simple way to verify: try to get user info
      const response = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      this.logger.error('SendGrid configuration verification failed:', error);
      return false;
    }
  }

  async getDeliveryStatistics(messageIds: string[]): Promise<
    Array<{
      messageId: string;
      delivered: boolean;
      opened: boolean;
      clicked: boolean;
      bounced: boolean;
      unsubscribed: boolean;
    }>
  > {
    try {
      // This would require implementing SendGrid's Event Webhook
      // For now, return placeholder data
      return messageIds.map(messageId => ({
        messageId,
        delivered: true,
        opened: false,
        clicked: false,
        bounced: false,
        unsubscribed: false,
      }));
    } catch (error) {
      this.logger.error('Failed to get SendGrid delivery statistics:', error);
      return [];
    }
  }

  async handleWebhook(events: any[]): Promise<void> {
    for (const event of events) {
      try {
        switch (event.event) {
          case 'delivered':
            await this.handleDeliveredEvent(event);
            break;
          case 'open':
            await this.handleOpenEvent(event);
            break;
          case 'click':
            await this.handleClickEvent(event);
            break;
          case 'bounce':
            await this.handleBounceEvent(event);
            break;
          case 'unsubscribe':
            await this.handleUnsubscribeEvent(event);
            break;
          case 'spamreport':
            await this.handleSpamReportEvent(event);
            break;
          default:
            this.logger.debug(`Unhandled SendGrid event: ${event.event}`);
        }
      } catch (error) {
        this.logger.error(`Failed to process SendGrid webhook event:`, error);
      }
    }
  }

  private async handleDeliveredEvent(event: any): Promise<void> {
    this.logger.debug(`Email delivered: ${event.email} - Message ID: ${event.sg_message_id}`);
    // Update delivery status in database
  }

  private async handleOpenEvent(event: any): Promise<void> {
    this.logger.debug(`Email opened: ${event.email} - Message ID: ${event.sg_message_id}`);
    // Track email open in analytics
  }

  private async handleClickEvent(event: any): Promise<void> {
    this.logger.debug(`Email clicked: ${event.email} - URL: ${event.url}`);
    // Track click in analytics
  }

  private async handleBounceEvent(event: any): Promise<void> {
    this.logger.warn(`Email bounced: ${event.email} - Reason: ${event.reason}`);
    // Add to suppression list if hard bounce
  }

  private async handleUnsubscribeEvent(event: any): Promise<void> {
    this.logger.debug(`User unsubscribed: ${event.email}`);
    // Add to suppression list
  }

  private async handleSpamReportEvent(event: any): Promise<void> {
    this.logger.warn(`Spam report: ${event.email}`);
    // Add to suppression list and flag for review
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mailgun from 'mailgun-js';
import { EmailMessage, DeliveryResult } from './smtp-provider.service';

@Injectable()
export class MailgunService {
  private readonly logger = new Logger(MailgunService.name);
  private mg: mailgun.Mailgun;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('MAILGUN_API_KEY');
    const domain = this.configService.get('MAILGUN_DOMAIN');

    if (apiKey && domain) {
      this.mg = mailgun({
        apiKey,
        domain,
        host: this.configService.get('MAILGUN_HOST', 'api.mailgun.net'),
      });
      this.logger.log('Mailgun service initialized');
    } else {
      this.logger.warn('Mailgun API key or domain not found in configuration');
    }
  }

  async sendEmail(message: EmailMessage): Promise<DeliveryResult> {
    try {
      const emailData: mailgun.messages.SendData = {
        from: message.fromName ? `${message.fromName} <${message.from}>` : message.from,
        to: message.to,
        subject: message.subject,
        ...(message.text && { text: message.text }),
        ...(message.html && { html: message.html }),
        ...(message.cc && { cc: message.cc }),
        ...(message.bcc && { bcc: message.bcc }),
        ...(message.replyTo && { 'h:Reply-To': message.replyTo }),
        ...(message.headers && {
          'h:X-Custom-Headers': JSON.stringify(message.headers),
        }),
        ...(message.tags && { 'o:tag': message.tags }),
        ...(message.metadata && {
          'v:metadata': JSON.stringify(message.metadata),
        }),
        'o:tracking': this.configService.get('MAILGUN_TRACKING', 'true'),
        'o:tracking-clicks': this.configService.get('MAILGUN_CLICK_TRACKING', 'true'),
        'o:tracking-opens': this.configService.get('MAILGUN_OPEN_TRACKING', 'true'),
      };

      // Handle attachments
      if (message.attachments) {
        emailData.attachment = message.attachments.map(att => ({
          data: att.content || att.path,
          filename: att.filename,
          contentType: att.contentType,
        }));
      }

      const response = await this.mg.messages().send(emailData);

      return {
        success: true,
        messageId: response.id,
        provider: 'mailgun',
        timestamp: new Date(),
        recipientCount: 0, // Will be set by caller
      };
    } catch (error) {
      this.logger.error('Mailgun email send failed:', error);

      return {
        success: false,
        error: error.message || 'Mailgun send failed',
        provider: 'mailgun',
        timestamp: new Date(),
        recipientCount: 0,
      };
    }
  }

  async sendBulkEmail(messages: EmailMessage[]): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    // Mailgun doesn't have a native bulk send API, so we send individually
    for (const message of messages) {
      const result = await this.sendEmail(message);
      results.push(result);

      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  async verifyConfiguration(): Promise<boolean> {
    try {
      if (!this.mg) {
        return false;
      }

      // Test configuration by getting domain info
      const domain = this.configService.get('MAILGUN_DOMAIN');
      await this.mg.domains(domain).info();

      return true;
    } catch (error) {
      this.logger.error('Mailgun configuration verification failed:', error);
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
      const stats: {
        messageId: string;
        delivered: boolean;
        opened: boolean;
        clicked: boolean;
        bounced: boolean;
        unsubscribed: boolean;
      }[] = [];

      for (const messageId of messageIds) {
        try {
          // Query Mailgun events for this message
          const events = await this.mg.events().get({
            'message-id': messageId,
          });

          const delivered = events.items.some(e => e.event === 'delivered');
          const opened = events.items.some(e => e.event === 'opened');
          const clicked = events.items.some(e => e.event === 'clicked');
          const bounced = events.items.some(e => e.event === 'bounced');
          const unsubscribed = events.items.some(e => e.event === 'unsubscribed');

          stats.push({
            messageId,
            delivered,
            opened,
            clicked,
            bounced,
            unsubscribed,
          });
        } catch (error) {
          this.logger.error(`Failed to get stats for message ${messageId}:`, error);
          stats.push({
            messageId,
            delivered: false,
            opened: false,
            clicked: false,
            bounced: false,
            unsubscribed: false,
          });
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get Mailgun delivery statistics:', error);
      return [];
    }
  }

  async handleWebhook(eventData: any): Promise<void> {
    try {
      const { 'event-data': event } = eventData;

      switch (event.event) {
        case 'delivered':
          await this.handleDeliveredEvent(event);
          break;
        case 'opened':
          await this.handleOpenEvent(event);
          break;
        case 'clicked':
          await this.handleClickEvent(event);
          break;
        case 'bounced':
          await this.handleBounceEvent(event);
          break;
        case 'unsubscribed':
          await this.handleUnsubscribeEvent(event);
          break;
        case 'complained':
          await this.handleComplaintEvent(event);
          break;
        default:
          this.logger.debug(`Unhandled Mailgun event: ${event.event}`);
      }
    } catch (error) {
      this.logger.error('Failed to process Mailgun webhook:', error);
    }
  }

  private async handleDeliveredEvent(event: any): Promise<void> {
    this.logger.debug(
      `Email delivered: ${event.recipient} - Message ID: ${event.message.headers['message-id']}`,
    );
    // Update delivery status in database
  }

  private async handleOpenEvent(event: any): Promise<void> {
    this.logger.debug(
      `Email opened: ${event.recipient} - Message ID: ${event.message.headers['message-id']}`,
    );
    // Track email open in analytics
  }

  private async handleClickEvent(event: any): Promise<void> {
    this.logger.debug(`Email clicked: ${event.recipient} - URL: ${event.url}`);
    // Track click in analytics
  }

  private async handleBounceEvent(event: any): Promise<void> {
    this.logger.warn(`Email bounced: ${event.recipient} - Reason: ${event.reason}`);
    // Add to suppression list if hard bounce
  }

  private async handleUnsubscribeEvent(event: any): Promise<void> {
    this.logger.debug(`User unsubscribed: ${event.recipient}`);
    // Add to suppression list
  }

  private async handleComplaintEvent(event: any): Promise<void> {
    this.logger.warn(`Spam complaint: ${event.recipient}`);
    // Add to suppression list and flag for review
  }

  async getDomainStatistics(): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    complained: number;
  }> {
    try {
      const domain = this.configService.get('MAILGUN_DOMAIN');
      const stats = await this.mg.domains(domain).stats();

      return {
        sent: stats.total_sent || 0,
        delivered: stats.total_delivered || 0,
        opened: stats.total_opened || 0,
        clicked: stats.total_clicked || 0,
        bounced: stats.total_bounced || 0,
        unsubscribed: stats.total_unsubscribed || 0,
        complained: stats.total_complained || 0,
      };
    } catch (error) {
      this.logger.error('Failed to get Mailgun domain statistics:', error);
      return {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        complained: 0,
      };
    }
  }

  async validateEmail(email: string): Promise<{
    isValid: boolean;
    isDeliverable: boolean;
    reason?: string;
  }> {
    try {
      const validation = await this.mg.validate(email);

      return {
        isValid: validation.is_valid,
        isDeliverable: validation.is_deliverable,
        reason: validation.reason,
      };
    } catch (error) {
      this.logger.error(`Email validation failed for ${email}:`, error);
      return {
        isValid: false,
        isDeliverable: false,
        reason: 'Validation service error',
      };
    }
  }
}

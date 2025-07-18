import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as AWS from 'aws-sdk';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter;
  private sesClient?: AWS.SES;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailProvider = this.configService.get('EMAIL_PROVIDER', 'smtp');

    if (emailProvider === 'ses') {
      this.initializeSES();
    } else {
      this.initializeSMTP();
    }
  }

  private initializeSES() {
    this.sesClient = new AWS.SES({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });
  }

  private initializeSMTP() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: this.configService.get('SMTP_SECURE', false),
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(
    notification: Notification,
    template: NotificationTemplate,
    recipientEmail: string,
    variables: Record<string, any> = {},
  ): Promise<boolean> {
    try {
      const subject = this.renderTemplate(template.subject, variables);
      const htmlBody = this.renderTemplate(template.htmlBody || template.body, variables);
      const textBody = this.renderTemplate(template.body, variables);

      const mailOptions = {
        from: this.configService.get('EMAIL_FROM_ADDRESS'),
        to: recipientEmail,
        subject,
        text: textBody,
        html: htmlBody,
        headers: {
          'X-Notification-ID': notification.id,
          'X-Notification-Type': notification.type,
        },
      };

      if (this.sesClient) {
        await this.sendViaSES(mailOptions);
      } else {
        await this.transporter.sendMail(mailOptions);
      }

      this.logger.log(`Email sent successfully to ${recipientEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipientEmail}:`, error);
      return false;
    }
  }

  private async sendViaSES(mailOptions: any): Promise<void> {
    const params = {
      Source: mailOptions.from,
      Destination: {
        ToAddresses: [mailOptions.to],
      },
      Message: {
        Subject: {
          Data: mailOptions.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: mailOptions.text,
            Charset: 'UTF-8',
          },
          Html: {
            Data: mailOptions.html,
            Charset: 'UTF-8',
          },
        },
      },
    };

    await this.sesClient!.sendEmail(params).promise();
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    // Simple template variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  async sendBulkEmail(
    notifications: Array<{
      notification: Notification;
      template: NotificationTemplate;
      recipientEmail: string;
      variables: Record<string, any>;
    }>,
  ): Promise<{ successful: number; failed: number }> {
    const results = await Promise.allSettled(
      notifications.map(({ notification, template, recipientEmail, variables }) =>
        this.sendEmail(notification, template, recipientEmail, variables),
      ),
    );

    const successful = results.filter(
      result => result.status === 'fulfilled' && result.value === true,
    ).length;
    const failed = results.length - successful;

    this.logger.log(`Bulk email completed: ${successful} successful, ${failed} failed`);

    return { successful, failed };
  }

  async verifyEmailConfiguration(): Promise<boolean> {
    try {
      if (this.sesClient) {
        const fromEmail = this.configService.get('SES_FROM_EMAIL');
        if (!fromEmail) throw new Error('SES_FROM_EMAIL is not set in config');

        await this.sesClient
          .getIdentityVerificationAttributes({
            Identities: [fromEmail],
          })
          .promise();

        return true;
      } else {
        await this.transporter.verify();
        return true;
      }
    } catch (error) {
      this.logger.error('Email configuration verification failed:', error);
      return false;
    }
  }
}

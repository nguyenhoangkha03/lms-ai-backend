import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as AWS from 'aws-sdk';
import { SendGridService } from './sendgrid.service';
import { MailgunService } from './mailgun.service';

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
    cid?: string;
  }>;
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
  timestamp: Date;
  recipientCount: number;
}

@Injectable()
export class SmtpProviderService {
  private readonly logger = new Logger(SmtpProviderService.name);
  private transporter?: nodemailer.Transporter;
  private sesClient?: AWS.SES;
  private activeProvider: string;

  constructor(
    private configService: ConfigService,
    private sendGridService: SendGridService,
    private mailgunService: MailgunService,
  ) {
    this.activeProvider = this.configService.get('EMAIL_PROVIDER', 'smtp');
    this.initializeProvider();
  }

  private initializeProvider(): void {
    switch (this.activeProvider) {
      case 'ses':
        this.initializeSES();
        break;
      case 'sendgrid':
        // SendGrid service initialized via dependency injection
        break;
      case 'mailgun':
        // Mailgun service initialized via dependency injection
        break;
      case 'smtp':
      default:
        this.initializeSMTP();
        break;
    }
  }

  private initializeSES(): void {
    this.sesClient = new AWS.SES({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });
    this.logger.log('AWS SES provider initialized');
  }

  private initializeSMTP(): void {
    const config = {
      host: this.configService.get('SMTP_HOST'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
      pool: true,
      maxConnections: parseInt(this.configService.get('SMTP_MAX_CONNECTIONS', '5')),
      maxMessages: parseInt(this.configService.get('SMTP_MAX_MESSAGES', '100')),
      rateDelta: parseInt(this.configService.get('SMTP_RATE_DELTA', '1000')),
      rateLimit: parseInt(this.configService.get('SMTP_RATE_LIMIT', '14')),
    };

    this.transporter = nodemailer.createTransport(config);
    this.logger.log('SMTP provider initialized');
  }

  async sendEmail(message: EmailMessage): Promise<DeliveryResult> {
    const startTime = Date.now();
    const recipients = Array.isArray(message.to) ? message.to : [message.to];
    const recipientCount = recipients.length;

    try {
      let result: DeliveryResult;

      switch (this.activeProvider) {
        case 'ses':
          result = await this.sendViaSES(message);
          break;
        case 'sendgrid':
          result = await this.sendViaSendGrid(message);
          break;
        case 'mailgun':
          result = await this.sendViaMailgun(message);
          break;
        case 'smtp':
        default:
          result = await this.sendViaSMTP(message);
          break;
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Email sent via ${this.activeProvider} in ${duration}ms - Success: ${result.success}, Recipients: ${recipientCount}`,
      );

      return {
        ...result,
        recipientCount,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Email failed via ${this.activeProvider} in ${duration}ms - Recipients: ${recipientCount}`,
        error,
      );

      return {
        success: false,
        error: error.message,
        provider: this.activeProvider,
        timestamp: new Date(),
        recipientCount,
      };
    }
  }

  private async sendViaSMTP(message: EmailMessage): Promise<DeliveryResult> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions = {
      from: message.fromName ? `"${message.fromName}" <${message.from}>` : message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
      headers: message.headers,
    };

    const info = await this.transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp',
      timestamp: new Date(),
      recipientCount: 0, // Will be set by caller
    };
  }

  private async sendViaSES(message: EmailMessage): Promise<DeliveryResult> {
    if (!this.sesClient) {
      throw new Error('SES client not initialized');
    }

    const destinations = Array.isArray(message.to) ? message.to : [message.to];
    const ccAddresses = Array.isArray(message.cc) ? message.cc : message.cc ? [message.cc] : [];
    const bccAddresses = Array.isArray(message.bcc)
      ? message.bcc
      : message.bcc
        ? [message.bcc]
        : [];

    const params: AWS.SES.SendEmailRequest = {
      Source: message.fromName ? `"${message.fromName}" <${message.from}>` : message.from,
      Destination: {
        ToAddresses: destinations,
        CcAddresses: ccAddresses,
        BccAddresses: bccAddresses,
      },
      Message: {
        Subject: {
          Data: message.subject,
          Charset: 'UTF-8',
        },
        Body: {
          ...(message.text && {
            Text: {
              Data: message.text,
              Charset: 'UTF-8',
            },
          }),
          ...(message.html && {
            Html: {
              Data: message.html,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      ...(message.replyTo && { ReplyToAddresses: [message.replyTo] }),
      ...(message.tags && {
        Tags: message.tags.map(tag => ({ Name: 'Tag', Value: tag })),
      }),
    };

    const result = await this.sesClient.sendEmail(params).promise();

    return {
      success: true,
      messageId: result.MessageId,
      provider: 'ses',
      timestamp: new Date(),
      recipientCount: 0, // Will be set by caller
    };
  }

  private async sendViaSendGrid(message: EmailMessage): Promise<DeliveryResult> {
    return await this.sendGridService.sendEmail(message);
  }

  private async sendViaMailgun(message: EmailMessage): Promise<DeliveryResult> {
    return await this.mailgunService.sendEmail(message);
  }

  async sendBulkEmail(messages: EmailMessage[]): Promise<DeliveryResult[]> {
    const batchSize = parseInt(this.configService.get('EMAIL_BATCH_SIZE', '50'));
    const results: DeliveryResult[] = [];

    // Process in batches to avoid overwhelming the provider
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchPromises = batch.map(message => this.sendEmail(message));

      try {
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, _index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason?.message || 'Unknown error',
              provider: this.activeProvider,
              timestamp: new Date(),
              recipientCount: 1,
            });
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < messages.length) {
          const delay = parseInt(this.configService.get('EMAIL_BATCH_DELAY', '1000'));
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        this.logger.error(`Batch email processing failed:`, error);
        // Add failed results for the entire batch
        batch.forEach(() => {
          results.push({
            success: false,
            error: error.message,
            provider: this.activeProvider,
            timestamp: new Date(),
            recipientCount: 1,
          });
        });
      }
    }

    return results;
  }

  async verifyConfiguration(): Promise<boolean> {
    try {
      switch (this.activeProvider) {
        case 'ses':
          return await this.verifySESConfiguration();
        case 'sendgrid':
          return await this.sendGridService.verifyConfiguration();
        case 'mailgun':
          return await this.mailgunService.verifyConfiguration();
        case 'smtp':
        default:
          return await this.verifySMTPConfiguration();
      }
    } catch (error) {
      this.logger.error(`Email provider verification failed:`, error);
      return false;
    }
  }

  private async verifySMTPConfiguration(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }
    return await this.transporter.verify();
  }

  private async verifySESConfiguration(): Promise<boolean> {
    if (!this.sesClient) {
      return false;
    }

    const fromEmail = this.configService.get('EMAIL_FROM_ADDRESS');
    if (!fromEmail) {
      return false;
    }

    await this.sesClient
      .getIdentityVerificationAttributes({
        Identities: [fromEmail],
      })
      .promise();

    return true;
  }

  getActiveProvider(): string {
    return this.activeProvider;
  }

  async switchProvider(provider: string): Promise<void> {
    if (this.activeProvider === provider) {
      return;
    }

    this.activeProvider = provider;
    this.initializeProvider();

    const isValid = await this.verifyConfiguration();
    if (!isValid) {
      throw new Error(`Failed to switch to ${provider}: Configuration verification failed`);
    }

    this.logger.log(`Successfully switched email provider to: ${provider}`);
  }
}

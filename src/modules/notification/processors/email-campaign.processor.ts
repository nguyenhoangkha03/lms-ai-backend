import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailCampaign, CampaignStatus } from '../entities/email-campaign.entity';
import {
  EmailCampaignRecipient,
  DeliveryStatus,
} from '../entities/email-campaign-recipient.entity';
import { EmailMessage, SmtpProviderService } from '../services/smtp-provider.service';
import { EmailSuppressionService } from '../services/email-suppression.service';
import { EmailAnalyticsService } from '../services/email-analytics.service';
import { NotificationTemplateService } from '../services/notification-template.service';

interface SendCampaignJobData {
  campaignId: string;
  sendOptions?: {
    testMode?: boolean;
    batchSize?: number;
    delayBetweenBatches?: number;
  };
}

interface SendScheduledCampaignJobData {
  campaignId: string;
}

@Processor('email-campaign')
export class EmailCampaignProcessor {
  private readonly logger = new Logger(EmailCampaignProcessor.name);

  constructor(
    @InjectRepository(EmailCampaign)
    private campaignRepository: Repository<EmailCampaign>,

    @InjectRepository(EmailCampaignRecipient)
    private recipientRepository: Repository<EmailCampaignRecipient>,

    private smtpProviderService: SmtpProviderService,
    private emailSuppressionService: EmailSuppressionService,
    private emailAnalyticsService: EmailAnalyticsService,
    private templateService: NotificationTemplateService,
  ) {}

  @Process('send-campaign')
  async handleSendCampaign(job: Job<SendCampaignJobData>): Promise<void> {
    const { campaignId, sendOptions = {} } = job.data;

    try {
      this.logger.log(`Processing email campaign: ${campaignId}`);

      // Get campaign details
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
        relations: ['recipients'],
      });

      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      if (campaign.status !== CampaignStatus.SENDING) {
        this.logger.warn(`Campaign ${campaignId} is not in sending status, skipping`);
        return;
      }

      // Get pending recipients
      const recipients = await this.recipientRepository.find({
        where: {
          campaignId,
          status: DeliveryStatus.PENDING,
        },
        order: { createdAt: 'ASC' },
      });

      if (recipients.length === 0) {
        this.logger.log(`No pending recipients for campaign ${campaignId}`);
        await this.completeCampaign(campaignId);
        return;
      }

      // Process recipients in batches
      const batchSize = sendOptions.batchSize || 50;
      const delayBetweenBatches = sendOptions.delayBetweenBatches || 1000;

      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        // Update job progress
        const progress = Math.round((i / recipients.length) * 100);
        await job.progress(progress);

        // Check if campaign is still in sending status
        const currentCampaign = await this.campaignRepository.findOne({
          where: { id: campaignId },
        });

        if (currentCampaign?.status !== CampaignStatus.SENDING) {
          this.logger.log(`Campaign ${campaignId} stopped sending, aborting`);
          break;
        }

        // Process batch
        const batchResults = await this.processBatch(campaign, batch, sendOptions.testMode);

        successCount += batchResults.successful;
        failureCount += batchResults.failed;
        processedCount += batch.length;

        // Update campaign statistics
        await this.updateCampaignProgress(campaignId, successCount, failureCount);

        // Delay between batches to respect rate limits
        if (i + batchSize < recipients.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }

        this.logger.log(
          `Campaign ${campaignId} batch ${Math.floor(i / batchSize) + 1}: ` +
            `${batchResults.successful} successful, ${batchResults.failed} failed`,
        );
      }

      // Complete campaign
      await this.completeCampaign(campaignId);

      this.logger.log(
        `Campaign ${campaignId} completed: ${successCount} successful, ${failureCount} failed out of ${processedCount} total`,
      );
    } catch (error) {
      this.logger.error(`Campaign ${campaignId} processing failed:`, error);

      // Mark campaign as failed
      await this.campaignRepository.update(campaignId, {
        status: CampaignStatus.FAILED,
        errorLogs: [
          {
            timestamp: new Date(),
            error: error.message,
            details: error.stack,
          },
        ],
      });

      throw error;
    }
  }

  @Process('send-scheduled-campaign')
  async handleScheduledCampaign(job: Job<SendScheduledCampaignJobData>): Promise<void> {
    const { campaignId } = job.data;

    try {
      const campaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
      });

      if (!campaign) {
        this.logger.error(`Scheduled campaign ${campaignId} not found`);
        return;
      }

      if (campaign.status !== CampaignStatus.SCHEDULED) {
        this.logger.warn(`Campaign ${campaignId} is not scheduled, skipping`);
        return;
      }

      // Check if it's time to send
      if (campaign.scheduledAt && campaign.scheduledAt > new Date()) {
        this.logger.warn(`Campaign ${campaignId} scheduled time not yet reached`);
        return;
      }

      // Start sending
      await this.campaignRepository.update(campaignId, {
        status: CampaignStatus.SENDING,
        sentAt: new Date(),
      });

      // Queue the actual sending job
      const emailCampaignQueue = job.queue;
      await emailCampaignQueue.add('send-campaign', { campaignId });

      this.logger.log(`Scheduled campaign ${campaignId} queued for sending`);
    } catch (error) {
      this.logger.error(`Failed to process scheduled campaign ${campaignId}:`, error);
      throw error;
    }
  }

  private async processBatch(
    campaign: EmailCampaign,
    recipients: EmailCampaignRecipient[],
    testMode: boolean = false,
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    // Prepare email messages
    const emailMessages: Array<{ emailMessage: EmailMessage; recipient: EmailCampaignRecipient }> =
      [];

    for (const recipient of recipients) {
      try {
        // Check if email is suppressed
        const isSuppressed = await this.emailSuppressionService.isEmailSuppressed(
          recipient.email,
          'marketing',
        );

        if (isSuppressed) {
          await this.recipientRepository.update(recipient.id, {
            status: DeliveryStatus.FAILED,
            bounceReason: 'Email suppressed',
          });
          failed++;
          continue;
        }

        // Prepare personalized content
        const variables = {
          ...recipient.variables,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          email: recipient.email,
          unsubscribeUrl: this.generateUnsubscribeUrl(campaign.id, recipient.email),
          viewOnlineUrl: this.generateViewOnlineUrl(campaign.id, recipient.email),
        };

        const personalizedSubject = this.replaceVariables(campaign.subject, variables);
        const personalizedHtmlContent = this.replaceVariables(campaign.htmlContent, variables);
        const personalizedTextContent = campaign.textContent
          ? this.replaceVariables(campaign.textContent, variables)
          : undefined;

        // Add tracking pixels and click tracking
        const trackedHtmlContent = this.addTrackingToContent(
          personalizedHtmlContent,
          campaign.id,
          recipient.email,
        );

        const emailMessage = {
          to: recipient.email,
          from: campaign.fromEmail || process.env.EMAIL_FROM_ADDRESS || 'no-reply@example.com',
          fromName: campaign.fromName || process.env.EMAIL_FROM_NAME,
          replyTo: campaign.replyToEmail,
          subject: personalizedSubject,
          text: personalizedTextContent,
          html: trackedHtmlContent,
          headers: {
            'X-Campaign-ID': campaign.id,
            'X-Recipient-ID': recipient.id,
            'List-Unsubscribe': `<${this.generateUnsubscribeUrl(campaign.id, recipient.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
          metadata: {
            campaignId: campaign.id,
            recipientId: recipient.id,
            variant: recipient.variant,
          },
        };

        emailMessages.push({ emailMessage, recipient });
      } catch (error) {
        this.logger.error(`Failed to prepare email for ${recipient.email}:`, error);

        await this.recipientRepository.update(recipient.id, {
          status: DeliveryStatus.FAILED,
          bounceReason: error.message,
        });

        failed++;
      }
    }

    // Send emails in batch
    if (emailMessages.length > 0 && !testMode) {
      const results = await this.smtpProviderService.sendBulkEmail(
        emailMessages.map(item => item.emailMessage),
      );

      // Process results
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const { recipient } = emailMessages[i];

        if (result.success) {
          await this.recipientRepository.update(recipient.id, {
            status: DeliveryStatus.SENT,
            messageId: result.messageId,
            sentAt: new Date(),
          });

          // Track sent event
          await this.emailAnalyticsService.trackEmailEvent(
            campaign.id,
            recipient.email,
            'sent' as any,
            {
              messageId: result.messageId,
            },
          );

          successful++;
        } else {
          await this.recipientRepository.update(recipient.id, {
            status: DeliveryStatus.FAILED,
            bounceReason: result.error,
          });

          failed++;
        }
      }
    } else if (testMode) {
      // In test mode, just mark as sent without actually sending
      for (const { recipient } of emailMessages) {
        await this.recipientRepository.update(recipient.id, {
          status: DeliveryStatus.SENT,
          messageId: `test-${Date.now()}-${Math.random()}`,
          sentAt: new Date(),
        });
        successful++;
      }
    }

    return { successful, failed };
  }

  private async updateCampaignProgress(
    campaignId: string,
    successCount: number,
    failureCount: number,
  ): Promise<void> {
    await this.campaignRepository.update(campaignId, {
      sentCount: successCount,
      failedCount: failureCount,
    });
  }

  private async completeCampaign(campaignId: string): Promise<void> {
    await this.campaignRepository.update(campaignId, {
      status: CampaignStatus.SENT,
      completedAt: new Date(),
    });

    this.logger.log(`Campaign ${campaignId} marked as completed`);
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    return result;
  }

  private addTrackingToContent(
    htmlContent: string,
    campaignId: string,
    recipientEmail: string,
  ): string {
    let tracked = htmlContent;

    // Add open tracking pixel
    const trackingPixel = `<img src="${process.env.APP_URL}/api/email/track/open/${campaignId}/${encodeURIComponent(recipientEmail)}" width="1" height="1" border="0" alt="" />`;

    // Insert tracking pixel before closing body tag
    if (tracked.includes('</body>')) {
      tracked = tracked.replace('</body>', `${trackingPixel}</body>`);
    } else {
      tracked += trackingPixel;
    }

    // Add click tracking to links
    const linkRegex = /<a\s+([^>]*href\s*=\s*["']([^"']+)["'][^>]*)>/gi;
    tracked = tracked.replace(linkRegex, (match, attributes, url) => {
      // Skip if already a tracking URL or unsubscribe link
      if (url.includes('/track/click/') || url.includes('/unsubscribe/')) {
        return match;
      }

      const trackingUrl = `${process.env.APP_URL}/api/email/track/click/${campaignId}/${encodeURIComponent(recipientEmail)}?url=${encodeURIComponent(url)}`;
      return `<a ${attributes.replace(/href\s*=\s*["'][^"']+["']/i, `href="${trackingUrl}"`)}`;
    });

    return tracked;
  }

  private generateUnsubscribeUrl(campaignId: string, email: string): string {
    return `${process.env.APP_URL}/api/email/unsubscribe/${campaignId}/${encodeURIComponent(email)}`;
  }

  private generateViewOnlineUrl(campaignId: string, email: string): string {
    return `${process.env.APP_URL}/api/email/view/${campaignId}/${encodeURIComponent(email)}`;
  }
}

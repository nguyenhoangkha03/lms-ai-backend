import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery as _,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { EmailAnalyticsService } from '../services/email-analytics.service';
import { EmailSuppressionService } from '../services/email-suppression.service';
import { AnalyticsEventType } from '../entities/email-campaign-analytics.entity';

@ApiTags('Email Tracking')
@Controller('email')
export class EmailTrackingController {
  constructor(
    private readonly analyticsService: EmailAnalyticsService,
    private readonly suppressionService: EmailSuppressionService,
  ) {}

  @Get('track/open/:campaignId/:email')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async trackEmailOpen(
    @Param('campaignId') campaignId: string,
    @Param('email') email: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    try {
      const decodedEmail = decodeURIComponent(email);
      const clientIp = this.getClientIP(req);

      // Track the open event
      await this.analyticsService.trackEmailEvent(
        campaignId,
        decodedEmail,
        AnalyticsEventType.OPENED,
        {
          userAgent,
          ip: clientIp,
        },
      );

      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64',
      );

      res.set({
        'Content-Type': 'image/png',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      res.send(pixel);
    } catch (error) {
      // Return empty pixel even on error to avoid breaking email display
      const pixel = Buffer.from('', 'base64');
      res.set('Content-Type', 'image/png');
      res.send(pixel);
    }
  }

  @Get('track/click/:campaignId/:email')
  @ApiExcludeEndpoint()
  async trackEmailClick(
    @Param('campaignId') campaignId: string,
    @Param('email') email: string,
    @Query('url') targetUrl: string,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    try {
      const decodedEmail = decodeURIComponent(email);
      const decodedUrl = decodeURIComponent(targetUrl);
      const clientIp = this.getClientIP(req);

      // Track the click event
      await this.analyticsService.trackEmailEvent(
        campaignId,
        decodedEmail,
        AnalyticsEventType.CLICKED,
        {
          url: decodedUrl,
          userAgent,
          ip: clientIp,
        },
      );

      // Redirect to the target URL
      res.redirect(302, decodedUrl);
    } catch (error) {
      // If tracking fails, still redirect to avoid breaking user experience
      const decodedUrl = decodeURIComponent(targetUrl);
      res.redirect(302, decodedUrl);
    }
  }

  @Get('unsubscribe/:campaignId/:email')
  @ApiOperation({ summary: 'Handle email unsubscribe' })
  @ApiParam({ name: 'campaignId', description: 'Campaign ID' })
  @ApiParam({ name: 'email', description: 'Email address to unsubscribe' })
  async handleUnsubscribe(
    @Param('campaignId') campaignId: string,
    @Param('email') email: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('token') token?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    try {
      const decodedEmail = decodeURIComponent(email);
      const clientIp = this.getClientIP(req);

      // Verify unsubscribe token if provided (for security)
      if (token && !this.verifyUnsubscribeToken(campaignId, decodedEmail, token)) {
        return res.status(400).send('Invalid unsubscribe token');
      }

      // Add to suppression list
      await this.suppressionService.handleUnsubscribe(
        decodedEmail,
        'link',
        `campaign_${campaignId}`,
        {
          userAgent,
          ip: clientIp,
          campaignId,
        },
      );

      // Track unsubscribe event
      await this.analyticsService.trackEmailEvent(
        campaignId,
        decodedEmail,
        AnalyticsEventType.UNSUBSCRIBED,
        {
          userAgent,
          ip: clientIp,
        },
      );

      // Return unsubscribe confirmation page
      const confirmationHtml = this.generateUnsubscribeConfirmationPage(decodedEmail);
      res.set('Content-Type', 'text/html');
      res.send(confirmationHtml);
    } catch (error) {
      res.status(500).send('An error occurred while processing your unsubscribe request');
    }
  }

  @Post('unsubscribe/:campaignId/:email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle one-click unsubscribe (RFC 8058)' })
  @ApiParam({ name: 'campaignId', description: 'Campaign ID' })
  @ApiParam({ name: 'email', description: 'Email address to unsubscribe' })
  async handleOneClickUnsubscribe(
    @Param('campaignId') campaignId: string,
    @Param('email') email: string,
    @Req() req: Request,
    @Headers('user-agent') userAgent?: string,
  ) {
    try {
      const decodedEmail = decodeURIComponent(email);
      const clientIp = this.getClientIP(req);

      // Add to suppression list
      await this.suppressionService.handleUnsubscribe(
        decodedEmail,
        'link',
        `campaign_${campaignId}`,
        {
          userAgent,
          ip: clientIp,
          campaignId,
          method: 'one-click',
        },
      );

      // Track unsubscribe event
      await this.analyticsService.trackEmailEvent(
        campaignId,
        decodedEmail,
        AnalyticsEventType.UNSUBSCRIBED,
        {
          userAgent,
          ip: clientIp,
        },
      );

      return {
        success: true,
        message: 'Successfully unsubscribed',
      };
    } catch (error) {
      return {
        success: false,
        message: 'An error occurred while processing your unsubscribe request',
      };
    }
  }

  @Get('view/:campaignId/:email')
  @ApiOperation({ summary: 'View email in browser' })
  @ApiParam({ name: 'campaignId', description: 'Campaign ID' })
  @ApiParam({ name: 'email', description: 'Recipient email address' })
  async viewEmailInBrowser(
    @Param('campaignId') campaignId: string,
    @Param('email') email: string,
    @Res() res: Response,
  ) {
    try {
      const decodedEmail = decodeURIComponent(email);

      // Get campaign content (implementation would fetch from database)
      const emailContent = await this.getEmailContent(campaignId, decodedEmail);

      if (!emailContent) {
        return res.status(404).send('Email not found');
      }

      // Return the HTML content
      res.set('Content-Type', 'text/html');
      res.send(emailContent.htmlContent);
    } catch (error) {
      res.status(500).send('An error occurred while loading the email');
    }
  }

  @Post('webhooks/sendgrid')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleSendGridWebhook(@Req() req: Request) {
    try {
      const events = req.body;

      // Process SendGrid webhook events
      for (const event of events) {
        await this.processSendGridEvent(event);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('webhooks/mailgun')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleMailgunWebhook(@Req() req: Request) {
    try {
      const eventData = req.body;

      // Process Mailgun webhook event
      await this.processMailgunEvent(eventData);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('webhooks/ses')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleSESWebhook(@Req() req: Request) {
    try {
      const message = JSON.parse(req.body.Message || req.body.message || '{}');

      // Process SES SNS notification
      await this.processSESEvent(message);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }

  private verifyUnsubscribeToken(_campaignId: string, _email: string, _token: string): boolean {
    // Implementation would verify the token (e.g., HMAC signature)
    // For security, tokens should be time-limited and campaign-specific
    return true; // Simplified for example
  }

  private generateUnsubscribeConfirmationPage(email: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed Successfully</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          .container { max-width: 600px; margin: 0 auto; }
          .success { color: #28a745; }
          .info { color: #6c757d; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✓ Unsubscribed Successfully</h1>
          <p>The email address <strong>${email}</strong> has been unsubscribed from our mailing list.</p>
          <p class="info">You will no longer receive marketing emails from us. This may take up to 24 hours to take effect.</p>
          <p class="info">If you unsubscribed by mistake, you can always resubscribe by signing up again on our website.</p>
        </div>
      </body>
      </html>
    `;
  }

  private async getEmailContent(
    _campaignId: string,
    _email: string,
  ): Promise<{
    htmlContent: string;
  } | null> {
    // Implementation would fetch email content from database
    // This would include the personalized content for this specific recipient
    return null; // Simplified for example
  }

  private async processSendGridEvent(event: any): Promise<void> {
    const campaignId = event.custom_args?.campaign_id;
    const email = event.email;

    if (!campaignId || !email) return;

    let eventType: AnalyticsEventType;
    let eventData: any = {};

    switch (event.event) {
      case 'delivered':
        eventType = AnalyticsEventType.DELIVERED;
        break;
      case 'open':
        eventType = AnalyticsEventType.OPENED;
        eventData = {
          userAgent: event.useragent,
          ip: event.ip,
        };
        break;
      case 'click':
        eventType = AnalyticsEventType.CLICKED;
        eventData = {
          url: event.url,
          userAgent: event.useragent,
          ip: event.ip,
        };
        break;
      case 'bounce':
        eventType = AnalyticsEventType.BOUNCED;
        eventData = {
          metadata: {
            bounceType: event.type,
            bounceReason: event.reason,
          },
        };
        break;
      case 'unsubscribe':
        eventType = AnalyticsEventType.UNSUBSCRIBED;
        break;
      case 'spamreport':
        eventType = AnalyticsEventType.COMPLAINED;
        break;
      default:
        return;
    }

    await this.analyticsService.trackEmailEvent(campaignId, email, eventType, eventData);
  }

  private async processMailgunEvent(eventData: any): Promise<void> {
    const event = eventData['event-data'];
    const campaignId = event.message?.headers?.['X-Campaign-ID'];
    const email = event.recipient;

    if (!campaignId || !email) return;

    let eventType: AnalyticsEventType;
    let additionalData: any = {};

    switch (event.event) {
      case 'delivered':
        eventType = AnalyticsEventType.DELIVERED;
        break;
      case 'opened':
        eventType = AnalyticsEventType.OPENED;
        additionalData = {
          userAgent: event['user-variables']?.['user-agent'],
          ip: event['client-info']?.['client-ip'],
        };
        break;
      case 'clicked':
        eventType = AnalyticsEventType.CLICKED;
        additionalData = {
          url: event.url,
          userAgent: event['user-variables']?.['user-agent'],
          ip: event['client-info']?.['client-ip'],
        };
        break;
      case 'bounced':
        eventType = AnalyticsEventType.BOUNCED;
        additionalData = {
          metadata: {
            bounceType: event.severity,
            bounceReason: event.reason,
          },
        };
        break;
      case 'unsubscribed':
        eventType = AnalyticsEventType.UNSUBSCRIBED;
        break;
      case 'complained':
        eventType = AnalyticsEventType.COMPLAINED;
        break;
      default:
        return;
    }

    await this.analyticsService.trackEmailEvent(campaignId, email, eventType, additionalData);
  }

  private async processSESEvent(message: any): Promise<void> {
    if (message.notificationType === 'Bounce') {
      await this.handleSESBounce(message.bounce);
    } else if (message.notificationType === 'Complaint') {
      await this.handleSESComplaint(message.complaint);
    } else if (message.notificationType === 'Delivery') {
      await this.handleSESDelivery(message.delivery);
    }
  }

  private async handleSESBounce(bounce: any): Promise<void> {
    for (const recipient of bounce.bouncedRecipients) {
      await this.suppressionService.handleBounce(
        recipient.emailAddress,
        bounce.bounceType === 'Permanent' ? 'hard' : 'soft',
        recipient.diagnosticCode,
        {
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
        },
      );
    }
  }

  private async handleSESComplaint(complaint: any): Promise<void> {
    for (const recipient of complaint.complainedRecipients) {
      await this.suppressionService.handleSpamComplaint(
        recipient.emailAddress,
        complaint.complaintFeedbackType,
        {
          feedbackType: complaint.complaintFeedbackType,
          userAgent: complaint.userAgent,
        },
      );
    }
  }

  private async handleSESDelivery(_delivery: any): Promise<void> {
    // Track delivery events if needed
    // Implementation would extract campaign ID from message headers
  }
}

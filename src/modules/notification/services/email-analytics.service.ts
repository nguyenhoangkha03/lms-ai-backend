import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmailCampaignAnalytics,
  AnalyticsEventType,
} from '../entities/email-campaign-analytics.entity';
import { EmailCampaign } from '../entities/email-campaign.entity';
import {
  EmailCampaignRecipient,
  DeliveryStatus,
} from '../entities/email-campaign-recipient.entity';

export interface EmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  totalComplaints: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  complaintRate: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
}

@Injectable()
export class EmailAnalyticsService {
  private readonly logger = new Logger(EmailAnalyticsService.name);

  constructor(
    @InjectRepository(EmailCampaignAnalytics)
    private analyticsRepository: Repository<EmailCampaignAnalytics>,

    @InjectRepository(EmailCampaign)
    private campaignRepository: Repository<EmailCampaign>,

    @InjectRepository(EmailCampaignRecipient)
    private recipientRepository: Repository<EmailCampaignRecipient>,
  ) {}

  async trackEmailEvent(
    campaignId: string,
    recipientEmail: string,
    eventType: AnalyticsEventType,
    eventData?: {
      url?: string;
      userAgent?: string;
      ip?: string;
      messageId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      // Parse user agent for device/browser info
      const deviceInfo = this.parseUserAgent(eventData?.userAgent);

      // Get geolocation from IP (would integrate with geolocation service)
      const geoInfo = await this.getGeolocation(eventData?.ip);

      // Create analytics record
      const analytics = this.analyticsRepository.create({
        campaignId,
        recipientEmail,
        eventType,
        timestamp: new Date(),
        url: eventData?.url,
        userAgent: eventData?.userAgent,
        ip: eventData?.ip,
        country: geoInfo?.country,
        region: geoInfo?.region,
        city: geoInfo?.city,
        browser: deviceInfo?.browser,
        os: deviceInfo?.os,
        device: deviceInfo?.device,
        isMobile: deviceInfo?.isMobile || false,
        messageId: eventData?.messageId,
        eventData: eventData?.metadata,
      });

      await this.analyticsRepository.save(analytics);

      // Update recipient status
      await this.updateRecipientStatus(campaignId, recipientEmail, eventType);

      // Update campaign statistics
      await this.updateCampaignStatistics(campaignId, eventType);

      this.logger.debug(
        `Tracked email event: ${eventType} for ${recipientEmail} in campaign ${campaignId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to track email event:`, error);
    }
  }

  async getCampaignMetrics(
    campaignId: string,
    dateRange?: { startDate: Date; endDate: Date },
  ): Promise<EmailMetrics> {
    const queryBuilder = this.recipientRepository
      .createQueryBuilder('recipient')
      .where('recipient.campaignId = :campaignId', { campaignId });

    if (dateRange) {
      queryBuilder.andWhere('recipient.sentAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const stats = await queryBuilder
      .select([
        'COUNT(*) as totalSent',
        'COUNT(CASE WHEN recipient.status IN (:...deliveredStatuses) THEN 1 END) as totalDelivered',
        'COUNT(CASE WHEN recipient.status = :opened THEN 1 END) as totalOpened',
        'COUNT(CASE WHEN recipient.status = :clicked THEN 1 END) as totalClicked',
        'COUNT(CASE WHEN recipient.status = :bounced THEN 1 END) as totalBounced',
        'COUNT(CASE WHEN recipient.status = :unsubscribed THEN 1 END) as totalUnsubscribed',
        'COUNT(CASE WHEN recipient.status = :complained THEN 1 END) as totalComplaints',
      ])
      .setParameters({
        deliveredStatuses: [
          DeliveryStatus.DELIVERED,
          DeliveryStatus.OPENED,
          DeliveryStatus.CLICKED,
        ],
        opened: DeliveryStatus.OPENED,
        clicked: DeliveryStatus.CLICKED,
        bounced: DeliveryStatus.BOUNCED,
        unsubscribed: DeliveryStatus.UNSUBSCRIBED,
        complained: DeliveryStatus.COMPLAINED,
      })
      .getRawOne();

    const totalSent = parseInt(stats.totalSent) || 0;
    const totalDelivered = parseInt(stats.totalDelivered) || 0;
    const totalOpened = parseInt(stats.totalOpened) || 0;
    const totalClicked = parseInt(stats.totalClicked) || 0;
    const totalBounced = parseInt(stats.totalBounced) || 0;
    const totalUnsubscribed = parseInt(stats.totalUnsubscribed) || 0;
    const totalComplaints = parseInt(stats.totalComplaints) || 0;

    return {
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalUnsubscribed,
      totalComplaints,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      unsubscribeRate: totalDelivered > 0 ? (totalUnsubscribed / totalDelivered) * 100 : 0,
      complaintRate: totalDelivered > 0 ? (totalComplaints / totalDelivered) * 100 : 0,
    };
  }

  async getTimeSeriesData(
    campaignId: string,
    interval: 'hour' | 'day' | 'week' | 'month',
    dateRange: { startDate: Date; endDate: Date },
  ): Promise<TimeSeriesData[]> {
    const groupByFormat = this.getDateFormat(interval);

    const data = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select([
        `DATE_FORMAT(analytics.timestamp, '${groupByFormat}') as period`,
        'COUNT(CASE WHEN analytics.eventType = :sent THEN 1 END) as sent',
        'COUNT(CASE WHEN analytics.eventType = :delivered THEN 1 END) as delivered',
        'COUNT(CASE WHEN analytics.eventType = :opened THEN 1 END) as opened',
        'COUNT(CASE WHEN analytics.eventType = :clicked THEN 1 END) as clicked',
        'COUNT(CASE WHEN analytics.eventType = :bounced THEN 1 END) as bounced',
        'COUNT(CASE WHEN analytics.eventType = :unsubscribed THEN 1 END) as unsubscribed',
      ])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .setParameters({
        sent: AnalyticsEventType.SENT,
        delivered: AnalyticsEventType.DELIVERED,
        opened: AnalyticsEventType.OPENED,
        clicked: AnalyticsEventType.CLICKED,
        bounced: AnalyticsEventType.BOUNCED,
        unsubscribed: AnalyticsEventType.UNSUBSCRIBED,
      })
      .getRawMany();

    return data.map(row => ({
      timestamp: new Date(row.period),
      sent: parseInt(row.sent) || 0,
      delivered: parseInt(row.delivered) || 0,
      opened: parseInt(row.opened) || 0,
      clicked: parseInt(row.clicked) || 0,
      bounced: parseInt(row.bounced) || 0,
      unsubscribed: parseInt(row.unsubscribed) || 0,
    }));
  }

  async getDeviceStatistics(campaignId: string): Promise<{
    devices: Array<{ device: string; count: number; percentage: number }>;
    browsers: Array<{ browser: string; count: number; percentage: number }>;
    operatingSystems: Array<{ os: string; count: number; percentage: number }>;
  }> {
    const deviceStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['analytics.device as device', 'COUNT(*) as count'])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.device IS NOT NULL')
      .groupBy('analytics.device')
      .orderBy('count', 'DESC')
      .getRawMany();

    const browserStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['analytics.browser as browser', 'COUNT(*) as count'])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.browser IS NOT NULL')
      .groupBy('analytics.browser')
      .orderBy('count', 'DESC')
      .getRawMany();

    const osStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['analytics.os as os', 'COUNT(*) as count'])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.os IS NOT NULL')
      .groupBy('analytics.os')
      .orderBy('count', 'DESC')
      .getRawMany();

    const totalDevices = deviceStats.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalBrowsers = browserStats.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalOS = osStats.reduce((sum, item) => sum + parseInt(item.count), 0);

    return {
      devices: deviceStats.map(item => ({
        device: item.device,
        count: parseInt(item.count),
        percentage: totalDevices > 0 ? (parseInt(item.count) / totalDevices) * 100 : 0,
      })),
      browsers: browserStats.map(item => ({
        browser: item.browser,
        count: parseInt(item.count),
        percentage: totalBrowsers > 0 ? (parseInt(item.count) / totalBrowsers) * 100 : 0,
      })),
      operatingSystems: osStats.map(item => ({
        os: item.os,
        count: parseInt(item.count),
        percentage: totalOS > 0 ? (parseInt(item.count) / totalOS) * 100 : 0,
      })),
    };
  }

  async getGeographicStatistics(campaignId: string): Promise<{
    countries: Array<{ country: string; count: number; percentage: number }>;
    regions: Array<{ region: string; count: number; percentage: number }>;
    cities: Array<{ city: string; count: number; percentage: number }>;
  }> {
    const countryStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['analytics.country as country', 'COUNT(*) as count'])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.country IS NOT NULL')
      .groupBy('analytics.country')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const regionStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['analytics.region as region', 'COUNT(*) as count'])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.region IS NOT NULL')
      .groupBy('analytics.region')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const cityStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['analytics.city as city', 'COUNT(*) as count'])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.city IS NOT NULL')
      .groupBy('analytics.city')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const totalCountries = countryStats.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalRegions = regionStats.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalCities = cityStats.reduce((sum, item) => sum + parseInt(item.count), 0);

    return {
      countries: countryStats.map(item => ({
        country: item.country,
        count: parseInt(item.count),
        percentage: totalCountries > 0 ? (parseInt(item.count) / totalCountries) * 100 : 0,
      })),
      regions: regionStats.map(item => ({
        region: item.region,
        count: parseInt(item.count),
        percentage: totalRegions > 0 ? (parseInt(item.count) / totalRegions) * 100 : 0,
      })),
      cities: cityStats.map(item => ({
        city: item.city,
        count: parseInt(item.count),
        percentage: totalCities > 0 ? (parseInt(item.count) / totalCities) * 100 : 0,
      })),
    };
  }

  async getClickHeatmap(campaignId: string): Promise<
    Array<{
      url: string;
      clicks: number;
      uniqueClicks: number;
      clickRate: number;
    }>
  > {
    const clickStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select([
        'analytics.url as url',
        'COUNT(*) as clicks',
        'COUNT(DISTINCT analytics.recipientEmail) as uniqueClicks',
      ])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.eventType = :clicked', { clicked: AnalyticsEventType.CLICKED })
      .andWhere('analytics.url IS NOT NULL')
      .groupBy('analytics.url')
      .orderBy('clicks', 'DESC')
      .getRawMany();

    // Get total delivered count for click rate calculation
    const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
    const totalDelivered = campaign!.sentCount - campaign!.bouncedCount || 1;

    return clickStats.map(item => ({
      url: item.url,
      clicks: parseInt(item.clicks),
      uniqueClicks: parseInt(item.uniqueClicks),
      clickRate: totalDelivered > 0 ? (parseInt(item.uniqueClicks) / totalDelivered) * 100 : 0,
    }));
  }

  async getEmailClientStatistics(campaignId: string): Promise<
    Array<{
      emailClient: string;
      opens: number;
      percentage: number;
    }>
  > {
    const clientStats = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select(['analytics.emailClient as emailClient', 'COUNT(*) as opens'])
      .where('analytics.campaignId = :campaignId', { campaignId })
      .andWhere('analytics.eventType = :opened', { opened: AnalyticsEventType.OPENED })
      .andWhere('analytics.emailClient IS NOT NULL')
      .groupBy('analytics.emailClient')
      .orderBy('opens', 'DESC')
      .getRawMany();

    const totalOpens = clientStats.reduce((sum, item) => sum + parseInt(item.opens), 0);

    return clientStats.map(item => ({
      emailClient: item.emailClient,
      opens: parseInt(item.opens),
      percentage: totalOpens > 0 ? (parseInt(item.opens) / totalOpens) * 100 : 0,
    }));
  }

  async getEngagementTrends(
    campaignIds: string[],
    dateRange: { startDate: Date; endDate: Date },
  ): Promise<{
    averageOpenRate: number;
    averageClickRate: number;
    averageBounceRate: number;
    trendData: Array<{
      date: Date;
      openRate: number;
      clickRate: number;
      bounceRate: number;
    }>;
  }> {
    if (campaignIds.length === 0) {
      return {
        averageOpenRate: 0,
        averageClickRate: 0,
        averageBounceRate: 0,
        trendData: [],
      };
    }

    // Get overall averages
    const averages = await this.campaignRepository
      .createQueryBuilder('campaign')
      .select([
        'AVG(campaign.openRate) as avgOpenRate',
        'AVG(campaign.clickRate) as avgClickRate',
        'AVG((campaign.bouncedCount / campaign.sentCount) * 100) as avgBounceRate',
      ])
      .where('campaign.id IN (:...campaignIds)', { campaignIds })
      .andWhere('campaign.sentAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .getRawOne();

    // Get daily trend data
    const trendData = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select([
        'DATE(analytics.timestamp) as date',
        `COUNT(CASE WHEN analytics.eventType = '${AnalyticsEventType.OPENED}' THEN 1 END) as opens`,
        `COUNT(CASE WHEN analytics.eventType = '${AnalyticsEventType.CLICKED}' THEN 1 END) as clicks`,
        `COUNT(CASE WHEN analytics.eventType = '${AnalyticsEventType.BOUNCED}' THEN 1 END) as bounces`,
        `COUNT(CASE WHEN analytics.eventType = '${AnalyticsEventType.DELIVERED}' THEN 1 END) as delivered`,
      ])
      .where('analytics.campaignId IN (:...campaignIds)', { campaignIds })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .groupBy('DATE(analytics.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const processedTrendData = trendData.map(row => {
      const delivered = parseInt(row.delivered) || 1;
      const opens = parseInt(row.opens) || 0;
      const clicks = parseInt(row.clicks) || 0;
      const bounces = parseInt(row.bounces) || 0;

      return {
        date: new Date(row.date),
        openRate: (opens / delivered) * 100,
        clickRate: (clicks / delivered) * 100,
        bounceRate: (bounces / delivered) * 100,
      };
    });

    return {
      averageOpenRate: parseFloat(averages.avgOpenRate) || 0,
      averageClickRate: parseFloat(averages.avgClickRate) || 0,
      averageBounceRate: parseFloat(averages.avgBounceRate) || 0,
      trendData: processedTrendData,
    };
  }

  async generatePerformanceReport(
    campaignId: string,
    compareWithPrevious: boolean = false,
  ): Promise<{
    currentMetrics: EmailMetrics;
    previousMetrics?: EmailMetrics;
    improvementAreas: string[];
    recommendations: string[];
    keyInsights: string[];
  }> {
    const currentMetrics = await this.getCampaignMetrics(campaignId);

    let previousMetrics: EmailMetrics | undefined;
    if (compareWithPrevious) {
      // Get previous campaign metrics for comparison
      const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
      if (campaign) {
        // Find previous campaign of same type
        const previousCampaign = await this.campaignRepository.findOne({
          where: {
            type: campaign.type,
            createdBy: campaign.createdBy,
            sentAt: { $lt: campaign.sentAt } as any,
          },
          order: { sentAt: 'DESC' },
        });

        if (previousCampaign) {
          previousMetrics = await this.getCampaignMetrics(previousCampaign.id);
        }
      }
    }

    // Generate insights and recommendations
    const improvementAreas = this.identifyImprovementAreas(currentMetrics, previousMetrics);
    const recommendations = this.generateRecommendations(currentMetrics, previousMetrics);
    const keyInsights = this.generateKeyInsights(currentMetrics, previousMetrics);

    return {
      currentMetrics,
      previousMetrics,
      improvementAreas,
      recommendations,
      keyInsights,
    };
  }

  private async updateRecipientStatus(
    campaignId: string,
    recipientEmail: string,
    eventType: AnalyticsEventType,
  ): Promise<void> {
    let status: DeliveryStatus;
    const updateFields: any = {};

    switch (eventType) {
      case AnalyticsEventType.SENT:
        status = DeliveryStatus.SENT;
        updateFields.sentAt = new Date();
        break;
      case AnalyticsEventType.DELIVERED:
        status = DeliveryStatus.DELIVERED;
        updateFields.deliveredAt = new Date();
        break;
      case AnalyticsEventType.OPENED:
        status = DeliveryStatus.OPENED;
        updateFields.openedAt = new Date();
        updateFields.openCount = () => 'openCount + 1';
        break;
      case AnalyticsEventType.CLICKED:
        status = DeliveryStatus.CLICKED;
        updateFields.clickedAt = new Date();
        updateFields.clickCount = () => 'clickCount + 1';
        break;
      case AnalyticsEventType.BOUNCED:
        status = DeliveryStatus.BOUNCED;
        updateFields.bouncedAt = new Date();
        break;
      case AnalyticsEventType.UNSUBSCRIBED:
        status = DeliveryStatus.UNSUBSCRIBED;
        updateFields.unsubscribedAt = new Date();
        break;
      case AnalyticsEventType.COMPLAINED:
        status = DeliveryStatus.COMPLAINED;
        updateFields.complainedAt = new Date();
        break;
      default:
        return;
    }

    await this.recipientRepository.update(
      { campaignId, email: recipientEmail },
      { status, ...updateFields },
    );
  }

  private async updateCampaignStatistics(
    campaignId: string,
    eventType: AnalyticsEventType,
  ): Promise<void> {
    const updateFields: any = {};

    switch (eventType) {
      case AnalyticsEventType.DELIVERED:
        // Update delivery count and rate
        break;
      case AnalyticsEventType.OPENED:
        updateFields.openedCount = () => 'openedCount + 1';
        break;
      case AnalyticsEventType.CLICKED:
        updateFields.clickedCount = () => 'clickedCount + 1';
        break;
      case AnalyticsEventType.BOUNCED:
        updateFields.bouncedCount = () => 'bouncedCount + 1';
        break;
      case AnalyticsEventType.UNSUBSCRIBED:
        updateFields.unsubscribedCount = () => 'unsubscribedCount + 1';
        break;
      case AnalyticsEventType.COMPLAINED:
        updateFields.complaintsCount = () => 'complaintsCount + 1';
        break;
    }

    if (Object.keys(updateFields).length > 0) {
      await this.campaignRepository.update(campaignId, updateFields);

      // Recalculate rates
      const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
      if (campaign) {
        const deliveredCount = campaign.sentCount - campaign.bouncedCount;
        const openRate = deliveredCount > 0 ? (campaign.openedCount / deliveredCount) * 100 : 0;
        const clickRate = deliveredCount > 0 ? (campaign.clickedCount / deliveredCount) * 100 : 0;

        await this.campaignRepository.update(campaignId, {
          openRate: Math.round(openRate * 100) / 100,
          clickRate: Math.round(clickRate * 100) / 100,
        });
      }
    }
  }

  private parseUserAgent(userAgent?: string): {
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  } {
    if (!userAgent) {
      return {};
    }

    // Simple user agent parsing (would use a proper library in production)
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);

    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    const device = isMobile ? 'Mobile' : 'Desktop';

    return { browser, os, device, isMobile };
  }

  private async getGeolocation(ip?: string): Promise<{
    country?: string;
    region?: string;
    city?: string;
  }> {
    if (!ip) {
      return {};
    }

    // Would integrate with a geolocation service like MaxMind or IPinfo
    // For now, return placeholder data
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
    };
  }

  private getDateFormat(interval: 'hour' | 'day' | 'week' | 'month'): string {
    switch (interval) {
      case 'hour':
        return '%Y-%m-%d %H:00:00';
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-%u';
      case 'month':
        return '%Y-%m';
      default:
        return '%Y-%m-%d';
    }
  }

  private identifyImprovementAreas(current: EmailMetrics, previous?: EmailMetrics): string[] {
    const areas: string[] = [];

    // Industry benchmarks (these would be configurable)
    const benchmarks = {
      openRate: 25,
      clickRate: 3,
      bounceRate: 2,
      deliveryRate: 95,
    };

    if (current.openRate < benchmarks.openRate) {
      areas.push('Email Open Rate');
    }

    if (current.clickRate < benchmarks.clickRate) {
      areas.push('Click-Through Rate');
    }

    if (current.bounceRate > benchmarks.bounceRate) {
      areas.push('Email Deliverability');
    }

    if (current.deliveryRate < benchmarks.deliveryRate) {
      areas.push('List Quality');
    }

    if (previous) {
      if (current.openRate < previous.openRate) {
        areas.push('Subject Line Optimization');
      }

      if (current.clickRate < previous.clickRate) {
        areas.push('Content Engagement');
      }
    }

    return areas;
  }

  private generateRecommendations(current: EmailMetrics, _previous?: EmailMetrics): string[] {
    const recommendations: string[] = [];

    if (current.openRate < 20) {
      recommendations.push('Improve subject lines with A/B testing and personalization');
      recommendations.push('Optimize send times based on recipient time zones');
      recommendations.push('Clean your email list to improve sender reputation');
    }

    if (current.clickRate < 2) {
      recommendations.push('Add clear and compelling call-to-action buttons');
      recommendations.push('Improve email content relevance and personalization');
      recommendations.push('Optimize email design for mobile devices');
    }

    if (current.bounceRate > 3) {
      recommendations.push('Implement email validation at signup');
      recommendations.push('Regular list cleaning and maintenance');
      recommendations.push('Use double opt-in for new subscribers');
    }

    if (current.unsubscribeRate > 0.5) {
      recommendations.push('Review email frequency and content relevance');
      recommendations.push('Implement preference center for subscribers');
      recommendations.push('Segment your audience for more targeted content');
    }

    return recommendations;
  }

  private generateKeyInsights(current: EmailMetrics, previous?: EmailMetrics): string[] {
    const insights: string[] = [];

    insights.push(
      `Campaign reached ${current.totalSent} recipients with ${current.deliveryRate.toFixed(1)}% delivery rate`,
    );

    if (current.openRate > 25) {
      insights.push(
        `Excellent open rate of ${current.openRate.toFixed(1)}% - above industry average`,
      );
    } else if (current.openRate > 15) {
      insights.push(`Good open rate of ${current.openRate.toFixed(1)}% - room for improvement`);
    } else {
      insights.push(`Low open rate of ${current.openRate.toFixed(1)}% - needs immediate attention`);
    }

    if (current.clickRate > 3) {
      insights.push(`Strong engagement with ${current.clickRate.toFixed(1)}% click rate`);
    }

    if (previous) {
      const openRateChange = current.openRate - previous.openRate;
      const clickRateChange = current.clickRate - previous.clickRate;

      if (openRateChange > 0) {
        insights.push(
          `Open rate improved by ${openRateChange.toFixed(1)}% compared to previous campaign`,
        );
      } else if (openRateChange < 0) {
        insights.push(
          `Open rate decreased by ${Math.abs(openRateChange).toFixed(1)}% compared to previous campaign`,
        );
      }

      if (clickRateChange > 0) {
        insights.push(
          `Click rate improved by ${clickRateChange.toFixed(1)}% compared to previous campaign`,
        );
      } else if (clickRateChange < 0) {
        insights.push(
          `Click rate decreased by ${Math.abs(clickRateChange).toFixed(1)}% compared to previous campaign`,
        );
      }
    }

    return insights;
  }
}

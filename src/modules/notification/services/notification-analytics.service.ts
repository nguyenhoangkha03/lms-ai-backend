import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationDelivery } from '../entities/notification-delivery.entity';
import { DeliveryStatus } from '@/common/enums/notification.enums';

@Injectable()
export class NotificationAnalyticsService {
  private readonly _logger = new Logger(NotificationAnalyticsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationDelivery)
    private deliveryRepository: Repository<NotificationDelivery>,
  ) {}

  async getSystemAnalytics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const defaultDateFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const defaultDateTo = dateTo || new Date();

    const [
      totalNotifications,
      totalDeliveries,
      deliveryStats,
      typeStats,
      priorityStats,
      channelStats,
      performanceStats,
    ] = await Promise.all([
      this.getTotalNotifications(defaultDateFrom, defaultDateTo),
      this.getTotalDeliveries(defaultDateFrom, defaultDateTo),
      this.getDeliveryStats(defaultDateFrom, defaultDateTo),
      this.getNotificationsByType(defaultDateFrom, defaultDateTo),
      this.getNotificationsByPriority(defaultDateFrom, defaultDateTo),
      this.getDeliveriesByChannel(defaultDateFrom, defaultDateTo),
      this.getPerformanceMetrics(defaultDateFrom, defaultDateTo),
    ]);

    return {
      period: {
        from: defaultDateFrom,
        to: defaultDateTo,
      },
      overview: {
        totalNotifications,
        totalDeliveries,
        averageDeliveriesPerNotification:
          totalNotifications > 0 ? (totalDeliveries / totalNotifications).toFixed(2) : 0,
      },
      deliveryStats,
      typeDistribution: typeStats,
      priorityDistribution: priorityStats,
      channelPerformance: channelStats,
      performance: performanceStats,
    };
  }

  async getUserAnalytics(userId: string, dateFrom?: Date, dateTo?: Date): Promise<any> {
    const defaultDateFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const defaultDateTo = dateTo || new Date();

    const notifications = await this.notificationRepository.find({
      where: {
        userId,
        createdAt: Between(defaultDateFrom, defaultDateTo),
      },
      order: { createdAt: 'DESC' },
    });

    const readNotifications = notifications.filter(n => n.isRead);
    const unreadNotifications = notifications.filter(n => !n.isRead);

    const engagementStats = this.calculateEngagementStats(notifications);
    const timeStats = this.calculateTimeStats(notifications);
    const interactionStats = this.calculateInteractionStats(notifications);

    return {
      period: {
        from: defaultDateFrom,
        to: defaultDateTo,
      },
      summary: {
        total: notifications.length,
        read: readNotifications.length,
        unread: unreadNotifications.length,
        readRate:
          notifications.length > 0
            ? ((readNotifications.length / notifications.length) * 100).toFixed(1)
            : 0,
      },
      engagement: engagementStats,
      timing: timeStats,
      interactions: interactionStats,
      recentActivity: notifications.slice(0, 10).map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        isRead: n.isRead,
        createdAt: n.createdAt,
        readAt: n.readAt,
      })),
    };
  }

  async getDeliveryAnalytics(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const defaultDateFrom = dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    const defaultDateTo = dateTo || new Date();

    const deliveries = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.notification', 'notification')
      .where('delivery.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: defaultDateFrom,
        dateTo: defaultDateTo,
      })
      .getMany();

    const channelStats = this.groupBy(deliveries, 'channel');
    const statusStats = this.groupBy(deliveries, 'status');
    const hourlyStats = this.getHourlyDeliveryStats(deliveries);
    const failureAnalysis = this.analyzeFailures(deliveries);

    return {
      period: {
        from: defaultDateFrom,
        to: defaultDateTo,
      },
      overview: {
        totalDeliveries: deliveries.length,
        successfulDeliveries: deliveries.filter(
          d => d.status === DeliveryStatus.SENT || d.status === DeliveryStatus.DELIVERED,
        ).length,
        failedDeliveries: deliveries.filter(d => d.status === DeliveryStatus.FAILED).length,
        pendingDeliveries: deliveries.filter(d => d.status === DeliveryStatus.PENDING).length,
      },
      byChannel: Object.entries(channelStats).map(([channel, count]) => ({
        channel,
        count,
        successRate: this.calculateChannelSuccessRate(deliveries, channel),
      })),
      byStatus: Object.entries(statusStats).map(([status, count]) => ({ status, count })),
      hourlyDistribution: hourlyStats,
      failureAnalysis,
    };
  }

  private async getTotalNotifications(dateFrom: Date, dateTo: Date): Promise<number> {
    return this.notificationRepository.count({
      where: { createdAt: Between(dateFrom, dateTo) },
    });
  }

  private async getTotalDeliveries(dateFrom: Date, dateTo: Date): Promise<number> {
    return this.deliveryRepository.count({
      where: { createdAt: Between(dateFrom, dateTo) },
    });
  }

  private async getDeliveryStats(dateFrom: Date, dateTo: Date): Promise<any> {
    const deliveries = await this.deliveryRepository.find({
      where: { createdAt: Between(dateFrom, dateTo) },
    });

    const successful = deliveries.filter(
      d => d.status === DeliveryStatus.SENT || d.status === DeliveryStatus.DELIVERED,
    ).length;

    const failed = deliveries.filter(d => d.status === DeliveryStatus.FAILED).length;
    const pending = deliveries.filter(d => d.status === DeliveryStatus.PENDING).length;

    return {
      total: deliveries.length,
      successful,
      failed,
      pending,
      successRate: deliveries.length > 0 ? ((successful / deliveries.length) * 100).toFixed(2) : 0,
      failureRate: deliveries.length > 0 ? ((failed / deliveries.length) * 100).toFixed(2) : 0,
    };
  }

  private async getNotificationsByType(dateFrom: Date, dateTo: Date): Promise<any[]> {
    const result = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type, COUNT(*) as count')
      .where('notification.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('notification.type')
      .getRawMany();

    return result.map(item => ({
      type: item.notification_type,
      count: parseInt(item.count),
    }));
  }

  private async getNotificationsByPriority(dateFrom: Date, dateTo: Date): Promise<any[]> {
    const result = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.priority, COUNT(*) as count')
      .where('notification.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('notification.priority')
      .getRawMany();

    return result.map(item => ({
      priority: item.notification_priority,
      count: parseInt(item.count),
    }));
  }

  private async getDeliveriesByChannel(dateFrom: Date, dateTo: Date): Promise<any[]> {
    const result = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .select('delivery.channel, delivery.status, COUNT(*) as count')
      .where('delivery.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('delivery.channel, delivery.status')
      .getRawMany();

    const channelStats = this.groupBy(result, 'delivery_channel');

    return Object.entries(channelStats).map(([channel, deliveries]: [string, any[]]) => {
      const total = deliveries.reduce((sum, d) => sum + parseInt(d.count), 0);
      const successful = deliveries
        .filter(
          d =>
            d.delivery_status === DeliveryStatus.SENT ||
            d.delivery_status === DeliveryStatus.DELIVERED,
        )
        .reduce((sum, d) => sum + parseInt(d.count), 0);

      return {
        channel,
        total,
        successful,
        failed: total - successful,
        successRate: total > 0 ? ((successful / total) * 100).toFixed(2) : 0,
      };
    });
  }

  private async getPerformanceMetrics(dateFrom: Date, dateTo: Date): Promise<any> {
    const deliveries = await this.deliveryRepository.find({
      where: {
        createdAt: Between(dateFrom, dateTo),
        sentAt: { $ne: null } as any,
      },
    });

    const deliveryTimes = deliveries
      .filter(d => d.sentAt && d.createdAt)
      .map(d => d.sentAt!.getTime() - d.createdAt.getTime());

    const avgDeliveryTime =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
        : 0;

    const retryCount = deliveries.reduce((sum, d) => sum + d.retryCount, 0);

    return {
      averageDeliveryTime: Math.round(avgDeliveryTime / 1000), // Convert to seconds
      totalRetries: retryCount,
      averageRetriesPerDelivery:
        deliveries.length > 0 ? (retryCount / deliveries.length).toFixed(2) : 0,
    };
  }

  private calculateEngagementStats(notifications: Notification[]): any {
    const withTracking = notifications.filter(n => n.tracking);

    if (withTracking.length === 0) {
      return { clicks: 0, opens: 0, conversions: 0, clickRate: 0, openRate: 0, conversionRate: 0 };
    }

    const totalClicks = withTracking.reduce((sum, n) => sum + (n.tracking?.clicks || 0), 0);
    const totalOpens = withTracking.reduce((sum, n) => sum + (n.tracking?.opens || 0), 0);
    const totalConversions = withTracking.reduce(
      (sum, n) => sum + (n.tracking?.conversions || 0),
      0,
    );

    return {
      clicks: totalClicks,
      opens: totalOpens,
      conversions: totalConversions,
      clickRate:
        notifications.length > 0 ? ((totalClicks / notifications.length) * 100).toFixed(2) : 0,
      openRate:
        notifications.length > 0 ? ((totalOpens / notifications.length) * 100).toFixed(2) : 0,
      conversionRate:
        notifications.length > 0 ? ((totalConversions / notifications.length) * 100).toFixed(2) : 0,
    };
  }

  private calculateTimeStats(notifications: Notification[]): any {
    const readNotifications = notifications.filter(n => n.isRead && n.readAt);

    if (readNotifications.length === 0) {
      return { averageTimeToRead: 0, fastestRead: 0, slowestRead: 0 };
    }

    const readTimes = readNotifications.map(n => n.readAt!.getTime() - n.createdAt.getTime());

    const avgReadTime = readTimes.reduce((sum, time) => sum + time, 0) / readTimes.length;
    const fastestRead = Math.min(...readTimes);
    const slowestRead = Math.max(...readTimes);

    return {
      averageTimeToRead: Math.round(avgReadTime / 1000 / 60), // Convert to minutes
      fastestRead: Math.round(fastestRead / 1000 / 60),
      slowestRead: Math.round(slowestRead / 1000 / 60),
    };
  }

  private calculateInteractionStats(notifications: Notification[]): any {
    const byType = this.groupBy(notifications, 'type');
    const byPriority = this.groupBy(notifications, 'priority');

    return {
      byType: Object.entries(byType).map(([type, notifs]: [string, any[]]) => ({
        type,
        count: notifs.length,
        readCount: notifs.filter(n => n.isRead).length,
        readRate:
          notifs.length > 0
            ? ((notifs.filter(n => n.isRead).length / notifs.length) * 100).toFixed(1)
            : 0,
      })),
      byPriority: Object.entries(byPriority).map(([priority, notifs]: [string, any[]]) => ({
        priority,
        count: notifs.length,
        readCount: notifs.filter(n => n.isRead).length,
        readRate:
          notifs.length > 0
            ? ((notifs.filter(n => n.isRead).length / notifs.length) * 100).toFixed(1)
            : 0,
      })),
    };
  }

  private getHourlyDeliveryStats(deliveries: NotificationDelivery[]): any[] {
    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      successful: 0,
    }));

    deliveries.forEach(delivery => {
      const hour = delivery.createdAt.getHours();
      hourlyStats[hour].count++;

      if (delivery.status === DeliveryStatus.SENT || delivery.status === DeliveryStatus.DELIVERED) {
        hourlyStats[hour].successful++;
      }
    });

    return hourlyStats;
  }

  private analyzeFailures(deliveries: NotificationDelivery[]): any {
    const failures = deliveries.filter(d => d.status === DeliveryStatus.FAILED);

    const errorGroups = this.groupBy(failures, 'errorMessage');
    const failuresByChannel = this.groupBy(failures, 'channel');

    return {
      totalFailures: failures.length,
      commonErrors: Object.entries(errorGroups)
        .map(([error, deliveries]: [string, any[]]) => ({
          error: error || 'Unknown error',
          count: deliveries.length,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      failuresByChannel: Object.entries(failuresByChannel).map(
        ([channel, deliveries]: [string, any[]]) => ({
          channel,
          count: deliveries.length,
        }),
      ),
    };
  }

  private calculateChannelSuccessRate(deliveries: NotificationDelivery[], channel: string): string {
    const channelDeliveries = deliveries.filter(d => d.channel === channel);
    const successful = channelDeliveries.filter(
      d => d.status === DeliveryStatus.SENT || d.status === DeliveryStatus.DELIVERED,
    ).length;

    return channelDeliveries.length > 0
      ? ((successful / channelDeliveries.length) * 100).toFixed(2)
      : '0';
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const groupKey = String(item[key]);
        groups[groupKey] = groups[groupKey] || [];
        groups[groupKey].push(item);
        return groups;
      },
      {} as Record<string, T[]>,
    );
  }
}

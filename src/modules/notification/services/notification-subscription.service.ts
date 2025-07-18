import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSubscription } from '../entities/notification-subscription.entity';
import { SubscriptionDto } from '../dto/notification.dto';
import { DeliveryChannel } from '@/common/enums/notification.enums';

@Injectable()
export class NotificationSubscriptionService {
  private readonly logger = new Logger(NotificationSubscriptionService.name);

  constructor(
    @InjectRepository(NotificationSubscription)
    private subscriptionRepository: Repository<NotificationSubscription>,
  ) {}

  async create(
    userId: string,
    subscriptionDto: SubscriptionDto,
  ): Promise<NotificationSubscription> {
    // Check if subscription already exists
    const existing = await this.subscriptionRepository.findOne({
      where: {
        userId,
        channel: subscriptionDto.channel,
        endpoint: subscriptionDto.endpoint,
      },
    });

    if (existing) {
      // Update existing subscription
      await this.subscriptionRepository.update(existing.id, {
        config: subscriptionDto.config,
        deviceInfo: subscriptionDto.deviceInfo,
        platform: subscriptionDto.platform,
        isActive: true,
        lastDeliveryAt: new Date(),
      });
      return this.findOne(existing.id);
    }

    // Create new subscription
    const subscription = this.subscriptionRepository.create({
      userId,
      ...subscriptionDto,
      isActive: true,
      isVerified: subscriptionDto.channel === DeliveryChannel.IN_APP, // In-app is verified by default
      verifiedAt: subscriptionDto.channel === DeliveryChannel.IN_APP ? new Date() : undefined,
      failureCount: 0,
      analytics: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        averageResponseTime: 0,
        engagementRate: 0,
      },
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription created: ${savedSubscription.id} for user ${userId} on ${subscriptionDto.channel}`,
    );

    return savedSubscription;
  }

  async findAllForUser(userId: string): Promise<NotificationSubscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByChannel(
    userId: string,
    channel: DeliveryChannel,
  ): Promise<NotificationSubscription[]> {
    return this.subscriptionRepository.find({
      where: { userId, channel, isActive: true },
      order: { lastDeliveryAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<NotificationSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async update(
    id: string,
    updateData: Partial<SubscriptionDto>,
  ): Promise<NotificationSubscription> {
    const _subscription = await this.findOne(id);

    await this.subscriptionRepository.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });

    return this.findOne(id);
  }

  async delete(id: string, userId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.subscriptionRepository.remove(subscription);
    this.logger.log(`Subscription deleted: ${id} for user ${userId}`);
  }

  async deactivate(id: string, userId: string): Promise<NotificationSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.subscriptionRepository.update(id, {
      isActive: false,
      updatedAt: new Date(),
    });

    return this.findOne(id);
  }

  async verify(id: string, _verificationCode?: string): Promise<NotificationSubscription> {
    const _subscription = await this.findOne(id);

    // For email/SMS, you might want to verify with a code
    // For push notifications, verification is automatic

    await this.subscriptionRepository.update(id, {
      isVerified: true,
      verifiedAt: new Date(),
    });

    this.logger.log(`Subscription verified: ${id}`);
    return this.findOne(id);
  }

  async recordDelivery(id: string, success: boolean, responseTime?: number): Promise<void> {
    const subscription = await this.findOne(id);
    const analytics = subscription.analytics || {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageResponseTime: 0,
      engagementRate: 0,
    };

    analytics.totalDeliveries!++;

    if (success) {
      analytics.successfulDeliveries!++;
      await this.subscriptionRepository.update(id, {
        lastDeliveryAt: new Date(),
        failureCount: 0,
      });
    } else {
      analytics.failedDeliveries!++;
      await this.subscriptionRepository.increment({ id }, 'failureCount', 1);
    }

    if (responseTime) {
      analytics.averageResponseTime =
        (analytics.averageResponseTime! * (analytics.totalDeliveries! - 1) + responseTime) /
        analytics.totalDeliveries!;
    }

    analytics.engagementRate =
      analytics.totalDeliveries! > 0
        ? (analytics.successfulDeliveries! / analytics.totalDeliveries!) * 100
        : 0;

    await this.subscriptionRepository.update(id, { analytics });
  }

  async cleanupFailedSubscriptions(): Promise<number> {
    const failureThreshold = 10;
    const failedSubscriptions = await this.subscriptionRepository.find({
      where: {
        failureCount: { $gte: failureThreshold } as any,
        isActive: true,
      },
    });

    if (failedSubscriptions.length > 0) {
      await this.subscriptionRepository.update(
        { id: { $in: failedSubscriptions.map(s => s.id) } as any },
        { isActive: false },
      );

      this.logger.log(`Deactivated ${failedSubscriptions.length} failed subscriptions`);
    }

    return failedSubscriptions.length;
  }

  async getSubscriptionStats(userId: string): Promise<any> {
    const subscriptions = await this.findAllForUser(userId);

    const stats = {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.isActive).length,
      verified: subscriptions.filter(s => s.isVerified).length,
      byChannel: {} as Record<string, number>,
      byPlatform: {} as Record<string, number>,
    };

    subscriptions.forEach(sub => {
      stats.byChannel[sub.channel] = (stats.byChannel[sub.channel] || 0) + 1;
      if (sub.platform) {
        stats.byPlatform[sub.platform] = (stats.byPlatform[sub.platform] || 0) + 1;
      }
    });

    return stats;
  }
}

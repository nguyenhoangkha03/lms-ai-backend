import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from '@/modules/notification/entities/notification.entity';
import { NotificationDelivery } from '@/modules/notification/entities/notification-delivery.entity';
import { DeliveryStatus } from '@/common/enums/notification.enums';

@Injectable()
export class NotificationCleanupTask {
  private readonly logger = new Logger(NotificationCleanupTask.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationDelivery)
    private deliveryRepository: Repository<NotificationDelivery>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredNotifications() {
    this.logger.log('Starting expired notifications cleanup...');

    try {
      const expiredCount = await this.notificationRepository.softDelete({
        expiresAt: LessThan(new Date()),
      });

      this.logger.log(`Cleaned up ${expiredCount.affected} expired notifications`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldDeliveries() {
    this.logger.log('Starting old deliveries cleanup...');

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

      const deletedCount = await this.deliveryRepository.delete({
        createdAt: LessThan(cutoffDate),
        status: DeliveryStatus.DELIVERED,
      });

      this.logger.log(`Cleaned up ${deletedCount.affected} old delivery records`);
    } catch (error) {
      this.logger.error('Failed to cleanup old deliveries:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async retryFailedDeliveries() {
    this.logger.log('Processing failed delivery retries...');

    try {
      const failedDeliveries = await this.deliveryRepository.find({
        where: {
          status: DeliveryStatus.FAILED,
          retryCount: LessThan(3),
          nextRetryAt: LessThan(new Date()),
        },
        relations: ['notification'],
      });

      this.logger.log(`Found ${failedDeliveries.length} failed deliveries to retry`);

      // Implementation would queue these for retry
      // This would integrate with the NotificationDeliveryService
    } catch (error) {
      this.logger.error('Failed to process retry queue:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateDailyDigests() {
    this.logger.log('Generating daily notification digests...');

    try {
      // Implementation would:
      // 1. Find users with digest preferences enabled
      // 2. Aggregate their unread notifications
      // 3. Send digest emails

      this.logger.log('Daily digests generation completed');
    } catch (error) {
      this.logger.error('Failed to generate daily digests:', error);
    }
  }
}

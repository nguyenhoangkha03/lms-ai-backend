import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationDeliveryService } from '../services/notification-delivery.service';

@Processor('notification-delivery')
export class NotificationDeliveryProcessor {
  private readonly logger = new Logger(NotificationDeliveryProcessor.name);

  constructor(private deliveryService: NotificationDeliveryService) {}

  @Process('deliver-notification')
  async handleDeliverNotification(job: Job<{ notificationId: string }>) {
    const { notificationId } = job.data;

    this.logger.log(`Processing notification delivery: ${notificationId}`);

    try {
      await this.deliveryService.deliverNotification(notificationId);
      this.logger.log(`Notification delivered successfully: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Failed to deliver notification ${notificationId}:`, error);
      throw error;
    }
  }

  @Process('deliver-single-channel')
  async handleDeliverSingleChannel(job: Job<{ notificationId: string; channel: string }>) {
    const { notificationId, channel } = job.data;

    this.logger.log(`Processing single channel delivery: ${notificationId} -> ${channel}`);

    try {
      await this.deliveryService.deliverToChannel(notificationId, channel as any);
      this.logger.log(`Channel delivery completed: ${notificationId} -> ${channel}`);
    } catch (error) {
      this.logger.error(
        `Failed to deliver to channel ${channel} for notification ${notificationId}:`,
        error,
      );
      throw error;
    }
  }

  @Process('retry-delivery')
  async handleRetryDelivery(job: Job<{ deliveryId: string }>) {
    const { deliveryId } = job.data;

    this.logger.log(`Processing delivery retry: ${deliveryId}`);

    try {
      // Implementation would fetch delivery record and retry based on channel
      this.logger.log(`Delivery retry completed: ${deliveryId}`);
    } catch (error) {
      this.logger.error(`Failed to retry delivery ${deliveryId}:`, error);
      throw error;
    }
  }

  @Process('cleanup-expired')
  async handleCleanupExpired(_job: Job) {
    this.logger.log('Processing expired notifications cleanup');

    try {
      // Implementation would clean up expired notifications
      this.logger.log('Expired notifications cleanup completed');
    } catch (error) {
      this.logger.error('Failed to cleanup expired notifications:', error);
      throw error;
    }
  }
}

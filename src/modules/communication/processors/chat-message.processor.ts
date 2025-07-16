import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ChatNotificationService } from '../services/chat-notification.service';
import { ChatMessageService } from '../services/chat-message.service';

@Processor('chat-message')
export class ChatMessageProcessor {
  private readonly logger = new Logger(ChatMessageProcessor.name);

  constructor(
    private readonly notificationService: ChatNotificationService,
    private readonly messageService: ChatMessageService,
  ) {}

  @Process('send-notifications')
  async handleMessageNotifications(
    job: Job<{
      messageId: string;
      roomId: string;
      senderId: string;
      content: string;
      mentions?: any;
    }>,
  ) {
    const { messageId, roomId, senderId, content, mentions } = job.data;

    try {
      this.logger.debug(`Processing notifications for message ${messageId}`);

      // Send notifications to mentioned users
      if (mentions?.users?.length > 0) {
        await this.notificationService.sendMentionNotifications(
          mentions.users,
          messageId,
          senderId,
          content,
        );
      }

      // Send @everyone notifications
      if (mentions?.everyone) {
        await this.notificationService.sendEveryoneNotification(
          roomId,
          messageId,
          senderId,
          content,
        );
      }

      // Send push notifications to offline users
      await this.notificationService.sendOfflineNotifications(roomId, messageId, senderId, content);

      this.logger.debug(`Notifications sent for message ${messageId}`);
    } catch (error) {
      this.logger.error(`Error processing message notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('process-attachments')
  async handleAttachmentProcessing(
    job: Job<{
      fileId: string;
      messageId: string;
    }>,
  ) {
    const { fileId: _, messageId } = job.data;

    try {
      this.logger.debug(`Processing attachments for message ${messageId}`);

      // Process file (generate thumbnails, extract metadata, etc.)
      // This would be handled by the FileService

      this.logger.debug(`Attachments processed for message ${messageId}`);
    } catch (error) {
      this.logger.error(`Error processing attachments: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('cleanup-old-messages')
  async handleMessageCleanup(
    job: Job<{
      roomId: string;
      retentionDays: number;
    }>,
  ) {
    const { roomId, retentionDays } = job.data;

    try {
      this.logger.debug(`Cleaning up old messages for room ${roomId}`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up old messages
      // This would be implemented in MessageService

      this.logger.debug(`Message cleanup completed for room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error during message cleanup: ${error.message}`, error.stack);
      throw error;
    }
  }
}

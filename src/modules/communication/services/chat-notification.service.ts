import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { NotificationService } from '../../notification/services/notification.service';
import { UserService } from '../../user/services/user.service';
import { NotificationCategory, NotificationType } from '@/common/enums/notification.enums';

@Injectable()
export class ChatNotificationService {
  private readonly logger = new Logger(ChatNotificationService.name);

  constructor(
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  async sendMentionNotifications(
    mentionedUserIds: string[],
    messageId: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    try {
      const sender = await this.userService.findById(senderId);

      for (const userId of mentionedUserIds) {
        await this.notificationService.createNotification({
          userId,
          type: NotificationType.CHAT_MENTION,
          category: NotificationCategory.CHAT,
          title: `${sender.firstName} ${sender.lastName} mentioned you`,
          message: content.substring(0, 100),
          data: {
            messageId,
            senderId,
            senderName: `${sender.firstName} ${sender.lastName}`,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error sending mention notifications: ${error.message}`);
    }
  }

  async sendEveryoneNotification(
    roomId: string,
    messageId: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    try {
      const participants = await this.participantRepository.find({
        where: {
          roomId,
          isActive: true,
        },
        select: ['userId'],
      });

      const userIds = participants.map(p => p.userId).filter(id => id !== senderId);

      const sender = await this.userService.findById(senderId);

      for (const userId of userIds) {
        await this.notificationService.createNotification({
          userId,
          type: NotificationType.CHAT_EVERYONE,
          category: NotificationCategory.CHAT,
          title: `${sender.firstName} ${sender.lastName} sent a message to everyone`,
          message: content.substring(0, 100),
          data: {
            messageId,
            senderId,
            roomId,
            senderName: `${sender.firstName} ${sender.lastName}`,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error sending everyone notifications: ${error.message}`);
    }
  }

  async sendOfflineNotifications(
    roomId: string,
    messageId: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    try {
      // Get offline participants (would need to track online status)
      // This is a simplified implementation
      const participants = await this.participantRepository.find({
        where: {
          roomId,
          isActive: true,
        },
        relations: ['user'],
      });

      const sender = await this.userService.findById(senderId);

      for (const participant of participants) {
        if (participant.userId === senderId) continue;

        const user = participant.user;
        const chatPref = user.notificationPreferences?.find(
          pref => pref.notificationType === NotificationType.CHAT_MESSAGE,
        );

        if (chatPref?.pushEnabled) {
          await this.notificationService.createNotification({
            userId: participant.userId,
            type: NotificationType.CHAT_MESSAGE,
            category: NotificationCategory.CHAT,
            title: `New message in chat`,
            message: content.substring(0, 100),
            data: {
              messageId,
              senderId,
              roomId,
              senderName: `${sender.firstName} ${sender.lastName}`,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error sending offline notifications: ${error.message}`);
    }
  }
}

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  NotificationQueryDto,
  BulkNotificationDto,
  TestNotificationDto,
} from '../dto/notification.dto';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  DeliveryChannel,
} from '@/common/enums/notification.enums';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createDto,
      deliveryStatus: {},
      tracking: {
        impressions: 0,
        clicks: 0,
        opens: 0,
        conversions: 0,
      },
      metadata: createDto.metadata || {},
    });

    const savedNotification = await this.notificationRepository.save(notification);
    this.logger.log(
      `Notification created: ${savedNotification.id} for user: ${savedNotification.userId}`,
    );

    return savedNotification;
  }

  async createBulk(bulkDto: BulkNotificationDto): Promise<Notification[]> {
    const notifications = bulkDto.userIds.map(userId =>
      this.notificationRepository.create({
        userId,
        title: bulkDto.title,
        message: bulkDto.message,
        type: bulkDto.type,
        category: bulkDto.category,
        priority: NotificationPriority.NORMAL,
        deliveryStatus: {},
        tracking: {
          impressions: 0,
          clicks: 0,
          opens: 0,
          conversions: 0,
        },
        metadata: bulkDto.templateVariables || {},
      }),
    );

    const savedNotifications = await this.notificationRepository.save(notifications);
    this.logger.log(`Bulk notifications created: ${savedNotifications.length} notifications`);

    return savedNotifications;
  }

  async findAllForUser(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{ data: Notification[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      priority,
      isRead,
      relatedType,
      search,
      dateFrom,
      dateTo,
    } = query;

    console.log(`User ${userId} retrieved page ${page}`);
    console.log(`User ${userId} retrieved limit ${limit}`);
    console.log(`User ${userId} retrieved type ${type}`);
    console.log(`User ${userId} retrieved category ${category}`);
    console.log(`User ${userId} retrieved priority ${priority}`);
    console.log(`User ${userId} retrieved isRead ${isRead}`);
    console.log(`User ${userId} retrieved relatedType ${relatedType}`);
    console.log(`User ${userId} retrieved search ${search}`);
    console.log(`User ${userId} retrieved dateFrom ${dateFrom}`);
    console.log(`User ${userId} retrieved dateTo ${dateTo}`);

    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (category) {
      queryBuilder.andWhere('notification.category = :category', { category });
    }

    if (priority) {
      queryBuilder.andWhere('notification.priority = :priority', { priority });
    }

    if (typeof isRead === 'boolean') {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
    }

    if (relatedType) {
      queryBuilder.andWhere('notification.relatedType = :relatedType', { relatedType });
    }

    if (search) {
      queryBuilder.andWhere(
        '(notification.title LIKE :search OR notification.message LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (dateFrom) {
      queryBuilder.andWhere('notification.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('notification.createdAt <= :dateTo', { dateTo });
    }

    // Exclude expired notifications
    queryBuilder.andWhere('(notification.expiresAt IS NULL OR notification.expiresAt > :now)', {
      now: new Date(),
    });

    queryBuilder.skip(skip).take(limit).orderBy('notification.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Track impression
    await this.trackInteraction(id, 'impression');

    return notification;
  }

  async update(
    id: string,
    updateDto: UpdateNotificationDto,
    userId: string,
  ): Promise<Notification> {
    const _notification = await this.findOne(id, userId);

    await this.notificationRepository.update(id, {
      ...updateDto,
      updatedAt: new Date(),
    });

    return this.findOne(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    const _notification = await this.findOne(id, userId);

    await this.notificationRepository.softDelete(id);
    this.logger.log(`Notification deleted: ${id} by user: ${userId}`);
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.findOne(id, userId);

    if (!notification.isRead) {
      await this.notificationRepository.update(id, {
        isRead: true,
        readAt: new Date(),
      });

      // Track open
      await this.trackInteraction(id, 'open');

      this.logger.log(`Notification marked as read: ${id} by user: ${userId}`);
    }
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    this.logger.log(`Marked ${result.affected || 0} notifications as read for user: ${userId}`);
    return result.affected || 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const count1 = await this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
        expiresAt: IsNull(),
      },
    });

    const count2 = await this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
        expiresAt: Between(new Date(), new Date('9999-12-31')),
      },
    });

    return count1 + count2;
  }

  async trackInteraction(
    notificationId: string,
    interactionType: 'impression' | 'click' | 'open' | 'conversion',
  ): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return;
    }

    const tracking = notification.tracking || {
      impressions: 0,
      clicks: 0,
      opens: 0,
      conversions: 0,
    };

    tracking[interactionType + 's'] = (tracking[interactionType + 's'] || 0) + 1;
    tracking.lastInteraction = new Date();

    await this.notificationRepository.update(notificationId, {
      tracking,
    });
  }

  async sendTestNotification(testDto: TestNotificationDto, userId: string): Promise<void> {
    const notification = await this.create({
      userId,
      title: `[TEST] ${testDto.title}`,
      message: testDto.message,
      type: NotificationType.SYSTEM_MAINTENANCE,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.LOW,
      channels: [testDto.channel],
      templateVariables: testDto.templateVariables,
      metadata: { isTest: true },
    });

    this.logger.log(`Test notification sent: ${notification.id} via ${testDto.channel}`);
  }

  async getAnalytics(userId: string): Promise<any> {
    const totalNotifications = await this.notificationRepository.count({
      where: { userId },
    });

    const unreadNotifications = await this.getUnreadCount(userId);
    const readNotifications = totalNotifications - unreadNotifications;

    const notificationsByType = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type, COUNT(*) as count')
      .where('notification.userId = :userId', { userId })
      .groupBy('notification.type')
      .getRawMany();

    const notificationsByPriority = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.priority, COUNT(*) as count')
      .where('notification.userId = :userId', { userId })
      .groupBy('notification.priority')
      .getRawMany();

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentActivity = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('DATE(notification.createdAt) as date, COUNT(*) as count')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.createdAt >= :since', { since: last30Days })
      .groupBy('DATE(notification.createdAt)')
      .orderBy('date', 'DESC')
      .getRawMany();

    return {
      summary: {
        total: totalNotifications,
        unread: unreadNotifications,
        read: readNotifications,
        readPercentage:
          totalNotifications > 0 ? Math.round((readNotifications / totalNotifications) * 100) : 0,
      },
      byType: notificationsByType.map(item => ({
        type: item.notification_type,
        count: parseInt(item.count),
      })),
      byPriority: notificationsByPriority.map(item => ({
        priority: item.notification_priority,
        count: parseInt(item.count),
      })),
      recentActivity: recentActivity.map(item => ({
        date: item.date,
        count: parseInt(item.count),
      })),
    };
  }

  // Helper methods for integrations
  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority?: NotificationPriority;
    relatedId?: string;
    relatedType?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
    data?: {
      messageId?: string;
      senderId?: string;
      senderName?: string;
      roomId?: string;
      sessionId?: string;
    };
  }): Promise<Notification> {
    return this.create({
      ...data,
      priority: data.priority || NotificationPriority.NORMAL,
    });
  }

  async scheduleNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    scheduledFor: Date;
    priority?: NotificationPriority;
    channels?: DeliveryChannel[];
    metadata?: Record<string, any>;
    data?: {
      sessionId?: string;
    };
  }): Promise<Notification> {
    const notification = await this.create({
      ...data,
      priority: data.priority || NotificationPriority.NORMAL,
      scheduledFor: data.scheduledFor,
    });

    this.logger.log(`Notification scheduled: ${notification.id} for ${data.scheduledFor}`);
    return notification;
  }

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.find({
      where: { userId },
    });
  }

  async createDefaultPreferences(userId: string): Promise<void> {
    const defaultPreferences = Object.values(NotificationType).map(
      type =>
        ({
          userId,
          notificationType: type,
          emailEnabled: true,
          pushEnabled: true,
          smsEnabled: false,
          inAppEnabled: true,
          frequency: 'immediate',
        }) as NotificationPreference,
    );

    await this.preferenceRepository.save(defaultPreferences);
    this.logger.log(`Default preferences created for user: ${userId}`);
  }
}

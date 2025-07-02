import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from '@/common/enums/notification.enums';
import { User } from '../../user/entities/user.entity';

@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['priority'])
@Index(['category'])
@Index(['isRead'])
@Index(['createdAt'])
@Index(['relatedId'])
@Index(['relatedType'])
export class Notification extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Recipient user ID',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Notification title',
  })
  title: string;

  @Column({
    type: 'text',
    comment: 'Notification message content',
  })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: 'Type of notification',
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
    comment: 'Priority level of notification',
  })
  priority: NotificationPriority;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
    comment: 'Category of notification',
  })
  category: NotificationCategory;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of related entity',
  })
  relatedId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Type of related entity',
  })
  relatedType?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether notification has been read',
  })
  isRead: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When notification was read',
  })
  readAt?: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Icon URL for notification',
  })
  iconUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Image URL for rich notifications',
  })
  imageUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Action URL when notification is clicked',
  })
  actionUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Action buttons for rich notifications',
  })
  actions?: {
    id: string;
    label: string;
    action: string;
    url?: string;
    style?: 'primary' | 'secondary' | 'danger';
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Delivery channel status',
  })
  deliveryStatus?: {
    inApp?: { sent: boolean; deliveredAt?: Date };
    email?: { sent: boolean; deliveredAt?: Date; opened?: boolean };
    push?: { sent: boolean; deliveredAt?: Date; clicked?: boolean };
    sms?: { sent: boolean; deliveredAt?: Date };
    slack?: { sent: boolean; deliveredAt?: Date };
    discord?: { sent: boolean; deliveredAt?: Date };
  };

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When notification expires',
  })
  expiresAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Personalization data',
  })
  personalization?: {
    userPreferences?: Record<string, any>;
    localization?: { language: string; timezone: string };
    customization?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Tracking and analytics data',
  })
  tracking?: {
    impressions?: number;
    clicks?: number;
    opens?: number;
    conversions?: number;
    lastInteraction?: Date;
    source?: string;
    campaign?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Rich content data',
  })
  richContent?: {
    html?: string;
    markdown?: string;
    attachments?: { type: string; url: string; name: string }[];
    embeds?: { type: string; url: string; title?: string; description?: string }[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Scheduling information',
  })
  scheduling?: {
    scheduledFor?: Date;
    timezone?: string;
    recurring?: {
      pattern: 'daily' | 'weekly' | 'monthly';
      interval?: number;
      endDate?: Date;
      daysOfWeek?: number[];
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Grouping information for notification bundling',
  })
  grouping?: {
    groupId?: string;
    groupType?: string;
    groupTitle?: string;
    groupCount?: number;
    isGroupSummary?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional notification metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt! <= new Date();
  }

  get isHighPriority(): boolean {
    return (
      this.priority === NotificationPriority.HIGH || this.priority === NotificationPriority.URGENT
    );
  }

  get wasDelivered(): boolean {
    return Object.values(this.deliveryStatus || {}).some(status => status.sent);
  }

  get deliveryChannels(): string[] {
    if (!this.deliveryStatus) return [];
    return Object.keys(this.deliveryStatus).filter(channel => this.deliveryStatus![channel].sent);
  }

  get hasBeenInteracted(): boolean {
    return this.tracking?.clicks || this.tracking?.opens || this.tracking?.conversions
      ? true
      : false;
  }
}

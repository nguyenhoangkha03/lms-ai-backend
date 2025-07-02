import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { NotificationType, NotificationFrequency } from '@/common/enums/notification.enums';
import { User } from '../../user/entities/user.entity';

@Entity('notification_preferences')
@Unique(['userId', 'notificationType'])
@Index(['userId'])
@Index(['notificationType'])
@Index(['emailEnabled'])
@Index(['pushEnabled'])
export class NotificationPreference extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: 'Type of notification',
  })
  notificationType: NotificationType;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether email notifications are enabled',
  })
  emailEnabled: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether push notifications are enabled',
  })
  pushEnabled: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether SMS notifications are enabled',
  })
  smsEnabled: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether in-app notifications are enabled',
  })
  inAppEnabled: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether Slack notifications are enabled',
  })
  slackEnabled: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether Discord notifications are enabled',
  })
  discordEnabled: boolean;

  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
    comment: 'Notification frequency preference',
  })
  frequency: NotificationFrequency;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Quiet hours configuration',
  })
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
    weekdays: number[]; // 0-6, Sunday = 0
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Advanced filtering preferences',
  })
  filters?: {
    minimumPriority?: string;
    keywords?: string[];
    excludeKeywords?: string[];
    senderWhitelist?: string[];
    senderBlacklist?: string[];
    categoryFilters?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Digest settings for batched notifications',
  })
  digestSettings?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    time: string; // HH:MM format for daily/weekly
    dayOfWeek?: number; // 0-6 for weekly
    maxItems?: number;
    groupByCategory?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Custom delivery preferences',
  })
  deliveryPreferences?: {
    email?: {
      format: 'html' | 'text';
      includeImages: boolean;
      unsubscribeLink: boolean;
    };
    push?: {
      sound: boolean;
      vibration: boolean;
      badge: boolean;
      grouping: boolean;
    };
    sms?: {
      shortFormat: boolean;
      includeLinks: boolean;
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Integration settings',
  })
  integrations?: {
    slack?: {
      channelId?: string;
      webhookUrl?: string;
      mentionUser?: boolean;
    };
    discord?: {
      channelId?: string;
      webhookUrl?: string;
      mentionUser?: boolean;
    };
    teams?: {
      channelId?: string;
      webhookUrl?: string;
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional preference metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get hasAnyChannelEnabled(): boolean {
    return (
      this.emailEnabled ||
      this.pushEnabled ||
      this.smsEnabled ||
      this.inAppEnabled ||
      this.slackEnabled ||
      this.discordEnabled
    );
  }

  get isInQuietHours(): boolean {
    if (!this.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = now.getDay();

    return (
      this.quietHours.weekdays.includes(currentDay) &&
      currentTime >= this.quietHours.startTime &&
      currentTime <= this.quietHours.endTime
    );
  }

  get enabledChannels(): string[] {
    const channels: string[] = [];
    if (this.emailEnabled) channels.push('email');
    if (this.pushEnabled) channels.push('push');
    if (this.smsEnabled) channels.push('sms');
    if (this.inAppEnabled) channels.push('inApp');
    if (this.slackEnabled) channels.push('slack');
    if (this.discordEnabled) channels.push('discord');
    return channels;
  }
}

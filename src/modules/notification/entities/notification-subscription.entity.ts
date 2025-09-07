import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DeliveryChannel } from '@/common/enums/notification.enums';
import { User } from '../../user/entities/user.entity';

@Entity('notification_subscriptions')
@Unique(['userId', 'channel'])
@Index(['userId'])
@Index(['channel'])
@Index(['isActive'])
export class NotificationSubscription extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: DeliveryChannel,
    comment: 'Subscription channel',
  })
  channel: DeliveryChannel;

  @Column({
    type: 'text',
    comment: 'Subscription endpoint (URL, token, phone, etc.)',
  })
  endpoint: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Channel-specific configuration',
  })
  config?: {
    // For push notifications
    pushSubscription?: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    };

    // For email
    emailSettings?: {
      format: 'html' | 'text';
      unsubscribeToken: string;
    };

    // For SMS
    smsSettings?: {
      carrierInfo?: string;
      timezone?: string;
    };

    // For Slack/Discord
    integrationSettings?: {
      channelId?: string;
      accessToken?: string;
      webhookUrl?: string;
    };
  };

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether subscription is active',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether subscription is verified',
  })
  isVerified: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When subscription was verified',
  })
  verifiedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last successful delivery',
  })
  lastDeliveryAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of failed deliveries',
  })
  failureCount: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Device/browser information',
  })
  deviceInfo?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Platform (web, mobile, desktop)',
  })
  platform?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Subscription analytics',
  })
  analytics?: {
    totalDeliveries?: number;
    successfulDeliveries?: number;
    failedDeliveries?: number;
    averageResponseTime?: number;
    lastClickedAt?: Date;
    engagementRate?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional subscription metadata',
  })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

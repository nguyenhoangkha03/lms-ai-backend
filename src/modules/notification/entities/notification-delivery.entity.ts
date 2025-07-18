import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DeliveryChannel, DeliveryStatus } from '@/common/enums/notification.enums';
import { Notification } from './notification.entity';

@Entity('notification_deliveries')
@Index(['notificationId'])
@Index(['channel'])
@Index(['status'])
@Index(['sentAt'])
@Index(['deliveredAt'])
export class NotificationDelivery extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Notification ID',
  })
  notificationId: string;

  @Column({
    type: 'enum',
    enum: DeliveryChannel,
    comment: 'Delivery channel used',
  })
  channel: DeliveryChannel;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
    comment: 'Delivery status',
  })
  status: DeliveryStatus;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Recipient address (email, phone, etc.)',
  })
  recipientAddress?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Template used for delivery',
  })
  templateId?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Rendered content sent',
  })
  renderedContent?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Subject line used',
  })
  subject?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When delivery was sent',
  })
  sentAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When delivery was confirmed',
  })
  deliveredAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When content was opened/viewed',
  })
  openedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When action was clicked',
  })
  clickedAt?: Date;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'External provider message ID',
  })
  externalId?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if delivery failed',
  })
  errorMessage?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of retry attempts',
  })
  retryCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Next retry scheduled time',
  })
  nextRetryAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Provider-specific response data',
  })
  providerResponse?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Delivery analytics and tracking',
  })
  analytics?: {
    deliveryTime?: number; // milliseconds
    userAgent?: string;
    ipAddress?: string;
    deviceType?: string;
    location?: string;
    openCount?: number;
    clickCount?: number;
    conversions?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional delivery metadata',
  })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification: Notification;
}

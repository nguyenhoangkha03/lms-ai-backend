import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EmailCampaign } from './email-campaign.entity';
import { User } from '../../user/entities/user.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  UNSUBSCRIBED = 'unsubscribed',
  COMPLAINED = 'complained',
}

@Entity('email_campaign_recipients')
@Index(['campaignId'])
@Index(['userId'])
@Index(['email'])
@Index(['status'])
@Index(['sentAt'])
@Index(['deliveredAt'])
@Index(['openedAt'])
@Index(['clickedAt'])
export class EmailCampaignRecipient extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Campaign ID',
  })
  campaignId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User ID if recipient is registered user',
  })
  userId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Recipient email address',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Recipient first name',
  })
  firstName?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Recipient last name',
  })
  lastName?: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
    comment: 'Current delivery status',
  })
  status: DeliveryStatus;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'External message ID from email provider',
  })
  messageId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'A/B test variant name',
  })
  variant?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Personalization variables for this recipient',
  })
  variables?: Record<string, any>;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When email was sent',
  })
  sentAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When email was delivered',
  })
  deliveredAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When email was first opened',
  })
  openedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When email was last opened',
  })
  lastOpenedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When first link was clicked',
  })
  clickedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When last link was clicked',
  })
  lastClickedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When email bounced',
  })
  bouncedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When recipient unsubscribed',
  })
  unsubscribedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When spam complaint was filed',
  })
  complainedAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of times email was opened',
  })
  openCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of link clicks',
  })
  clickCount: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Bounce type (hard/soft)',
  })
  bounceType?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Bounce reason or error message',
  })
  bounceReason?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Device and browser info from opens/clicks',
  })
  deviceInfo?: {
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    mobile?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Geographic information from opens/clicks',
  })
  geoInfo?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
    ip?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Click tracking data',
  })
  clickData?: Array<{
    url: string;
    clickedAt: Date;
    userAgent?: string;
    ip?: string;
  }>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Email open tracking data',
  })
  openData?: Array<{
    openedAt: Date;
    userAgent?: string;
    ip?: string;
  }>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  @ManyToOne(() => EmailCampaign, campaign => campaign.recipients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: EmailCampaign;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: User;
}

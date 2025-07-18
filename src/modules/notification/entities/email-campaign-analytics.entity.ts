import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EmailCampaign } from './email-campaign.entity';

export enum AnalyticsEventType {
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
  UNSUBSCRIBED = 'unsubscribed',
  COMPLAINED = 'complained',
  FAILED = 'failed',
}

@Entity('email_campaign_analytics')
@Index(['campaignId'])
@Index(['eventType'])
@Index(['timestamp'])
@Index(['recipientEmail'])
@Index(['url'])
@Index(['userAgent'])
@Index(['ip'])
export class EmailCampaignAnalytics extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Campaign ID',
  })
  campaignId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Recipient email address',
  })
  recipientEmail: string;

  @Column({
    type: 'enum',
    enum: AnalyticsEventType,
    comment: 'Type of analytics event',
  })
  eventType: AnalyticsEventType;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the event occurred',
  })
  timestamp: Date;

  @Column({
    type: 'varchar',
    length: 1000,
    nullable: true,
    comment: 'URL clicked (for click events)',
  })
  url?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'User agent string',
  })
  userAgent?: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address of the event',
  })
  ip?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Country from IP geolocation',
  })
  country?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Region from IP geolocation',
  })
  region?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'City from IP geolocation',
  })
  city?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Browser name',
  })
  browser?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Operating system',
  })
  os?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Device type (mobile, desktop, tablet)',
  })
  device?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether the event was from a mobile device',
  })
  isMobile: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Email client used to open email',
  })
  emailClient?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Referrer URL (for click events)',
  })
  referrer?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional event-specific data',
  })
  eventData?: {
    // For bounce events
    bounceType?: 'hard' | 'soft';
    bounceReason?: string;
    bounceSubType?: string;

    // For click events
    linkPosition?: number;
    linkText?: string;

    // For open events
    openType?: 'first' | 'repeat';

    // For unsubscribe events
    unsubscribeMethod?: 'link' | 'reply' | 'complaint';

    // For spam complaint events
    feedbackType?: string;

    // General metadata
    campaignVariant?: string;
    customTrackingParams?: Record<string, string>;
  };

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'External message ID from email provider',
  })
  messageId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Email provider that reported this event',
  })
  provider?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Raw webhook data from email provider',
  })
  rawData?: Record<string, any>;

  @ManyToOne(() => EmailCampaign, campaign => campaign.analytics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaignId' })
  campaign: EmailCampaign;
}

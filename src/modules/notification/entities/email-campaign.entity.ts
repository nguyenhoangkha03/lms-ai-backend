import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EmailCampaignRecipient } from './email-campaign-recipient.entity';
import { EmailCampaignAnalytics } from './email-campaign-analytics.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum CampaignType {
  NEWSLETTER = 'newsletter',
  PROMOTIONAL = 'promotional',
  COURSE_ANNOUNCEMENT = 'course_announcement',
  REMINDER = 'reminder',
  SYSTEM_UPDATE = 'system_update',
  MARKETING = 'marketing',
  EDUCATIONAL = 'educational',
}

@Entity('email_campaigns')
@Index(['status'])
@Index(['type'])
@Index(['scheduledAt'])
@Index(['createdBy'])
@Index(['targetAudience'])
export class EmailCampaign extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Campaign name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Campaign description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: CampaignType,
    comment: 'Type of email campaign',
  })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
    comment: 'Current status of campaign',
  })
  status: CampaignStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User who created the campaign',
  })
  createdBy: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Email subject line',
  })
  subject: string;

  @Column({
    type: 'longtext',
    comment: 'Email HTML content',
  })
  htmlContent: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Email plain text content',
  })
  textContent?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'From email address',
  })
  fromEmail?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'From name',
  })
  fromName?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Reply-to email address',
  })
  replyToEmail?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Target audience criteria',
  })
  targetAudience?: {
    userTypes?: string[];
    courseIds?: string[];
    tags?: string[];
    customQuery?: string;
    excludeUserIds?: string[];
    includeUserIds?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Campaign settings and configuration',
  })
  settings?: {
    enableTracking?: boolean;
    enableClickTracking?: boolean;
    enableOpenTracking?: boolean;
    enableUnsubscribeTracking?: boolean;
    customHeaders?: Record<string, string>;
    suppressionList?: string[];
    abTesting?: {
      enabled: boolean;
      variants: Array<{
        name: string;
        subject: string;
        htmlContent: string;
        percentage: number;
      }>;
    };
    deliverySettings?: {
      throttleRate?: number; // emails per minute
      retryAttempts?: number;
      retryDelay?: number; // minutes
    };
  };

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When campaign is scheduled to be sent',
  })
  scheduledAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When campaign sending started',
  })
  sentAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When campaign sending completed',
  })
  completedAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total number of recipients',
  })
  totalRecipients: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of emails sent successfully',
  })
  sentCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of failed email sends',
  })
  failedCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of bounced emails',
  })
  bouncedCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of emails opened',
  })
  openedCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of links clicked',
  })
  clickedCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of unsubscribes',
  })
  unsubscribedCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of spam complaints',
  })
  complaintsCount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Open rate percentage',
  })
  openRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Click-through rate percentage',
  })
  clickRate: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Detailed campaign statistics',
  })
  statistics?: {
    deliveryReport?: {
      delivered: number;
      bounced: number;
      deferred: number;
      dropped: number;
    };
    engagementReport?: {
      opens: number;
      uniqueOpens: number;
      clicks: number;
      uniqueClicks: number;
      unsubscribes: number;
      spamReports: number;
    };
    timeBasedStats?: {
      hourlyOpenRate: Record<string, number>;
      dailyOpenRate: Record<string, number>;
      deviceStats: Record<string, number>;
      locationStats: Record<string, number>;
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Campaign error logs and debugging info',
  })
  errorLogs?: Array<{
    timestamp: Date;
    error: string;
    details?: any;
    recipientEmail?: string;
  }>;

  @OneToMany(() => EmailCampaignRecipient, recipient => recipient.campaign)
  recipients: EmailCampaignRecipient[];

  @OneToMany(() => EmailCampaignAnalytics, analytics => analytics.campaign)
  analytics: EmailCampaignAnalytics[];
}

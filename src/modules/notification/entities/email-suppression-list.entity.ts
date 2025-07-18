import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

export enum SuppressionReason {
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED_HARD = 'bounced_hard',
  BOUNCED_SOFT = 'bounced_soft',
  SPAM_COMPLAINT = 'spam_complaint',
  MANUAL_SUPPRESSION = 'manual_suppression',
  GDPR_REQUEST = 'gdpr_request',
  INVALID_EMAIL = 'invalid_email',
  ROLE_ACCOUNT = 'role_account',
  GLOBALLY_SUPPRESSED = 'globally_suppressed',
}

export enum SuppressionScope {
  GLOBAL = 'global', // Suppressed from all emails
  MARKETING = 'marketing', // Only marketing emails
  TRANSACTIONAL = 'transactional', // Only transactional emails
  SPECIFIC_CAMPAIGN = 'specific_campaign', // Specific campaign type
  WORKFLOW = 'workflow', // Specific workflow
}

@Entity('email_suppression_list')
@Index(['email'])
@Index(['reason'])
@Index(['scope'])
@Index(['isActive'])
@Index(['suppressedAt'])
@Index(['expiresAt'])
export class EmailSuppressionList extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    unique: false, // Allow same email with different scopes
    comment: 'Suppressed email address',
  })
  email: string;

  @Column({
    type: 'enum',
    enum: SuppressionReason,
    comment: 'Reason for suppression',
  })
  reason: SuppressionReason;

  @Column({
    type: 'enum',
    enum: SuppressionScope,
    default: SuppressionScope.GLOBAL,
    comment: 'Scope of suppression',
  })
  scope: SuppressionScope;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Specific campaign/workflow ID for scoped suppression',
  })
  scopeId?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether suppression is currently active',
  })
  isActive: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When email was suppressed',
  })
  suppressedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When suppression expires (null for permanent)',
  })
  expiresAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User ID if suppressed user is registered',
  })
  userId?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Additional details about suppression',
  })
  details?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Source campaign or system that initiated suppression',
  })
  source?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata about suppression',
  })
  metadata?: {
    bounceType?: string;
    bounceSubType?: string;
    userAgent?: string;
    ip?: string;
    originalMessageId?: string;
    complaintFeedbackType?: string;
    unsubscribeMethod?: string;
    gdprRequestId?: string;
    adminUserId?: string;
  };

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When suppression was last updated',
  })
  lastUpdatedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User who manually updated suppression',
  })
  updatedBy?: string;

  // Composite index for email + scope + scopeId
  static getUniqueIndex(): string {
    return 'IDX_email_scope_scopeId';
  }
}

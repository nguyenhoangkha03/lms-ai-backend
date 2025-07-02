import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { AuditAction, AuditLevel, AuditStatus } from '@/common/enums/system.enums';
import { User } from '../../user/entities/user.entity';

@Entity('audit_logs')
@Index(['userId'])
@Index(['action'])
@Index(['entityType'])
@Index(['entityId'])
@Index(['level'])
@Index(['status'])
@Index(['timestamp'])
@Index(['ipAddress'])
@Index(['sessionId'])
export class AuditLog extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'User who performed the action',
  })
  userId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Session identifier',
  })
  sessionId?: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
    comment: 'Action that was performed',
  })
  action: AuditAction;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Type of entity affected',
  })
  entityType?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of entity affected',
  })
  entityId?: string;

  @Column({
    type: 'text',
    comment: 'Description of the action',
  })
  description: string;

  @Column({
    type: 'enum',
    enum: AuditLevel,
    default: AuditLevel.INFO,
    comment: 'Severity level of the action',
  })
  level: AuditLevel;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.SUCCESS,
    comment: 'Status of the action',
  })
  status: AuditStatus;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When the action occurred',
  })
  timestamp: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP address of the user',
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User agent string',
  })
  userAgent?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Request URL or endpoint',
  })
  requestUrl?: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'HTTP method used',
  })
  httpMethod?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'HTTP response status code',
  })
  responseCode?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Request processing time in milliseconds',
  })
  processingTime?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Request parameters and payload',
  })
  requestData?: {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any>;
    headers?: Record<string, string>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Response data (sanitized)',
  })
  responseData?: {
    data?: any;
    errors?: any[];
    statusCode?: number;
    message?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Changes made (before/after values)',
  })
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional context information',
  })
  context?: {
    module?: string;
    feature?: string;
    environment?: string;
    version?: string;
    correlationId?: string;
    parentAction?: string;
    businessContext?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Security-related information',
  })
  securityInfo?: {
    authMethod?: string;
    permissions?: string[];
    riskScore?: number;
    deviceFingerprint?: string;
    geoLocation?: { country: string; region: string; city: string };
    threatIndicators?: string[];
  };

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error details if action failed',
  })
  errorDetails?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Error code or exception type',
  })
  errorCode?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Stack trace for errors',
  })
  stackTrace?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Related entities affected by this action',
  })
  relatedEntities?: {
    entityType: string;
    entityId: string;
    relationship: string;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Tags for categorization and filtering',
  })
  tags?: string[];

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is a sensitive action requiring special attention',
  })
  isSensitive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this action requires manual review',
  })
  requiresReview: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID of admin who reviewed this action',
  })
  reviewedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When this action was reviewed',
  })
  reviewedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Review notes',
  })
  reviewNotes?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional audit metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => User, user => user.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: User;

  // Virtual properties
  get isError(): boolean {
    return this.status === AuditStatus.ERROR || this.status === AuditStatus.FAILED;
  }

  get isHighRisk(): boolean {
    return (
      this.level === AuditLevel.CRITICAL ||
      (this.securityInfo?.riskScore !== undefined && this.securityInfo.riskScore > 80) ||
      this.isSensitive
    );
  }

  get durationFormatted(): string {
    if (!this.processingTime) return 'N/A';
    if (this.processingTime < 1000) return `${this.processingTime}ms`;
    return `${(this.processingTime / 1000).toFixed(2)}s`;
  }

  get hasChanges(): boolean {
    return !!(this.changes && this.changes.length > 0);
  }

  get changeCount(): number {
    return this.changes?.length || 0;
  }
}

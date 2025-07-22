import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum RequestType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  RESTRICTION = 'restriction',
  PORTABILITY = 'portability',
  OBJECTION = 'objection',
  WITHDRAW_CONSENT = 'withdraw_consent',
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  PARTIALLY_COMPLETED = 'partially_completed',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('data_protection_requests')
@Index(['userId', 'type'])
@Index(['status', 'createdAt'])
@Index(['priority', 'dueDate'])
export class DataProtectionRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: RequestType,
    comment: 'Type of data protection request (GDPR Article reference)',
  })
  type: RequestType;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  legalBasis?: string;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  processedBy?: string;

  @Column({ type: 'text', nullable: true })
  processingNotes?: string;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'json', nullable: true })
  requestDetails?: {
    specificData?: string[];
    timeRange?: {
      from?: Date;
      to?: Date;
    };
    format?: string;
    deliveryMethod?: string;
    additionalInfo?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  processingLog?: Array<{
    action: string;
    performedBy: string;
    timestamp: Date;
    details?: string;
    result?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  dataCategories?: string[];

  @Column({ type: 'json', nullable: true })
  affectedSystems?: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  resultFilePath?: string;

  @Column({ type: 'bigint', nullable: true })
  resultFileSize?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resultFileFormat?: string;

  @Column({ type: 'datetime', nullable: true })
  resultExpiresAt?: Date;

  @Column({ type: 'json', nullable: true })
  communications?: Array<{
    type: 'email' | 'phone' | 'letter' | 'portal';
    sent: Date;
    subject?: string;
    content?: string;
    sentBy: string;
  }>;

  @Column({ type: 'boolean', default: false })
  isUrgent: boolean;

  @Column({ type: 'boolean', default: false })
  requiresManualReview: boolean;

  @Column({ type: 'boolean', default: false })
  hasThirdPartyData: boolean;

  @Column({ type: 'json', nullable: true })
  thirdParties?: Array<{
    name: string;
    contactInfo: string;
    dataShared: string[];
    notificationSent?: Date;
    responseReceived?: Date;
  }>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => User, user => user.dataProtectionRequests)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

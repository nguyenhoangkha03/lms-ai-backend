import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Entity, Index, Column, ManyToOne, JoinColumn } from 'typeorm';

export enum ConsentType {
  COOKIES = 'cookies',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  PROFILING = 'profiling',
  DATA_PROCESSING = 'data_processing',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  AUTOMATED_DECISIONS = 'automated_decisions',
  COMMUNICATION = 'communication',
  LOCATION_TRACKING = 'location_tracking',
}

export enum ConsentStatus {
  GIVEN = 'given',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export enum ConsentMethod {
  EXPLICIT = 'explicit',
  IMPLICIT = 'implicit',
  OPT_OUT = 'opt_out',
  LEGITIMATE_INTEREST = 'legitimate_interest',
}

@Entity('consent_records')
@Index(['userId', 'type'])
@Index(['status', 'expiresAt'])
@Index(['consentGivenAt'])
export class ConsentRecord extends BaseEntity {
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ConsentType,
  })
  type: ConsentType;

  @Column({
    type: 'enum',
    enum: ConsentStatus,
    default: ConsentStatus.PENDING,
  })
  status: ConsentStatus;

  @Column({
    type: 'enum',
    enum: ConsentMethod,
  })
  method: ConsentMethod;

  @Column({ type: 'text' })
  purpose: string;

  @Column({ type: 'text', nullable: true })
  legalBasis?: string;

  @Column({ type: 'datetime' })
  consentGivenAt: Date;

  @Column({ type: 'datetime', nullable: true })
  consentWithdrawnAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  version?: string;

  @Column({ type: 'json', nullable: true })
  consentDetails?: {
    specificConsents?: Record<string, boolean>;
    granularity?: string;
    scope?: string[];
    conditions?: string[];
  };

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  consentInterface?: string;

  @Column({ type: 'json', nullable: true })
  evidence?: {
    formData?: Record<string, any>;
    checkboxes?: Record<string, boolean>;
    timestamps?: Record<string, Date>;
    screenshots?: string[];
    audioRecordings?: string[];
  };

  @Column({ type: 'json', nullable: true })
  thirdParties?: Array<{
    name: string;
    purpose: string;
    retentionPeriod?: string;
    dataCategories?: string[];
  }>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => User, user => user.consentRecords)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

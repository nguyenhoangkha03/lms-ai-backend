import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Index, Column } from 'typeorm';

export enum AnonymizationType {
  PSEUDONYMIZATION = 'pseudonymization',
  GENERALIZATION = 'generalization',
  SUPPRESSION = 'suppression',
  NOISE_ADDITION = 'noise_addition',
  DATA_MASKING = 'data_masking',
  SYNTHETIC_DATA = 'synthetic_data',
}

export enum AnonymizationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

@Entity('data_anonymization_logs')
@Index(['entityType', 'entityId'])
@Index(['anonymizationType', 'status'])
@Index(['performedAt'])
export class DataAnonymizationLog extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'varchar', length: 36 })
  entityId: string;

  @Column({
    type: 'enum',
    enum: AnonymizationType,
  })
  anonymizationType: AnonymizationType;

  @Column({
    type: 'enum',
    enum: AnonymizationStatus,
    default: AnonymizationStatus.PENDING,
  })
  status: AnonymizationStatus;

  @Column({ type: 'varchar', length: 36 })
  performedBy: string;

  @Column({ type: 'datetime' })
  performedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'json' })
  fieldsAnonymized: Array<{
    fieldName: string;
    originalType: string;
    anonymizationMethod: string;
    parameters?: Record<string, any>;
  }>;

  @Column({ type: 'json', nullable: true })
  anonymizationParameters?: {
    algorithm?: string;
    kValue?: number;
    lDiversity?: number;
    tCloseness?: number;
    epsilonValue?: number;
    saltValue?: string;
  };

  @Column({ type: 'varchar', length: 500, nullable: true })
  backupLocation?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  backupChecksum?: string;

  @Column({ type: 'datetime', nullable: true })
  backupExpiresAt?: Date;

  @Column({ type: 'boolean', default: false })
  isReversible: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reversibilityKey?: string;

  @Column({ type: 'datetime', nullable: true })
  reversedAt?: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reversedBy?: string;

  @Column({ type: 'json', nullable: true })
  qualityMetrics?: {
    dataUtility?: number;
    informationLoss?: number;
    privacyRisk?: number;
    riskAssessment?: string;
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  legalBasis?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  relatedRequestId?: string;

  @Column({ type: 'json', nullable: true })
  complianceChecks?: Array<{
    regulation: string;
    requirement: string;
    status: 'compliant' | 'non_compliant' | 'unknown';
    details?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}

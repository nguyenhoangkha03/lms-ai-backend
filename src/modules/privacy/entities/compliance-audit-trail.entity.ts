import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Index, Column } from 'typeorm';

export enum AuditEventType {
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  CONSENT_CHANGE = 'consent_change',
  PRIVACY_SETTINGS_CHANGE = 'privacy_settings_change',
  DATA_EXPORT = 'data_export',
  DATA_BREACH = 'data_breach',
  SECURITY_INCIDENT = 'security_incident',
  COMPLIANCE_CHECK = 'compliance_check',
  POLICY_UPDATE = 'policy_update',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review',
  REMEDIATED = 'remediated',
}

@Entity('compliance_audit_trails')
@Index(['eventType', 'timestamp'])
@Index(['subjectUserId', 'eventType'])
@Index(['complianceStatus'])
export class ComplianceAuditTrail extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  eventType: AuditEventType;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  subjectUserId?: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  performedBy?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json', nullable: true })
  eventData?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    changes?: Record<string, any>;
    context?: Record<string, any>;
  };

  @Column({
    type: 'enum',
    enum: ComplianceStatus,
    default: ComplianceStatus.COMPLIANT,
  })
  complianceStatus: ComplianceStatus;

  @Column({ type: 'json', nullable: true })
  applicableRegulations?: Array<{
    name: string;
    article?: string;
    requirement: string;
    status: ComplianceStatus;
  }>;

  @Column({ type: 'text', nullable: true })
  complianceNotes?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  riskLevel?: string;

  @Column({ type: 'json', nullable: true })
  riskFactors?: string[];

  @Column({ type: 'text', nullable: true })
  riskMitigation?: string;

  // Follow-up actions
  @Column({ type: 'json', nullable: true })
  requiredActions?: Array<{
    action: string;
    dueDate?: Date;
    assignedTo?: string;
    status?: string;
  }>;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'varchar', length: 36, nullable: true })
  reviewedBy?: string;

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  @Column({ type: 'json', nullable: true })
  evidence?: Array<{
    type: string;
    location: string;
    description: string;
    checksum?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  relatedDocuments?: Array<{
    type: string;
    reference: string;
    version?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;
}

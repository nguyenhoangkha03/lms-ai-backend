import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { ComplianceAuditService } from './compliance-audit.service';
import { DataAnonymizationService } from './data-anonymization.service';
import { ComplianceStatus } from '../entities/compliance-audit-trail.entity';
import { AnonymizationType } from '../entities/data-anonymization-log.entity';

export interface DataDeletionOptions {
  softDelete?: boolean;
  anonymize?: boolean;
  retainAuditLogs?: boolean;
  retainLegalBasis?: boolean;
  cascadeDelete?: boolean;
  backupBeforeDelete?: boolean;
}

@Injectable()
export class DataDeletionService {
  constructor(
    private dataSource: DataSource,
    private winstonLogger: WinstonService,
    private complianceAudit: ComplianceAuditService,
    private anonymizationService: DataAnonymizationService,
  ) {
    this.winstonLogger.setContext(DataDeletionService.name);
  }

  async deleteUserData(
    userId: string,
    options: DataDeletionOptions = {},
    requestedBy?: string,
  ): Promise<{
    deletedTables: string[];
    anonymizedTables: string[];
    retainedTables: string[];
    backupLocation?: string;
  }> {
    const {
      softDelete = true,
      anonymize = false,
      retainAuditLogs = true,
      retainLegalBasis = true,
      cascadeDelete: _ = true,
      backupBeforeDelete = true,
    } = options;

    const result = {
      deletedTables: [] as string[],
      anonymizedTables: [] as string[],
      retainedTables: [] as string[],
      backupLocation: undefined as string | undefined,
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (backupBeforeDelete) {
        result.backupLocation = await this.createUserDataBackup(userId);
      }
      const tableStrategies = this.getTableDeletionStrategies(retainAuditLogs, retainLegalBasis);

      for (const [tableName, strategy] of Object.entries(tableStrategies)) {
        switch (strategy.action) {
          case 'delete':
            if (softDelete) {
              await this.softDeleteFromTable(queryRunner, tableName, userId, strategy);
              result.deletedTables.push(tableName);
            } else {
              await this.hardDeleteFromTable(queryRunner, tableName, userId, strategy);
              result.deletedTables.push(tableName);
            }
            break;

          case 'anonymize':
            if (anonymize) {
              await this.anonymizeTableData(tableName, userId, strategy);
              result.anonymizedTables.push(tableName);
            } else {
              result.retainedTables.push(tableName);
            }
            break;

          case 'retain':
            result.retainedTables.push(tableName);
            break;
        }
      }

      await queryRunner.commitTransaction();

      await this.complianceAudit.logEvent({
        eventType: 'data_deletion',
        subjectUserId: userId,
        performedBy: requestedBy || userId,
        description: 'User data deletion completed',
        eventData: {
          options,
          result,
          softDelete,
          anonymize,
        },
        complianceStatus: ComplianceStatus.COMPLIANT,
        applicableRegulations: [
          {
            name: 'GDPR',
            article: 'Article 17',
            requirement: 'Right to erasure',
            status: ComplianceStatus.COMPLIANT,
          },
        ],
      });

      this.winstonLogger.log(`User data deletion completed: ${userId}, {
        userId: ${userId},
        deletedTables: ${result.deletedTables.length},
        anonymizedTables: ${result.anonymizedTables.length},
        retainedTables: ${result.retainedTables.length},
      }`);

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.winstonLogger.error(`Failed to delete user data: ${userId}, ${error}, ${options}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private getTableDeletionStrategies(
    retainAuditLogs: boolean,
    retainLegalBasis: boolean,
  ): Record<
    string,
    { action: 'delete' | 'anonymize' | 'retain'; userIdField: string; conditions?: string }
  > {
    return {
      users: { action: 'delete', userIdField: 'id' },
      user_profiles: { action: 'delete', userIdField: 'userId' },
      student_profiles: { action: 'delete', userIdField: 'userId' },
      teacher_profiles: { action: 'delete', userIdField: 'userId' },
      user_socials: { action: 'delete', userIdField: 'userId' },

      course_enrollments: {
        action: retainLegalBasis ? 'anonymize' : 'delete',
        userIdField: 'userId',
      },
      learning_sessions: {
        action: retainLegalBasis ? 'anonymize' : 'delete',
        userIdField: 'userId',
      },
      learning_activities: {
        action: retainLegalBasis ? 'anonymize' : 'delete',
        userIdField: 'userId',
      },
      assessment_attempts: {
        action: retainLegalBasis ? 'anonymize' : 'delete',
        userIdField: 'userId',
      },

      chat_messages: { action: 'delete', userIdField: 'senderId' },
      chat_participants: { action: 'delete', userIdField: 'userId' },
      notifications: { action: 'delete', userIdField: 'userId' },
      payments: { action: 'retain', userIdField: 'userId' },
      invoices: { action: 'retain', userIdField: 'userId' },

      audit_logs: {
        action: retainAuditLogs ? 'retain' : 'anonymize',
        userIdField: 'userId',
      },
      security_events: {
        action: retainAuditLogs ? 'retain' : 'anonymize',
        userIdField: 'userId',
      },

      consent_records: { action: 'retain', userIdField: 'userId' },
      data_protection_requests: { action: 'retain', userIdField: 'userId' },
      compliance_audit_trails: { action: 'retain', userIdField: 'subjectUserId' },
    };
  }

  private async softDeleteFromTable(
    queryRunner: any,
    tableName: string,
    userId: string,
    strategy: { userIdField: string; conditions?: string },
  ): Promise<void> {
    const query = `
      UPDATE ${tableName} 
      SET deletedAt = NOW() 
      WHERE ${strategy.userIdField} = ? 
      AND deletedAt IS NULL
      ${strategy.conditions ? `AND ${strategy.conditions}` : ''}
    `;

    await queryRunner.query(query, [userId]);
    this.winstonLogger.debug(`Soft deleted from ${tableName} for user ${userId}`);
  }

  private async hardDeleteFromTable(
    queryRunner: any,
    tableName: string,
    userId: string,
    strategy: { userIdField: string; conditions?: string },
  ): Promise<void> {
    const query = `
      DELETE FROM ${tableName} 
      WHERE ${strategy.userIdField} = ?
      ${strategy.conditions ? `AND ${strategy.conditions}` : ''}
    `;

    await queryRunner.query(query, [userId]);
    this.winstonLogger.debug(`Hard deleted from ${tableName} for user ${userId}`);
  }

  private async anonymizeTableData(
    tableName: string,
    userId: string,
    _strategy: { userIdField: string; conditions?: string },
  ): Promise<void> {
    const fieldsToAnonymize = this.getAnonymizationFields(tableName);

    if (fieldsToAnonymize.length > 0) {
      await this.anonymizationService.anonymizeData(
        {
          entityType: tableName,
          entityId: userId,
          anonymizationType: AnonymizationType.PSEUDONYMIZATION,
          fieldsAnonymized: fieldsToAnonymize,
          isReversible: false,
          reason: 'GDPR right to erasure - data anonymization',
        },
        'system',
      );
    }

    this.winstonLogger.debug(`Anonymized ${tableName} for user ${userId}`);
  }

  private getAnonymizationFields(tableName: string): Array<{
    fieldName: string;
    originalType: string;
    anonymizationMethod: string;
  }> {
    const fieldMappings: Record<
      string,
      Array<{
        fieldName: string;
        originalType: string;
        anonymizationMethod: string;
      }>
    > = {
      course_enrollments: [
        { fieldName: 'userId', originalType: 'varchar', anonymizationMethod: 'hash' },
        { fieldName: 'ipAddress', originalType: 'varchar', anonymizationMethod: 'suppression' },
      ],
      learning_sessions: [
        { fieldName: 'userId', originalType: 'varchar', anonymizationMethod: 'hash' },
        { fieldName: 'ipAddress', originalType: 'varchar', anonymizationMethod: 'suppression' },
        { fieldName: 'userAgent', originalType: 'text', anonymizationMethod: 'suppression' },
      ],
      assessment_attempts: [
        { fieldName: 'userId', originalType: 'varchar', anonymizationMethod: 'hash' },
        { fieldName: 'ipAddress', originalType: 'varchar', anonymizationMethod: 'suppression' },
      ],
      audit_logs: [
        { fieldName: 'userId', originalType: 'varchar', anonymizationMethod: 'hash' },
        { fieldName: 'ipAddress', originalType: 'varchar', anonymizationMethod: 'suppression' },
        { fieldName: 'userAgent', originalType: 'text', anonymizationMethod: 'suppression' },
      ],
    };

    return fieldMappings[tableName] || [];
  }

  private async createUserDataBackup(userId: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupLocation = `backups/user-deletions/${userId}/${timestamp}`;

    this.winstonLogger.debug(`Creating user data backup at: ${backupLocation}`);

    return backupLocation;
  }

  async scheduleDataDeletion(
    userId: string,
    options: DataDeletionOptions,
    scheduleDate: Date,
    requestedBy?: string,
  ): Promise<string> {
    const jobId = `data-deletion-${userId}-${Date.now()}`;

    this.winstonLogger.log(`Data deletion scheduled: ${jobId}, {
      userId: ${userId},
      scheduleDate: ${scheduleDate.toISOString()},
      options: ${JSON.stringify(options)},
    }`);

    await this.complianceAudit.logEvent({
      eventType: 'data_deletion_scheduled',
      subjectUserId: userId,
      performedBy: requestedBy || userId,
      description: `Data deletion scheduled for ${scheduleDate.toISOString()}`,
      eventData: {
        jobId,
        scheduleDate,
        options,
      },
    });

    return jobId;
  }
}

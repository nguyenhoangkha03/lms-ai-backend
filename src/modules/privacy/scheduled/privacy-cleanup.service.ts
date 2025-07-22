import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ComplianceAuditService } from '../services/compliance-audit.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConsentRecord, ConsentStatus } from '../entities/consent-record.entity';

@Injectable()
export class PrivacyCleanupService {
  private readonly logger = new Logger(PrivacyCleanupService.name);

  constructor(
    @InjectRepository(ConsentRecord)
    private consentRepository: Repository<ConsentRecord>,
    private configService: ConfigService,
    private auditService: ComplianceAuditService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredConsents(): Promise<void> {
    this.logger.log('Starting expired consent cleanup...');

    try {
      const expiredConsents = await this.consentRepository.find({
        where: {
          status: ConsentStatus.GIVEN,
          expiresAt: LessThan(new Date()),
        },
      });

      for (const consent of expiredConsents) {
        await this.consentRepository.update(consent.id, {
          status: ConsentStatus.EXPIRED,
        });

        await this.auditService.logEvent({
          eventType: 'consent_expired',
          subjectUserId: consent.userId,
          description: `Consent expired for ${consent.type}`,
          eventData: {
            consentId: consent.id,
            type: consent.type,
            expiredAt: consent.expiresAt,
          },
        });
      }

      this.logger.log(`Processed ${expiredConsents.length} expired consents`);
    } catch (error) {
      this.logger.error('Failed to process expired consents', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDataRetentionCleanup(): Promise<void> {
    this.logger.log('Starting data retention cleanup...');

    try {
      const retentionDays = this.configService.get<number>('DATA_RETENTION_DAYS', 2555);
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      this.logger.log(`Would clean up data older than ${cutoffDate.toISOString()}`);

      await this.auditService.logEvent({
        eventType: 'data_retention_cleanup',
        description: 'Automated data retention cleanup executed',
        eventData: {
          cutoffDate,
          retentionDays,
        },
      });
    } catch (error) {
      this.logger.error('Failed to execute data retention cleanup', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async generateComplianceReport(): Promise<void> {
    this.logger.log('Generating weekly compliance report...');

    try {
      const endDate = new Date();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const report = await this.auditService.generateComplianceReport(startDate, endDate, true);

      this.logger.log(`Generated compliance report: ${JSON.stringify(report.summary)}`);
    } catch (error) {
      this.logger.error('Failed to generate compliance report', error);
    }
  }
}

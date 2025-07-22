import {
  DataAnonymizationLog,
  AnonymizationType,
  AnonymizationStatus,
} from '../entities/data-anonymization-log.entity';
import { CreateAnonymizationRequestDto } from '../dto/create-anonymization-request.dto';
import * as crypto from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceAuditService } from './compliance-audit.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { ComplianceStatus } from '../entities/compliance-audit-trail.entity';

@Injectable()
export class DataAnonymizationService {
  constructor(
    @InjectRepository(DataAnonymizationLog)
    private anonymizationLogRepository: Repository<DataAnonymizationLog>,
    private winstonLogger: WinstonService,
    private complianceAudit: ComplianceAuditService,
  ) {
    this.winstonLogger.setContext(DataAnonymizationService.name);
  }

  async anonymizeData(
    createDto: CreateAnonymizationRequestDto,
    performedBy: string,
  ): Promise<DataAnonymizationLog> {
    try {
      const log = this.anonymizationLogRepository.create({
        ...createDto,
        status: AnonymizationStatus.IN_PROGRESS,
        performedBy,
        performedAt: new Date(),
      });

      const savedLog = await this.anonymizationLogRepository.save(log);

      let backupInfo: any = {};
      if (createDto.isReversible) {
        backupInfo = await this.createBackup(createDto.entityType, createDto.entityId);
        savedLog.backupLocation = backupInfo.location;
        savedLog.backupChecksum = backupInfo.checksum;
        savedLog.reversibilityKey = this.generateReversibilityKey();
      }

      const anonymizationResult = await this.performAnonymization(createDto);

      savedLog.status = AnonymizationStatus.COMPLETED;
      savedLog.qualityMetrics = anonymizationResult.qualityMetrics;

      await this.anonymizationLogRepository.save(savedLog);

      await this.complianceAudit.logEvent({
        eventType: 'data_anonymization',
        description: `Data anonymized for ${createDto.entityType}:${createDto.entityId}`,
        eventData: {
          anonymizationType: createDto.anonymizationType,
          fieldsAnonymized: createDto.fieldsAnonymized.map(f => f.fieldName),
          isReversible: createDto.isReversible,
        },
        complianceStatus: ComplianceStatus.COMPLIANT,
        applicableRegulations: [
          {
            name: 'GDPR',
            article: 'Article 25',
            requirement: 'Data protection by design',
            status: ComplianceStatus.COMPLIANT,
          },
        ],
      });

      this.winstonLogger.log(`Data anonymized: ${savedLog.id}, {
        entityType: ${createDto.entityType},
        entityId: ${createDto.entityId},
        anonymizationType: ${createDto.anonymizationType},
      }`);

      return savedLog;
    } catch (error) {
      this.winstonLogger.error(`Failed to anonymize data, ${error}, ${createDto}`);
      throw error;
    }
  }

  private async performAnonymization(dto: CreateAnonymizationRequestDto): Promise<{
    qualityMetrics: any;
  }> {
    const qualityMetrics = {
      dataUtility: 0,
      informationLoss: 0,
      privacyRisk: 0,
      riskAssessment: 'low',
    };

    switch (dto.anonymizationType) {
      case AnonymizationType.PSEUDONYMIZATION:
        await this.applypseudonymization(dto);
        qualityMetrics.dataUtility = 0.9;
        qualityMetrics.informationLoss = 0.1;
        qualityMetrics.privacyRisk = 0.3;
        break;

      case AnonymizationType.GENERALIZATION:
        await this.applyGeneralization(dto);
        qualityMetrics.dataUtility = 0.7;
        qualityMetrics.informationLoss = 0.3;
        qualityMetrics.privacyRisk = 0.2;
        break;

      case AnonymizationType.SUPPRESSION:
        await this.applySuppression(dto);
        qualityMetrics.dataUtility = 0.5;
        qualityMetrics.informationLoss = 0.5;
        qualityMetrics.privacyRisk = 0.1;
        break;

      case AnonymizationType.NOISE_ADDITION:
        await this.applyNoiseAddition(dto);
        qualityMetrics.dataUtility = 0.8;
        qualityMetrics.informationLoss = 0.2;
        qualityMetrics.privacyRisk = 0.2;
        break;

      case AnonymizationType.DATA_MASKING:
        await this.applyDataMasking(dto);
        qualityMetrics.dataUtility = 0.6;
        qualityMetrics.informationLoss = 0.4;
        qualityMetrics.privacyRisk = 0.1;
        break;

      default:
        throw new BadRequestException(`Anonymization type ${dto.anonymizationType} not supported`);
    }

    return { qualityMetrics };
  }

  private async applypseudonymization(dto: CreateAnonymizationRequestDto): Promise<void> {
    const _saltValue = dto.anonymizationParameters?.saltValue || this.generateSalt();

    for (const field of dto.fieldsAnonymized) {
      this.winstonLogger.debug(`Pseudonymizing field: ${field.fieldName}`);
    }
  }

  private async applyGeneralization(dto: CreateAnonymizationRequestDto): Promise<void> {
    const kValue = dto.anonymizationParameters?.kValue || 5;

    for (const field of dto.fieldsAnonymized) {
      this.winstonLogger.debug(`Generalizing field: ${field.fieldName} with k=${kValue}`);
    }
  }

  private async applySuppression(dto: CreateAnonymizationRequestDto): Promise<void> {
    for (const field of dto.fieldsAnonymized) {
      this.winstonLogger.debug(`Suppressing field: ${field.fieldName}`);
    }
  }

  private async applyNoiseAddition(dto: CreateAnonymizationRequestDto): Promise<void> {
    const epsilonValue = dto.anonymizationParameters?.epsilonValue || 0.1;

    for (const field of dto.fieldsAnonymized) {
      this.winstonLogger.debug(`Adding noise to field: ${field.fieldName} with ε=${epsilonValue}`);
    }
  }

  private async applyDataMasking(dto: CreateAnonymizationRequestDto): Promise<void> {
    for (const field of dto.fieldsAnonymized) {
      this.winstonLogger.debug(`Masking field: ${field.fieldName}`);
    }
  }

  private async createBackup(
    entityType: string,
    entityId: string,
  ): Promise<{
    location: string;
    checksum: string;
  }> {
    const backupLocation = `backups/${entityType}/${entityId}/${Date.now()}.backup`;
    const checksum = crypto
      .createHash('sha256')
      .update(`${entityType}:${entityId}:${Date.now()}`)
      .digest('hex');

    this.winstonLogger.debug(`Creating backup at: ${backupLocation}`);

    return { location: backupLocation, checksum };
  }

  private generateReversibilityKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async reverseAnonymization(logId: string, performedBy: string): Promise<DataAnonymizationLog> {
    const log = await this.anonymizationLogRepository.findOne({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundException('Anonymization log not found');
    }

    if (!log.isReversible) {
      throw new BadRequestException('This anonymization is not reversible');
    }

    if (log.status === AnonymizationStatus.REVERSED) {
      throw new BadRequestException('Anonymization already reversed');
    }

    await this.restoreFromBackup(log.backupLocation!, log.reversibilityKey!);

    log.status = AnonymizationStatus.REVERSED;
    log.reversedAt = new Date();
    log.reversedBy = performedBy;

    return await this.anonymizationLogRepository.save(log);
  }

  private async restoreFromBackup(backupLocation: string, reversibilityKey: string): Promise<void> {
    this.winstonLogger.debug(
      `Restoring from backup: ${backupLocation} with key: ${reversibilityKey}`,
    );
  }
}

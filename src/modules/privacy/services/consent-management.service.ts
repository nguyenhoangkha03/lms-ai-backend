import { ConsentRecord, ConsentType, ConsentStatus } from '../entities/consent-record.entity';
import { CreateConsentRecordDto } from '../dto/create-consent-record.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplianceAuditService } from './compliance-audit.service';
import { ComplianceStatus } from '../entities/compliance-audit-trail.entity';

@Injectable()
export class ConsentManagementService {
  constructor(
    @InjectRepository(ConsentRecord)
    private consentRepository: Repository<ConsentRecord>,
    private winstonLogger: WinstonService,
    private complianceAudit: ComplianceAuditService,
  ) {
    this.winstonLogger.setContext(ConsentManagementService.name);
  }

  async recordConsent(
    userId: string,
    createDto: CreateConsentRecordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ConsentRecord> {
    try {
      const existingConsent = await this.consentRepository.findOne({
        where: {
          userId,
          type: createDto.type,
          status: ConsentStatus.GIVEN,
        },
        order: { createdAt: 'DESC' },
      });

      if (existingConsent) {
        await this.withdrawConsent(existingConsent.id, userId);
      }

      const consent = this.consentRepository.create({
        ...createDto,
        userId,
        status: ConsentStatus.GIVEN,
        consentGivenAt: new Date(),
        ipAddress,
        userAgent,
      });

      const savedConsent = await this.consentRepository.save(consent);

      await this.complianceAudit.logEvent({
        eventType: 'consent_given',
        subjectUserId: userId,
        description: `Consent given for ${createDto.type}`,
        eventData: {
          consentId: savedConsent.id,
          type: createDto.type,
          purpose: createDto.purpose,
          method: createDto.method,
        },
        complianceStatus: ComplianceStatus.COMPLIANT,
        applicableRegulations: [
          {
            name: 'GDPR',
            article: 'Article 7',
            requirement: 'Consent management',
            status: ComplianceStatus.COMPLIANT,
          },
        ],
      });

      this.winstonLogger.log(`Consent recorded: ${savedConsent.id}, {
        userId: ${userId},
        consentType: ${createDto.type},
        consentId: ${savedConsent.id},
      }`);

      return savedConsent;
    } catch (error) {
      this.winstonLogger.error(`Failed to record consent, ${error}, ${userId}, ${createDto}`);
      throw error;
    }
  }

  async withdrawConsent(consentId: string, userId: string): Promise<ConsentRecord> {
    const consent = await this.consentRepository.findOne({
      where: { id: consentId, userId },
    });

    if (!consent) {
      throw new NotFoundException('Consent record not found');
    }

    if (consent.status === ConsentStatus.WITHDRAWN) {
      throw new BadRequestException('Consent already withdrawn');
    }

    const updatedConsent = await this.consentRepository.save({
      ...consent,
      status: ConsentStatus.WITHDRAWN,
      consentWithdrawnAt: new Date(),
    });

    await this.complianceAudit.logEvent({
      eventType: 'consent_withdrawn',
      subjectUserId: userId,
      description: `Consent withdrawn for ${consent.type}`,
      eventData: {
        consentId,
        type: consent.type,
        originalConsentDate: consent.consentGivenAt,
      },
    });

    return updatedConsent;
  }

  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    return this.consentRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveConsents(userId: string): Promise<Record<string, ConsentRecord>> {
    const consents = await this.consentRepository.find({
      where: {
        userId,
        status: ConsentStatus.GIVEN,
      },
      order: { createdAt: 'DESC' },
    });

    return consents.reduce(
      (acc, consent) => {
        if (!acc[consent.type] || consent.createdAt > acc[consent.type].createdAt) {
          acc[consent.type] = consent;
        }
        return acc;
      },
      {} as Record<string, ConsentRecord>,
    );
  }

  async hasValidConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: {
        userId,
        type: consentType,
        status: ConsentStatus.GIVEN,
      },
      order: { createdAt: 'DESC' },
    });

    if (!consent) return false;

    if (consent.expiresAt && new Date() > consent.expiresAt) {
      await this.consentRepository.update(consent.id, {
        status: ConsentStatus.EXPIRED,
      });
      return false;
    }

    return true;
  }
  async getConsentMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalConsents: number;
    consentsByType: Record<string, number>;
    consentsByStatus: Record<string, number>;
    withdrawalRate: number;
    expirationRate: number;
  }> {
    const queryBuilder = this.consentRepository.createQueryBuilder('consent');

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.where('consent.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.where('consent.createdAt >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.where('consent.createdAt <= :endDate', { endDate });
      }
    }

    const consents = await queryBuilder.getMany();

    const totalConsents = consents.length;
    const consentsByType = consents.reduce(
      (acc, consent) => {
        acc[consent.type] = (acc[consent.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const consentsByStatus = consents.reduce(
      (acc, consent) => {
        acc[consent.status] = (acc[consent.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const withdrawnConsents = consents.filter(c => c.status === ConsentStatus.WITHDRAWN).length;
    const expiredConsents = consents.filter(c => c.status === ConsentStatus.EXPIRED).length;

    const withdrawalRate = totalConsents > 0 ? (withdrawnConsents / totalConsents) * 100 : 0;
    const expirationRate = totalConsents > 0 ? (expiredConsents / totalConsents) * 100 : 0;

    return {
      totalConsents,
      consentsByType,
      consentsByStatus,
      withdrawalRate,
      expirationRate,
    };
  }
}

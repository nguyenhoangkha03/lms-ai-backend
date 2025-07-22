import {
  ComplianceAuditTrail,
  AuditEventType,
  ComplianceStatus,
} from '../entities/compliance-audit-trail.entity';
import { ComplianceAuditQueryDto } from '../dto/compliance-audit-query.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { Injectable } from '@nestjs/common';

export interface ComplianceAuditEvent {
  eventType: string;
  subjectUserId?: string;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  description: string;
  eventData?: {
    consentId?: string;
    type?: string;
    purpose?: string;
    method?: string;
    anonymizationType?: string;
    fieldsAnonymized?: string[];
    isReversible?: boolean;
    originalConsentDate?: Date;
    options?: Record<string, any>;
    result?: Record<string, any>;
    softDelete?: boolean;
    anonymize?: boolean;
    jobId?: string;
    format?: string;
    deliveryMethod?: string;
    dataCategories?: string[];
    fileSize?: number;
    requestId?: string;
    description?: string;
    expiredAt?: Date;
    cutoffDate?: Date;
    retentionDays?: number;
    path?: string;
    query?: Record<string, any>;
    timestamp?: Date;
    scheduleDate?: Date;
    before?: Record<string, any>;
    after?: Record<string, any>;
    changes?: Record<string, any>;
    context?: Record<string, any>;
  };
  complianceStatus?: ComplianceStatus;
  applicableRegulations?: Array<{
    name: string;
    article?: string;
    requirement: string;
    status: ComplianceStatus;
  }>;
  riskLevel?: string;
  riskFactors?: string[];
  riskMitigation?: string;
}

@Injectable()
export class ComplianceAuditService {
  constructor(
    @InjectRepository(ComplianceAuditTrail)
    private auditRepository: Repository<ComplianceAuditTrail>,
    private winstonLogger: WinstonService,
  ) {
    this.winstonLogger.setContext(ComplianceAuditService.name);
  }

  async logEvent(event: ComplianceAuditEvent): Promise<ComplianceAuditTrail> {
    try {
      const auditRecord = this.auditRepository.create({
        eventType: event.eventType as AuditEventType,
        timestamp: new Date(),
        subjectUserId: event.subjectUserId,
        performedBy: event.performedBy,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        description: event.description,
        eventData: event.eventData,
        complianceStatus: event.complianceStatus || ComplianceStatus.COMPLIANT,
        applicableRegulations: event.applicableRegulations,
        riskLevel: event.riskLevel || 'low',
        riskFactors: event.riskFactors,
        riskMitigation: event.riskMitigation,
      });

      const savedRecord = await this.auditRepository.save(auditRecord);

      this.winstonLogger.log(`Compliance audit logged: ${event.eventType}, {
        auditId: ${savedRecord.id},
        eventType: ${event.eventType},
        subjectUserId: ${event.subjectUserId},
        complianceStatus: ${event.complianceStatus},
      }`);

      return savedRecord;
    } catch (error) {
      this.winstonLogger.error(`Failed to log compliance audit event: ${error}, ${event}`);
      throw error;
    }
  }

  async findAuditRecords(query: ComplianceAuditQueryDto): Promise<{
    items: ComplianceAuditTrail[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, startDate, endDate, ...filters } = query;

    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .orderBy('audit.timestamp', 'DESC');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryBuilder.andWhere(`audit.${key} = :${key}`, { [key]: value });
      }
    });

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        });
      } else if (startDate) {
        queryBuilder.andWhere('audit.timestamp >= :startDate', {
          startDate: new Date(startDate),
        });
      } else if (endDate) {
        queryBuilder.andWhere('audit.timestamp <= :endDate', {
          endDate: new Date(endDate),
        });
      }
    }

    if (search) {
      queryBuilder.andWhere(
        '(audit.description LIKE :search OR audit.complianceNotes LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total, page, limit };
  }

  async getComplianceMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByComplianceStatus: Record<string, number>;
    riskDistribution: Record<string, number>;
    regulationCompliance: Record<string, { compliant: number; nonCompliant: number }>;
    trendsOverTime: Array<{ date: string; count: number; complianceRate: number }>;
  }> {
    const queryBuilder = this.auditRepository.createQueryBuilder('audit');

    if (startDate || endDate) {
      if (startDate && endDate) {
        queryBuilder.where('audit.timestamp BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.where('audit.timestamp >= :startDate', { startDate });
      } else if (endDate) {
        queryBuilder.where('audit.timestamp <= :endDate', { endDate });
      }
    }

    const events = await queryBuilder.getMany();

    const totalEvents = events.length;

    const eventsByType = events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const eventsByComplianceStatus = events.reduce(
      (acc, event) => {
        acc[event.complianceStatus] = (acc[event.complianceStatus] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const riskDistribution = events.reduce(
      (acc, event) => {
        const risk = event.riskLevel || 'unknown';
        acc[risk] = (acc[risk] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const regulationCompliance = events.reduce(
      (acc, event) => {
        if (event.applicableRegulations) {
          event.applicableRegulations.forEach(reg => {
            if (!acc[reg.name]) {
              acc[reg.name] = { compliant: 0, nonCompliant: 0 };
            }
            if (reg.status === ComplianceStatus.COMPLIANT) {
              acc[reg.name].compliant++;
            } else {
              acc[reg.name].nonCompliant++;
            }
          });
        }
        return acc;
      },
      {} as Record<string, { compliant: number; nonCompliant: number }>,
    );

    const trendsMap = new Map<string, { count: number; compliant: number }>();
    events.forEach(event => {
      const dateKey = event.timestamp.toISOString().split('T')[0];
      const existing = trendsMap.get(dateKey) || { count: 0, compliant: 0 };
      existing.count++;
      if (event.complianceStatus === ComplianceStatus.COMPLIANT) {
        existing.compliant++;
      }
      trendsMap.set(dateKey, existing);
    });

    const trendsOverTime = Array.from(trendsMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        complianceRate: data.count > 0 ? (data.compliant / data.count) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalEvents,
      eventsByType,
      eventsByComplianceStatus,
      riskDistribution,
      regulationCompliance,
      trendsOverTime,
    };
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    includeRecommendations: boolean = true,
  ): Promise<{
    summary: any;
    metrics: any;
    violations: ComplianceAuditTrail[];
    recommendations: string[];
  }> {
    const metrics = await this.getComplianceMetrics(startDate, endDate);

    const violations = await this.auditRepository.find({
      where: {
        complianceStatus: ComplianceStatus.NON_COMPLIANT,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'DESC' },
    });

    const summary = {
      reportPeriod: { startDate, endDate },
      totalEvents: metrics.totalEvents,
      complianceRate:
        metrics.totalEvents > 0
          ? ((metrics.eventsByComplianceStatus['compliant'] || 0) / metrics.totalEvents) * 100
          : 100,
      violationsCount: violations.length,
      riskLevel: this.calculateOverallRiskLevel(metrics.riskDistribution),
    };

    const recommendations = includeRecommendations
      ? this.generateRecommendations(metrics, violations)
      : [];

    return {
      summary,
      metrics,
      violations,
      recommendations,
    };
  }

  private calculateOverallRiskLevel(riskDistribution: Record<string, number>): string {
    const total = Object.values(riskDistribution).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 'low';

    const criticalPercent = ((riskDistribution['critical'] || 0) / total) * 100;
    const highPercent = ((riskDistribution['high'] || 0) / total) * 100;

    if (criticalPercent > 10) return 'critical';
    if (highPercent > 20) return 'high';
    if (criticalPercent + highPercent > 30) return 'medium';
    return 'low';
  }

  private generateRecommendations(metrics: any, violations: ComplianceAuditTrail[]): string[] {
    const recommendations: string[] = [];

    if (violations.length > metrics.totalEvents * 0.05) {
      recommendations.push(
        'Consider reviewing and updating compliance procedures due to high violation rate',
      );
    }

    const consentWithdrawals = Object.keys(metrics.eventsByType).filter(
      type => type.includes('consent') && type.includes('withdrawn'),
    ).length;
    if (consentWithdrawals > 10) {
      recommendations.push('Review consent collection practices due to frequent withdrawals');
    }

    if (metrics.riskDistribution['critical'] > 0) {
      recommendations.push('Immediate review required for critical risk events');
    }
    const dataRequests = metrics.eventsByType['data_protection_request_created'] || 0;
    if (dataRequests > 20) {
      recommendations.push(
        'Consider implementing self-service data export tools to reduce manual processing',
      );
    }

    return recommendations;
  }
}

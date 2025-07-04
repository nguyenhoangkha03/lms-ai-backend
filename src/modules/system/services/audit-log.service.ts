import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { CacheService } from '@/cache/cache.service';
import { AuditAction, AuditLevel, AuditStatus } from '@/common/enums/system.enums';

export interface CreateAuditLogDto {
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  description?: string;
  level?: AuditLevel;
  status?: AuditStatus;
  ipAddress?: string;
  userAgent?: string;
  requestUrl?: string;
  httpMethod?: string;
  responseCode?: number;
  processingTime?: number;
  requestData?: any;
  responseData?: any;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  context?: Record<string, any>;
  securityInfo?: {
    authMethod?: string;
    permissions?: string[];
    riskScore?: number;
    deviceFingerprint?: string;
    geoLocation?: { country: string; region: string; city: string };
    threatIndicators?: string[];
  };
  errorDetails?: string;
  errorCode?: string;
  stackTrace?: string;
  relatedEntities?: Array<{
    entityType: string;
    entityId: string;
    relationship: string;
  }>;
  tags?: string[];
  isSensitive?: boolean;
  requiresReview?: boolean;
  metadata?: Record<string, any>;
}

export interface AuditLogQueryDto {
  userId?: string;
  actions?: AuditAction[];
  entityTypes?: string[];
  levels?: AuditLevel[];
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  tags?: string[];
  isSensitive?: boolean;
  requiresReview?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AuditStats {
  total: number;
  byLevel: Record<string, number>;
  byAction: Record<string, number>;
  byUser: Record<string, number>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly cacheService: CacheService,
  ) {}

  async createAuditLog(data: CreateAuditLogDto): Promise<AuditLog> {
    try {
      // Sanitize sensitive data
      const sanitizedData = this.sanitizeAuditData(data);

      const auditLog = this.auditLogRepository.create({
        ...sanitizedData,
        timestamp: new Date(),
        level: sanitizedData.level || AuditLevel.INFO,
        status: sanitizedData.status || AuditStatus.SUCCESS,
      });

      const savedLog = await this.auditLogRepository.save(auditLog);

      // Trigger security alerts if needed
      await this.checkSecurityAlerts(savedLog);

      // Update statistics
      await this.updateAuditStatistics(savedLog);

      return savedLog;
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAuditLogs(query: AuditLogQueryDto): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 50, sortBy = 'timestamp', sortOrder = 'DESC', ...filters } = query;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user')
      .leftJoinAndSelect('audit.reviewer', 'reviewer');

    // Apply filters
    if (filters.userId) {
      queryBuilder.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.actions && filters.actions.length > 0) {
      queryBuilder.andWhere('audit.action IN (:...actions)', { actions: filters.actions });
    }

    if (filters.entityTypes && filters.entityTypes.length > 0) {
      queryBuilder.andWhere('audit.entityType IN (:...entityTypes)', {
        entityTypes: filters.entityTypes,
      });
    }

    if (filters.levels && filters.levels.length > 0) {
      queryBuilder.andWhere('audit.level IN (:...levels)', { levels: filters.levels });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters.ipAddress) {
      queryBuilder.andWhere('audit.ipAddress = :ipAddress', {
        ipAddress: filters.ipAddress,
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('JSON_CONTAINS(audit.tags, :tags)', {
        tags: JSON.stringify(filters.tags),
      });
    }

    if (filters.isSensitive !== undefined) {
      queryBuilder.andWhere('audit.isSensitive = :isSensitive', {
        isSensitive: filters.isSensitive,
      });
    }

    if (filters.requiresReview !== undefined) {
      queryBuilder.andWhere('audit.requiresReview = :requiresReview', {
        requiresReview: filters.requiresReview,
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`audit.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSecurityEvents(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<{
    totalEvents: number;
    highRiskEvents: number;
    failedAttempts: number;
    suspiciousActivities: number;
    topThreatIndicators: Array<{ indicator: string; count: number }>;
    riskByUser: Array<{ userId: string; riskScore: number; eventCount: number }>;
  }> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const cacheKey = `security_events:${timeframe}`;
    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) return cached;

    // Get security-related audit logs
    const securityLogs = await this.auditLogRepository.find({
      where: {
        timestamp: Between(startDate, now),
        level: In([AuditLevel.WARNING, AuditLevel.ERROR, AuditLevel.CRITICAL]),
      },
      relations: ['user'],
    });

    const totalEvents = securityLogs.length;
    const highRiskEvents = securityLogs.filter(
      log => log.securityInfo?.riskScore && log.securityInfo.riskScore > 70,
    ).length;

    const failedAttempts = securityLogs.filter(
      log => log.status === AuditStatus.FAILED || log.status === AuditStatus.ERROR,
    ).length;

    const suspiciousActivities = securityLogs.filter(
      log => log.securityInfo?.threatIndicators && log.securityInfo.threatIndicators.length > 0,
    ).length;

    // Aggregate threat indicators
    const threatIndicators = new Map<string, number>();
    securityLogs.forEach(log => {
      log.securityInfo?.threatIndicators?.forEach(indicator => {
        threatIndicators.set(indicator, (threatIndicators.get(indicator) || 0) + 1);
      });
    });

    const topThreatIndicators = Array.from(threatIndicators.entries())
      .map(([indicator, count]) => ({ indicator, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Risk by user
    const userRisks = new Map<string, { riskScore: number; eventCount: number }>();
    securityLogs.forEach(log => {
      if (log.userId) {
        const current = userRisks.get(log.userId) || { riskScore: 0, eventCount: 0 };
        current.riskScore = Math.max(current.riskScore, log.securityInfo?.riskScore || 0);
        current.eventCount++;
        userRisks.set(log.userId, current);
      }
    });

    const riskByUser = Array.from(userRisks.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    const result = {
      totalEvents,
      highRiskEvents,
      failedAttempts,
      suspiciousActivities,
      topThreatIndicators,
      riskByUser,
    };

    await this.cacheService.set(cacheKey, result, 300); // 5 minutes cache
    return result;
  }

  async markAsReviewed(id: string, reviewerId: string, notes?: string): Promise<AuditLog> {
    const auditLog = await this.auditLogRepository.findOne({ where: { id } });
    if (!auditLog) {
      throw new Error('Audit log not found');
    }

    auditLog.reviewedBy = reviewerId;
    auditLog.reviewedAt = new Date();
    auditLog.reviewNotes = notes;
    auditLog.requiresReview = false;

    return this.auditLogRepository.save(auditLog);
  }

  async exportAuditLogs(query: AuditLogQueryDto): Promise<string> {
    const { data } = await this.findAuditLogs({ ...query, limit: 10000 });

    const csvHeaders = [
      'Timestamp',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Description',
      'Level',
      'Status',
      'IP Address',
      'User Agent',
    ];

    const csvRows = data.map(log => [
      log.timestamp.toISOString(),
      log.userId || '',
      log.action,
      log.entityType || '',
      log.entityId || '',
      log.description,
      log.level,
      log.status,
      log.ipAddress || '',
      log.userAgent || '',
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private sanitizeAuditData(data: CreateAuditLogDto): CreateAuditLogDto {
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'private'];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      const sanitized = Array.isArray(obj) ? [] : {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));

        if (isSensitive && typeof value === 'string') {
          sanitized[key] = value.length > 0 ? '[REDACTED]' : '';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    };

    return {
      ...data,
      requestData: data.requestData ? sanitize(data.requestData) : undefined,
      responseData: data.responseData ? sanitize(data.responseData) : undefined,
      metadata: data.metadata ? sanitize(data.metadata) : undefined,
    };
  }

  private async checkSecurityAlerts(auditLog: AuditLog): Promise<void> {
    // Check for high-risk activities
    if (
      auditLog.level === AuditLevel.CRITICAL ||
      (auditLog.securityInfo?.riskScore && auditLog.securityInfo.riskScore > 80)
    ) {
      // Trigger immediate security alert
      await this.triggerSecurityAlert(auditLog);
    }

    // Check for repeated failed attempts
    if (auditLog.status === AuditStatus.FAILED && auditLog.ipAddress) {
      await this.checkRepeatedFailures(auditLog);
    }
  }

  private async triggerSecurityAlert(auditLog: AuditLog): Promise<void> {
    this.logger.warn(`Security Alert: ${auditLog.description}`, {
      userId: auditLog.userId,
      ipAddress: auditLog.ipAddress,
      riskScore: auditLog.securityInfo?.riskScore,
      threatIndicators: auditLog.securityInfo?.threatIndicators,
    });

    // Here you would typically:
    // 1. Send notifications to security team
    // 2. Update threat detection systems
    // 3. Trigger automated responses
  }

  private async checkRepeatedFailures(auditLog: AuditLog): Promise<void> {
    const recentFailures = await this.auditLogRepository.count({
      where: {
        ipAddress: auditLog.ipAddress,
        status: AuditStatus.FAILED,
        timestamp: Between(
          new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
          new Date(),
        ),
      },
    });

    if (recentFailures >= 5) {
      // Create high-risk audit log for potential brute force attack
      await this.createAuditLog({
        action: AuditAction.LOGIN,
        description: `Potential brute force attack detected from IP ${auditLog.ipAddress}`,
        level: AuditLevel.CRITICAL,
        ipAddress: auditLog.ipAddress,
        context: {
          module: 'security',
          feature: 'brute_force_detection',
          failureCount: recentFailures,
        },
        securityInfo: {
          riskScore: 95,
          threatIndicators: ['brute_force_attack', 'repeated_failures'],
        },
        tags: ['security', 'brute_force', 'high_risk'],
        isSensitive: true,
        requiresReview: true,
      });
    }
  }

  private async updateAuditStatistics(auditLog: AuditLog): Promise<void> {
    const statsKey = `audit_stats:${new Date().toISOString().split('T')[0]}`;
    const currentStats = (await this.cacheService.get<AuditStats>(statsKey)) || {
      total: 0,
      byLevel: {},
      byAction: {},
      byUser: {},
    };

    currentStats.total++;
    currentStats.byLevel[auditLog.level] = (currentStats.byLevel[auditLog.level] || 0) + 1;
    currentStats.byAction[auditLog.action] = (currentStats.byAction[auditLog.action] || 0) + 1;

    if (auditLog.userId) {
      currentStats.byUser[auditLog.userId] = (currentStats.byUser[auditLog.userId] || 0) + 1;
    }

    await this.cacheService.set(statsKey, currentStats, 24 * 60 * 60); // 24 hours
  }
}

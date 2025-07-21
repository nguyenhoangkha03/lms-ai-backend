import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { RedisService } from '@/redis/redis.service';
import { SecurityEvent } from '../entities/security-event.entity';

export interface AuditEvent {
  type: 'authentication' | 'authorization' | 'validation' | 'encryption' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp?: Date;
}

@Injectable()
export class SecurityAuditService {
  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepository: Repository<SecurityEvent>,
    private readonly logger: WinstonService,
    private readonly redis: RedisService,
  ) {
    this.logger.setContext(SecurityAuditService.name);
  }

  async logSecurityEvent(event: AuditEvent): Promise<void> {
    try {
      const securityEvent = this.securityEventRepository.create({
        type: event.type,
        severity: event.severity,
        source: event.source,
        userId: event.userId,
        sessionId: event.sessionId,
        ip: event.ip,
        userAgent: event.userAgent,
        details: event.details,
        timestamp: event.timestamp || new Date(),
      });

      await this.securityEventRepository.save(securityEvent);

      const logMethod = this.getLogMethod(event.severity);
      this.logger[logMethod](
        `Security Event: ${event.type}, ${JSON.stringify({
          ...event,
          eventId: securityEvent.id,
        })}`,
      );

      await this.cacheRecentEvent(securityEvent);
      if (event.severity === 'critical') {
        await this.triggerSecurityAlert(securityEvent);
      }
    } catch (error) {
      this.logger.error('Failed to log security event:', error);
    }
  }

  async getSecurityEvents(options: {
    type?: string;
    severity?: string;
    userId?: string;
    ip?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    events: SecurityEvent[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.securityEventRepository.createQueryBuilder('event');

    if (options.type) {
      queryBuilder.andWhere('event.type = :type', { type: options.type });
    }

    if (options.severity) {
      queryBuilder.andWhere('event.severity = :severity', { severity: options.severity });
    }

    if (options.userId) {
      queryBuilder.andWhere('event.userId = :userId', { userId: options.userId });
    }

    if (options.ip) {
      queryBuilder.andWhere('event.ip = :ip', { ip: options.ip });
    }

    if (options.startDate) {
      queryBuilder.andWhere('event.timestamp >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      queryBuilder.andWhere('event.timestamp <= :endDate', { endDate: options.endDate });
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    queryBuilder.orderBy('event.timestamp', 'DESC').skip(skip).take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { events, total, page, totalPages };
  }

  async generateSecurityReport(timeframe: { startDate: Date; endDate: Date }): Promise<{
    summary: {
      totalEvents: number;
      eventsByType: Record<string, number>;
      eventsBySeverity: Record<string, number>;
      uniqueIps: number;
      affectedUsers: number;
    };
    trends: {
      daily: Array<{ date: string; count: number }>;
      hourly: Array<{ hour: number; count: number }>;
    };
    topThreats: Array<{
      ip: string;
      eventCount: number;
      lastSeen: Date;
      threatTypes: string[];
    }>;
    recommendations: string[];
  }> {
    const queryBuilder = this.securityEventRepository
      .createQueryBuilder('event')
      .where('event.timestamp >= :startDate', { startDate: timeframe.startDate })
      .andWhere('event.timestamp <= :endDate', { endDate: timeframe.endDate });

    const events = await queryBuilder.getMany();
    const totalEvents = events.length;

    const eventsByType = events.reduce(
      (acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const eventsBySeverity = events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const uniqueIps = new Set(events.map(e => e.ip)).size;
    const affectedUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;

    const daily = this.generateDailyTrends(events, timeframe);
    const hourly = this.generateHourlyTrends(events);

    const topThreats = this.identifyTopThreats(events);
    const recommendations = this.generateRecommendations(events, eventsBySeverity);

    return {
      summary: {
        totalEvents,
        eventsByType,
        eventsBySeverity,
        uniqueIps,
        affectedUsers,
      },
      trends: { daily, hourly },
      topThreats,
      recommendations,
    };
  }

  async detectSuspiciousPatterns(): Promise<{
    patterns: Array<{
      type: string;
      description: string;
      severity: string;
      affectedIps: string[];
      count: number;
    }>;
  }> {
    const patterns: any[] = [];

    const failedLogins = await this.securityEventRepository
      .createQueryBuilder('event')
      .select('event.ip, COUNT(*) as count')
      .where('event.type = :type', { type: 'authentication' })
      .andWhere('event.severity IN (:...severities)', { severities: ['high', 'critical'] })
      .andWhere('event.timestamp >= :since', { since: new Date(Date.now() - 3600000) })
      .groupBy('event.ip')
      .having('COUNT(*) >= :threshold', { threshold: 5 })
      .getRawMany();

    if (failedLogins.length > 0) {
      patterns.push({
        type: 'brute_force',
        description: 'Multiple failed login attempts detected',
        severity: 'high',
        affectedIps: failedLogins.map(f => f.ip),
        count: failedLogins.reduce((sum, f) => sum + parseInt(f.count), 0),
      });
    }

    const sqlInjectionAttempts = await this.securityEventRepository
      .createQueryBuilder('event')
      .select('event.ip, COUNT(*) as count')
      .where('event.type = :type', { type: 'validation' })
      .andWhere('event.details LIKE :pattern', { pattern: '%SQL injection%' })
      .andWhere('event.timestamp >= :since', { since: new Date(Date.now() - 3600000) })
      .groupBy('event.ip')
      .getRawMany();

    if (sqlInjectionAttempts.length > 0) {
      patterns.push({
        type: 'sql_injection',
        description: 'SQL injection attempts detected',
        severity: 'critical',
        affectedIps: sqlInjectionAttempts.map(s => s.ip),
        count: sqlInjectionAttempts.reduce((sum, s) => sum + parseInt(s.count), 0),
      });
    }

    return { patterns };
  }

  private getLogMethod(severity: string): 'debug' | 'log' | 'warn' | 'error' {
    switch (severity) {
      case 'low':
        return 'debug';
      case 'medium':
        return 'log';
      case 'high':
        return 'warn';
      case 'critical':
        return 'error';
      default:
        return 'log';
    }
  }

  private async cacheRecentEvent(event: SecurityEvent): Promise<void> {
    const key = 'recent_security_events';
    await this.redis.lpush(key, JSON.stringify(event));
    await this.redis.ltrim(key, 0, 999); // Keep last 1000 events
    await this.redis.expire(key, 86400); // 24 hours
  }

  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    this.logger.error(`CRITICAL SECURITY ALERT, {
      eventId: ${event.id},
      type: ${event.type},
      ip: ${event.ip},
      userId: ${event.userId},
      details: ${event.details},
    }`);

    await this.redis.set(`security_alert:${event.id}`, JSON.stringify(event), 3600);
  }

  private generateDailyTrends(
    events: SecurityEvent[],
    _timeframe: any,
  ): Array<{ date: string; count: number }> {
    const dailyMap = new Map<string, number>();

    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });

    return Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));
  }

  private generateHourlyTrends(events: SecurityEvent[]): Array<{ hour: number; count: number }> {
    const hourlyMap = new Map<number, number>();

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
    });

    const result: Array<{ hour: number; count: number }> = [];
    for (let i = 0; i < 24; i++) {
      result.push({ hour: i, count: hourlyMap.get(i) || 0 });
    }

    return result;
  }

  private identifyTopThreats(events: SecurityEvent[]): Array<{
    ip: string;
    eventCount: number;
    lastSeen: Date;
    threatTypes: string[];
  }> {
    const ipMap = new Map<
      string,
      {
        count: number;
        lastSeen: Date;
        types: Set<string>;
      }
    >();

    events.forEach(event => {
      const existing = ipMap.get(event.ip) || {
        count: 0,
        lastSeen: new Date(0),
        types: new Set(),
      };

      existing.count++;
      existing.types.add(event.type);
      if (event.timestamp > existing.lastSeen) {
        existing.lastSeen = event.timestamp;
      }

      ipMap.set(event.ip, existing);
    });

    return Array.from(ipMap.entries())
      .map(([ip, data]) => ({
        ip,
        eventCount: data.count,
        lastSeen: data.lastSeen,
        threatTypes: Array.from(data.types),
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
  }

  private generateRecommendations(
    events: SecurityEvent[],
    eventsBySeverity: Record<string, number>,
  ): string[] {
    const recommendations: string[] = [];

    if (eventsBySeverity.critical > 10) {
      recommendations.push('Immediate investigation required for critical security events');
      recommendations.push('Consider implementing stricter access controls');
    }

    if (eventsBySeverity.validation > 50) {
      recommendations.push(
        'Review input validation rules - high number of validation failures detected',
      );
      recommendations.push('Consider implementing additional bot protection');
    }

    if (eventsBySeverity.authentication > 20) {
      recommendations.push('Consider implementing account lockout policies');
      recommendations.push('Review authentication mechanisms and consider 2FA enforcement');
    }

    return recommendations;
  }
}

import { Controller, Get, Post, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from '../services/audit-log.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { SecurityEventInterceptor } from '../../auth/interceptors/security-event.interceptor';
import { UserType } from '@/common/enums/user.enums';
import { AuditLogQueryDto } from '../services/audit-log.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Security Dashboard')
@Controller('security')
@UseInterceptors(SecurityEventInterceptor)
@ApiBearerAuth()
export class SecurityController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('events')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['read:audit_log'],
    rateLimit: { points: 20, duration: 60 },
  })
  @ApiOperation({ summary: 'Get security events overview' })
  @ApiResponse({ status: 200, description: 'Security events retrieved' })
  async getSecurityEvents(@Query('timeframe') timeframe: '24h' | '7d' | '30d' = '24h') {
    return this.auditLogService.getSecurityEvents(timeframe);
  }

  @Get('audit-logs')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['read:audit_log'],
    rateLimit: { points: 50, duration: 60 },
  })
  @ApiOperation({ summary: 'Get detailed audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.findAuditLogs(query);
  }

  @Post('audit-logs/:id/review')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['update:audit_log'],
    rateLimit: { points: 10, duration: 60 },
  })
  @ApiOperation({ summary: 'Mark audit log as reviewed' })
  @ApiResponse({ status: 200, description: 'Audit log marked as reviewed' })
  async reviewAuditLog(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.auditLogService.markAsReviewed(id, reviewerId, notes);
  }

  @Get('audit-logs/export')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['export:audit_log'],
    rateLimit: { points: 3, duration: 3600 }, // 3 exports per hour
  })
  @ApiOperation({ summary: 'Export audit logs to CSV' })
  @ApiResponse({ status: 200, description: 'Audit logs exported' })
  async exportAuditLogs(@Query() query: AuditLogQueryDto) {
    const csvContent = await this.auditLogService.exportAuditLogs(query);
    return {
      content: csvContent,
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
    };
  }

  @Get('threat-detection')
  @Authorize({
    roles: [UserType.ADMIN],
    permissions: ['read:security_threats'],
    rateLimit: { points: 10, duration: 60 },
  })
  @ApiOperation({ summary: 'Get threat detection summary' })
  @ApiResponse({ status: 200, description: 'Threat detection data retrieved' })
  async getThreatDetection() {
    const securityEvents = await this.auditLogService.getSecurityEvents('24h');

    return {
      threatLevel: this.calculateThreatLevel(securityEvents),
      activeThreats: securityEvents.topThreatIndicators.slice(0, 5),
      riskUsers: securityEvents.riskByUser.slice(0, 10),
      recommendations: this.generateSecurityRecommendations(securityEvents),
    };
  }

  private calculateThreatLevel(events: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const { highRiskEvents, totalEvents } = events;

    if (totalEvents === 0) return 'LOW';

    const riskRatio = highRiskEvents / totalEvents;

    if (riskRatio > 0.5) return 'CRITICAL';
    if (riskRatio > 0.3) return 'HIGH';
    if (riskRatio > 0.1) return 'MEDIUM';
    return 'LOW';
  }

  private generateSecurityRecommendations(events: any): string[] {
    const recommendations: string[] = [];

    if (events.failedAttempts > 50) {
      recommendations.push(
        'Consider implementing stricter rate limiting on authentication endpoints',
      );
    }

    if (events.suspiciousActivities > 20) {
      recommendations.push('Review and potentially block suspicious IP addresses');
    }

    if (events.highRiskEvents > 10) {
      recommendations.push('Enable additional monitoring for high-risk operations');
    }

    const topThreat = events.topThreatIndicators[0];
    if (topThreat?.indicator === 'brute_force_attack') {
      recommendations.push('Implement account lockout policies for repeated failed attempts');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture is good. Continue monitoring.');
    }

    return recommendations;
  }
}

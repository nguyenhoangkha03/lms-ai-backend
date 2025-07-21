import { Controller, Get, Post, Body, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { SecurityAuditService } from '../services/security-audit.service';
import { ApiSecurityService } from '../services/api-security.service';
import { EncryptionService } from '../services/encryption.service';

@ApiTags('Security')
@Controller('security')
@UseGuards(RolesGuard)
export class SecurityController {
  constructor(
    private readonly securityAudit: SecurityAuditService,
    private readonly apiSecurity: ApiSecurityService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get('events')
  @Roles('admin')
  @ApiOperation({ summary: 'Get security events' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Security events retrieved' })
  async getSecurityEvents(@Query() query: any) {
    return this.securityAudit.getSecurityEvents({
      type: query.type,
      severity: query.severity,
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 50,
    });
  }

  @Get('report')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate security report' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to include' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Security report generated' })
  async generateReport(@Query('days') days: number = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    return this.securityAudit.generateSecurityReport({ startDate, endDate });
  }

  @Get('patterns')
  @Roles('admin')
  @ApiOperation({ summary: 'Detect suspicious patterns' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Suspicious patterns detected' })
  async detectPatterns() {
    return this.securityAudit.detectSuspiciousPatterns();
  }

  @Post('csp-report')
  @ApiOperation({ summary: 'Content Security Policy violation report endpoint' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CSP report received' })
  async handleCspReport(@Body() report: any) {
    await this.apiSecurity.handleCspReport(report, {} as any);
    return { success: true };
  }

  @Get('health')
  @Roles('admin')
  @ApiOperation({ summary: 'Get security health status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Security health status' })
  async getSecurityHealth() {
    const encryptionHealth = this.encryption.getHealthStatus();
    const securityReport = await this.apiSecurity.generateSecurityReport();

    return {
      encryption: encryptionHealth,
      security: securityReport,
      timestamp: new Date().toISOString(),
    };
  }
}

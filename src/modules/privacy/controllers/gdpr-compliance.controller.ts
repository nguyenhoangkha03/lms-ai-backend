import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user.enums';
import { ConsentManagementService } from '../services/consent-management.service';
import { DataProtectionRequestService } from '../services/data-protection-request.service';
import { PrivacySettingsService } from '../services/privacy-settings.service';
import { ComplianceAuditService } from '../services/compliance-audit.service';

@ApiTags('GDPR Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy/gdpr')
export class GdprComplianceController {
  constructor(
    private readonly requestService: DataProtectionRequestService,
    private readonly consentService: ConsentManagementService,
    private readonly privacySettingsService: PrivacySettingsService,
    private readonly auditService: ComplianceAuditService,
  ) {}

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get GDPR compliance dashboard (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'GDPR dashboard data retrieved successfully' })
  async getGdprDashboard(@Query('period') period: string = '30d') {
    const periodDays = this.parsePeriod(period);
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [requestMetrics, consentMetrics, complianceMetrics] = await Promise.all([
      this.requestService.getRequestMetrics(startDate, endDate),
      this.consentService.getConsentMetrics(startDate, endDate),
      this.auditService.getComplianceMetrics(startDate, endDate),
    ]);

    return {
      period: { startDate, endDate, days: periodDays },
      dataProtectionRequests: requestMetrics,
      consentManagement: consentMetrics,
      complianceAudit: complianceMetrics,
      overallComplianceScore: this.calculateComplianceScore(
        requestMetrics,
        consentMetrics,
        complianceMetrics,
      ),
    };
  }

  @Get('user-rights/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get user rights status (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User rights status retrieved successfully' })
  async getUserRightsStatus(@Param('userId', ParseUUIDPipe) userId: string) {
    const [activeConsents, privacySettings, recentRequests] = await Promise.all([
      this.consentService.getActiveConsents(userId),
      this.privacySettingsService.getPrivacySettings(userId),
      this.requestService.findAll({
        userId,
        page: 1,
        limit: 10,
      }),
    ]);

    return {
      userId,
      activeConsents,
      privacySettings,
      recentRequests: recentRequests.items,
      rightsStatus: {
        canAccessData: true,
        canRectifyData: true,
        canEraseData: true,
        canRestrictProcessing: true,
        canPortData: true,
        canObjectToProcessing: true,
      },
    };
  }

  @Post('user-rights/exercise')
  @ApiOperation({ summary: 'Exercise user rights under GDPR' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User rights request submitted successfully',
  })
  async exerciseUserRights(
    @Request() req: any,
    @Body()
    body: {
      rightType:
        | 'access'
        | 'rectification'
        | 'erasure'
        | 'restriction'
        | 'portability'
        | 'objection';
      description: string;
      specificData?: string[];
    },
  ) {
    const requestTypeMap = {
      access: 'access',
      rectification: 'rectification',
      erasure: 'erasure',
      restriction: 'restriction',
      portability: 'portability',
      objection: 'objection',
    };

    return this.requestService.create(req.user.id, {
      type: requestTypeMap[body.rightType] as any,
      description: body.description,
      requestDetails: {
        specificData: body.specificData,
      },
      isUrgent: false,
    });
  }

  @Get('compliance-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get overall GDPR compliance status (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance status retrieved successfully' })
  async getComplianceStatus() {
    const endDate = new Date();
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days

    const [requestMetrics, complianceMetrics] = await Promise.all([
      this.requestService.getRequestMetrics(startDate, endDate),
      this.auditService.getComplianceMetrics(startDate, endDate),
    ]);

    const complianceChecks = {
      dataProtectionOfficer: true,
      privacyPolicies: true,
      consentManagement: true,
      dataProcessingRecords: true,
      breachNotification: true,
      dataProtectionByDesign: true,
      thirdPartyCompliance: true,
    };

    const overallScore = this.calculateComplianceScore(requestMetrics, null, complianceMetrics);

    return {
      overallScore,
      complianceChecks,
      requestHandling: {
        averageResponseTime: requestMetrics.averageProcessingTime,
        complianceRate: requestMetrics.complianceRate,
        overdueRequests: 100 - requestMetrics.complianceRate,
      },
      riskAssessment: this.assessGdprRisk(complianceMetrics),
      recommendations: this.generateGdprRecommendations(requestMetrics, complianceMetrics),
    };
  }

  private parsePeriod(period: string): number {
    const periodMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    return periodMap[period] || 30;
  }

  private calculateComplianceScore(
    requestMetrics: any,
    consentMetrics: any,
    complianceMetrics: any,
  ): number {
    let score = 100;

    if (requestMetrics.complianceRate < 95) {
      score -= (95 - requestMetrics.complianceRate) * 0.5;
    }
    const violationRate =
      ((complianceMetrics.eventsByComplianceStatus['non_compliant'] || 0) /
        (complianceMetrics.totalEvents || 1)) *
      100;
    score -= violationRate * 2;

    const highRiskEvents =
      (complianceMetrics.riskDistribution['high'] || 0) +
      (complianceMetrics.riskDistribution['critical'] || 0);
    score -= highRiskEvents * 0.1;

    return Math.max(0, Math.min(100, score));
  }

  private assessGdprRisk(complianceMetrics: any): {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
  } {
    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    const criticalEvents = complianceMetrics.riskDistribution['critical'] || 0;
    const highRiskEvents = complianceMetrics.riskDistribution['high'] || 0;
    const violationRate =
      ((complianceMetrics.eventsByComplianceStatus['non_compliant'] || 0) /
        (complianceMetrics.totalEvents || 1)) *
      100;

    if (criticalEvents > 0) {
      riskLevel = 'critical';
      riskFactors.push('Critical security or privacy events detected');
    } else if (highRiskEvents > 5) {
      riskLevel = 'high';
      riskFactors.push('Multiple high-risk events detected');
    } else if (violationRate > 10) {
      riskLevel = 'high';
      riskFactors.push('High rate of compliance violations');
    } else if (violationRate > 5 || highRiskEvents > 0) {
      riskLevel = 'medium';
      riskFactors.push('Some compliance issues detected');
    }

    if (riskFactors.length === 0) {
      riskFactors.push('No significant risk factors identified');
    }

    return { level: riskLevel, factors: riskFactors };
  }

  private generateGdprRecommendations(requestMetrics: any, complianceMetrics: any): string[] {
    const recommendations: string[] = [];

    if (requestMetrics.complianceRate < 95) {
      recommendations.push('Improve data protection request processing to meet GDPR timelines');
    }

    if (requestMetrics.averageProcessingTime > 25) {
      recommendations.push('Reduce average response time for data protection requests');
    }

    const violationCount = complianceMetrics.eventsByComplianceStatus['non_compliant'] || 0;
    if (violationCount > 0) {
      recommendations.push('Address compliance violations identified in audit trail');
    }

    const criticalEvents = complianceMetrics.riskDistribution['critical'] || 0;
    if (criticalEvents > 0) {
      recommendations.push('Immediately investigate and remediate critical privacy incidents');
    }

    if (recommendations.length === 0) {
      recommendations.push('Maintain current compliance standards and continue monitoring');
    }

    return recommendations;
  }
}

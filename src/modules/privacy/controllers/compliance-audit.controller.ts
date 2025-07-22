import { ComplianceAuditService } from '../services/compliance-audit.service';
import { CreateComplianceAuditDto } from '../dto/create-compliance-audit.dto';
import { ComplianceAuditQueryDto } from '../dto/compliance-audit-query.dto';
import { GdprComplianceReportDto } from '../dto/gdpr-compliance-report.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpStatus, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user.enums';

@ApiTags('Compliance Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
@Controller('privacy/compliance-audit')
export class ComplianceAuditController {
  constructor(private readonly auditService: ComplianceAuditService) {}

  @Post()
  @ApiOperation({ summary: 'Create compliance audit record (Admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Audit record created successfully' })
  async createAuditRecord(@Request() req: any, @Body() createDto: CreateComplianceAuditDto) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.auditService.logEvent({
      ...createDto,
      performedBy: req.user.id,
      ipAddress,
      userAgent,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get compliance audit records (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audit records retrieved successfully' })
  async findAuditRecords(@Query() query: ComplianceAuditQueryDto) {
    return this.auditService.findAuditRecords(query);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get compliance metrics (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Compliance metrics retrieved successfully' })
  async getComplianceMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getComplianceMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('reports/gdpr')
  @ApiOperation({ summary: 'Generate GDPR compliance report (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'GDPR compliance report generated successfully',
  })
  async generateGdprReport(@Body() reportDto: GdprComplianceReportDto) {
    const startDate = reportDto.startDate
      ? new Date(reportDto.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = reportDto.endDate ? new Date(reportDto.endDate) : new Date();

    return this.auditService.generateComplianceReport(
      startDate,
      endDate,
      reportDto.includeRecommendations ?? true,
    );
  }
}

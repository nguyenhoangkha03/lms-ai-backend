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
import { CreateConsentRecordDto } from '../dto/create-consent-record.dto';
import { ConsentType } from '../entities/consent-record.entity';

@ApiTags('Consent Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy/consent')
export class ConsentManagementController {
  constructor(private readonly consentService: ConsentManagementService) {}

  @Post()
  @ApiOperation({ summary: 'Record user consent' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Consent recorded successfully' })
  async recordConsent(@Request() req: any, @Body() createDto: CreateConsentRecordDto) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    return this.consentService.recordConsent(req.user.id, createDto, ipAddress, userAgent);
  }

  @Get()
  @ApiOperation({ summary: 'Get user consent records' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consent records retrieved successfully' })
  async getUserConsents(@Request() req: any) {
    return this.consentService.getUserConsents(req.user.id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active user consents' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Active consents retrieved successfully' })
  async getActiveConsents(@Request() req: any) {
    return this.consentService.getActiveConsents(req.user.id);
  }

  @Get('check/:type')
  @ApiOperation({ summary: 'Check if user has valid consent for specific type' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consent status retrieved successfully' })
  async checkConsent(@Param('type') type: ConsentType, @Request() req: any) {
    const hasConsent = await this.consentService.hasValidConsent(req.user.id, type);
    return { hasConsent, type };
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw specific consent' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consent withdrawn successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Consent record not found' })
  async withdrawConsent(@Param('id', ParseUUIDPipe) consentId: string, @Request() req: any) {
    return this.consentService.withdrawConsent(consentId, req.user.id);
  }

  @Get('metrics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get consent metrics (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Consent metrics retrieved successfully' })
  async getConsentMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.consentService.getConsentMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

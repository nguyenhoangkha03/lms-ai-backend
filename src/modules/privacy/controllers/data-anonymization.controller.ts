import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user.enums';
import { DataAnonymizationService } from '../services/data-anonymization.service';
import { CreateAnonymizationRequestDto } from '../dto/create-anonymization-request.dto';

@ApiTags('Data Anonymization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
@Controller('privacy/anonymization')
export class DataAnonymizationController {
  constructor(private readonly anonymizationService: DataAnonymizationService) {}

  @Post()
  @ApiOperation({ summary: 'Anonymize data (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Data anonymization initiated successfully',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid anonymization request' })
  async anonymizeData(@Request() req: any, @Body() createDto: CreateAnonymizationRequestDto) {
    return this.anonymizationService.anonymizeData(createDto, req.user.id);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse data anonymization (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Anonymization reversed successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot reverse anonymization' })
  async reverseAnonymization(@Param('id', ParseUUIDPipe) logId: string, @Request() req: any) {
    return this.anonymizationService.reverseAnonymization(logId, req.user.id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/common/enums/user.enums';
import { DataProtectionRequestService } from '../services/data-protection-request.service';
import { CreateDataProtectionRequestDto } from '../dto/create-data-protection-request.dto';
import { UpdateDataProtectionRequestDto } from '../dto/update-data-protection-request.dto';
import { DataProtectionRequestQueryDto } from '../dto/data-protection-query.dto';

@ApiTags('Data Protection Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy/data-protection-requests')
export class DataProtectionRequestController {
  constructor(private readonly requestService: DataProtectionRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a data protection request' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Request created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data' })
  async create(@Request() req: any, @Body() createDto: CreateDataProtectionRequestDto) {
    return this.requestService.create(req.user.id, createDto, req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get all data protection requests (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Requests retrieved successfully' })
  async findAll(@Query() query: DataProtectionRequestQueryDto) {
    return this.requestService.findAll(query);
  }

  @Get('my-requests')
  @ApiOperation({ summary: "Get current user's data protection requests" })
  @ApiResponse({ status: HttpStatus.OK, description: 'User requests retrieved successfully' })
  async findMyRequests(@Request() req: any, @Query() query: DataProtectionRequestQueryDto) {
    return this.requestService.findAll({
      ...query,
      userId: req.user.id,
    });
  }

  @Get('metrics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Get data protection request metrics (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Metrics retrieved successfully' })
  async getMetrics(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.requestService.getRequestMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific data protection request' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Request retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Request not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const request = await this.requestService.findOne(id);

    if (request.userId !== req.user.id && !req.user.roles?.includes(UserRole.ADMIN)) {
      throw new Error('Access denied');
    }

    return request;
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Update a data protection request (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Request updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Request not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDataProtectionRequestDto,
    @Request() req: any,
  ) {
    return this.requestService.update(id, updateDto, req.user.id);
  }

  @Post(':id/process')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Process a data protection request (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Request processed successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Request cannot be processed' })
  async processRequest(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.requestService.processRequest(id, req.user.id);
  }
}

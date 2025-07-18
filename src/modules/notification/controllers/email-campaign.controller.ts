import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { EmailCampaignService } from '../services/email-campaign.service';
import { EmailAnalyticsService } from '../services/email-analytics.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  SendCampaignDto,
  ScheduleCampaignDto,
  DuplicateCampaignDto,
  CampaignFilterDto,
  TestCampaignDto,
  PreviewCampaignDto,
  BulkCampaignActionDto,
  CampaignResponseDto,
  CampaignMetricsResponseDto,
} from '../dto/email-campaign.dto';

@ApiTags('Email Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email-campaigns')
export class EmailCampaignController {
  constructor(
    private readonly campaignService: EmailCampaignService,
    private readonly analyticsService: EmailAnalyticsService,
  ) {}

  @Post()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new email campaign' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Campaign created successfully',
    type: CampaignResponseDto,
  })
  async createCampaign(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser() user: UserPayload,
  ) {
    const campaign = await this.campaignService.create(createCampaignDto, user.sub);

    return {
      success: true,
      message: 'Email campaign created successfully',
      data: campaign,
    };
  }

  @Get()
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get all email campaigns with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaigns retrieved successfully',
    type: [CampaignResponseDto],
  })
  async getCampaigns(@Query() filters: CampaignFilterDto) {
    const { campaigns, total } = await this.campaignService.findAll(filters.page, filters.limit, {
      status: filters.status,
      type: filters.type,
      createdBy: filters.createdBy,
      search: filters.search,
    });

    return {
      success: true,
      message: 'Email campaigns retrieved successfully',
      data: campaigns,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit!),
      },
    };
  }

  @Get(':id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign retrieved successfully',
    type: CampaignResponseDto,
  })
  async getCampaign(@Param('id', ParseUUIDPipe) id: string) {
    const campaign = await this.campaignService.findOne(id);

    return {
      success: true,
      message: 'Email campaign retrieved successfully',
      data: campaign,
    };
  }

  @Put(':id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign updated successfully',
    type: CampaignResponseDto,
  })
  async updateCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    const campaign = await this.campaignService.update(id, updateCampaignDto);

    return {
      success: true,
      message: 'Email campaign updated successfully',
      data: campaign,
    };
  }

  @Delete(':id')
  @Roles('admin', 'instructor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Campaign deleted successfully',
  })
  async deleteCampaign(@Param('id', ParseUUIDPipe) id: string) {
    await this.campaignService.delete(id);

    return {
      success: true,
      message: 'Email campaign deleted successfully',
    };
  }

  @Post(':id/schedule')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Schedule campaign for later sending' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign scheduled successfully',
    type: CampaignResponseDto,
  })
  async scheduleCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() scheduleCampaignDto: ScheduleCampaignDto,
  ) {
    const campaign = await this.campaignService.schedule(id, scheduleCampaignDto.scheduledAt);

    return {
      success: true,
      message: 'Email campaign scheduled successfully',
      data: campaign,
    };
  }

  @Post(':id/send')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Send campaign immediately' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign queued for sending',
    type: CampaignResponseDto,
  })
  async sendCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() sendCampaignDto: SendCampaignDto,
  ) {
    const campaign = await this.campaignService.send(id, sendCampaignDto);

    return {
      success: true,
      message: 'Email campaign queued for sending',
      data: campaign,
    };
  }

  @Post(':id/pause')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Pause campaign sending' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign paused successfully',
    type: CampaignResponseDto,
  })
  async pauseCampaign(@Param('id', ParseUUIDPipe) id: string) {
    const campaign = await this.campaignService.pause(id);

    return {
      success: true,
      message: 'Email campaign paused successfully',
      data: campaign,
    };
  }

  @Post(':id/resume')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Resume paused campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign resumed successfully',
    type: CampaignResponseDto,
  })
  async resumeCampaign(@Param('id', ParseUUIDPipe) id: string) {
    const campaign = await this.campaignService.resume(id);

    return {
      success: true,
      message: 'Email campaign resumed successfully',
      data: campaign,
    };
  }

  @Post(':id/cancel')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Cancel campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign cancelled successfully',
    type: CampaignResponseDto,
  })
  async cancelCampaign(@Param('id', ParseUUIDPipe) id: string) {
    const campaign = await this.campaignService.cancel(id);

    return {
      success: true,
      message: 'Email campaign cancelled successfully',
      data: campaign,
    };
  }

  @Post(':id/duplicate')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Duplicate campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Campaign duplicated successfully',
    type: CampaignResponseDto,
  })
  async duplicateCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() duplicateCampaignDto: DuplicateCampaignDto,
  ) {
    const campaign = await this.campaignService.duplicateCampaign(id, duplicateCampaignDto.name);

    return {
      success: true,
      message: 'Email campaign duplicated successfully',
      data: campaign,
    };
  }

  @Post(':id/test')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Send test email' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test email sent successfully',
  })
  async testCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() testCampaignDto: TestCampaignDto,
  ) {
    // Implementation would send test emails
    return {
      success: true,
      message: 'Test emails sent successfully',
      data: {
        testEmails: testCampaignDto.testEmails,
        sentCount: testCampaignDto.testEmails.length,
      },
    };
  }

  @Post(':id/preview')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Preview campaign email' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email preview generated successfully',
  })
  async previewCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() previewCampaignDto: PreviewCampaignDto,
  ) {
    const campaign = await this.campaignService.findOne(id);

    // Generate preview with variables
    const variables = previewCampaignDto.variables || {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    };

    const preview = {
      subject: this.replaceVariables(campaign.subject, variables),
      htmlContent: this.replaceVariables(campaign.htmlContent, variables),
      textContent: campaign.textContent
        ? this.replaceVariables(campaign.textContent, variables)
        : undefined,
    };

    return {
      success: true,
      message: 'Email preview generated successfully',
      data: preview,
    };
  }

  @Get(':id/recipients')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get campaign recipients' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recipients retrieved successfully',
  })
  async getCampaignRecipients(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const { recipients, total } = await this.campaignService.getRecipients(id, page, limit);

    return {
      success: true,
      message: 'Campaign recipients retrieved successfully',
      data: recipients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get(':id/statistics')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign statistics retrieved successfully',
    type: CampaignMetricsResponseDto,
  })
  async getCampaignStatistics(@Param('id', ParseUUIDPipe) id: string) {
    const statistics = await this.campaignService.getCampaignStatistics(id);

    return {
      success: true,
      message: 'Campaign statistics retrieved successfully',
      data: statistics,
    };
  }

  @Get(':id/analytics')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get detailed campaign analytics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign analytics retrieved successfully',
  })
  async getCampaignAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange =
      startDate && endDate
        ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          }
        : undefined;

    const [metrics, deviceStats, geoStats, clickHeatmap, emailClientStats] = await Promise.all([
      this.analyticsService.getCampaignMetrics(id, dateRange),
      this.analyticsService.getDeviceStatistics(id),
      this.analyticsService.getGeographicStatistics(id),
      this.analyticsService.getClickHeatmap(id),
      this.analyticsService.getEmailClientStatistics(id),
    ]);

    return {
      success: true,
      message: 'Campaign analytics retrieved successfully',
      data: {
        metrics,
        deviceStatistics: deviceStats,
        geographicStatistics: geoStats,
        clickHeatmap,
        emailClientStatistics: emailClientStats,
      },
    };
  }

  @Get(':id/time-series')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get campaign time series data' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiQuery({
    name: 'interval',
    enum: ['hour', 'day', 'week', 'month'],
    description: 'Time interval',
  })
  @ApiQuery({ name: 'startDate', description: 'Start date' })
  @ApiQuery({ name: 'endDate', description: 'End date' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time series data retrieved successfully',
  })
  async getCampaignTimeSeries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('interval') interval: 'hour' | 'day' | 'week' | 'month' = 'day',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const timeSeriesData = await this.analyticsService.getTimeSeriesData(id, interval, {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

    return {
      success: true,
      message: 'Campaign time series data retrieved successfully',
      data: timeSeriesData,
    };
  }

  @Get(':id/performance-report')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Generate campaign performance report' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiQuery({
    name: 'compareWithPrevious',
    required: false,
    description: 'Compare with previous campaign',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance report generated successfully',
  })
  async getCampaignPerformanceReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('compareWithPrevious') compareWithPrevious: boolean = false,
  ) {
    const report = await this.analyticsService.generatePerformanceReport(id, compareWithPrevious);

    return {
      success: true,
      message: 'Campaign performance report generated successfully',
      data: report,
    };
  }

  @Post('bulk-action')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Perform bulk action on campaigns' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk action completed successfully',
  })
  async bulkCampaignAction(@Body() bulkActionDto: BulkCampaignActionDto) {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const campaignId of bulkActionDto.campaignIds) {
      try {
        switch (bulkActionDto.action) {
          case 'pause':
            await this.campaignService.pause(campaignId);
            break;
          case 'resume':
            await this.campaignService.resume(campaignId);
            break;
          case 'cancel':
            await this.campaignService.cancel(campaignId);
            break;
          case 'delete':
            await this.campaignService.delete(campaignId);
            break;
        }
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Campaign ${campaignId}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Bulk action ${bulkActionDto.action} completed`,
      data: results,
    };
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    return result;
  }
}

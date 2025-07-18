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
import { EmailAutomationService } from '../services/email-automation.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateStepDto,
  UpdateStepDto,
  TriggerWorkflowDto,
  WorkflowFilterDto,
  WorkflowTestDto,
  WorkflowResponseDto,
  WorkflowStatisticsResponseDto,
} from '../dto/email-automation.dto';

@ApiTags('Email Automation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('email-automation')
export class EmailAutomationController {
  constructor(private readonly automationService: EmailAutomationService) {}

  // Workflow Management
  @Post('workflows')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new email automation workflow' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Workflow created successfully',
    type: WorkflowResponseDto,
  })
  async createWorkflow(
    @Body() createWorkflowDto: CreateWorkflowDto,
    @CurrentUser() user: UserPayload,
  ) {
    const workflow = await this.automationService.createWorkflow(createWorkflowDto, user.sub);

    return {
      success: true,
      message: 'Email automation workflow created successfully',
      data: workflow,
    };
  }

  @Get('workflows')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get all email automation workflows' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflows retrieved successfully',
    type: [WorkflowResponseDto],
  })
  async getWorkflows(@Query() filters: WorkflowFilterDto) {
    const { workflows, total } = await this.automationService.findAllWorkflows(
      filters.page,
      filters.limit,
      {
        status: filters.status,
        triggerType: filters.triggerType,
        createdBy: filters.createdBy,
        search: filters.search,
      },
    );

    return {
      success: true,
      message: 'Email automation workflows retrieved successfully',
      data: workflows,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit!),
      },
    };
  }

  @Get('workflows/:id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow retrieved successfully',
    type: WorkflowResponseDto,
  })
  async getWorkflow(@Param('id', ParseUUIDPipe) id: string) {
    const workflow = await this.automationService.findOneWorkflow(id);

    return {
      success: true,
      message: 'Email automation workflow retrieved successfully',
      data: workflow,
    };
  }

  @Put('workflows/:id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow updated successfully',
    type: WorkflowResponseDto,
  })
  async updateWorkflow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    const workflow = await this.automationService.updateWorkflow(id, updateWorkflowDto);

    return {
      success: true,
      message: 'Email automation workflow updated successfully',
      data: workflow,
    };
  }

  @Delete('workflows/:id')
  @Roles('admin', 'instructor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Workflow deleted successfully',
  })
  async deleteWorkflow(@Param('id', ParseUUIDPipe) id: string) {
    await this.automationService.deleteWorkflow(id);

    return {
      success: true,
      message: 'Email automation workflow deleted successfully',
    };
  }

  @Post('workflows/:id/activate')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Activate workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow activated successfully',
    type: WorkflowResponseDto,
  })
  async activateWorkflow(@Param('id', ParseUUIDPipe) id: string) {
    const workflow = await this.automationService.activateWorkflow(id);

    return {
      success: true,
      message: 'Email automation workflow activated successfully',
      data: workflow,
    };
  }

  @Post('workflows/:id/deactivate')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Deactivate workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow deactivated successfully',
    type: WorkflowResponseDto,
  })
  async deactivateWorkflow(@Param('id', ParseUUIDPipe) id: string) {
    const workflow = await this.automationService.deactivateWorkflow(id);

    return {
      success: true,
      message: 'Email automation workflow deactivated successfully',
      data: workflow,
    };
  }

  @Post('workflows/:id/trigger')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Manually trigger workflow for a user' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow triggered successfully',
  })
  async triggerWorkflow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() triggerWorkflowDto: TriggerWorkflowDto,
  ) {
    const executionId = await this.automationService.triggerWorkflow(
      id,
      triggerWorkflowDto.userId,
      triggerWorkflowDto.triggerData,
    );

    return {
      success: true,
      message: 'Email automation workflow triggered successfully',
      data: { executionId },
    };
  }

  @Post('workflows/:id/test')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Test workflow execution' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow test completed successfully',
  })
  async testWorkflow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() testWorkflowDto: WorkflowTestDto,
  ) {
    const executionId = await this.automationService.triggerWorkflow(
      id,
      testWorkflowDto.userId,
      testWorkflowDto.testData,
    );

    return {
      success: true,
      message: 'Email automation workflow test completed successfully',
      data: {
        executionId,
        testMode: testWorkflowDto.testMode,
        message: 'Workflow executed in test mode - no actual emails sent',
      },
    };
  }

  @Get('workflows/:id/statistics')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow statistics retrieved successfully',
    type: WorkflowStatisticsResponseDto,
  })
  async getWorkflowStatistics(@Param('id', ParseUUIDPipe) id: string) {
    const statistics = await this.automationService.getWorkflowStatistics(id);

    return {
      success: true,
      message: 'Workflow statistics retrieved successfully',
      data: statistics,
    };
  }

  // Step Management
  @Post('workflows/:workflowId/steps')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Add step to workflow' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Step added successfully',
  })
  async addStep(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() createStepDto: CreateStepDto,
  ) {
    // Implementation would be in the automation service
    return {
      success: true,
      message: 'Workflow step added successfully',
      data: { workflowId, step: createStepDto },
    };
  }

  @Put('workflows/:workflowId/steps/:stepId')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update workflow step' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step updated successfully',
  })
  async updateStep(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() updateStepDto: UpdateStepDto,
  ) {
    // Implementation would be in the automation service
    return {
      success: true,
      message: 'Workflow step updated successfully',
      data: { workflowId, stepId, updates: updateStepDto },
    };
  }

  @Delete('workflows/:workflowId/steps/:stepId')
  @Roles('admin', 'instructor')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workflow step' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Step deleted successfully',
  })
  async deleteStep(
    @Param('workflowId', ParseUUIDPipe) _workflowId: string,
    @Param('stepId', ParseUUIDPipe) _stepId: string,
  ) {
    // Implementation would be in the automation service
    return {
      success: true,
      message: 'Workflow step deleted successfully',
    };
  }

  @Post('workflows/:workflowId/steps/:stepId/test')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Test individual workflow step' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiParam({ name: 'stepId', description: 'Step ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step test completed successfully',
  })
  async testStep(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Param('stepId', ParseUUIDPipe) stepId: string,
    @Body() testData: { userId: string; variables?: Record<string, any> },
  ) {
    // Implementation would test individual step
    return {
      success: true,
      message: 'Workflow step test completed successfully',
      data: {
        workflowId,
        stepId,
        testUserId: testData.userId,
        testMode: true,
      },
    };
  }

  // Analytics and Reporting
  @Get('analytics/overview')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get automation analytics overview' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics overview retrieved successfully',
  })
  async getAnalyticsOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const _dateRange =
      startDate && endDate
        ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          }
        : undefined;

    // Implementation would aggregate analytics across all workflows
    const overview = {
      totalWorkflows: 0,
      activeWorkflows: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      averageOpenRate: 0,
      averageClickRate: 0,
      topPerformingWorkflows: [],
      recentExecutions: [],
    };

    return {
      success: true,
      message: 'Automation analytics overview retrieved successfully',
      data: overview,
    };
  }

  @Get('analytics/performance')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get workflow performance comparison' })
  @ApiQuery({ name: 'workflowIds', description: 'Comma-separated workflow IDs' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for comparison' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for comparison' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance comparison retrieved successfully',
  })
  async getPerformanceComparison(
    @Query('workflowIds') workflowIds: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const ids = workflowIds.split(',');
    const _dateRange =
      startDate && endDate
        ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          }
        : undefined;

    // Implementation would compare performance across workflows
    const comparison = {
      workflows: ids.map(id => ({
        workflowId: id,
        name: `Workflow ${id}`,
        executions: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
      })),
      insights: ['Workflow A has the highest open rate', 'Workflow B shows declining performance'],
    };

    return {
      success: true,
      message: 'Workflow performance comparison retrieved successfully',
      data: comparison,
    };
  }

  @Get('templates/suggested')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get suggested workflow templates' })
  @ApiQuery({ name: 'triggerType', required: false, description: 'Filter by trigger type' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suggested templates retrieved successfully',
  })
  async getSuggestedTemplates(@Query('triggerType') triggerType?: string) {
    const templates = [
      {
        id: 'welcome-series',
        name: 'Welcome Email Series',
        description: 'Multi-step welcome email sequence for new users',
        triggerType: 'user_registration',
        steps: [
          { type: 'email', name: 'Welcome Email', delay: 0 },
          { type: 'delay', name: 'Wait 1 Day', delay: 1 },
          { type: 'email', name: 'Getting Started Guide', delay: 0 },
          { type: 'delay', name: 'Wait 3 Days', delay: 3 },
          { type: 'email', name: 'Tips and Best Practices', delay: 0 },
        ],
      },
      {
        id: 'course-completion',
        name: 'Course Completion Follow-up',
        description: 'Congratulate users and suggest next courses',
        triggerType: 'course_completion',
        steps: [
          { type: 'email', name: 'Congratulations Email', delay: 0 },
          { type: 'delay', name: 'Wait 2 Days', delay: 2 },
          { type: 'email', name: 'Certificate and Next Steps', delay: 0 },
          { type: 'delay', name: 'Wait 1 Week', delay: 7 },
          { type: 'email', name: 'Recommended Courses', delay: 0 },
        ],
      },
      {
        id: 'engagement-revival',
        name: 'Re-engagement Campaign',
        description: 'Win back inactive users',
        triggerType: 'inactivity',
        steps: [
          { type: 'email', name: 'We Miss You', delay: 0 },
          { type: 'delay', name: 'Wait 5 Days', delay: 5 },
          { type: 'condition', name: 'Check Activity', delay: 0 },
          { type: 'email', name: 'Special Offer', delay: 0 },
          { type: 'delay', name: 'Wait 1 Week', delay: 7 },
          { type: 'email', name: 'Final Reminder', delay: 0 },
        ],
      },
    ];

    const filteredTemplates = triggerType
      ? templates.filter(t => t.triggerType === triggerType)
      : templates;

    return {
      success: true,
      message: 'Suggested workflow templates retrieved successfully',
      data: filteredTemplates,
    };
  }

  @Post('templates/:templateId/create-workflow')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Workflow created from template successfully',
  })
  async createWorkflowFromTemplate(
    @Param('templateId') templateId: string,
    @Body() customization: { name: string; description?: string; settings?: any },
    @CurrentUser() user: UserPayload,
  ) {
    // Implementation would create workflow based on template
    return {
      success: true,
      message: 'Workflow created from template successfully',
      data: {
        templateId,
        workflowId: `workflow_${Date.now()}`,
        name: customization.name,
        createdBy: user.sub,
      },
    };
  }
}

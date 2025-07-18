import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationTemplateService } from '../services/notification-template.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { NotificationType, DeliveryChannel } from '@/common/enums/notification.enums';
import {
  CreateNotificationTemplateDto,
  PreviewTemplateDto,
  UpdateNotificationTemplateDto,
  ValidateTemplateDto,
} from '../dto/notification.dto';

@ApiTags('Notification Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notification-templates')
export class NotificationTemplateController {
  constructor(private readonly templateService: NotificationTemplateService) {}

  @Post()
  @Roles('admin', 'super_admin') // Only admins can create templates
  @ApiOperation({ summary: 'Create a new notification template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
    schema: {
      example: {
        success: true,
        message: 'Template created successfully',
        data: {
          id: 'uuid-string',
          name: 'Course Enrollment Email',
          type: NotificationType.COURSE_ENROLLMENT,
          channel: 'email',
          templateType: 'email_html',
          subject: 'Welcome to {{courseName}}!',
          body: 'Hi {{userFirstName}}, welcome to {{courseName}}!',
          htmlBody: '<h2>Welcome to {{courseName}}!</h2><p>Hi {{userFirstName}}...</p>',
          isActive: true,
          version: 1,
          variables: [
            { name: 'courseName', description: 'Course name', type: 'string', required: true },
            {
              name: 'userFirstName',
              description: 'User first name',
              type: 'string',
              required: true,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Template already exists or invalid data',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async create(@Body() createDto: CreateNotificationTemplateDto) {
    const template = await this.templateService.create(createDto);

    return {
      success: true,
      message: 'Template created successfully',
      data: template,
    };
  }

  @Get()
  @Roles('admin', 'super_admin', 'teacher') // Teachers can view templates
  @ApiOperation({ summary: 'Get all notification templates' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: NotificationType,
    description: 'Filter by notification type',
  })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: DeliveryChannel,
    description: 'Filter by delivery channel',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({ name: 'locale', required: false, type: String, description: 'Filter by locale' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Templates retrieved successfully',
        data: [
          {
            id: 'uuid-1',
            name: 'Course Enrollment Email',
            type: NotificationType.COURSE_ENROLLMENT,
            channel: 'email',
            subject: 'Welcome to {{courseName}}!',
            isActive: true,
            version: 1,
            createdAt: '2025-01-18T10:00:00Z',
          },
          {
            id: 'uuid-2',
            name: 'Assignment Due Push',
            type: NotificationType.ASSIGNMENT_DUE,
            channel: 'push',
            subject: 'Assignment Due Soon',
            isActive: true,
            version: 1,
            createdAt: '2025-01-18T10:00:00Z',
          },
        ],
      },
    },
  })
  async findAll(
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: DeliveryChannel,
    @Query('active') active?: boolean,
    @Query('locale') locale?: string,
  ) {
    let templates = await this.templateService.findAll();

    // Apply filters
    if (type) {
      templates = templates.filter(t => t.type === type);
    }
    if (channel) {
      templates = templates.filter(t => t.channel === channel);
    }
    if (typeof active === 'boolean') {
      templates = templates.filter(t => t.isActive === active);
    }
    if (locale) {
      templates = templates.filter(t => t.locale === locale);
    }

    return {
      success: true,
      message: 'Templates retrieved successfully',
      data: templates,
    };
  }

  @Get(':id')
  @Roles('admin', 'super_admin', 'teacher')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Template retrieved successfully',
        data: {
          id: 'uuid-string',
          name: 'Course Enrollment Email',
          description: 'Welcome email sent when user enrolls in a course',
          type: NotificationType.COURSE_ENROLLMENT,
          channel: 'email',
          templateType: 'email_html',
          subject: 'Welcome to {{courseName}}! 🎉',
          body: 'Hi {{userFirstName}}, welcome to {{courseName}}!',
          htmlBody: '<div style="font-family: Arial;"><h2>Welcome to {{courseName}}!</h2></div>',
          locale: 'en',
          isActive: true,
          isDefault: true,
          version: 1,
          variables: [
            {
              name: 'courseName',
              description: 'Course name',
              type: 'string',
              required: true,
            },
            {
              name: 'userFirstName',
              description: 'User first name',
              type: 'string',
              required: true,
            },
          ],
          styling: {
            theme: 'modern',
            colors: { primary: '#4285f4', secondary: '#34a853' },
          },
          createdAt: '2025-01-18T10:00:00Z',
          updatedAt: '2025-01-18T10:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Template not found' })
  async findOne(@Param('id') id: string) {
    const template = await this.templateService.findOne(id);

    return {
      success: true,
      message: 'Template retrieved successfully',
      data: template,
    };
  }

  @Put(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Template updated successfully',
        data: {
          id: 'uuid-string',
          name: 'Updated Template Name',
          version: 2,
          updatedAt: '2025-01-18T11:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Template not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateNotificationTemplateDto) {
    const template = await this.templateService.update(id, updateDto);

    return {
      success: true,
      message: 'Template updated successfully',
      data: template,
    };
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Template deleted successfully',
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Template not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot delete default template' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async remove(@Param('id') id: string) {
    await this.templateService.delete(id);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  @Post(':id/activate')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Activate notification template' })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template activated successfully',
    schema: {
      example: {
        success: true,
        message: 'Template activated successfully',
        data: { id: 'uuid-string', isActive: true },
      },
    },
  })
  async activate(@Param('id') id: string) {
    const template = await this.templateService.activate(id);

    return {
      success: true,
      message: 'Template activated successfully',
      data: template,
    };
  }

  @Post(':id/deactivate')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Deactivate notification template' })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template deactivated successfully',
    schema: {
      example: {
        success: true,
        message: 'Template deactivated successfully',
        data: { id: 'uuid-string', isActive: false },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot deactivate default template',
  })
  async deactivate(@Param('id') id: string) {
    const template = await this.templateService.deactivate(id);

    return {
      success: true,
      message: 'Template deactivated successfully',
      data: template,
    };
  }

  @Post(':id/preview')
  @Roles('admin', 'super_admin', 'teacher')
  @ApiOperation({ summary: 'Preview template with variables' })
  @ApiParam({ name: 'id', type: String, description: 'Template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template preview generated successfully',
    schema: {
      example: {
        success: true,
        message: 'Template preview generated successfully',
        data: {
          subject: 'Welcome to Advanced React Course!',
          body: 'Hi John, welcome to Advanced React Course!',
          htmlBody: '<div><h2>Welcome to Advanced React Course!</h2><p>Hi John...</p></div>',
        },
      },
    },
  })
  async preview(@Param('id') id: string, @Body() previewDto: PreviewTemplateDto) {
    const preview = await this.templateService.previewTemplate(id, previewDto.variables);

    return {
      success: true,
      message: 'Template preview generated successfully',
      data: preview,
    };
  }

  @Post('validate')
  @Roles('admin', 'super_admin', 'teacher')
  @ApiOperation({ summary: 'Validate template syntax and variables' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template validation completed',
    schema: {
      example: {
        success: true,
        message: 'Template validation completed',
        data: {
          isValid: true,
          errors: [],
        },
      },
    },
  })
  async validate(@Body() validateDto: ValidateTemplateDto) {
    const validation = await this.templateService.validateTemplate(
      validateDto.content,
      validateDto.variables,
    );

    return {
      success: true,
      message: 'Template validation completed',
      data: validation,
    };
  }

  @Get('types/:type/channels/:channel')
  @Roles('admin', 'super_admin', 'teacher')
  @ApiOperation({ summary: 'Get template by type and channel' })
  @ApiParam({ name: 'type', enum: NotificationType, description: 'Notification type' })
  @ApiParam({ name: 'channel', enum: DeliveryChannel, description: 'Delivery channel' })
  @ApiQuery({
    name: 'locale',
    required: false,
    type: String,
    description: 'Template locale (default: en)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template found',
    schema: {
      example: {
        success: true,
        message: 'Template found',
        data: {
          id: 'uuid-string',
          name: 'Course Enrollment Email',
          subject: 'Welcome to {{courseName}}!',
          body: 'Hi {{userFirstName}}, welcome!',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found for this type and channel',
  })
  async findByTypeAndChannel(
    @Param('type') type: NotificationType,
    @Param('channel') channel: DeliveryChannel,
    @Query('locale') locale = 'en',
  ) {
    const template = await this.templateService.findByTypeAndChannel(type, channel, locale);

    if (!template) {
      return {
        success: false,
        message: `No template found for ${type} on ${channel} (locale: ${locale})`,
        data: null,
      };
    }

    return {
      success: true,
      message: 'Template found',
      data: template,
    };
  }

  @Post('create-defaults')
  @Roles('super_admin') // Only super admin can create default templates
  @ApiOperation({ summary: 'Create default notification templates' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Default templates created successfully',
    schema: {
      example: {
        success: true,
        message: 'Default templates created successfully',
      },
    },
  })
  async createDefaults() {
    await this.templateService.createDefaultTemplates();

    return {
      success: true,
      message: 'Default templates created successfully',
    };
  }

  @Get('export/all')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Export all templates (for backup/migration)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates exported successfully',
    schema: {
      example: {
        success: true,
        message: 'Templates exported successfully',
        data: {
          exportedAt: '2025-01-18T12:00:00Z',
          count: 15,
          templates: '...', // Full template data
        },
      },
    },
  })
  async exportAll() {
    const templates = await this.templateService.findAll();

    return {
      success: true,
      message: 'Templates exported successfully',
      data: {
        exportedAt: new Date(),
        count: templates.length,
        templates,
      },
    };
  }

  @Get('stats/usage')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get template usage statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template statistics retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Template statistics retrieved successfully',
        data: {
          totalTemplates: 25,
          activeTemplates: 20,
          inactiveTemplates: 5,
          byChannel: {
            email: 12,
            push: 8,
            sms: 3,
            in_app: 2,
          },
          byType: {
            course_enrollment: 4,
            assignment_due: 4,
            grade_posted: 4,
            system_maintenance: 2,
          },
          mostUsedTemplates: [
            { id: 'uuid-1', name: 'Course Enrollment Email', usageCount: 1250 },
            { id: 'uuid-2', name: 'Assignment Due Push', usageCount: 890 },
          ],
        },
      },
    },
  })
  async getUsageStats() {
    const templates = await this.templateService.findAll();

    const stats = {
      totalTemplates: templates.length,
      activeTemplates: templates.filter(t => t.isActive).length,
      inactiveTemplates: templates.filter(t => !t.isActive).length,
      byChannel: this.groupBy(templates, 'channel'),
      byType: this.groupBy(templates, 'type'),
      byLocale: this.groupBy(templates, 'locale'),
      defaultTemplates: templates.filter(t => t.isDefault).length,
      customTemplates: templates.filter(t => !t.isDefault).length,
    };

    return {
      success: true,
      message: 'Template statistics retrieved successfully',
      data: stats,
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce(
      (groups, item) => {
        const groupKey = String(item[key]);
        groups[groupKey] = (groups[groupKey] || 0) + 1;
        return groups;
      },
      {} as Record<string, number>,
    );
  }
}

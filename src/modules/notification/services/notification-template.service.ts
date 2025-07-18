import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationType, DeliveryChannel, TemplateType } from '@/common/enums/notification.enums';

export interface CreateTemplateDto {
  name: string;
  description?: string;
  type: NotificationType;
  channel: DeliveryChannel;
  templateType: TemplateType;
  subject: string;
  body: string;
  htmlBody?: string;
  locale?: string;
  isActive?: boolean;
  styling?: any;
  variables?: any[];
  version?: number;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {}

  async create(createDto: CreateTemplateDto): Promise<NotificationTemplate> {
    // Check if template already exists for this type and channel
    const existing = await this.templateRepository.findOne({
      where: {
        type: createDto.type,
        channel: createDto.channel,
        locale: createDto.locale || 'en',
      },
    });

    if (existing && !createDto.locale) {
      throw new BadRequestException(
        `Template already exists for ${createDto.type} on ${createDto.channel}`,
      );
    }

    const template = this.templateRepository.create({
      ...createDto,
      locale: createDto.locale || 'en',
      isActive: createDto.isActive !== false,
      version: 1,
      variables:
        createDto.variables || this.extractVariables(createDto.body + (createDto.htmlBody || '')),
    });

    const savedTemplate = await this.templateRepository.save(template);
    this.logger.log(
      `Template created: ${savedTemplate.id} for ${createDto.type}/${createDto.channel}`,
    );

    return savedTemplate;
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return this.templateRepository.find({
      order: { type: 'ASC', channel: 'ASC' },
    });
  }

  async findByTypeAndChannel(
    type: NotificationType,
    channel: DeliveryChannel,
    locale = 'en',
  ): Promise<NotificationTemplate | null> {
    return this.templateRepository.findOne({
      where: { type, channel, locale, isActive: true },
      order: { version: 'DESC' },
    });
  }

  async findOne(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async update(id: string, updateDto: UpdateTemplateDto): Promise<NotificationTemplate> {
    const template = await this.findOne(id);

    // Create new version if content changed
    if (updateDto.body || updateDto.htmlBody || updateDto.subject) {
      updateDto.version = template.version + 1;
      updateDto.variables = this.extractVariables(
        (updateDto.body || template.body) + (updateDto.htmlBody || template.htmlBody || ''),
      );
    }

    await this.templateRepository.update(id, {
      ...updateDto,
      updatedAt: new Date(),
    });

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.isDefault) {
      throw new BadRequestException('Cannot delete default template');
    }

    await this.templateRepository.softDelete(id);
    this.logger.log(`Template deleted: ${id}`);
  }

  async activate(id: string): Promise<NotificationTemplate> {
    await this.templateRepository.update(id, { isActive: true });
    return this.findOne(id);
  }

  async deactivate(id: string): Promise<NotificationTemplate> {
    const template = await this.findOne(id);

    if (template.isDefault) {
      throw new BadRequestException('Cannot deactivate default template');
    }

    await this.templateRepository.update(id, { isActive: false });
    return this.findOne(id);
  }

  async renderTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
  ): Promise<{ subject: string; body: string; htmlBody?: string }> {
    const renderedSubject = this.replaceVariables(template.subject, variables);
    const renderedBody = this.replaceVariables(template.body, variables);
    const renderedHtmlBody = template.htmlBody
      ? this.replaceVariables(template.htmlBody, variables)
      : undefined;

    return {
      subject: renderedSubject,
      body: renderedBody,
      htmlBody: renderedHtmlBody,
    };
  }

  async previewTemplate(
    id: string,
    variables: Record<string, any>,
  ): Promise<{ subject: string; body: string; htmlBody?: string }> {
    const template = await this.findOne(id);
    return this.renderTemplate(template, variables);
  }

  async validateTemplate(
    templateContent: string,
    variables: Record<string, any>,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for unclosed variables
    const openBraces = (templateContent.match(/\{\{/g) || []).length;
    const closeBraces = (templateContent.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push('Mismatched template variable braces');
    }

    // Check for undefined variables
    const templateVars = this.extractVariableNames(templateContent);
    const providedVars = Object.keys(variables);

    const missingVars = templateVars.filter(v => !providedVars.includes(v));
    if (missingVars.length > 0) {
      errors.push(`Missing variables: ${missingVars.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      // Email templates
      {
        name: 'Course Enrollment - Email',
        type: NotificationType.COURSE_ENROLLMENT,
        channel: DeliveryChannel.EMAIL,
        templateType: TemplateType.EMAIL_HTML,
        subject: 'Welcome to {{courseName}}! 🎉',
        body: 'Hi {{userFirstName}}, welcome to {{courseName}}! Start learning: {{actionUrl}}',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to {{courseName}}! 🎉</h2>
            <p>Hi {{userFirstName}},</p>
            <p>Congratulations! You have successfully enrolled in <strong>{{courseName}}</strong>.</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="{{actionUrl}}" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Start Learning</a>
            </div>
            <p>Happy learning!</p>
          </div>
        `,
      },

      // Push notification templates
      {
        name: 'Assignment Due - Push',
        type: NotificationType.ASSIGNMENT_DUE,
        channel: DeliveryChannel.PUSH,
        templateType: TemplateType.PUSH_NOTIFICATION,
        subject: '⏰ Assignment Due Soon',
        body: "{{assignmentName}} is due {{dueDate}}. Don't miss the deadline!",
      },

      // SMS templates
      {
        name: 'Security Alert - SMS',
        type: NotificationType.SECURITY_ALERT,
        channel: DeliveryChannel.SMS,
        templateType: TemplateType.SMS_MESSAGE,
        subject: '',
        body: 'SECURITY ALERT: {{alertMessage}} Please check your account immediately. {{actionUrl}}',
      },
    ];

    for (const templateData of defaultTemplates) {
      const existing = await this.templateRepository.findOne({
        where: {
          type: templateData.type,
          channel: templateData.channel,
        },
      });

      if (!existing) {
        await this.create({
          ...templateData,
          isActive: true,
        });
      }
    }

    this.logger.log('Default templates created');
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    return result;
  }

  private extractVariables(
    content: string,
  ): Array<{ name: string; description: string; type: string; required: boolean }> {
    const variableNames = this.extractVariableNames(content);

    return variableNames.map(name => ({
      name,
      description: `Template variable: ${name}`,
      type: 'string',
      required: true,
    }));
  }

  private extractVariableNames(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }
}

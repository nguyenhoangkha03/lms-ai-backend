import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from '../../modules/notification/entities/notification-template.entity';
import { NotificationType, DeliveryChannel, TemplateType } from '@/common/enums/notification.enums';

@Injectable()
export class NotificationTemplatesSeeder {
  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {}

  async seed() {
    const templates = [
      // Course Enrollment Templates
      {
        name: 'Course Enrollment - Email',
        type: NotificationType.COURSE_ENROLLMENT,
        channel: DeliveryChannel.EMAIL,
        templateType: TemplateType.EMAIL_HTML,
        subject: 'Welcome to {{courseName}}! 🎉',
        body: `
          <h2>Welcome to {{courseName}}!</h2>
          <p>Hi {{userFirstName}},</p>
          <p>Congratulations! You have successfully enrolled in <strong>{{courseName}}</strong>.</p>
          <p>You can start learning right away by clicking the button below:</p>
          <a href="{{actionUrl}}" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Start Learning</a>
          <p>Happy learning!</p>
        `,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to {{courseName}}! 🎉</h2>
            <p>Hi {{userFirstName}},</p>
            <p>Congratulations! You have successfully enrolled in <strong>{{courseName}}</strong>.</p>
            <p>You can start learning right away by clicking the button below:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="{{actionUrl}}" style="background-color: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Learning</a>
            </div>
            <p>Happy learning!</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">This is an automated message from LMS System</p>
          </div>
        `,
      },
      {
        name: 'Course Enrollment - Push',
        type: NotificationType.COURSE_ENROLLMENT,
        channel: DeliveryChannel.PUSH,
        templateType: TemplateType.PUSH_NOTIFICATION,
        subject: 'Enrolled in {{courseName}}',
        body: 'Welcome! You can start learning {{courseName}} right now. Tap to begin your journey! 🚀',
      },
      {
        name: 'Course Enrollment - SMS',
        type: NotificationType.COURSE_ENROLLMENT,
        channel: DeliveryChannel.SMS,
        templateType: TemplateType.SMS_MESSAGE,
        subject: '',
        body: 'Hi {{userFirstName}}! Welcome to {{courseName}}. Start learning: {{actionUrl}}',
      },

      // Assignment Due Templates
      {
        name: 'Assignment Due - Email',
        type: NotificationType.ASSIGNMENT_DUE,
        channel: DeliveryChannel.EMAIL,
        templateType: TemplateType.EMAIL_HTML,
        subject: '⏰ Assignment Due: {{assignmentName}}',
        body: `
          <h2>Assignment Reminder</h2>
          <p>Hi {{userFirstName}},</p>
          <p>This is a friendly reminder that your assignment <strong>{{assignmentName}}</strong> is due soon.</p>
          <p><strong>Due Date:</strong> {{dueDate}}</p>
          <p>Don't wait until the last minute! Complete your assignment now:</p>
          <a href="{{actionUrl}}" style="background-color: #ff9800; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Assignment</a>
        `,
      },
      {
        name: 'Assignment Due - Push',
        type: NotificationType.ASSIGNMENT_DUE,
        channel: DeliveryChannel.PUSH,
        templateType: TemplateType.PUSH_NOTIFICATION,
        subject: '⏰ Assignment Due Soon',
        body: "{{assignmentName}} is due {{dueDate}}. Don't miss the deadline!",
      },

      // Study Group Invitation Templates
      {
        name: 'Study Group Invitation - Email',
        type: NotificationType.STUDY_GROUP_INVITATION,
        channel: DeliveryChannel.EMAIL,
        templateType: TemplateType.EMAIL_HTML,
        subject: "👥 You're invited to join {{groupName}}",
        body: `
          <h2>Study Group Invitation</h2>
          <p>Hi {{userFirstName}},</p>
          <p>{{inviterName}} has invited you to join the study group <strong>{{groupName}}</strong>.</p>
          <p><strong>Group Description:</strong> {{groupDescription}}</p>
          <p>Join your fellow learners and enhance your learning experience together!</p>
          <a href="{{actionUrl}}" style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Join Group</a>
        `,
      },

      // System Maintenance Templates
      {
        name: 'System Maintenance - Email',
        type: NotificationType.SYSTEM_MAINTENANCE,
        channel: DeliveryChannel.EMAIL,
        templateType: TemplateType.EMAIL_HTML,
        subject: '🔧 Scheduled Maintenance: {{maintenanceDate}}',
        body: `
          <h2>Scheduled System Maintenance</h2>
          <p>Hi {{userFirstName}},</p>
          <p>We will be performing scheduled maintenance on our learning platform.</p>
          <p><strong>Maintenance Window:</strong> {{maintenanceDate}} to {{maintenanceEndDate}}</p>
          <p><strong>Expected Duration:</strong> {{duration}}</p>
          <p>During this time, the platform may be temporarily unavailable. We apologize for any inconvenience.</p>
          <p>Thank you for your patience!</p>
        `,
      },
    ];

    for (const templateData of templates) {
      const existingTemplate = await this.templateRepository.findOne({
        where: {
          type: templateData.type,
          channel: templateData.channel,
        },
      });

      if (!existingTemplate) {
        const template = this.templateRepository.create({
          ...templateData,
          isActive: true,
          isDefault: true,
          version: 1,
          variables: this.extractVariables(templateData.body + (templateData.htmlBody || '')),
        } as NotificationTemplate);

        await this.templateRepository.save(template);
      }
    }
  }

  private extractVariables(
    content: string,
  ): Array<{ name: string; description: string; type: string; required: boolean }> {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables).map(variable => ({
      name: variable,
      description: `Template variable: ${variable}`,
      type: 'string',
      required: true,
    }));
  }
}

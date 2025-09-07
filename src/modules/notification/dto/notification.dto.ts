import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  DeliveryChannel,
  NotificationFrequency,
  TemplateType,
} from '@/common/enums/notification.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Notification priority' })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiProperty({ enum: NotificationCategory, description: 'Notification category' })
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({ description: 'Icon URL' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Action URL' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Action buttons' })
  @IsOptional()
  @IsArray()
  actions?: Array<{
    id: string;
    label: string;
    action: string;
    url?: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;

  @ApiPropertyOptional({ description: 'Delivery channels to use' })
  @IsOptional()
  @IsArray()
  @IsEnum(DeliveryChannel, { each: true })
  channels?: DeliveryChannel[];

  @ApiPropertyOptional({ description: 'Scheduled delivery time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFor?: Date;

  @ApiPropertyOptional({ description: 'Expiration time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Notification data' })
  @IsOptional()
  @IsObject()
  data?: {
    sessionId?: string;
    studentId?: string;
    assessmentId?: string;
    assessmentTitle?: string;
    attemptId?: string;
    timeTaken?: number;
    studentName?: string;
    eventType?: string;
    violationCount?: number;
    shouldTerminate?: boolean;
    reason?: string;
    remainingMinutes?: number;
    warningType?: string;
    autoSubmitted?: boolean;
    messageId?: string;
    senderId?: string;
    senderName?: string;
    roomId?: string;
    reportId?: string;
    postId?: string;
    status?: string;
    threadId?: string;
    replyAuthorId?: string;
    authorId?: string;
    content?: string;
    points?: number;
    relatedId?: string;
    gradeId?: string;
    score?: number;
    percentage?: number;
  };

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({ description: 'Notification title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Mark as read' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class NotificationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NotificationType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationPriority, description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Filter by related entity type' })
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({ description: 'Search in title and message' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by date from' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter by date to' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}

export class BulkNotificationDto {
  @ApiProperty({ description: 'User IDs to send notification to' })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: NotificationCategory, description: 'Notification category' })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiPropertyOptional({ description: 'Delivery channels to use' })
  @IsOptional()
  @IsArray()
  @IsEnum(DeliveryChannel, { each: true })
  channels?: DeliveryChannel[];

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;
}

export class NotificationPreferenceDto {
  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable SMS notifications' })
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable in-app notifications' })
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Notification frequency' })
  @IsOptional()
  @IsString()
  frequency?: NotificationFrequency;

  @ApiPropertyOptional({ description: 'Quiet hours configuration' })
  @IsOptional()
  @IsObject()
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
    weekdays: number[];
  };
}

export class CreateNotificationTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ enum: DeliveryChannel, description: 'Delivery channel' })
  @IsEnum(DeliveryChannel)
  channel: DeliveryChannel;

  @ApiProperty({ enum: TemplateType, description: 'Template type' })
  @IsEnum(TemplateType)
  templateType: TemplateType;

  @ApiProperty({ description: 'Template subject line' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Template body content' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'HTML version of template body' })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional({ description: 'Template locale (e.g., en, vi, fr)' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Template styling configuration' })
  @IsOptional()
  @IsObject()
  styling?: any;

  @ApiPropertyOptional({ description: 'Template variables definition' })
  @IsOptional()
  @IsArray()
  variables?: any[];
}

export class PreviewTemplateDto {
  @ApiProperty({ description: 'Template variables for preview' })
  @IsObject()
  variables: Record<string, any>;
}

export class ValidateTemplateDto {
  @ApiProperty({ description: 'Template content to validate' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Variables to test against' })
  @IsObject()
  variables: Record<string, any>;
}

export class UpdateNotificationTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Template subject line' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Template body content' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'HTML version of template body' })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Template styling configuration' })
  @IsOptional()
  @IsObject()
  styling?: any;

  @ApiPropertyOptional({ description: 'Template variables definition' })
  @IsOptional()
  @IsArray()
  variables?: any[];
}

export class SubscriptionDto {
  @ApiProperty({ enum: DeliveryChannel, description: 'Subscription channel' })
  @IsEnum(DeliveryChannel)
  channel: DeliveryChannel;

  @ApiProperty({ description: 'Subscription endpoint' })
  @IsString()
  endpoint: string;

  @ApiPropertyOptional({ description: 'Channel configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Device information' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional({ description: 'Platform information' })
  @IsOptional()
  @IsString()
  platform?: string;
}

export class TestNotificationDto {
  @ApiProperty({ description: 'Test notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Test notification message' })
  @IsString()
  message: string;

  @ApiProperty({ enum: DeliveryChannel, description: 'Channel to test' })
  @IsEnum(DeliveryChannel)
  channel: DeliveryChannel;

  @ApiPropertyOptional({ description: 'Template variables for testing' })
  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, any>;
}

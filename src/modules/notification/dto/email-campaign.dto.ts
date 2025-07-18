import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsBoolean,
  IsDate,
  IsEmail,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignType, CampaignStatus } from '../entities/email-campaign.entity';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CampaignType, description: 'Campaign type' })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiProperty({ description: 'Email subject line' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML email content' })
  @IsString()
  htmlContent: string;

  @ApiPropertyOptional({ description: 'Plain text email content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'From email address' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'From name' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @ApiPropertyOptional({ description: 'Target audience criteria' })
  @IsOptional()
  @IsObject()
  targetAudience?: {
    userTypes?: string[];
    courseIds?: string[];
    tags?: string[];
    customQuery?: string;
    excludeUserIds?: string[];
    includeUserIds?: string[];
  };

  @ApiPropertyOptional({ description: 'Campaign settings' })
  @IsOptional()
  @IsObject()
  settings?: {
    enableTracking?: boolean;
    enableClickTracking?: boolean;
    enableOpenTracking?: boolean;
    enableUnsubscribeTracking?: boolean;
    customHeaders?: Record<string, string>;
    suppressionList?: string[];
    abTesting?: {
      enabled: boolean;
      variants: Array<{
        name: string;
        subject: string;
        htmlContent: string;
        percentage: number;
      }>;
    };
    deliverySettings?: {
      throttleRate?: number;
      retryAttempts?: number;
      retryDelay?: number;
    };
  };
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Email subject line' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'HTML email content' })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Plain text email content' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'From email address' })
  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @ApiPropertyOptional({ description: 'From name' })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ description: 'Reply-to email address' })
  @IsOptional()
  @IsEmail()
  replyToEmail?: string;

  @ApiPropertyOptional({ description: 'Target audience criteria' })
  @IsOptional()
  @IsObject()
  targetAudience?: {
    userTypes?: string[];
    courseIds?: string[];
    tags?: string[];
    customQuery?: string;
    excludeUserIds?: string[];
    includeUserIds?: string[];
  };

  @ApiPropertyOptional({ description: 'Campaign settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class SendCampaignDto {
  @ApiPropertyOptional({ description: "Test mode - don't actually send emails" })
  @IsOptional()
  @IsBoolean()
  testMode?: boolean;

  @ApiPropertyOptional({ description: 'Batch size for sending', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Delay between batches in milliseconds', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delayBetweenBatches?: number;
}

export class ScheduleCampaignDto {
  @ApiProperty({ description: 'Scheduled send time' })
  @IsDate()
  @Type(() => Date)
  scheduledAt: Date;
}

export class DuplicateCampaignDto {
  @ApiProperty({ description: 'Name for duplicated campaign' })
  @IsString()
  name: string;
}

export class CampaignFilterDto {
  @ApiPropertyOptional({ enum: CampaignStatus, description: 'Filter by campaign status' })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ enum: CampaignType, description: 'Filter by campaign type' })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @ApiPropertyOptional({ description: 'Filter by creator user ID' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Search in name, description, or subject' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

export class CampaignStatisticsDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  campaignId: string;

  @ApiPropertyOptional({ description: 'Start date for statistics' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for statistics' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}

export class BulkCampaignActionDto {
  @ApiProperty({ description: 'Campaign IDs to perform action on' })
  @IsArray()
  @IsString({ each: true })
  campaignIds: string[];

  @ApiProperty({
    enum: ['pause', 'resume', 'cancel', 'delete'],
    description: 'Action to perform on campaigns',
  })
  @IsEnum(['pause', 'resume', 'cancel', 'delete'])
  action: 'pause' | 'resume' | 'cancel' | 'delete';
}

export class TestCampaignDto {
  @ApiProperty({ description: 'Test email addresses' })
  @IsArray()
  @IsEmail({}, { each: true })
  testEmails: string[];

  @ApiPropertyOptional({ description: 'Test variables to use in email' })
  @IsOptional()
  @IsObject()
  testVariables?: Record<string, any>;
}

export class PreviewCampaignDto {
  @ApiPropertyOptional({ description: 'Variables to use for preview' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Device type for preview' })
  @IsOptional()
  @IsEnum(['desktop', 'mobile', 'tablet'])
  device?: 'desktop' | 'mobile' | 'tablet';
}

// Response DTOs
export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ enum: CampaignType })
  type: CampaignType;

  @ApiProperty({ enum: CampaignStatus })
  status: CampaignStatus;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  totalRecipients: number;

  @ApiProperty()
  sentCount: number;

  @ApiProperty()
  failedCount: number;

  @ApiProperty()
  openedCount: number;

  @ApiProperty()
  clickedCount: number;

  @ApiProperty()
  openRate: number;

  @ApiProperty()
  clickRate: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  sentAt?: Date;

  @ApiProperty()
  completedAt?: Date;
}

export class CampaignMetricsResponseDto {
  @ApiProperty()
  totalSent: number;

  @ApiProperty()
  totalDelivered: number;

  @ApiProperty()
  totalOpened: number;

  @ApiProperty()
  totalClicked: number;

  @ApiProperty()
  totalBounced: number;

  @ApiProperty()
  totalUnsubscribed: number;

  @ApiProperty()
  totalComplaints: number;

  @ApiProperty()
  deliveryRate: number;

  @ApiProperty()
  openRate: number;

  @ApiProperty()
  clickRate: number;

  @ApiProperty()
  bounceRate: number;

  @ApiProperty()
  unsubscribeRate: number;

  @ApiProperty()
  complaintRate: number;
}

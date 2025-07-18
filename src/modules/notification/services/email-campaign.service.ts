import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailCampaign, CampaignStatus, CampaignType } from '../entities/email-campaign.entity';
import {
  EmailCampaignRecipient,
  DeliveryStatus,
} from '../entities/email-campaign-recipient.entity';
import { User } from '../../user/entities/user.entity';
import { SmtpProviderService } from './smtp-provider.service';
import { EmailSuppressionService } from './email-suppression.service';
import { NotificationTemplateService } from './notification-template.service';
import { CreateCampaignDto, UpdateCampaignDto, SendCampaignDto } from '../dto/email-campaign.dto';

@Injectable()
export class EmailCampaignService {
  private readonly logger = new Logger(EmailCampaignService.name);

  constructor(
    @InjectRepository(EmailCampaign)
    private campaignRepository: Repository<EmailCampaign>,

    @InjectRepository(EmailCampaignRecipient)
    private recipientRepository: Repository<EmailCampaignRecipient>,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectQueue('email-campaign')
    private emailCampaignQueue: Queue,

    private smtpProviderService: SmtpProviderService,
    private emailSuppressionService: EmailSuppressionService,
    private templateService: NotificationTemplateService,
  ) {}

  async create(createCampaignDto: CreateCampaignDto, createdBy: string): Promise<EmailCampaign> {
    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      createdBy,
      status: CampaignStatus.DRAFT,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // If target audience is specified, build recipient list
    if (createCampaignDto.targetAudience) {
      await this.buildRecipientList(savedCampaign.id, createCampaignDto.targetAudience);
    }

    this.logger.log(`Email campaign created: ${savedCampaign.id} by user ${createdBy}`);
    return savedCampaign;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: CampaignStatus;
      type?: CampaignType;
      createdBy?: string;
      search?: string;
    },
  ): Promise<{ campaigns: EmailCampaign[]; total: number }> {
    const queryBuilder = this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.recipients', 'recipients');

    if (filters?.status) {
      queryBuilder.andWhere('campaign.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      queryBuilder.andWhere('campaign.type = :type', { type: filters.type });
    }

    if (filters?.createdBy) {
      queryBuilder.andWhere('campaign.createdBy = :createdBy', { createdBy: filters.createdBy });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(campaign.name LIKE :search OR campaign.description LIKE :search OR campaign.subject LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    queryBuilder
      .orderBy('campaign.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [campaigns, total] = await queryBuilder.getManyAndCount();

    return { campaigns, total };
  }

  async findOne(id: string): Promise<EmailCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['recipients', 'analytics'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  async update(id: string, updateCampaignDto: UpdateCampaignDto): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    // Prevent updates to sent campaigns
    if (campaign.status === CampaignStatus.SENT || campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException('Cannot update campaigns that are sent or currently sending');
    }

    await this.campaignRepository.update(id, updateCampaignDto);

    // If target audience was updated, rebuild recipient list
    if (updateCampaignDto.targetAudience) {
      await this.recipientRepository.delete({ campaignId: id });
      await this.buildRecipientList(id, updateCampaignDto.targetAudience);
    }

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const campaign = await this.findOne(id);

    // Prevent deletion of active campaigns
    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException('Cannot delete campaigns that are currently sending');
    }

    await this.campaignRepository.delete(id);
    this.logger.log(`Email campaign deleted: ${id}`);
  }

  async schedule(id: string, scheduledAt: Date): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be scheduled');
    }

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    await this.campaignRepository.update(id, {
      status: CampaignStatus.SCHEDULED,
      scheduledAt,
    });

    // Add job to queue for scheduled sending
    await this.emailCampaignQueue.add(
      'send-scheduled-campaign',
      { campaignId: id },
      { delay: scheduledAt.getTime() - Date.now() },
    );

    this.logger.log(`Campaign ${id} scheduled for ${scheduledAt.toISOString()}`);
    return this.findOne(id);
  }

  async send(id: string, sendOptions?: SendCampaignDto): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Only draft or scheduled campaigns can be sent');
    }

    // Validate campaign has recipients
    if (campaign.totalRecipients === 0) {
      throw new BadRequestException('Campaign has no recipients');
    }

    // Update campaign status
    await this.campaignRepository.update(id, {
      status: CampaignStatus.SENDING,
      sentAt: new Date(),
    });

    // Add sending job to queue
    await this.emailCampaignQueue.add(
      'send-campaign',
      {
        campaignId: id,
        sendOptions: sendOptions || {},
      },
      {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Campaign ${id} queued for sending`);
    return this.findOne(id);
  }

  async pause(id: string): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (
      campaign.status !== CampaignStatus.SENDING &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException('Only sending or scheduled campaigns can be paused');
    }

    await this.campaignRepository.update(id, {
      status: CampaignStatus.PAUSED,
    });

    // Remove scheduled jobs from queue
    const jobs = await this.emailCampaignQueue.getJobs(['delayed', 'waiting']);
    for (const job of jobs) {
      if (job.data.campaignId === id) {
        await job.remove();
      }
    }

    this.logger.log(`Campaign ${id} paused`);
    return this.findOne(id);
  }

  async resume(id: string): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    await this.campaignRepository.update(id, {
      status: CampaignStatus.SENDING,
    });

    // Resume sending
    await this.emailCampaignQueue.add(
      'send-campaign',
      { campaignId: id },
      {
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Campaign ${id} resumed`);
    return this.findOne(id);
  }

  async cancel(id: string): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException('Cannot cancel campaigns that have already been sent');
    }

    await this.campaignRepository.update(id, {
      status: CampaignStatus.CANCELLED,
    });

    // Remove all pending jobs from queue
    const jobs = await this.emailCampaignQueue.getJobs(['delayed', 'waiting', 'active']);
    for (const job of jobs) {
      if (job.data.campaignId === id) {
        await job.remove();
      }
    }

    this.logger.log(`Campaign ${id} cancelled`);
    return this.findOne(id);
  }

  private async buildRecipientList(campaignId: string, targetAudience: any): Promise<void> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Build query based on target audience criteria
    if (targetAudience.userTypes?.length > 0) {
      queryBuilder.andWhere('user.userType IN (:...userTypes)', {
        userTypes: targetAudience.userTypes,
      });
    }

    if (targetAudience.courseIds?.length > 0) {
      queryBuilder
        .innerJoin('user.enrollments', 'enrollment')
        .andWhere('enrollment.courseId IN (:...courseIds)', {
          courseIds: targetAudience.courseIds,
        });
    }

    if (targetAudience.tags?.length > 0) {
      queryBuilder.andWhere('JSON_CONTAINS(user.tags, :tags)', {
        tags: JSON.stringify(targetAudience.tags),
      });
    }

    if (targetAudience.includeUserIds?.length > 0) {
      queryBuilder.andWhere('user.id IN (:...includeUserIds)', {
        includeUserIds: targetAudience.includeUserIds,
      });
    }

    if (targetAudience.excludeUserIds?.length > 0) {
      queryBuilder.andWhere('user.id NOT IN (:...excludeUserIds)', {
        excludeUserIds: targetAudience.excludeUserIds,
      });
    }

    // Execute query to get users
    const users = await queryBuilder.getMany();

    // Filter out suppressed emails
    const validRecipients: Partial<EmailCampaignRecipient>[] = [];
    for (const user of users) {
      const isSuppressed = await this.emailSuppressionService.isEmailSuppressed(
        user.email,
        'marketing',
      );

      if (!isSuppressed) {
        validRecipients.push({
          campaignId,
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: DeliveryStatus.PENDING,
        });
      }
    }

    // Batch insert recipients
    if (validRecipients.length > 0) {
      await this.recipientRepository
        .createQueryBuilder()
        .insert()
        .into(EmailCampaignRecipient)
        .values(validRecipients)
        .execute();
    }

    // Update campaign recipient count
    await this.campaignRepository.update(campaignId, {
      totalRecipients: validRecipients.length,
    });

    this.logger.log(
      `Built recipient list for campaign ${campaignId}: ${validRecipients.length} recipients`,
    );
  }

  async getRecipients(
    campaignId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ recipients: EmailCampaignRecipient[]; total: number }> {
    const [recipients, total] = await this.recipientRepository.findAndCount({
      where: { campaignId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { recipients, total };
  }

  async getCampaignStatistics(id: string): Promise<{
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    clickedCount: number;
    bouncedCount: number;
    unsubscribedCount: number;
    complaintsCount: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> {
    const _campaign = await this.findOne(id);

    const stats = await this.recipientRepository
      .createQueryBuilder('recipient')
      .select([
        'COUNT(CASE WHEN recipient.status = :sent THEN 1 END) as sentCount',
        'COUNT(CASE WHEN recipient.status = :delivered THEN 1 END) as deliveredCount',
        'COUNT(CASE WHEN recipient.status = :opened THEN 1 END) as openedCount',
        'COUNT(CASE WHEN recipient.status = :clicked THEN 1 END) as clickedCount',
        'COUNT(CASE WHEN recipient.status = :bounced THEN 1 END) as bouncedCount',
        'COUNT(CASE WHEN recipient.status = :unsubscribed THEN 1 END) as unsubscribedCount',
        'COUNT(CASE WHEN recipient.status = :complained THEN 1 END) as complaintsCount',
      ])
      .where('recipient.campaignId = :campaignId', { campaignId: id })
      .setParameters({
        sent: DeliveryStatus.SENT,
        delivered: DeliveryStatus.DELIVERED,
        opened: DeliveryStatus.OPENED,
        clicked: DeliveryStatus.CLICKED,
        bounced: DeliveryStatus.BOUNCED,
        unsubscribed: DeliveryStatus.UNSUBSCRIBED,
        complained: DeliveryStatus.COMPLAINED,
      })
      .getRawOne();

    const sentCount = parseInt(stats.sentCount) || 0;
    const deliveredCount = parseInt(stats.deliveredCount) || 0;
    const openedCount = parseInt(stats.openedCount) || 0;
    const clickedCount = parseInt(stats.clickedCount) || 0;
    const bouncedCount = parseInt(stats.bouncedCount) || 0;
    const unsubscribedCount = parseInt(stats.unsubscribedCount) || 0;
    const complaintsCount = parseInt(stats.complaintsCount) || 0;

    const openRate = deliveredCount > 0 ? (openedCount / deliveredCount) * 100 : 0;
    const clickRate = deliveredCount > 0 ? (clickedCount / deliveredCount) * 100 : 0;
    const bounceRate = sentCount > 0 ? (bouncedCount / sentCount) * 100 : 0;

    return {
      sentCount,
      deliveredCount,
      openedCount,
      clickedCount,
      bouncedCount,
      unsubscribedCount,
      complaintsCount,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
    };
  }

  async duplicateCampaign(id: string, name: string): Promise<EmailCampaign> {
    const originalCampaign = await this.findOne(id);

    const duplicatedCampaign = this.campaignRepository.create({
      name,
      description: originalCampaign.description,
      type: originalCampaign.type,
      createdBy: originalCampaign.createdBy,
      subject: originalCampaign.subject,
      htmlContent: originalCampaign.htmlContent,
      textContent: originalCampaign.textContent,
      fromEmail: originalCampaign.fromEmail,
      fromName: originalCampaign.fromName,
      replyToEmail: originalCampaign.replyToEmail,
      targetAudience: originalCampaign.targetAudience,
      settings: originalCampaign.settings,
      status: CampaignStatus.DRAFT,
    });

    const savedCampaign = await this.campaignRepository.save(duplicatedCampaign);

    this.logger.log(`Campaign ${id} duplicated as ${savedCampaign.id}`);
    return savedCampaign;
  }
}

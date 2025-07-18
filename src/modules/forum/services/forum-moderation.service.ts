import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPostReport } from '../entities/forum-post-report.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { CreateForumReportDto, UpdateForumReportDto } from '../dto/forum-report.dto';
import { BulkModerationDto } from '../dto/forum-moderation.dto';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { ForumPostStatus } from '@/common/enums/forum.enums';
import { NotificationCategory, NotificationType } from '@/common/enums/notification.enums';

@Injectable()
export class ForumModerationService {
  constructor(
    @InjectRepository(ForumPostReport)
    private readonly reportRepository: Repository<ForumPostReport>,
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
    private readonly notificationService: NotificationService,
  ) {}

  async reportPost(
    postId: string,
    reporterId: string,
    reportDto: CreateForumReportDto,
  ): Promise<ForumPostReport> {
    try {
      // Check if post exists
      const post = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['author'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if user already reported this post
      const existingReport = await this.reportRepository.findOne({
        where: { postId, reporterId },
      });

      if (existingReport) {
        throw new ForbiddenException('You have already reported this post');
      }

      // Create report
      const report = this.reportRepository.create({
        postId,
        reporterId,
        ...reportDto,
        status: 'pending',
        createdBy: reporterId,
        updatedBy: reporterId,
      });

      const savedReport = await this.reportRepository.save(report);

      // Update post report count
      await this.postRepository.increment({ id: postId }, 'reportCount', 1);
      await this.postRepository.update(postId, { isReported: true });

      // Notify moderators if threshold reached
      if (post.reportCount >= 3) {
        await this.notifyModerators(postId, 'multiple_reports');
      }

      this.logger.log(`Forum post reported, {
        ${postId},
        ${reporterId},
        reason: ${reportDto.reason},
      }`);

      return savedReport;
    } catch (error) {
      this.logger.error(`Failed to report forum post, error, {
        ${postId},
        ${reporterId},
        ${reportDto},
      }`);
      throw error;
    }
  }

  async getReports(
    options: {
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    reports: ForumPostReport[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.post', 'post')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.handler', 'handler')
      .orderBy('report.createdAt', 'DESC');

    if (status) {
      queryBuilder.where('report.status = :status', { status });
    }

    const [reports, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async handleReport(
    reportId: string,
    updateDto: UpdateForumReportDto,
    moderatorId: string,
  ): Promise<ForumPostReport> {
    try {
      const report = await this.reportRepository.findOne({
        where: { id: reportId },
        relations: ['post', 'reporter'],
      });

      if (!report) {
        throw new NotFoundException('Report not found');
      }

      // Update report
      Object.assign(report, updateDto, {
        handledBy: moderatorId,
        handledAt: new Date(),
        updatedBy: moderatorId,
      });

      const updatedReport = await this.reportRepository.save(report);

      // Notify reporter about the decision
      await this.notificationService.create({
        userId: report.reporterId,
        category: NotificationCategory.FORUM_REPORT,
        type: NotificationType.REPORT_HANDLED,
        title: 'Report Update',
        message: `Your report has been ${updateDto.status}`,
        data: {
          reportId,
          postId: report.postId,
          status: updateDto.status,
        },
      });

      this.logger.log(`Forum report handled, {
        ${reportId},
        ${moderatorId},
        status: ${updateDto.status},
      }`);

      return updatedReport;
    } catch (error) {
      this.logger.error(`Failed to handle forum report, error, {
        ${reportId},
        ${updateDto},
        ${moderatorId},
      }`);
      throw error;
    }
  }

  async performBulkAction(bulkDto: BulkModerationDto, moderatorId: string): Promise<void> {
    try {
      const { targetIds, action, reason } = bulkDto;

      for (const targetId of targetIds) {
        switch (action) {
          case 'delete':
            await this.postRepository.softDelete(targetId);
            break;
          case 'lock':
            // Implementation depends on your thread locking logic
            break;
          case 'archive':
            await this.postRepository.update(targetId, {
              status: ForumPostStatus.ARCHIVED,
              updatedBy: moderatorId,
            });
            break;
          // Add more actions as needed
        }
      }

      this.logger.log(`Bulk moderation action performed, {
        ${action},
        ${targetIds},
        ${moderatorId},
        ${reason},
      }`);
    } catch (error) {
      this.logger.error(`Failed to perform bulk moderation action, error, {
        ${bulkDto},
        ${moderatorId},
      }`);
      throw error;
    }
  }

  private async notifyModerators(postId: string, type: string): Promise<void> {
    // Implementation would depend on your user/role management system
    // This is a placeholder
    this.logger.log(`Moderator notification sent, {
      ${postId},
      ${type},
    }`);
  }
}

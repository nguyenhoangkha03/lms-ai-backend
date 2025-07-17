import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { NotificationService } from '@/modules/notification/notification.service';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
@Processor('forum-notification')
export class ForumNotificationProcessor {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly logger: WinstonService,
  ) {}

  @Process('thread-reply')
  async handleThreadReply(job: Job) {
    const { threadId, threadTitle, authorId, replyAuthorId } = job.data;

    try {
      await this.notificationService.create({
        userId: authorId,
        type: 'forum_thread_reply',
        title: 'New Reply to Your Thread',
        message: `Someone replied to your thread "${threadTitle}"`,
        data: {
          threadId,
          replyAuthorId,
        },
      });

      this.logger.log(`Thread reply notification sent, {
        ${threadId},
        ${authorId},
        ${replyAuthorId},
      }`);
    } catch (error) {
      this.logger.error('Failed to send thread reply notification', error);
      throw error;
    }
  }

  @Process('mention-notification')
  async handleMention(job: Job) {
    const { mentionedUserId, postId, authorId, content } = job.data;

    try {
      await this.notificationService.create({
        userId: mentionedUserId,
        type: 'forum_mention',
        title: 'You were mentioned in a forum post',
        message: `You were mentioned in a forum discussion`,
        data: {
          postId,
          authorId,
          content: content.substring(0, 100),
        },
      });

      this.logger.log(`Mention notification sent, {
        ${mentionedUserId},
        ${postId},
        ${authorId},
      }`);
    } catch (error) {
      this.logger.error('Failed to send mention notification', error);
      throw error;
    }
  }

  @Process('reputation-awarded')
  async handleReputationAwarded(job: Job) {
    const { userId, points, reason, relatedId } = job.data;

    try {
      await this.notificationService.create({
        userId,
        type: 'forum_reputation_gained',
        title: 'Reputation Points Awarded',
        message: `You earned ${points} reputation points for ${reason}`,
        data: {
          points,
          reason,
          relatedId,
        },
      });

      this.logger.log(`Reputation notification sent, {
        ${userId},
        ${points},
        ${reason},
      }`);
    } catch (error) {
      this.logger.error('Failed to send reputation notification', error);
      throw error;
    }
  }
}

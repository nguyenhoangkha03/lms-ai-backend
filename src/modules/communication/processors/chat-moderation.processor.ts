import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ChatModerationService } from '../services/chat-moderation.service';

@Processor('chat-moderation')
export class ChatModerationProcessor {
  private readonly logger = new Logger(ChatModerationProcessor.name);

  constructor(private readonly moderationService: ChatModerationService) {}

  @Process('auto-moderate')
  async handleAutoModeration(
    job: Job<{
      messageId: string;
      content: string;
      roomId: string;
      userId: string;
    }>,
  ) {
    const { messageId, content, roomId, userId } = job.data;

    try {
      this.logger.debug(`Auto-moderating message ${messageId}`);

      const result = await this.moderationService.checkMessage(content, roomId, userId);

      if (result.blocked) {
        await this.moderationService.createModerationRecord({
          messageId,
          roomId,
          targetUserId: userId,
          action: result.suggestedAction || 'flag_content',
          reason: result.reason!,
          severity: result.severity,
          isAutomated: true,
          confidenceScore: result.confidence,
        });
      }

      this.logger.debug(`Auto-moderation completed for message ${messageId}`);
    } catch (error) {
      this.logger.error(`Error in auto-moderation: ${error.message}`, error.stack);
    }
  }

  @Process('expire-moderation')
  async handleModerationExpiry(
    job: Job<{
      moderationId: string;
    }>,
  ) {
    const { moderationId } = job.data;

    try {
      this.logger.debug(`Expiring moderation ${moderationId}`);
      // Mark moderation as expired
      // This would be implemented in ModerationService

      this.logger.debug(`Moderation ${moderationId} expired`);
    } catch (error) {
      this.logger.error(`Error expiring moderation: ${error.message}`, error.stack);
    }
  }
}

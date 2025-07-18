import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { RealtimeEventService } from '../services/realtime-event.service';
import { RealtimeGateway } from '../gateways/realtime.gateway';

interface BroadcastEventJobData {
  eventId: string;
  options?: {
    immediate?: boolean;
    priority?: number;
  };
}

@Processor('realtime-events')
export class RealtimeEventProcessor {
  private readonly logger = new Logger(RealtimeEventProcessor.name);

  constructor(
    private readonly realtimeEventService: RealtimeEventService,
    private readonly _realtimeGateway: RealtimeGateway,
  ) {}

  @Process('broadcast-event')
  async handleBroadcastEvent(job: Job<BroadcastEventJobData>): Promise<void> {
    const { eventId, options: _ = {} } = job.data;

    try {
      this.logger.log(`Processing broadcast event job: ${eventId}`);

      await this.realtimeEventService.broadcastEvent(eventId);

      this.logger.log(`Successfully broadcasted event: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast event ${eventId}:`, error);
      throw error;
    }
  }

  @Process('cleanup-expired-events')
  async handleCleanupExpiredEvents(_job: Job): Promise<void> {
    try {
      this.logger.log('Processing cleanup expired events job');

      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const expiredCount = await this.realtimeEventService.expireOldEvents(cutoffDate);

      this.logger.log(`Cleaned up ${expiredCount} expired events`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired events:', error);
      throw error;
    }
  }
}

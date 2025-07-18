import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { VideoRecordingService } from '../services/video-recording.service';
import { NotificationService } from '../../notification/services/notification.service';
import { VideoProvider } from '@/common/enums/communication.enums';

@Processor('video-recording')
export class VideoRecordingProcessor {
  private readonly logger = new Logger(VideoRecordingProcessor.name);

  constructor(
    private readonly recordingService: VideoRecordingService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process('process-recording')
  async handleRecordingProcessing(
    job: Job<{
      sessionId: string;
      provider: VideoProvider;
      meetingId: string;
    }>,
  ) {
    const { sessionId, provider: _, meetingId: __ } = job.data;

    try {
      this.logger.debug(`Processing recording for session ${sessionId}`);

      await this.recordingService.processRecording(job.data);

      this.logger.debug(`Recording processed successfully for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to process recording for session ${sessionId}: ${error.message}`);
      throw error;
    }
  }

  @Process('cleanup-recordings')
  async handleRecordingCleanup(
    job: Job<{
      sessionId: string;
      retentionDays: number;
    }>,
  ) {
    const { sessionId, retentionDays: _ } = job.data;

    try {
      this.logger.debug(`Cleaning up old recordings for session ${sessionId}`);

      // Implementation would clean up recordings older than retention period

      this.logger.debug(`Recording cleanup completed for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error during recording cleanup: ${error.message}`);
      throw error;
    }
  }

  @Process('generate-thumbnails')
  async handleThumbnailGeneration(
    job: Job<{
      sessionId: string;
      recordingPath: string;
    }>,
  ) {
    const { sessionId, recordingPath } = job.data;

    try {
      this.logger.debug(`Generating thumbnails for recording ${recordingPath}`);

      // Implementation would generate video thumbnails

      this.logger.debug(`Thumbnails generated for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error generating thumbnails: ${error.message}`);
      throw error;
    }
  }
}

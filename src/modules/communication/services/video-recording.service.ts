import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoSession } from '../entities/video-session.entity';
import { FileManagementService } from '../../file-management/services/file-management.service';
import { ZoomIntegrationService } from './zoom-integration.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { VideoProvider, VideoSessionStatus } from '@/common/enums/communication.enums';
import { UpdateVideoSessionDto } from '../dto/video-session.dto';

interface RecordingMetadata {
  sessionId: string;
  fileName: string;
  fileSize: number;
  duration: number;
  format: string;
  quality: string;
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class VideoRecordingService {
  private readonly logger = new Logger(VideoRecordingService.name);

  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepository: Repository<VideoSession>,
    private readonly fileManagementService: FileManagementService,
    private readonly zoomService: ZoomIntegrationService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('video-recording')
    private readonly recordingQueue: Queue,
  ) {}

  async startRecording(sessionId: string, hostId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.hostId !== hostId) {
      throw new BadRequestException('Only the host can start recording');
    }

    if (session.status !== VideoSessionStatus.LIVE) {
      throw new BadRequestException('Can only record live sessions');
    }

    if (session.isRecording) {
      throw new BadRequestException('Recording is already in progress');
    }

    // Start recording with provider
    await this.startProviderRecording(session);

    // Update session
    await this.sessionRepository.update(sessionId, {
      isRecording: true,
    });

    this.eventEmitter.emit('video.recording.started', {
      sessionId,
      hostId,
      timestamp: new Date(),
    });

    this.logger.debug(`Started recording for session ${sessionId}`);
  }

  async stopRecording(sessionId: string, hostId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.hostId !== hostId) {
      throw new BadRequestException('Only the host can stop recording');
    }

    if (!session.isRecording) {
      throw new BadRequestException('No recording in progress');
    }

    // Stop recording with provider
    await this.stopProviderRecording(session);

    // Update session
    await this.sessionRepository.update(sessionId, {
      isRecording: false,
    });

    // Queue recording processing
    await this.recordingQueue.add('process-recording', {
      sessionId,
      provider: session.provider,
      meetingId: session.meetingId,
    });

    this.eventEmitter.emit('video.recording.stopped', {
      sessionId,
      hostId,
      timestamp: new Date(),
    });

    this.logger.debug(`Stopped recording for session ${sessionId}`);
  }

  async getRecordings(sessionId: string): Promise<any[]> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      select: ['recordingUrl', 'recordingDuration', 'recordingSize', 'provider', 'meetingId'],
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Get recordings from provider
    return this.getProviderRecordings(session);
  }

  async downloadRecording(sessionId: string, recordingId: string): Promise<Buffer> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Download from provider or storage
    return this.downloadProviderRecording(session, recordingId);
  }

  async deleteRecording(sessionId: string, recordingId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Delete from provider and storage
    await this.deleteProviderRecording(session, recordingId);

    this.eventEmitter.emit('video.recording.deleted', {
      sessionId,
      recordingId,
      timestamp: new Date(),
    });

    this.logger.debug(`Deleted recording ${recordingId} for session ${sessionId}`);
  }

  async processRecording(jobData: {
    sessionId: string;
    provider: VideoProvider;
    meetingId: string;
  }): Promise<void> {
    const { sessionId, provider, meetingId } = jobData;

    try {
      this.logger.debug(`Processing recording for session ${sessionId}`);

      // Get recording from provider
      const recordings = await this.getProviderRecordings({ provider, meetingId } as VideoSession);

      for (const recording of recordings) {
        // Download recording
        const recordingBuffer = await this.downloadProviderRecording(
          { provider, meetingId } as VideoSession,
          recording.id,
        );

        const fileName = `recording_${sessionId}_${Date.now()}.${recording.format || 'mp4'}`;
        const filePath = await this.fileManagementService.uploadBuffer(
          recordingBuffer,
          fileName,
          `video-recordings/${sessionId}`,
          recording.mimeType || 'video/mp4',
        );

        await this.sessionRepository.update(sessionId, {
          recordingUrl: filePath,
          recordingDuration: recording.duration,
          recordingSize: recording.fileSize,
        } as UpdateVideoSessionDto);

        // Create recording metadata
        const metadata: RecordingMetadata = {
          sessionId,
          fileName,
          fileSize: recording.fileSize,
          duration: recording.duration,
          format: recording.format || 'mp4',
          quality: recording.quality || 'HD',
          startTime: recording.startTime,
          endTime: recording.endTime,
        };

        this.eventEmitter.emit('video.recording.processed', {
          sessionId,
          metadata,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to process recording for session ${sessionId}: ${error.message}`);

      this.eventEmitter.emit('video.recording.failed', {
        sessionId,
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  private async startProviderRecording(session: VideoSession): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        // Zoom handles recording automatically if enabled in settings
        break;

      case VideoProvider.WEBRTC:
        // For WebRTC, we would need to implement server-side recording
        // This is a simplified implementation
        this.logger.debug('WebRTC recording started (client-side implementation required)');
        break;

      default:
        // Handle other providers
        break;
    }
  }

  private async stopProviderRecording(session: VideoSession): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        // Zoom handles recording automatically
        break;

      case VideoProvider.WEBRTC:
        // Stop WebRTC recording
        this.logger.debug('WebRTC recording stopped');
        break;

      default:
        // Handle other providers
        break;
    }
  }

  private async getProviderRecordings(session: VideoSession): Promise<any[]> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        return this.zoomService.getRecordings(session.meetingId!);

      case VideoProvider.WEBRTC:
        // For WebRTC, recordings would be stored locally
        return [];

      default:
        return [];
    }
  }

  private async downloadProviderRecording(
    session: VideoSession,
    _recordingId: string,
  ): Promise<Buffer> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        // Download from Zoom (would need to implement in ZoomService)
        throw new Error('Zoom recording download not implemented');

      case VideoProvider.WEBRTC:
        // Download from local storage
        throw new Error('WebRTC recording download not implemented');

      default:
        throw new Error('Recording download not supported for this provider');
    }
  }

  private async deleteProviderRecording(
    session: VideoSession,
    _recordingId: string,
  ): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        // Delete from Zoom
        break;

      case VideoProvider.WEBRTC:
        // Delete from local storage
        break;

      default:
        // Handle other providers
        break;
    }
  }
}

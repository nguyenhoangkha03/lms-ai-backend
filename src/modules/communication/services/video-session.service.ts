import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { VideoSession } from '../entities/video-session.entity';
import { VideoParticipant } from '../entities/video-participant.entity';
import { ZoomIntegrationService } from './zoom-integration.service';
import { WebRTCService } from './webrtc.service';
import { AttendanceTrackingService } from './attendance-tracking.service';
import { NotificationService } from '../../notification/notification.service';
import { CacheService } from '@/cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  VideoSessionType,
  VideoSessionStatus,
  VideoProvider,
  ParticipantRole,
  ParticipantConnectionStatus,
} from '@/common/enums/communication.enums';
import {
  CreateVideoSessionDto,
  UpdateVideoSessionDto,
  JoinSessionDto,
  ScheduleSessionDto as _,
} from '../dto/video-session.dto';

@Injectable()
export class VideoSessionService {
  private readonly _logger = new Logger(VideoSessionService.name);

  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepository: Repository<VideoSession>,
    @InjectRepository(VideoParticipant)
    private readonly participantRepository: Repository<VideoParticipant>,
    private readonly zoomService: ZoomIntegrationService,
    private readonly webrtcService: WebRTCService,
    private readonly attendanceService: AttendanceTrackingService,
    private readonly notificationService: NotificationService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSession(createSessionDto: CreateVideoSessionDto): Promise<VideoSession> {
    const session = this.sessionRepository.create({
      ...createSessionDto,
      status: VideoSessionStatus.SCHEDULED,
      currentParticipants: 0,
      totalParticipants: 0,
    });

    // Set provider-specific configurations
    await this.configureProvider(session);

    const savedSession = await this.sessionRepository.save(session);

    // Add host as participant
    await this.addParticipant(savedSession.id, createSessionDto.hostId, ParticipantRole.HOST);

    // Schedule reminder notifications
    await this.scheduleNotifications(savedSession);

    this.eventEmitter.emit('video.session.created', {
      sessionId: savedSession.id,
      hostId: createSessionDto.hostId,
      timestamp: new Date(),
    });

    return this.getSessionById(savedSession.id);
  }

  async getSessionById(sessionId: string): Promise<VideoSession> {
    const cacheKey = `video_session:${sessionId}`;

    const cached = await this.cacheService.get<VideoSession>(cacheKey);
    if (cached) {
      return cached;
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['host', 'course', 'lesson', 'participants', 'participants.user'],
    });

    if (!session) {
      throw new NotFoundException('Video session not found');
    }

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, session, 300);

    return session;
  }

  async updateSession(sessionId: string, updateDto: UpdateVideoSessionDto): Promise<VideoSession> {
    const session = await this.getSessionById(sessionId);

    // Update session data
    await this.sessionRepository.update(sessionId, updateDto);

    // Update provider settings if needed
    if (updateDto.settings || updateDto.securitySettings) {
      await this.updateProviderSettings(session, updateDto);
    }

    // Clear cache
    await this.cacheService.del(`video_session:${sessionId}`);

    this.eventEmitter.emit('video.session.updated', {
      sessionId,
      changes: updateDto,
      timestamp: new Date(),
    });

    return this.getSessionById(sessionId);
  }

  async startSession(sessionId: string, hostId: string): Promise<VideoSession> {
    const session = await this.getSessionById(sessionId);

    if (session.hostId !== hostId) {
      throw new BadRequestException('Only the host can start the session');
    }

    if (session.status !== VideoSessionStatus.SCHEDULED) {
      throw new BadRequestException('Session is not in scheduled status');
    }

    // Start the session with provider
    await this.startProviderSession(session);

    // Update session status
    await this.sessionRepository.update(sessionId, {
      status: VideoSessionStatus.LIVE,
      actualStart: new Date(),
    });

    // Start attendance tracking
    await this.attendanceService.startTracking(sessionId);

    // Clear cache
    await this.cacheService.del(`video_session:${sessionId}`);

    this.eventEmitter.emit('video.session.started', {
      sessionId,
      hostId,
      timestamp: new Date(),
    });

    // Notify participants
    await this.notifyParticipants(sessionId, 'session_started');

    return this.getSessionById(sessionId);
  }

  async endSession(sessionId: string, hostId: string): Promise<VideoSession> {
    const session = await this.getSessionById(sessionId);

    if (session.hostId !== hostId) {
      throw new BadRequestException('Only the host can end the session');
    }

    if (session.status !== VideoSessionStatus.LIVE) {
      throw new BadRequestException('Session is not currently live');
    }

    // End the session with provider
    await this.endProviderSession(session);

    // Calculate duration
    const duration = session.actualStart
      ? Math.floor((Date.now() - session.actualStart.getTime()) / 1000)
      : 0;

    // Update session status
    await this.sessionRepository.update(sessionId, {
      status: VideoSessionStatus.COMPLETED,
      actualEnd: new Date(),
    });

    // End attendance tracking
    await this.attendanceService.endTracking(sessionId);

    // Update all participants
    await this.participantRepository.update(
      { sessionId, connectionStatus: ParticipantConnectionStatus.CONNECTED },
      {
        connectionStatus: ParticipantConnectionStatus.DISCONNECTED,
        leftAt: new Date(),
        duration: () => `TIMESTAMPDIFF(SECOND, joinedAt, NOW())`,
      },
    );

    // Clear cache
    await this.cacheService.del(`video_session:${sessionId}`);

    this.eventEmitter.emit('video.session.ended', {
      sessionId,
      hostId,
      duration,
      timestamp: new Date(),
    });

    return this.getSessionById(sessionId);
  }

  async joinSession(
    sessionId: string,
    joinDto: JoinSessionDto,
  ): Promise<{
    session: VideoSession;
    participant: VideoParticipant;
    connectionInfo: any;
  }> {
    const session = await this.getSessionById(sessionId);

    // Validate session can be joined
    await this.validateSessionAccess(session, joinDto.userId);

    // Check if user is already a participant
    let participant = await this.participantRepository.findOne({
      where: { sessionId, userId: joinDto.userId },
    });

    if (participant) {
      // Update existing participant
      await this.participantRepository.update(participant.id, {
        connectionStatus: ParticipantConnectionStatus.CONNECTING,
        joinedAt: new Date(),
        displayName: joinDto.displayName,
        deviceInfo: joinDto.deviceInfo,
      });
    } else {
      // Create new participant
      participant = await this.addParticipant(sessionId, joinDto.userId, ParticipantRole.ATTENDEE, {
        displayName: joinDto.displayName,
        deviceInfo: joinDto.deviceInfo,
      });
    }

    // Get connection info from provider
    const connectionInfo = await this.getProviderConnectionInfo(session, participant);

    // Update participant count
    await this.updateParticipantCount(sessionId);

    // Track attendance
    await this.attendanceService.recordJoin(sessionId, joinDto.userId);

    this.eventEmitter.emit('video.participant.joined', {
      sessionId,
      userId: joinDto.userId,
      participantId: participant.id,
      timestamp: new Date(),
    });

    return {
      session,
      participant,
      connectionInfo,
    };
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: {
        sessionId,
        userId,
        connectionStatus: In([
          ParticipantConnectionStatus.CONNECTED,
          ParticipantConnectionStatus.CONNECTING,
        ]),
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found in session');
    }

    // Calculate duration
    const duration = participant.joinedAt
      ? Math.floor((Date.now() - participant.joinedAt.getTime()) / 1000)
      : 0;

    // Update participant status
    await this.participantRepository.update(participant.id, {
      connectionStatus: ParticipantConnectionStatus.DISCONNECTED,
      leftAt: new Date(),
      duration,
    });

    // Update participant count
    await this.updateParticipantCount(sessionId);

    // Track attendance
    await this.attendanceService.recordLeave(sessionId, userId);

    this.eventEmitter.emit('video.participant.left', {
      sessionId,
      userId,
      participantId: participant.id,
      duration,
      timestamp: new Date(),
    });
  }

  async getSessionParticipants(
    sessionId: string,
    includeInactive: boolean = false,
  ): Promise<VideoParticipant[]> {
    const queryBuilder = this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.user', 'user')
      .where('participant.sessionId = :sessionId', { sessionId });

    if (!includeInactive) {
      queryBuilder.andWhere('participant.connectionStatus IN (:...statuses)', {
        statuses: [ParticipantConnectionStatus.CONNECTED, ParticipantConnectionStatus.CONNECTING],
      });
    }

    return queryBuilder.orderBy('participant.joinedAt', 'ASC').getMany();
  }

  async getUserSessions(
    userId: string,
    status?: VideoSessionStatus,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ sessions: VideoSession[]; total: number }> {
    const queryBuilder = this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.session', 'session')
      .leftJoinAndSelect('session.host', 'host')
      .leftJoinAndSelect('session.course', 'course')
      .where('participant.userId = :userId', { userId })
      .orderBy('session.scheduledStart', 'DESC')
      .limit(limit)
      .offset(offset);

    if (status) {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    const [participants, total] = await queryBuilder.getManyAndCount();
    const sessions = participants.map(p => p.session);

    return { sessions, total };
  }

  async getUpcomingSessions(userId: string, limit: number = 10): Promise<VideoSession[]> {
    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    const participants = await this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.session', 'session')
      .leftJoinAndSelect('session.host', 'host')
      .leftJoinAndSelect('session.course', 'course')
      .where('participant.userId = :userId', { userId })
      .andWhere('session.status = :status', { status: VideoSessionStatus.SCHEDULED })
      .andWhere('session.scheduledStart BETWEEN :now AND :oneWeekLater', {
        now,
        oneWeekLater,
      })
      .orderBy('session.scheduledStart', 'ASC')
      .limit(limit)
      .getMany();

    return participants.map(p => p.session);
  }

  async searchSessions(
    query: string,
    filters: {
      hostId?: string;
      courseId?: string;
      sessionType?: VideoSessionType;
      status?: VideoSessionStatus;
      provider?: VideoProvider;
      startDate?: Date;
      endDate?: Date;
    } = {},
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ sessions: VideoSession[]; total: number }> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.host', 'host')
      .leftJoinAndSelect('session.course', 'course')
      .where(
        '(LOWER(session.title) LIKE LOWER(:query) OR LOWER(session.description) LIKE LOWER(:query))',
        {
          query: `%${query}%`,
        },
      )
      .orderBy('session.scheduledStart', 'DESC')
      .limit(limit)
      .offset(offset);

    // Apply filters
    if (filters.hostId) {
      queryBuilder.andWhere('session.hostId = :hostId', { hostId: filters.hostId });
    }

    if (filters.courseId) {
      queryBuilder.andWhere('session.courseId = :courseId', { courseId: filters.courseId });
    }

    if (filters.sessionType) {
      queryBuilder.andWhere('session.sessionType = :sessionType', {
        sessionType: filters.sessionType,
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('session.status = :status', { status: filters.status });
    }

    if (filters.provider) {
      queryBuilder.andWhere('session.provider = :provider', { provider: filters.provider });
    }

    if (filters.startDate && filters.endDate) {
      queryBuilder.andWhere('session.scheduledStart BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const [sessions, total] = await queryBuilder.getManyAndCount();

    return { sessions, total };
  }

  // Private helper methods
  private async configureProvider(session: VideoSession): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        const zoomMeeting = await this.zoomService.createMeeting({
          topic: session.title,
          startTime: session.scheduledStart,
          duration: Math.floor(
            (session.scheduledEnd.getTime() - session.scheduledStart.getTime()) / (1000 * 60),
          ),
          settings: session.settings,
        });
        session.meetingId = zoomMeeting.id;
        session.meetingUrl = zoomMeeting.joinUrl;
        session.passcode = zoomMeeting.password;
        break;

      case VideoProvider.WEBRTC:
        const webrtcRoom = await this.webrtcService.createRoom({
          name: session.title,
          maxParticipants: session.maxParticipants,
          settings: session.settings,
        });
        session.meetingId = webrtcRoom.id;
        session.meetingUrl = webrtcRoom.url;
        break;

      default:
        // For other providers, set basic configuration
        session.meetingId = `session_${session.id}`;
        break;
    }
  }

  private async startProviderSession(session: VideoSession): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        await this.zoomService.startMeeting(session.meetingId!);
        break;

      case VideoProvider.WEBRTC:
        await this.webrtcService.startRoom(session.meetingId!);
        break;

      default:
        // Handle other providers
        break;
    }
  }

  private async endProviderSession(session: VideoSession): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        await this.zoomService.endMeeting(session.meetingId!);
        break;

      case VideoProvider.WEBRTC:
        await this.webrtcService.endRoom(session.meetingId!);
        break;

      default:
        // Handle other providers
        break;
    }
  }

  private async getProviderConnectionInfo(
    session: VideoSession,
    participant: VideoParticipant,
  ): Promise<any> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        return this.zoomService.getJoinInfo(session.meetingId!, participant.userId);

      case VideoProvider.WEBRTC:
        return this.webrtcService.getConnectionInfo(session.meetingId!, participant.userId);

      default:
        return {
          meetingUrl: session.meetingUrl,
          meetingId: session.meetingId,
          passcode: session.passcode,
        };
    }
  }

  private async validateSessionAccess(session: VideoSession, userId: string): Promise<void> {
    // Check if session is accessible
    if (session.status === VideoSessionStatus.CANCELLED) {
      throw new BadRequestException('Session has been cancelled');
    }

    if (session.status === VideoSessionStatus.COMPLETED) {
      throw new BadRequestException('Session has already ended');
    }

    // Check capacity
    if (session.maxParticipants && session.currentParticipants >= session.maxParticipants) {
      throw new BadRequestException('Session is at full capacity');
    }

    // Check if registration is required
    if (session.requiresRegistration) {
      const participant = await this.participantRepository.findOne({
        where: { sessionId: session.id, userId },
      });

      if (!participant) {
        throw new BadRequestException('Registration required for this session');
      }
    }
  }

  private async addParticipant(
    sessionId: string,
    userId: string,
    role: ParticipantRole,
    additionalData: any = {},
  ): Promise<VideoParticipant> {
    const participant = this.participantRepository.create({
      sessionId,
      userId,
      role,
      connectionStatus: ParticipantConnectionStatus.CONNECTING,
      joinedAt: new Date(),
      ...additionalData,
    } as VideoParticipant);

    return this.participantRepository.save(participant);
  }

  private async updateParticipantCount(sessionId: string): Promise<void> {
    const activeCount = await this.participantRepository.count({
      where: {
        sessionId,
        connectionStatus: In([
          ParticipantConnectionStatus.CONNECTED,
          ParticipantConnectionStatus.CONNECTING,
        ]),
      },
    });

    const totalCount = await this.participantRepository.count({
      where: { sessionId },
    });

    await this.sessionRepository.update(sessionId, {
      currentParticipants: activeCount,
      totalParticipants: totalCount,
    });
  }

  private async updateProviderSettings(
    session: VideoSession,
    updateDto: UpdateVideoSessionDto,
  ): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        if (updateDto.settings || updateDto.securitySettings) {
          await this.zoomService.updateMeeting(session.meetingId!, {
            settings: updateDto.settings,
            securitySettings: updateDto.securitySettings,
          });
        }
        break;

      case VideoProvider.WEBRTC:
        if (updateDto.settings) {
          await this.webrtcService.updateRoom(session.meetingId!, updateDto.settings);
        }
        break;

      default:
        // Handle other providers
        break;
    }
  }

  private async scheduleNotifications(session: VideoSession): Promise<void> {
    // Schedule reminder notifications (would use a job queue in real implementation)
    // This is a simplified version

    if (session.scheduledStart) {
      // Get all participants
      const participants = await this.getSessionParticipants(session.id, true);

      for (const participant of participants) {
        // Schedule notifications for 24 hours, 1 hour, and 15 minutes before
        await this.notificationService.scheduleNotification({
          userId: participant.userId,
          type: 'video_session_reminder',
          title: `Upcoming session: ${session.title}`,
          message: `Your video session starts in 24 hours`,
          scheduledFor: new Date(session.scheduledStart.getTime() - 24 * 60 * 60 * 1000),
          data: { sessionId: session.id },
        });
      }
    }
  }

  private async notifyParticipants(sessionId: string, eventType: string): Promise<void> {
    const participants = await this.getSessionParticipants(sessionId, true);

    for (const participant of participants) {
      await this.notificationService.createNotification({
        userId: participant.userId,
        type: `video_session_${eventType}`,
        title: `Session ${eventType.replace('_', ' ')}`,
        message: `The video session has ${eventType.replace('_', ' ')}`,
        data: { sessionId },
      });
    }
  }
}

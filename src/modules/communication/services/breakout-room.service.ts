import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoSession } from '../entities/video-session.entity';
import { VideoParticipant } from '../entities/video-participant.entity';
import { ZoomIntegrationService } from './zoom-integration.service';
import { WebRTCService } from './webrtc.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VideoProvider, ParticipantConnectionStatus } from '@/common/enums/communication.enums';

export interface BreakoutRoom {
  id: string;
  name: string;
  participantIds: string[];
  capacity?: number;
}

@Injectable()
export class BreakoutRoomService {
  private readonly logger = new Logger(BreakoutRoomService.name);

  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepository: Repository<VideoSession>,
    @InjectRepository(VideoParticipant)
    private readonly participantRepository: Repository<VideoParticipant>,
    private readonly zoomService: ZoomIntegrationService,
    private readonly webrtcService: WebRTCService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createBreakoutRooms(
    sessionId: string,
    rooms: BreakoutRoom[],
    autoAssign: boolean = false,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    // Update session breakout room configuration
    const breakoutConfig = {
      enabled: true,
      autoAssign,
      allowParticipantsToChoose: !autoAssign,
      rooms,
    };

    await this.sessionRepository.update(sessionId, {
      breakoutRooms: breakoutConfig,
    });

    // Create breakout rooms with the provider
    await this.createProviderBreakoutRooms(session, rooms);

    // Auto-assign participants if enabled
    if (autoAssign) {
      await this.autoAssignParticipants(sessionId, rooms);
    }

    this.eventEmitter.emit('video.breakout.created', {
      sessionId,
      rooms: rooms.length,
      timestamp: new Date(),
    });

    this.logger.debug(`Created ${rooms.length} breakout rooms for session ${sessionId}`);
  }

  async assignParticipantToRoom(sessionId: string, userId: string, roomId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session?.breakoutRooms?.enabled) {
      throw new BadRequestException('Breakout rooms are not enabled for this session');
    }

    // Find the room
    const room = session.breakoutRooms.rooms.find(r => r.id === roomId);
    if (!room) {
      throw new BadRequestException('Breakout room not found');
    }

    // Check capacity
    if (room.capacity && room.participantIds.length >= room.capacity) {
      throw new BadRequestException('Breakout room is at full capacity');
    }

    // Update participant's breakout room assignment
    await this.participantRepository.update({ sessionId, userId }, { breakoutRoomId: roomId });

    // Update session breakout room data
    const updatedRooms = session.breakoutRooms.rooms.map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          participantIds: [...r.participantIds.filter(id => id !== userId), userId],
        };
      } else {
        return {
          ...r,
          participantIds: r.participantIds.filter(id => id !== userId),
        };
      }
    });

    await this.sessionRepository.update(sessionId, {
      breakoutRooms: {
        ...session.breakoutRooms,
        rooms: updatedRooms,
      },
    });

    this.eventEmitter.emit('video.breakout.assigned', {
      sessionId,
      userId,
      roomId,
      timestamp: new Date(),
    });

    this.logger.debug(`Assigned user ${userId} to breakout room ${roomId}`);
  }

  async removeParticipantFromRoom(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session?.breakoutRooms?.enabled) {
      throw new BadRequestException('Breakout rooms are not enabled for this session');
    }

    // Update participant's breakout room assignment
    await this.participantRepository.update({ sessionId, userId }, { breakoutRoomId: null });

    // Update session breakout room data
    const updatedRooms = session.breakoutRooms.rooms.map(r => ({
      ...r,
      participantIds: r.participantIds.filter(id => id !== userId),
    }));

    await this.sessionRepository.update(sessionId, {
      breakoutRooms: {
        ...session.breakoutRooms,
        rooms: updatedRooms,
      },
    });

    this.eventEmitter.emit('video.breakout.removed', {
      sessionId,
      userId,
      timestamp: new Date(),
    });

    this.logger.debug(`Removed user ${userId} from breakout room`);
  }

  async getBreakoutRooms(sessionId: string): Promise<BreakoutRoom[]> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      select: ['breakoutRooms'],
    });

    return session?.breakoutRooms?.rooms || [];
  }

  async getBreakoutRoomParticipants(
    sessionId: string,
    roomId: string,
  ): Promise<VideoParticipant[]> {
    return this.participantRepository.find({
      where: {
        sessionId,
        breakoutRoomId: roomId,
        connectionStatus: ParticipantConnectionStatus.CONNECTED,
      },
      relations: ['user'],
    });
  }

  async closeBreakoutRooms(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session?.breakoutRooms?.enabled) {
      throw new BadRequestException('Breakout rooms are not enabled for this session');
    }

    // Remove all participants from breakout rooms
    await this.participantRepository.update({ sessionId }, { breakoutRoomId: null });

    // Disable breakout rooms
    await this.sessionRepository.update(sessionId, {
      breakoutRooms: {
        ...session.breakoutRooms,
        enabled: false,
      },
    });

    // Close breakout rooms with provider
    await this.closeProviderBreakoutRooms(session);

    this.eventEmitter.emit('video.breakout.closed', {
      sessionId,
      timestamp: new Date(),
    });

    this.logger.debug(`Closed breakout rooms for session ${sessionId}`);
  }

  private async createProviderBreakoutRooms(
    session: VideoSession,
    rooms: BreakoutRoom[],
  ): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        await this.zoomService.createBreakoutRooms(session.meetingId!, rooms);
        break;

      case VideoProvider.WEBRTC:
        // For WebRTC, we would create separate room instances
        // This is a simplified implementation
        for (const room of rooms) {
          await this.webrtcService.createRoom({
            name: room.name,
            maxParticipants: room.capacity,
          });
        }
        break;

      default:
        // Handle other providers
        break;
    }
  }

  private async closeProviderBreakoutRooms(session: VideoSession): Promise<void> {
    switch (session.provider) {
      case VideoProvider.ZOOM:
        // Zoom handles breakout room closure automatically when meeting ends
        break;

      case VideoProvider.WEBRTC:
        // Close individual WebRTC rooms
        if (session.breakoutRooms?.rooms) {
          for (const room of session.breakoutRooms.rooms) {
            await this.webrtcService.endRoom(room.id);
          }
        }
        break;

      default:
        // Handle other providers
        break;
    }
  }

  private async autoAssignParticipants(sessionId: string, rooms: BreakoutRoom[]): Promise<void> {
    const participants = await this.participantRepository.find({
      where: {
        sessionId,
        connectionStatus: ParticipantConnectionStatus.CONNECTED,
      },
      select: ['userId'],
    });

    // Simple round-robin assignment
    participants.forEach((participant, index) => {
      const roomIndex = index % rooms.length;
      const room = rooms[roomIndex];

      this.assignParticipantToRoom(sessionId, participant.userId, room.id);
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@/cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface WebRTCRoom {
  id: string;
  name: string;
  url: string;
  maxParticipants?: number;
  settings?: any;
}

@Injectable()
export class WebRTCService {
  private readonly logger = new Logger(WebRTCService.name);
  private readonly rooms = new Map<string, WebRTCRoom>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRoom(config: {
    name: string;
    maxParticipants?: number;
    settings?: any;
  }): Promise<WebRTCRoom> {
    const roomId = this.generateRoomId();

    const room: WebRTCRoom = {
      id: roomId,
      name: config.name,
      url: `${process.env.FRONTEND_URL}/video/${roomId}`,
      maxParticipants: config.maxParticipants,
      settings: config.settings,
    };

    this.rooms.set(roomId, room);

    // Cache room data
    await this.cacheService.set(`webrtc_room:${roomId}`, room, 3600); // 1 hour

    this.logger.debug(`WebRTC room created: ${roomId}`);

    return room;
  }

  async updateRoom(roomId: string, settings: any): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.settings = { ...room.settings, ...settings };
      this.rooms.set(roomId, room);

      // Update cache
      await this.cacheService.set(`webrtc_room:${roomId}`, room, 3600);
    }
  }

  async startRoom(roomId: string): Promise<void> {
    // For WebRTC, rooms are essentially always "started" when created
    this.eventEmitter.emit('webrtc.room.started', {
      roomId,
      timestamp: new Date(),
    });
  }

  async endRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      this.rooms.delete(roomId);
      await this.cacheService.del(`webrtc_room:${roomId}`);

      this.eventEmitter.emit('webrtc.room.ended', {
        roomId,
        timestamp: new Date(),
      });
    }
  }

  async getConnectionInfo(roomId: string, userId: string): Promise<any> {
    const room = this.rooms.get(roomId) || (await this.cacheService.get(`webrtc_room:${roomId}`));

    if (!room) {
      throw new Error('Room not found');
    }

    return {
      roomId,
      roomUrl: room.url,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      settings: room.settings,
      userId,
    };
  }

  async getRoom(roomId: string): Promise<WebRTCRoom | null> {
    return this.rooms.get(roomId) || (await this.cacheService.get(`webrtc_room:${roomId}`));
  }

  private generateRoomId(): string {
    return `webrtc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

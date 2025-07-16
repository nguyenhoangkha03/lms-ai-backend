import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from '../entities/chat-room.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(ChatService.name);
  }

  async checkUserAccess(roomId: string, userId: string): Promise<boolean | null> {
    const cacheKey = `room_access:${roomId}:${userId}`;

    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const participant = await this.participantRepository.findOne({
      where: {
        roomId,
        userId,
        isActive: true,
      },
    });

    const hasAccess = !!participant;

    await this.cacheService.set(cacheKey, hasAccess, 300);

    return hasAccess;
  }

  async getActiveRoomsForUser(userId: string): Promise<string[]> {
    const participants = await this.participantRepository.find({
      where: {
        userId,
        isActive: true,
      },
      select: ['roomId'],
    });

    return participants.map(p => p.roomId);
  }

  async getUsersInRoom(roomId: string): Promise<string[]> {
    const participants = await this.participantRepository.find({
      where: {
        roomId,
        isActive: true,
      },
      select: ['userId'],
    });

    return participants.map(p => p.userId);
  }

  async broadcastToRoom(roomId: string, event: string, data: any): Promise<void> {
    this.eventEmitter.emit('chat.broadcast', {
      roomId,
      event,
      data,
      timestamp: new Date(),
    });
  }

  async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    this.eventEmitter.emit('chat.user_broadcast', {
      userId,
      event,
      data,
      timestamp: new Date(),
    });
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    await this.roomRepository.update(roomId, {
      lastActivityAt: new Date(),
    });

    await this.cacheService.del(`room_info:${roomId}`);
  }

  async getRoomStats(roomId: string): Promise<{
    totalMessages: number;
    activeUsers: number;
    totalParticipants: number;
  }> {
    const cacheKey = `room_stats:${roomId}`;

    const cached = await this.cacheService.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const [messageCount, participantCount, activeParticipants] = await Promise.all([
      this.roomRepository
        .createQueryBuilder('room')
        .leftJoin('room.messages', 'message')
        .where('room.id = :roomId', { roomId })
        .andWhere('message.deletedAt IS NULL')
        .getCount(),

      this.participantRepository.count({
        where: { roomId },
      }),

      this.participantRepository.count({
        where: {
          roomId,
          isActive: true,
        },
      }),
    ]);

    const stats = {
      totalMessages: messageCount,
      activeUsers: activeParticipants,
      totalParticipants: participantCount,
    };

    await this.cacheService.set(cacheKey, stats, 600);

    return stats;
  }

  async getRecentActivity(userId: string, limit: number = 10): Promise<any[]> {
    const recentRooms = await this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.room', 'room')
      .leftJoinAndSelect('room.messages', 'message', 'message.createdAt >= :since', {
        since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      })
      .where('participant.userId = :userId', { userId })
      .andWhere('participant.isActive = true')
      .orderBy('participant.lastSeenAt', 'DESC')
      .limit(limit)
      .getMany();

    return recentRooms.map(participant => ({
      roomId: participant.roomId,
      roomName: participant.room.name,
      lastActivity: participant.lastSeenAt,
      unreadCount: 0,
    }));
  }
}

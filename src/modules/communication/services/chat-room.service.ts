import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatRoom } from '../entities/chat-room.entity';
import { ChatParticipant } from '../entities/chat-participant.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { CreateRoomDto, UpdateRoomDto } from '../dto/chat.dto';
import { CacheService } from '@/cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ParticipantRole } from '@/common/enums/communication.enums';

@Injectable()
export class ChatRoomService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly roomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(ChatMessage)
    private readonly _messageRepository: Repository<ChatMessage>,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createRoom(createRoomDto: CreateRoomDto & { createdBy: string }): Promise<ChatRoom> {
    const room = this.roomRepository.create({
      ...createRoomDto,
      participantCount: 1,
      isActive: true,
    });

    const savedRoom = await this.roomRepository.save(room);

    await this.addParticipant(savedRoom.id, createRoomDto.createdBy, 'admin');

    this.eventEmitter.emit('room.created', {
      roomId: savedRoom.id,
      createdBy: createRoomDto.createdBy,
      timestamp: new Date(),
    });

    return this.getRoomWithParticipants(savedRoom.id);
  }

  async getRoomWithParticipants(roomId: string): Promise<ChatRoom> {
    const cacheKey = `room_info:${roomId}`;

    const cached = await this.cacheService.get<ChatRoom>(cacheKey);
    if (cached) {
      return cached;
    }

    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['creator', 'course', 'lesson', 'participants', 'participants.user'],
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    await this.cacheService.set(cacheKey, room, 300);

    return room;
  }

  async updateRoom(roomId: string, updateRoomDto: UpdateRoomDto): Promise<ChatRoom> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    await this.roomRepository.update(roomId, updateRoomDto);

    await this.cacheService.del(`room_info:${roomId}`);

    return this.getRoomWithParticipants(roomId);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    await this.roomRepository.softDelete(roomId);

    await this.cacheService.del(`room_info:${roomId}`);

    this.eventEmitter.emit('room.deleted', {
      roomId,
      timestamp: new Date(),
    });
  }

  async joinRoom(
    roomId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER,
  ): Promise<void> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (!room.canAcceptNewMembers) {
      throw new BadRequestException('Room cannot accept new members');
    }

    const existingParticipant = await this.participantRepository.findOne({
      where: { roomId, userId },
    });

    if (existingParticipant) {
      if (existingParticipant.isActive) {
        throw new BadRequestException('User is already in the room');
      } else {
        await this.participantRepository.update(existingParticipant.id, {
          isActive: true,
          joinedAt: new Date(),
          role,
        });
      }
    } else {
      await this.addParticipant(roomId, userId, role);
    }

    await this.updateParticipantCount(roomId);

    await this.cacheService.del(`room_access:${roomId}:${userId}`);
    await this.cacheService.del(`room_info:${roomId}`);

    this.eventEmitter.emit('room.user_joined', {
      roomId,
      userId,
      role,
      timestamp: new Date(),
    });
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { roomId, userId, isActive: true },
    });

    if (!participant) {
      throw new NotFoundException('User is not in the room');
    }

    await this.participantRepository.update(participant.id, {
      isActive: false,
      leftAt: new Date(),
    });

    await this.updateParticipantCount(roomId);

    await this.cacheService.del(`room_access:${roomId}:${userId}`);
    await this.cacheService.del(`room_info:${roomId}`);

    this.eventEmitter.emit('room.user_left', {
      roomId,
      userId,
      timestamp: new Date(),
    });
  }

  async inviteUsers(
    roomId: string,
    userIds: string[],
    role: ParticipantRole = ParticipantRole.MEMBER,
  ): Promise<void> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    for (const userId of userIds) {
      try {
        await this.joinRoom(roomId, userId, role);
      } catch (error) {
        console.warn(`Failed to invite user ${userId}: ${error.message}`);
      }
    }

    this.eventEmitter.emit('room.invites_sent', {
      roomId,
      userIds,
      role,
      timestamp: new Date(),
    });
  }

  async getRoomParticipants(
    roomId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ participants: ChatParticipant[]; total: number }> {
    const [participants, total] = await this.participantRepository.findAndCount({
      where: {
        roomId,
        isActive: true,
      },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { participants, total };
  }

  async updateParticipantRole(
    roomId: string,
    userId: string,
    role: ParticipantRole,
  ): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { roomId, userId, isActive: true },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    await this.participantRepository.update(participant.id, { role });

    await this.cacheService.del(`room_info:${roomId}`);

    this.eventEmitter.emit('room.role_updated', {
      roomId,
      userId,
      newRole: role,
      timestamp: new Date(),
    });
  }

  async removeParticipant(roomId: string, userId: string): Promise<void> {
    await this.leaveRoom(roomId, userId);
  }

  async getUserRooms(
    userId: string,
    type?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ rooms: ChatRoom[]; total: number }> {
    const queryBuilder = this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.room', 'room')
      .leftJoinAndSelect('room.course', 'course')
      .leftJoinAndSelect('room.lesson', 'lesson')
      .where('participant.userId = :userId', { userId })
      .andWhere('participant.isActive = true')
      .andWhere('room.deletedAt IS NULL')
      .orderBy('participant.lastSeenAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (type) {
      queryBuilder.andWhere('room.type = :type', { type });
    }

    const [participants, total] = await queryBuilder.getManyAndCount();
    const rooms = participants.map(p => p.room);

    return { rooms, total };
  }

  async searchPublicRooms(
    query: string,
    type?: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ rooms: ChatRoom[]; total: number }> {
    const queryBuilder = this.roomRepository
      .createQueryBuilder('room')
      .where('room.isPrivate = false')
      .andWhere('room.isActive = true')
      .andWhere('room.deletedAt IS NULL')
      .andWhere(
        '(LOWER(room.name) LIKE LOWER(:query) OR LOWER(room.description) LIKE LOWER(:query))',
        {
          query: `%${query}%`,
        },
      )
      .orderBy('room.participantCount', 'DESC')
      .limit(limit)
      .offset(offset);

    if (type) {
      queryBuilder.andWhere('room.type = :type', { type });
    }

    const [rooms, total] = await queryBuilder.getManyAndCount();

    return { rooms, total };
  }

  async checkUserAccess(roomId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: {
        roomId,
        userId,
        isActive: true,
      },
    });

    return !!participant;
  }

  async isModerator(roomId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: {
        roomId,
        userId,
        isActive: true,
        role: In(['moderator', 'admin', 'owner']),
      },
    });

    return !!participant;
  }

  async isRoomOwner(roomId: string, userId: string): Promise<boolean> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId, createdBy: userId },
    });

    return !!room;
  }

  async updateLastMessage(roomId: string, message: ChatMessage): Promise<void> {
    await this.roomRepository.update(roomId, {
      lastMessage: message.content.substring(0, 100),
      lastMessageAt: message.createdAt,
      lastMessageBy: message.senderId,
      lastActivityAt: new Date(),
    });

    await this.cacheService.del(`room_info:${roomId}`);
  }

  // Private helper methods
  private async addParticipant(
    roomId: string,
    userId: string,
    role: string,
  ): Promise<ChatParticipant> {
    const participant = this.participantRepository.create({
      roomId,
      userId,
      role,
      isActive: true,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    } as ChatParticipant);

    return this.participantRepository.save(participant);
  }

  private async updateParticipantCount(roomId: string): Promise<void> {
    const count = await this.participantRepository.count({
      where: { roomId, isActive: true },
    });

    await this.roomRepository.update(roomId, { participantCount: count });
  }
}

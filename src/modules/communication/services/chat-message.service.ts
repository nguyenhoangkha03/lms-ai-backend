import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatMessageThread } from '../entities/chat-message-thread.entity';
import { ChatMessageReaction } from '../entities/chat-message-reaction.entity';
import { ChatFile } from '../entities/chat-file.entity';
import { SendMessageDto, CreateThreadDto } from '../dto/chat.dto';
import { CacheService } from '@/cache/cache.service';

@Injectable()
export class ChatMessageService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatMessageThread)
    private readonly threadRepository: Repository<ChatMessageThread>,
    @InjectRepository(ChatMessageReaction)
    private readonly reactionRepository: Repository<ChatMessageReaction>,
    @InjectRepository(ChatFile)
    private readonly fileRepository: Repository<ChatFile>,
    private readonly cacheService: CacheService,
  ) {}

  async createMessage(createMessageDto: SendMessageDto): Promise<ChatMessage> {
    const message = this.messageRepository.create({
      ...createMessageDto,
      mentions: this.extractMentions(createMessageDto.content),
    });

    const savedMessage = await this.messageRepository.save(message);

    // If this is a reply, update parent message reply count
    if (createMessageDto.parentMessageId) {
      await this.incrementReplyCount(createMessageDto.parentMessageId);
    }

    // If this is in a thread, update thread reply count
    if (createMessageDto.threadId) {
      await this.updateThreadLastReply(createMessageDto.threadId, savedMessage);
    }

    // Clear cache for room messages
    await this.cacheService.del(`room_messages:${createMessageDto.roomId}`);

    return this.findById(savedMessage.id);
  }

  async findById(id: string): Promise<ChatMessage> {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: [
        'sender',
        'room',
        'parentMessage',
        'replies',
        'files',
        'reactions',
        'reactions.user',
      ],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async getRecentMessages(
    roomId: string,
    limit: number = 50,
    before?: Date,
  ): Promise<ChatMessage[]> {
    const cacheKey = `room_messages:${roomId}:${limit}:${before?.getTime() || 'latest'}`;

    // Try to get from cache
    const cached = await this.cacheService.get<ChatMessage[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.files', 'files')
      .leftJoinAndSelect('message.reactions', 'reactions')
      .leftJoinAndSelect('reactions.user', 'reactionUser')
      .where('message.roomId = :roomId', { roomId })
      .andWhere('message.deletedAt IS NULL')
      .orderBy('message.createdAt', 'DESC')
      .limit(limit);

    if (before) {
      queryBuilder.andWhere('message.createdAt < :before', { before });
    }

    const messages = await queryBuilder.getMany();

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, messages, 300);

    return messages.reverse(); // Return in chronological order
  }

  async getThreadMessages(
    threadId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const [messages, total] = await this.messageRepository.findAndCount({
      where: {
        threadId,
        deletedAt: null,
      },
      relations: ['sender', 'files', 'reactions', 'reactions.user'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    } as any);

    return { messages, total };
  }

  async editMessage(messageId: string, newContent: string): Promise<ChatMessage> {
    const message = await this.findById(messageId);

    // Store edit history
    const editHistory = message.editHistory ? JSON.parse(message.editHistory) : [];
    editHistory.push({
      content: message.content,
      editedAt: new Date(),
    });

    await this.messageRepository.update(messageId, {
      content: newContent,
      isEdited: true,
      editedAt: new Date(),
      editHistory: JSON.stringify(editHistory),
      mentions: this.extractMentions(newContent),
    });

    // Clear cache
    await this.cacheService.del(`room_messages:${message.roomId}`);

    return this.findById(messageId);
  }

  async deleteMessage(messageId: string): Promise<void> {
    const message = await this.findById(messageId);

    await this.messageRepository.softDelete(messageId);

    // Update parent message reply count if this was a reply
    if (message.parentMessageId) {
      await this.decrementReplyCount(message.parentMessageId);
    }

    // Clear cache
    await this.cacheService.del(`room_messages:${message.roomId}`);
  }

  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<ChatMessageReaction> {
    // Check if reaction already exists
    const existingReaction = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji },
    });

    if (existingReaction) {
      // Toggle reaction
      if (existingReaction.isActive) {
        await this.reactionRepository.update(existingReaction.id, { isActive: false });
        await this.decrementReactionCount(messageId);
      } else {
        await this.reactionRepository.update(existingReaction.id, { isActive: true });
        await this.incrementReactionCount(messageId);
      }
      return existingReaction;
    }

    // Create new reaction
    const reaction = this.reactionRepository.create({
      messageId,
      userId,
      emoji,
      isActive: true,
    });

    const savedReaction = await this.reactionRepository.save(reaction);
    await this.incrementReactionCount(messageId);

    return savedReaction;
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const reaction = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji, isActive: true },
    });

    if (reaction) {
      await this.reactionRepository.update(reaction.id, { isActive: false });
      await this.decrementReactionCount(messageId);
    }
  }

  async createThread(createThreadDto: CreateThreadDto): Promise<ChatMessageThread> {
    const thread = this.threadRepository.create(createThreadDto);
    return this.threadRepository.save(thread);
  }

  async markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
    const messages = await this.messageRepository.find({
      where: { id: In(messageIds) },
      select: ['id', 'readBy'],
    });

    for (const message of messages) {
      const readBy = message.readBy || [];
      const existingRead = readBy.find(r => r.userId === userId);

      if (!existingRead) {
        readBy.push({ userId, readAt: new Date() });
        await this.messageRepository.update(message.id, { readBy });
      }
    }
  }

  async searchMessages(
    roomId: string,
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.files', 'files')
      .where('message.roomId = :roomId', { roomId })
      .andWhere('message.deletedAt IS NULL')
      .andWhere('LOWER(message.content) LIKE LOWER(:query)', { query: `%${query}%` })
      .orderBy('message.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    const [messages, total] = await queryBuilder.getManyAndCount();

    return { messages, total };
  }

  async getPinnedMessages(roomId: string): Promise<ChatMessage[]> {
    return this.messageRepository.find({
      where: {
        roomId,
        isPinned: true,
        deletedAt: null,
      },
      relations: ['sender', 'files'],
      order: { pinnedAt: 'DESC' },
    } as any);
  }

  async pinMessage(messageId: string, userId: string): Promise<ChatMessage> {
    await this.messageRepository.update(messageId, {
      isPinned: true,
      pinnedAt: new Date(),
      pinnedBy: userId,
    });

    return this.findById(messageId);
  }

  async unpinMessage(messageId: string): Promise<ChatMessage> {
    await this.messageRepository.update(messageId, {
      isPinned: false,
      pinnedAt: null,
      pinnedBy: null,
    });

    return this.findById(messageId);
  }

  // Private helper methods
  private extractMentions(content: string): any {
    const mentions: any = {
      users: [],
      roles: [],
      everyone: false,
      here: false,
    };

    // Extract @user mentions
    const userMentions = content.match(/@(\w+)/g);
    if (userMentions) {
      mentions.users = userMentions.map(mention => mention.slice(1));
    }

    // Check for @everyone and @here
    mentions.everyone = content.includes('@everyone');
    mentions.here = content.includes('@here');

    return mentions;
  }

  private async incrementReplyCount(messageId: string): Promise<void> {
    await this.messageRepository.increment({ id: messageId }, 'replyCount', 1);
  }

  private async decrementReplyCount(messageId: string): Promise<void> {
    await this.messageRepository.decrement({ id: messageId }, 'replyCount', 1);
  }

  private async incrementReactionCount(messageId: string): Promise<void> {
    await this.messageRepository.increment({ id: messageId }, 'reactionCount', 1);
  }

  private async decrementReactionCount(messageId: string): Promise<void> {
    await this.messageRepository.decrement({ id: messageId }, 'reactionCount', 1);
  }

  private async updateThreadLastReply(threadId: string, message: ChatMessage): Promise<void> {
    await this.threadRepository.update(threadId, {
      lastReplyAt: message.createdAt,
      lastReplyBy: message.senderId,
      replyCount: () => 'replyCount + 1',
    });
  }
}

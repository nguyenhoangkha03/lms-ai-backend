import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../services/chat.service';
import { ChatRoomService } from '../services/chat-room.service';
import { ChatMessageService } from '../services/chat-message.service';
import { ChatModerationService } from '../services/chat-moderation.service';
import { ChatFileService } from '../services/chat-file.service';
import { WsJwtGuard } from '@/modules/auth/guards/ws-jwt.guard';
import {
  SendMessageDto,
  JoinRoomDto,
  LeaveRoomDto,
  TypingIndicatorDto,
  MessageReactionDto,
  EditMessageDto,
  DeleteMessageDto,
  CreateThreadDto,
  FileUploadDto,
} from '../dto/chat.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
  activeRooms?: Set<string>;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  // Track online users and typing indicators
  private onlineUsers: Map<string, Set<string>> = new Map(); // userId -> roomIds
  private typingUsers: Map<string, Map<string, NodeJS.Timeout>> = new Map(); // roomId -> userId -> timeout

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly chatRoomService: ChatRoomService,
    private readonly chatMessageService: ChatMessageService,
    private readonly chatModerationService: ChatModerationService,
    private readonly chatFileService: ChatFileService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Client attempted to connect without token');
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      client.userId = payload.sub;
      client.role = payload.role;
      client.activeRooms = new Set();

      this.logger.log(`User ${client.userId} connected to chat`);

      // Initialize user online status
      if (!this.onlineUsers.has(client.userId!)) {
        this.onlineUsers.set(client.userId!, new Set());
      }

      // Send connection confirmation
      client.emit('connected', {
        userId: client.userId,
        timestamp: new Date(),
        onlineUsers: this.getOnlineUsersCount(),
      });

      // Broadcast user online status to relevant rooms
      await this.broadcastUserStatus(client.userId!, 'online');
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    this.logger.log(`User ${client.userId} disconnected from chat`);

    // Clean up typing indicators
    this.cleanupTypingIndicators(client.userId);

    // Remove from active rooms
    if (client.activeRooms) {
      for (const roomId of client.activeRooms) {
        await client.leave(roomId);
        await this.broadcastRoomUpdate(roomId, {
          type: 'user_left',
          userId: client.userId,
          timestamp: new Date(),
        });
      }
    }

    // Remove from online users
    this.onlineUsers.delete(client.userId);

    // Broadcast user offline status
    await this.broadcastUserStatus(client.userId, 'offline');
  }

  @SubscribeMessage('join_room')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleJoinRoom(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { roomId } = data;

      // Check if user has access to room
      const hasAccess = await this.chatRoomService.checkUserAccess(roomId, client.userId!);
      if (!hasAccess) {
        client.emit('error', {
          message: 'Access denied to chat room',
          roomId,
        });
        return;
      }

      // Join socket room
      await client.join(roomId);
      client.activeRooms?.add(roomId);

      // Update online users for this room
      const userRooms = this.onlineUsers.get(client.userId!) || new Set();
      userRooms.add(roomId);
      this.onlineUsers.set(client.userId!, userRooms);

      // Get room info and recent messages
      const roomInfo = await this.chatRoomService.getRoomWithParticipants(roomId);
      const recentMessages = await this.chatMessageService.getRecentMessages(roomId, 50);

      // Send room joined confirmation
      client.emit('room_joined', {
        roomId,
        roomInfo,
        recentMessages,
        onlineUsers: await this.getRoomOnlineUsers(roomId),
        timestamp: new Date(),
      });

      // Broadcast to room that user joined
      client.to(roomId).emit('user_joined_room', {
        roomId,
        userId: client.userId,
        timestamp: new Date(),
      });

      this.logger.debug(`User ${client.userId} joined room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join room',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('leave_room')
  @UseGuards(WsJwtGuard)
  async handleLeaveRoom(
    @MessageBody() data: LeaveRoomDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { roomId } = data;

      // Leave socket room
      await client.leave(roomId);
      client.activeRooms?.delete(roomId);

      // Update online users
      const userRooms = this.onlineUsers.get(client.userId!);
      if (userRooms) {
        userRooms.delete(roomId);
      }

      // Clean up typing indicator for this room
      this.stopTyping(roomId, client.userId!);

      // Broadcast to room that user left
      client.to(roomId).emit('user_left_room', {
        roomId,
        userId: client.userId,
        timestamp: new Date(),
      });

      client.emit('room_left', { roomId, timestamp: new Date() });

      this.logger.debug(`User ${client.userId} left room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error leaving room: ${error.message}`);
      client.emit('error', {
        message: 'Failed to leave room',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('send_message')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Check if user is in the room
      if (!client.activeRooms?.has(data.roomId)) {
        client.emit('error', {
          message: 'You must join the room first',
          roomId: data.roomId,
        });
        return;
      }

      // Check moderation before sending
      const moderationResult = await this.chatModerationService.checkMessage(
        data.content,
        data.roomId,
        client.userId!,
      );

      if (moderationResult.blocked) {
        client.emit('message_blocked', {
          reason: moderationResult.reason,
          severity: moderationResult.severity,
          timestamp: new Date(),
        });
        return;
      }

      // Create message
      const message = await this.chatMessageService.createMessage({
        ...data,
        senderId: client.userId,
      });

      // Stop typing indicator
      this.stopTyping(data.roomId, client.userId!);

      // Broadcast message to room
      this.server.to(data.roomId).emit('new_message', {
        message,
        timestamp: new Date(),
      });

      // Send delivery confirmation to sender
      client.emit('message_sent', {
        tempId: data.tempId,
        messageId: message.id,
        timestamp: new Date(),
      });

      // Update room's last message info
      await this.chatRoomService.updateLastMessage(data.roomId, message);

      this.logger.debug(`Message sent in room ${data.roomId} by user ${client.userId}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('error', {
        message: 'Failed to send message',
        error: error.message,
        tempId: data.tempId,
      });
    }
  }

  @SubscribeMessage('edit_message')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleEditMessage(
    @MessageBody() data: EditMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Check if user owns the message
      const message = await this.chatMessageService.findById(data.messageId);
      if (!message || message.senderId !== client.userId) {
        client.emit('error', {
          message: 'Cannot edit this message',
        });
        return;
      }

      // Check moderation for edited content
      const moderationResult = await this.chatModerationService.checkMessage(
        data.content,
        message.roomId,
        client.userId,
      );

      if (moderationResult.blocked) {
        client.emit('message_blocked', {
          reason: moderationResult.reason,
          messageId: data.messageId,
          timestamp: new Date(),
        });
        return;
      }

      // Update message
      const updatedMessage = await this.chatMessageService.editMessage(
        data.messageId,
        data.content,
      );

      // Broadcast edit to room
      this.server.to(message.roomId).emit('message_edited', {
        message: updatedMessage,
        timestamp: new Date(),
      });

      this.logger.debug(`Message ${data.messageId} edited by user ${client.userId}`);
    } catch (error) {
      this.logger.error(`Error editing message: ${error.message}`);
      client.emit('error', {
        message: 'Failed to edit message',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('delete_message')
  @UseGuards(WsJwtGuard)
  async handleDeleteMessage(
    @MessageBody() data: DeleteMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const message = await this.chatMessageService.findById(data.messageId);
      if (!message) {
        client.emit('error', { message: 'Message not found' });
        return;
      }

      // Check permissions (owner or moderator)
      const canDelete =
        message.senderId === client.userId ||
        (await this.chatRoomService.isModerator(message.roomId, client.userId!));

      if (!canDelete) {
        client.emit('error', { message: 'Cannot delete this message' });
        return;
      }

      // Delete message
      await this.chatMessageService.deleteMessage(data.messageId);

      // Broadcast deletion to room
      this.server.to(message.roomId).emit('message_deleted', {
        messageId: data.messageId,
        deletedBy: client.userId,
        timestamp: new Date(),
      });

      this.logger.debug(`Message ${data.messageId} deleted by user ${client.userId}`);
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
      client.emit('error', {
        message: 'Failed to delete message',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('typing_start')
  @UseGuards(WsJwtGuard)
  async handleTypingStart(
    @MessageBody() data: TypingIndicatorDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { roomId } = data;

      if (!client.activeRooms?.has(roomId)) {
        return;
      }

      this.startTyping(roomId, client.userId!);

      // Broadcast typing indicator to room (except sender)
      client.to(roomId).emit('user_typing', {
        roomId,
        userId: client.userId,
        isTyping: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error handling typing start: ${error.message}`);
    }
  }

  @SubscribeMessage('typing_stop')
  @UseGuards(WsJwtGuard)
  async handleTypingStop(
    @MessageBody() data: TypingIndicatorDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const { roomId } = data;

      this.stopTyping(roomId, client.userId!);

      // Broadcast stop typing to room
      client.to(roomId).emit('user_typing', {
        roomId,
        userId: client.userId,
        isTyping: false,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error handling typing stop: ${error.message}`);
    }
  }

  @SubscribeMessage('add_reaction')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleAddReaction(
    @MessageBody() data: MessageReactionDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const reaction = await this.chatMessageService.addReaction(
        data.messageId,
        client.userId!,
        data.emoji,
      );

      const message = await this.chatMessageService.findById(data.messageId);

      // Broadcast reaction to room
      this.server.to(message.roomId).emit('reaction_added', {
        messageId: data.messageId,
        reaction,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error adding reaction: ${error.message}`);
      client.emit('error', {
        message: 'Failed to add reaction',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('remove_reaction')
  @UseGuards(WsJwtGuard)
  async handleRemoveReaction(
    @MessageBody() data: MessageReactionDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      await this.chatMessageService.removeReaction(data.messageId, client.userId!, data.emoji);

      const message = await this.chatMessageService.findById(data.messageId);

      // Broadcast reaction removal to room
      this.server.to(message.roomId).emit('reaction_removed', {
        messageId: data.messageId,
        userId: client.userId,
        emoji: data.emoji,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error removing reaction: ${error.message}`);
      client.emit('error', {
        message: 'Failed to remove reaction',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('create_thread')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleCreateThread(
    @MessageBody() data: CreateThreadDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const thread = await this.chatMessageService.createThread({
        ...data,
        createdBy: client.userId!,
      });

      const message = await this.chatMessageService.findById(data.parentMessageId);

      // Broadcast thread creation to room
      this.server.to(message.roomId).emit('thread_created', {
        thread,
        parentMessageId: data.parentMessageId,
        timestamp: new Date(),
      });

      client.emit('thread_created_success', {
        threadId: thread.id,
        parentMessageId: data.parentMessageId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error creating thread: ${error.message}`);
      client.emit('error', {
        message: 'Failed to create thread',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('upload_file')
  @UseGuards(WsJwtGuard)
  async handleFileUpload(
    @MessageBody() data: FileUploadDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Check room access
      if (!client.activeRooms?.has(data.roomId)) {
        client.emit('error', {
          message: 'You must join the room first',
          roomId: data.roomId,
        });
        return;
      }

      // Process file upload
      const fileInfo = await this.chatFileService.processFileUpload(
        data.file,
        data.roomId,
        client.userId!,
      );

      // Send upload progress/completion
      client.emit('file_upload_progress', {
        fileId: fileInfo?.id,
        status: fileInfo?.status,
        progress: 100,
        timestamp: new Date(),
      });

      // If this is part of a message, create the message
      if (data.messageContent) {
        const message = await this.chatMessageService.createMessage({
          roomId: data.roomId,
          senderId: client.userId,
          content: data.messageContent,
          type: 'file',
          fileIds: [fileInfo!.id!],
        });

        // Broadcast file message to room
        this.server.to(data.roomId).emit('new_message', {
          message,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      client.emit('error', {
        message: 'Failed to upload file',
        error: error.message,
      });
    }
  }

  @SubscribeMessage('mark_messages_read')
  @UseGuards(WsJwtGuard)
  async handleMarkMessagesRead(
    @MessageBody() data: { roomId: string; messageIds: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      await this.chatMessageService.markMessagesAsRead(data.messageIds, client.userId!);

      // Broadcast read receipts to room
      client.to(data.roomId).emit('messages_read', {
        roomId: data.roomId,
        messageIds: data.messageIds,
        userId: client.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error marking messages as read: ${error.message}`);
    }
  }

  // Private helper methods
  private startTyping(roomId: string, userId: string): void {
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Map());
    }

    const roomTyping = this.typingUsers.get(roomId);

    // Clear existing timeout
    if (roomTyping?.has(userId)) {
      clearTimeout(roomTyping.get(userId));
    }

    // Set new timeout (stop typing after 3 seconds of inactivity)
    const timeout = setTimeout(() => {
      this.stopTyping(roomId, userId);

      // Broadcast stop typing
      this.server.to(roomId).emit('user_typing', {
        roomId,
        userId,
        isTyping: false,
        timestamp: new Date(),
      });
    }, 3000);

    roomTyping?.set(userId, timeout);
  }

  private stopTyping(roomId: string, userId: string): void {
    const roomTyping = this.typingUsers.get(roomId);
    if (roomTyping?.has(userId)) {
      clearTimeout(roomTyping.get(userId));
      roomTyping.delete(userId);
    }
  }

  private cleanupTypingIndicators(userId: string): void {
    for (const [roomId, roomTyping] of this.typingUsers.entries()) {
      if (roomTyping.has(userId)) {
        clearTimeout(roomTyping.get(userId));
        roomTyping.delete(userId);

        // Broadcast stop typing
        this.server.to(roomId).emit('user_typing', {
          roomId,
          userId,
          isTyping: false,
          timestamp: new Date(),
        });
      }
    }
  }

  private async getRoomOnlineUsers(roomId: string): Promise<string[]> {
    const onlineInRoom: string[] = [];

    for (const [userId, userRooms] of this.onlineUsers.entries()) {
      if (userRooms.has(roomId)) {
        onlineInRoom.push(userId);
      }
    }

    return onlineInRoom;
  }

  private getOnlineUsersCount(): number {
    return this.onlineUsers.size;
  }

  private async broadcastUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
    const userRooms = this.onlineUsers.get(userId);
    if (userRooms) {
      for (const roomId of userRooms) {
        this.server.to(roomId).emit('user_status_changed', {
          userId,
          status,
          timestamp: new Date(),
        });
      }
    }
  }

  private async broadcastRoomUpdate(roomId: string, update: any): Promise<void> {
    this.server.to(roomId).emit('room_updated', update);
  }
}

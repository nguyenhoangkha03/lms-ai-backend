import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { NotificationService } from '@/modules/notification/services/notification.service';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds

  constructor(private notificationService: NotificationService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove socket from user mapping
    for (const [userId, socketIds] of this.userSockets.entries()) {
      const index = socketIds.indexOf(client.id);
      if (index > -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSockets.delete(userId);
        }
        break;
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @CurrentUser() user: UserPayload) {
    const userId = user.sub;

    // Add socket to user mapping
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(client.id);

    // Join user to their personal room
    client.join(`user:${userId}`);

    // Send unread count
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    client.emit('unread-count', { count: unreadCount });

    this.logger.log(`User ${userId} joined with socket ${client.id}`);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
    @CurrentUser() user: UserPayload,
  ) {
    try {
      await this.notificationService.markAsRead(data.notificationId, user.sub);

      // Broadcast updated unread count
      const unreadCount = await this.notificationService.getUnreadCount(user.sub);
      this.server.to(`user:${user.sub}`).emit('unread-count', { count: unreadCount });

      client.emit('mark-read-success', { notificationId: data.notificationId });
    } catch (error) {
      client.emit('mark-read-error', { error: error.message });
    }
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('get-notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() query: any,
    @CurrentUser() user: UserPayload,
  ) {
    try {
      const notifications = await this.notificationService.findAllForUser(user.sub, query);
      client.emit('notifications', notifications);
    } catch (error) {
      client.emit('notifications-error', { error: error.message });
    }
  }

  // Method to send real-time notifications
  async sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new-notification', notification);

    // Update unread count
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('unread-count', { count: unreadCount });
  }

  // Method to broadcast system announcements
  async broadcastAnnouncement(announcement: any) {
    this.server.emit('system-announcement', announcement);
  }

  // Method to send notifications to specific user groups
  async sendToGroup(groupId: string, notification: any) {
    this.server.to(`group:${groupId}`).emit('group-notification', notification);
  }
}

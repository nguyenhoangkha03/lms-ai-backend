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
import { RealtimeEventService } from '../services/realtime-event.service';
import { UserPresenceService } from '../services/user-presence.service';
import { ActivityFeedService } from '../services/activity-feed.service';
import { PushNotificationService } from '../../notification/services/push-notification.service';
import { WsJwtGuard } from '@/modules/auth/guards/ws-jwt.guard';
import { EventType, EventScope } from '../entities/realtime-event.entity';
import { PresenceStatus, ActivityStatus } from '../entities/user-presence.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
  subscribedChannels?: Set<string>;
}

interface SubscribeChannelDto {
  channel: string;
  filters?: {
    eventTypes?: EventType[];
    priority?: number[];
    tags?: string[];
  };
}

interface UpdatePresenceDto {
  status: PresenceStatus;
  activityStatus?: ActivityStatus;
  statusMessage?: string;
  currentCourseId?: string;
  currentLessonId?: string;
}

interface TrackActivityDto {
  activityType: string;
  courseId?: string;
  lessonId?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  // Track active connections and subscriptions
  private activeConnections = new Map<string, Set<string>>(); // userId -> socketIds
  private channelSubscriptions = new Map<string, Set<string>>(); // channel -> socketIds
  private userChannels = new Map<string, Set<string>>(); // socketId -> channels

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeEventService: RealtimeEventService,
    private readonly userPresenceService: UserPresenceService,
    private readonly activityFeedService: ActivityFeedService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Real-time WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn('Real-time client attempted to connect without token');
        client.emit('auth_error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      client.userId = payload.sub;
      client.role = payload.role;
      client.subscribedChannels = new Set();

      // Track connection
      if (!this.activeConnections.has(client.userId!)) {
        this.activeConnections.set(client.userId!, new Set());
      }
      this.activeConnections.get(client.userId!)!.add(client.id);

      // Update user presence
      await this.userPresenceService.updatePresence(client.userId!, {
        status: PresenceStatus.ONLINE,
        isOnline: true,
        onlineAt: new Date(),
        lastSeenAt: new Date(),
        deviceInfo: this.extractDeviceInfo(client),
        locationInfo: this.extractLocationInfo(client),
      });

      // Auto-subscribe to user's personal channel
      const personalChannel = `user:${client.userId}`;
      client.join(personalChannel);
      client.subscribedChannels.add(personalChannel);
      this.addChannelSubscription(personalChannel, client.id);

      this.logger.log(`Real-time client connected: ${client.userId} (${client.id})`);

      // Send connection confirmation
      client.emit('connected', {
        userId: client.userId,
        timestamp: new Date(),
        channels: [personalChannel],
      });

      // Broadcast user online status to relevant channels
      await this.broadcastUserStatusChange(client.userId!, PresenceStatus.ONLINE);
    } catch (error) {
      this.logger.error(`Real-time connection error: ${error.message}`);
      client.emit('auth_error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.userId) return;

    this.logger.log(`Real-time client disconnected: ${client.userId} (${client.id})`);

    // Remove from active connections
    const userConnections = this.activeConnections.get(client.userId);
    if (userConnections) {
      userConnections.delete(client.id);
      if (userConnections.size === 0) {
        this.activeConnections.delete(client.userId);

        // User is completely offline
        await this.userPresenceService.updatePresence(client.userId, {
          status: PresenceStatus.OFFLINE,
          isOnline: false,
          lastSeenAt: new Date(),
        });

        // Broadcast user offline status
        await this.broadcastUserStatusChange(client.userId, PresenceStatus.OFFLINE);
      }
    }

    // Clean up channel subscriptions
    const userChannels = this.userChannels.get(client.id);
    if (userChannels) {
      userChannels.forEach(channel => {
        this.removeChannelSubscription(channel, client.id);
      });
      this.userChannels.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe_channel')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleSubscribeChannel(
    @MessageBody() data: SubscribeChannelDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Validate channel access
      const hasAccess = await this.validateChannelAccess(client.userId!, data.channel);
      if (!hasAccess) {
        client.emit('subscription_error', {
          channel: data.channel,
          message: 'Access denied to channel',
        });
        return;
      }

      // Subscribe to channel
      client.join(data.channel);
      client.subscribedChannels!.add(data.channel);
      this.addChannelSubscription(data.channel, client.id);

      this.logger.log(`User ${client.userId} subscribed to channel: ${data.channel}`);

      client.emit('channel_subscribed', {
        channel: data.channel,
        filters: data.filters,
        timestamp: new Date(),
      });

      // Send recent events in this channel
      const recentEvents = await this.realtimeEventService.getChannelEvents(data.channel, {
        limit: 10,
        filters: data.filters,
      });

      if (recentEvents.length > 0) {
        client.emit('channel_history', {
          channel: data.channel,
          events: recentEvents,
        });
      }
    } catch (error) {
      this.logger.error(`Channel subscription error: ${error.message}`);
      client.emit('subscription_error', {
        channel: data.channel,
        message: 'Failed to subscribe to channel',
      });
    }
  }

  @SubscribeMessage('unsubscribe_channel')
  @UseGuards(WsJwtGuard)
  async handleUnsubscribeChannel(
    @MessageBody() data: { channel: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      client.leave(data.channel);
      client.subscribedChannels!.delete(data.channel);
      this.removeChannelSubscription(data.channel, client.id);

      this.logger.log(`User ${client.userId} unsubscribed from channel: ${data.channel}`);

      client.emit('channel_unsubscribed', {
        channel: data.channel,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Channel unsubscription error: ${error.message}`);
    }
  }

  @SubscribeMessage('update_presence')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleUpdatePresence(
    @MessageBody() data: UpdatePresenceDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      await this.userPresenceService.updatePresence(client.userId!, {
        status: data.status,
        activityStatus: data.activityStatus,
        statusMessage: data.statusMessage,
        currentCourseId: data.currentCourseId,
        currentLessonId: data.currentLessonId,
        lastActivityAt: new Date(),
      });

      // Broadcast presence update
      await this.broadcastUserStatusChange(client.userId!, data.status);

      client.emit('presence_updated', {
        status: data.status,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Presence update error: ${error.message}`);
      client.emit('presence_error', { message: 'Failed to update presence' });
    }
  }

  @SubscribeMessage('track_activity')
  @UseGuards(WsJwtGuard)
  @UsePipes(new ValidationPipe())
  async handleTrackActivity(
    @MessageBody() data: TrackActivityDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Update user presence with current activity
      await this.userPresenceService.updateActivity(client.userId!, {
        activityType: data.activityType,
        courseId: data.courseId,
        lessonId: data.lessonId,
        progress: data.progress,
        metadata: data.metadata,
      });

      // Create activity feed entry if significant
      if (this.isSignificantActivity(data.activityType)) {
        await this.activityFeedService.createActivity({
          userId: client.userId!,
          activityType: data.activityType as any,
          courseId: data.courseId,
          lessonId: data.lessonId,
          activityData: {
            progress: data.progress,
            metadata: data.metadata,
          },
        } as any);
      }

      client.emit('activity_tracked', {
        activityType: data.activityType,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Activity tracking error: ${error.message}`);
    }
  }

  @SubscribeMessage('get_online_users')
  @UseGuards(WsJwtGuard)
  async handleGetOnlineUsers(
    @MessageBody() data: { courseId?: string; groupId?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const onlineUsers = await this.userPresenceService.getOnlineUsers({
        courseId: data.courseId,
        groupId: data.groupId,
        excludeUserId: client.userId,
      });

      client.emit('online_users', {
        users: onlineUsers,
        count: onlineUsers.length,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Get online users error: ${error.message}`);
    }
  }

  @SubscribeMessage('send_live_update')
  @UseGuards(WsJwtGuard)
  async handleSendLiveUpdate(
    @MessageBody()
    data: {
      eventType: EventType;
      scope: EventScope;
      targetId?: string;
      title: string;
      message?: string;
      payload?: any;
    },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      // Create and broadcast live update
      const event = await this.realtimeEventService.createEvent({
        ...data,
        triggeredBy: client.userId!,
      });

      await this.broadcastEvent(event);

      client.emit('live_update_sent', {
        eventId: event.id,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Send live update error: ${error.message}`);
      client.emit('live_update_error', { message: 'Failed to send live update' });
    }
  }

  // Public methods for broadcasting events
  async broadcastEvent(event: any): Promise<void> {
    try {
      const channel = this.getChannelFromEvent(event);

      // Broadcast via WebSocket
      this.server.to(channel).emit('realtime_event', {
        id: event.id,
        eventType: event.eventType,
        scope: event.scope,
        title: event.title,
        message: event.message,
        payload: event.payload,
        actionUrl: event.actionUrl,
        iconUrl: event.iconUrl,
        priority: event.priority,
        triggeredBy: event.triggeredBy,
        timestamp: event.createdAt,
      });

      // Send push notifications if enabled
      if (event.channels?.push) {
        await this.sendPushNotifications(event);
      }

      // Update event delivery status
      await this.realtimeEventService.updateDeliveryStatus(event.id, {
        websocket: { sent: true, timestamp: new Date() },
      });

      this.logger.log(`Event broadcasted: ${event.eventType} to channel: ${channel}`);
    } catch (error) {
      this.logger.error(`Broadcast event error: ${error.message}`);
    }
  }

  async broadcastToUser(userId: string, event: any): Promise<void> {
    const channel = `user:${userId}`;
    this.server.to(channel).emit('realtime_event', event);
  }

  async broadcastToCourse(courseId: string, event: any): Promise<void> {
    const channel = `course:${courseId}`;
    this.server.to(channel).emit('realtime_event', event);
  }

  async broadcastToGroup(groupId: string, event: any): Promise<void> {
    const channel = `group:${groupId}`;
    this.server.to(channel).emit('realtime_event', event);
  }

  async broadcastToRole(role: string, event: any): Promise<void> {
    const channel = `role:${role}`;
    this.server.to(channel).emit('realtime_event', event);
  }

  async broadcastGlobal(event: any): Promise<void> {
    this.server.emit('realtime_event', event);
  }

  // Helper methods
  private async validateChannelAccess(userId: string, channel: string): Promise<boolean> {
    const [type, id] = channel.split(':');

    switch (type) {
      case 'user':
        return id === userId; // Users can only subscribe to their own channel
      case 'course':
        return await this.userPresenceService.isUserInCourse(userId, id);
      case 'group':
        return await this.userPresenceService.isUserInGroup(userId, id);
      case 'role':
        return await this.userPresenceService.hasUserRole(userId, id);
      case 'global':
        return true; // Everyone can subscribe to global channel
      default:
        return false;
    }
  }

  private getChannelFromEvent(event: any): string {
    switch (event.scope) {
      case EventScope.USER:
        return `user:${event.targetId}`;
      case EventScope.COURSE:
        return `course:${event.targetId}`;
      case EventScope.GROUP:
        return `group:${event.targetId}`;
      case EventScope.ROLE:
        return `role:${event.targetId}`;
      case EventScope.GLOBAL:
        return 'global';
      default:
        return 'global';
    }
  }

  private addChannelSubscription(channel: string, socketId: string): void {
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
    }
    this.channelSubscriptions.get(channel)!.add(socketId);

    if (!this.userChannels.has(socketId)) {
      this.userChannels.set(socketId, new Set());
    }
    this.userChannels.get(socketId)!.add(channel);
  }

  private removeChannelSubscription(channel: string, socketId: string): void {
    const channelSubs = this.channelSubscriptions.get(channel);
    if (channelSubs) {
      channelSubs.delete(socketId);
      if (channelSubs.size === 0) {
        this.channelSubscriptions.delete(channel);
      }
    }

    const userChannels = this.userChannels.get(socketId);
    if (userChannels) {
      userChannels.delete(channel);
    }
  }

  private async broadcastUserStatusChange(userId: string, status: PresenceStatus): Promise<void> {
    // Get user's courses and groups to determine where to broadcast
    const userContext = await this.userPresenceService.getUserContext(userId);

    const statusUpdate = {
      userId,
      status,
      timestamp: new Date(),
    };

    // Broadcast to user's courses
    for (const courseId of userContext.courseIds) {
      this.server.to(`course:${courseId}`).emit('user_status_changed', statusUpdate);
    }

    // Broadcast to user's groups
    for (const groupId of userContext.groupIds) {
      this.server.to(`group:${groupId}`).emit('user_status_changed', statusUpdate);
    }
  }

  private extractDeviceInfo(client: AuthenticatedSocket): any {
    const userAgent = client.handshake.headers['user-agent'] || '';

    return {
      userAgent,
      type: this.detectDeviceType(userAgent),
      os: this.detectOS(userAgent),
      browser: this.detectBrowser(userAgent),
    };
  }

  private extractLocationInfo(client: AuthenticatedSocket): any {
    const forwarded = client.handshake.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : client.handshake.address;

    return {
      ip,
      // Additional geolocation would be added here
    };
  }

  private detectDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private detectOS(userAgent: string): string {
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Mac OS/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iOS/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  private detectBrowser(userAgent: string): string {
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  private isSignificantActivity(activityType: string): boolean {
    const significantActivities = [
      'lesson_completed',
      'course_enrolled',
      'assignment_submitted',
      'quiz_completed',
      'certificate_earned',
    ];
    return significantActivities.includes(activityType);
  }

  private async sendPushNotifications(event: any): Promise<void> {
    try {
      // Implementation would send push notifications to relevant users
      // This would integrate with the existing PushNotificationService
      this.logger.log(`Push notifications would be sent for event: ${event.eventType}`);
    } catch (error) {
      this.logger.error(`Push notification error: ${error.message}`);
    }
  }
}

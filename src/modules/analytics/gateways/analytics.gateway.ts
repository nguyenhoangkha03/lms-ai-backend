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
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { RealTimeStreamingService } from '../services/real-time-streaming.service';
import { DataCollectionService } from '../services/data-collection.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
  sessionId?: string;
}

@WebSocketGateway({
  namespace: '/analytics',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AnalyticsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AnalyticsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly realTimeStreamingService: RealTimeStreamingService,
    private readonly dataCollectionService: DataCollectionService,
  ) {}

  afterInit(_server: Server) {
    this.logger.log('Analytics WebSocket Gateway initialized');
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
      client.sessionId = `session_${client.userId}_${Date.now()}`;

      this.logger.log(`Client connected: ${client.userId} (${client.role})`);

      // Join user-specific room
      await client.join(`user_${client.userId}`);
      if (client.role === 'teacher' || client.role === 'admin') {
        await client.join('privileged_users');
      }

      // Send connection confirmation
      client.emit('connected', {
        userId: client.userId,
        sessionId: client.sessionId,
        timestamp: new Date(),
        availableEvents: [
          'activity_tracking',
          'engagement_monitoring',
          'performance_updates',
          'behavior_analysis',
          'real_time_metrics',
        ],
      });

      // Start session tracking
      await this.startSessionTracking(client);
    } catch (error) {
      this.logger.error(`Authentication failed for client: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.logger.log(`Client disconnected: ${client.userId}`);

      // End session tracking
      await this.endSessionTracking(client);

      // Emit disconnect event
      this.eventEmitter.emit('analytics.client.disconnected', {
        userId: client.userId,
        sessionId: client.sessionId,
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('track_activity')
  async handleTrackActivity(
    @MessageBody() data: any,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Ensure the activity belongs to the connected user
      data.studentId = client.userId;
      data.sessionId = client.sessionId;

      const activity = await this.dataCollectionService.trackActivity(data);

      // Send confirmation
      client.emit('activity_tracked', {
        success: true,
        activityId: activity.id,
        timestamp: new Date(),
      });

      // Broadcast to teachers/admins if needed
      if (data.broadcastToTeachers) {
        this.server.to('privileged_users').emit('student_activity', {
          studentId: client.userId,
          activity: activity,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error tracking activity: ${error.message}`);
      client.emit('error', { message: 'Failed to track activity' });
    }
  }

  @SubscribeMessage('track_engagement')
  async handleTrackEngagement(
    @MessageBody() data: any,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      await this.dataCollectionService.trackEngagement(
        client.userId,
        client.sessionId!,
        data.metrics,
      );

      client.emit('engagement_tracked', {
        success: true,
        timestamp: new Date(),
      });

      // Check for low engagement alerts
      if (data.metrics.focusScore < 30) {
        this.server.to('privileged_users').emit('engagement_alert', {
          studentId: client.userId,
          sessionId: client.sessionId,
          metrics: data.metrics,
          severity: 'low_engagement',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(`Error tracking engagement: ${error.message}`);
      client.emit('error', { message: 'Failed to track engagement' });
    }
  }

  @SubscribeMessage('track_performance')
  async handleTrackPerformance(
    @MessageBody() data: any,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      await this.dataCollectionService.trackPerformance(client.userId, data.courseId, data.metrics);

      client.emit('performance_tracked', {
        success: true,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error tracking performance: ${error.message}`);
      client.emit('error', { message: 'Failed to track performance' });
    }
  }

  @SubscribeMessage('get_real_time_metrics')
  async handleGetRealTimeMetrics(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const metrics = await this.dataCollectionService.getRealTimeMetrics(client.userId);

      client.emit('real_time_metrics', {
        success: true,
        data: metrics,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error getting real-time metrics: ${error.message}`);
      client.emit('error', { message: 'Failed to get metrics' });
    }
  }

  @SubscribeMessage('subscribe_to_events')
  async handleSubscribeToEvents(
    @MessageBody() data: { events: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Join event-specific rooms
      for (const eventType of data.events) {
        await client.join(`event_${eventType}`);
      }

      client.emit('subscribed_to_events', {
        success: true,
        events: data.events,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error subscribing to events: ${error.message}`);
      client.emit('error', { message: 'Failed to subscribe to events' });
    }
  }

  @SubscribeMessage('unsubscribe_from_events')
  async handleUnsubscribeFromEvents(
    @MessageBody() data: { events: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Leave event-specific rooms
      for (const eventType of data.events) {
        await client.leave(`event_${eventType}`);
      }

      client.emit('unsubscribed_from_events', {
        success: true,
        events: data.events,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error unsubscribing from events: ${error.message}`);
      client.emit('error', { message: 'Failed to unsubscribe from events' });
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('heartbeat_response', {
      timestamp: new Date(),
      status: 'alive',
    });
  }

  @SubscribeMessage('request_behavior_analysis')
  async handleRequestBehaviorAnalysis(
    @MessageBody() data: { days?: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      if (!client.userId) {
        client.emit('error', { message: 'Not authenticated' });
        return;
      }

      const patterns = await this.dataCollectionService.getUserBehaviorPatterns(
        client.userId,
        data.days || 30,
      );

      client.emit('behavior_analysis', {
        success: true,
        data: patterns,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error getting behavior analysis: ${error.message}`);
      client.emit('error', { message: 'Failed to get behavior analysis' });
    }
  }

  // Admin-only message handlers
  @SubscribeMessage('get_system_metrics')
  async handleGetSystemMetrics(@ConnectedSocket() client: AuthenticatedSocket) {
    try {
      if (!client.userId || client.role !== 'admin') {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const systemMetrics = {
        activeConnections: this.server.sockets.sockets.size,
        totalRooms: this.server.sockets.adapter.rooms.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date(),
      };

      client.emit('system_metrics', {
        success: true,
        data: systemMetrics,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error getting system metrics: ${error.message}`);
      client.emit('error', { message: 'Failed to get system metrics' });
    }
  }

  // Broadcast methods for server-side events
  broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  broadcastToPrivilegedUsers(event: string, data: any) {
    this.server.to('privileged_users').emit(event, data);
  }

  broadcastToEventSubscribers(eventType: string, data: any) {
    this.server.to(`event_${eventType}`).emit('event_update', {
      eventType,
      data,
      timestamp: new Date(),
    });
  }

  // Private helper methods
  private async startSessionTracking(client: AuthenticatedSocket) {
    try {
      await this.dataCollectionService.startSession({
        studentId: client.userId!,
        sessionId: client.sessionId!,
        deviceType: this.extractDeviceType(client.handshake.headers['user-agent']!),
        browser: this.extractBrowser(client.handshake.headers['user-agent']!),
        ipAddress: client.handshake.address,
      });

      this.logger.debug(`Session started for user ${client.userId}`);
    } catch (error) {
      this.logger.error(`Error starting session: ${error.message}`);
    }
  }

  private async endSessionTracking(client: AuthenticatedSocket) {
    if (!client.sessionId) return;

    try {
      await this.dataCollectionService.endSession(client.sessionId, {
        engagementMetrics: {},
        learningOutcomes: {},
        qualityIndicators: {},
      });

      this.logger.debug(`Session ended for user ${client.userId}`);
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`);
    }
  }

  private extractDeviceType(userAgent: string): any {
    if (!userAgent) return 'UNKNOWN';

    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'MOBILE';
    } else if (/Tablet/.test(userAgent)) {
      return 'TABLET';
    } else {
      return 'DESKTOP';
    }
  }

  private extractBrowser(userAgent: string): string {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';

    return 'Unknown';
  }
}

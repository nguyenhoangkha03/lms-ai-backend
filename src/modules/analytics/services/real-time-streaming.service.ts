import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { CacheService } from '@/cache/cache.service';
import { StreamingConfigDto } from '../dto/data-collection.dto';
import { WinstonService } from '@/logger/winston.service';
import { REDIS_CLIENT } from '@/common/constants/redis.constant';

interface StreamingConnection {
  id: string;
  userId: string;
  role: string;
  connectedAt: Date;
  lastActivity: Date;
  subscribedEvents: string[];
}

interface StreamingMetrics {
  totalConnections: number;
  activeConnections: number;
  eventsStreamed: number;
  averageLatency: number;
  errorRate: number;
}

@Injectable()
export class RealTimeStreamingService implements OnModuleInit, OnModuleDestroy {
  private io: Server;
  private connections: Map<string, StreamingConnection> = new Map();
  private streamingConfig: StreamingConfigDto = {
    enabled: true,
    interval: 5000,
    bufferSize: 100,
    events: [
      'activity.tracked',
      'engagement.updated',
      'performance.tracked',
      'session.started',
      'session.ended',
      'behavior.tracked',
    ],
  };
  private metricsBuffer: any[] = [];
  private streamingInterval: NodeJS.Timeout;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(RealTimeStreamingService.name);
    this.logger.log('Real-time Streaming Service initialized');
  }

  async onModuleInit() {
    this.logger.log('Initializing Real-time Streaming Service');
    await this.initializeStreaming();
  }

  async onModuleDestroy() {
    this.logger.log('Destroying Real-time Streaming Service');
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
    }
    if (this.io) {
      this.io.close();
    }
  }

  /**
   * Initialize WebSocket server and streaming
   */
  private async initializeStreaming(): Promise<void> {
    try {
      // Initialize Socket.IO server
      this.io = new Server({
        cors: {
          origin: process.env.FRONTEND_URL || '*',
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
      });

      // Set up connection handlers
      this.io.on('connection', socket => {
        this.handleConnection(socket);
      });

      // Start metrics streaming interval
      this.startMetricsStreaming();

      this.logger.log('Real-time streaming initialized successfully');
    } catch (error) {
      this.logger.error(`Error initializing streaming: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: any): void {
    const connectionId = socket.id;
    const userId = socket.handshake.auth?.userId;
    const role = socket.handshake.auth?.role || 'student';

    if (!userId) {
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    // Create connection record
    const connection: StreamingConnection = {
      id: connectionId,
      userId,
      role,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscribedEvents: [],
    };

    this.connections.set(connectionId, connection);

    this.logger.debug(`User ${userId} connected with role ${role}`);

    // Handle subscription to events
    socket.on('subscribe', (events: string[]) => {
      this.handleSubscription(connectionId, events);
    });

    // Handle unsubscription
    socket.on('unsubscribe', (events: string[]) => {
      this.handleUnsubscription(connectionId, events);
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.lastActivity = new Date();
        socket.emit('pong', { timestamp: new Date() });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(connectionId);
    });

    // Send welcome message
    socket.emit('connected', {
      connectionId,
      timestamp: new Date(),
      supportedEvents: this.streamingConfig.events,
    });
  }

  /**
   * Handle event subscription
   */
  private handleSubscription(connectionId: string, events: string[]): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Filter valid events
    const validEvents = events.filter(event => this.streamingConfig.events?.includes(event));

    // Add to subscription list
    connection.subscribedEvents = [...new Set([...connection.subscribedEvents, ...validEvents])];

    this.logger.debug(`User ${connection.userId} subscribed to: ${validEvents.join(', ')}`);

    // Send confirmation
    const socket = this.io.sockets.sockets.get(connectionId);
    if (socket) {
      socket.emit('subscribed', {
        events: validEvents,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle event unsubscription
   */
  private handleUnsubscription(connectionId: string, events: string[]): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from subscription list
    connection.subscribedEvents = connection.subscribedEvents.filter(
      event => !events.includes(event),
    );

    this.logger.debug(`User ${connection.userId} unsubscribed from: ${events.join(', ')}`);

    // Send confirmation
    const socket = this.io.sockets.sockets.get(connectionId);
    if (socket) {
      socket.emit('unsubscribed', {
        events,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.logger.debug(`User ${connection.userId} disconnected`);
      this.connections.delete(connectionId);
    }
  }

  /**
   * Start metrics streaming interval
   */
  private startMetricsStreaming(): void {
    if (!this.streamingConfig.enabled) return;

    this.streamingInterval = setInterval(async () => {
      await this.streamBufferedMetrics();
    }, this.streamingConfig.interval);
  }

  /**
   * Stream buffered metrics to connected clients
   */
  private async streamBufferedMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Group metrics by event type
    const groupedMetrics = metrics.reduce((acc, metric) => {
      const eventType = metric.eventType || 'general';
      if (!acc[eventType]) acc[eventType] = [];
      acc[eventType].push(metric);
      return acc;
    }, {});

    // Stream to subscribed connections
    for (const [eventType, eventMetrics] of Object.entries(groupedMetrics)) {
      this.streamToSubscribers(eventType, eventMetrics);
    }
  }

  /**
   * Stream data to subscribers of specific event
   */
  private streamToSubscribers(eventType: string, data: any): void {
    const subscribedConnections = Array.from(this.connections.values()).filter(conn =>
      conn.subscribedEvents.includes(eventType),
    );

    subscribedConnections.forEach(connection => {
      const socket = this.io.sockets.sockets.get(connection.id);
      if (socket) {
        socket.emit('stream', {
          eventType,
          data,
          timestamp: new Date(),
        });
      }
    });
  }

  /**
   * Configure streaming settings
   */
  async configureStreaming(config: StreamingConfigDto): Promise<void> {
    this.streamingConfig = { ...this.streamingConfig, ...config };

    // Restart streaming interval if needed
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
    }

    if (config.enabled) {
      this.startMetricsStreaming();
    }

    // Cache configuration
    await this.cacheService.set('streaming_config', this.streamingConfig, 3600);

    this.logger.log('Streaming configuration updated');
  }

  /**
   * Get streaming status
   */
  async getStreamingStatus(): Promise<any> {
    const metrics = this.calculateMetrics();

    return {
      enabled: this.streamingConfig.enabled,
      config: this.streamingConfig,
      connections: {
        total: this.connections.size,
        byRole: this.getConnectionsByRole(),
        active: this.getActiveConnections(),
      },
      metrics,
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  /**
   * Get connection count
   */
  async getConnectionCount(): Promise<number> {
    return this.connections.size;
  }

  /**
   * Event handlers for real-time streaming
   */

  @OnEvent('activity.tracked')
  async handleActivityTracked(payload: any): Promise<void> {
    this.addToBuffer('activity.tracked', {
      type: 'activity_tracked',
      studentId: payload.activity.studentId,
      activityType: payload.activity.activityType,
      courseId: payload.activity.courseId,
      lessonId: payload.activity.lessonId,
      timestamp: payload.timestamp,
      metadata: payload.activity.metadata,
    });
  }

  @OnEvent('engagement.updated')
  async handleEngagementUpdated(payload: any): Promise<void> {
    this.addToBuffer('engagement.updated', {
      type: 'engagement_updated',
      studentId: payload.studentId,
      sessionId: payload.sessionId,
      metrics: payload.metrics,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('engagement.low')
  async handleLowEngagement(payload: any): Promise<void> {
    this.addToBuffer('engagement.low', {
      type: 'engagement_alert',
      severity: 'warning',
      studentId: payload.studentId,
      sessionId: payload.sessionId,
      metrics: payload.metrics,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('performance.tracked')
  async handlePerformanceTracked(payload: any): Promise<void> {
    this.addToBuffer('performance.tracked', {
      type: 'performance_tracked',
      studentId: payload.studentId,
      courseId: payload.courseId,
      metrics: payload.metrics,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('performance.concern')
  async handlePerformanceConcern(payload: any): Promise<void> {
    this.addToBuffer('performance.concern', {
      type: 'performance_alert',
      severity: 'warning',
      studentId: payload.studentId,
      courseId: payload.courseId,
      metrics: payload.metrics,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('session.started')
  async handleSessionStarted(payload: any): Promise<void> {
    this.addToBuffer('session.started', {
      type: 'session_started',
      studentId: payload.session.studentId,
      sessionId: payload.session.sessionId,
      deviceType: payload.session.deviceType,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('session.ended')
  async handleSessionEnded(payload: any): Promise<void> {
    this.addToBuffer('session.ended', {
      type: 'session_ended',
      studentId: payload.session.studentId,
      sessionId: payload.session.sessionId,
      duration: payload.duration,
      timestamp: payload.timestamp,
    });
  }

  /**
   * Private helper methods
   */
  private addToBuffer(eventType: string, data: any): void {
    if (!this.streamingConfig.enabled) return;

    this.metricsBuffer.push({
      eventType,
      ...data,
    });

    // Limit buffer size
    if (this.metricsBuffer.length > this.streamingConfig.bufferSize!) {
      this.metricsBuffer = this.metricsBuffer.slice(-this.streamingConfig.bufferSize!);
    }
  }

  private getConnectionsByRole(): Record<string, number> {
    const roleCount: Record<string, number> = {};

    for (const connection of this.connections.values()) {
      roleCount[connection.role] = (roleCount[connection.role] || 0) + 1;
    }

    return roleCount;
  }

  private getActiveConnections(): number {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return Array.from(this.connections.values()).filter(conn => conn.lastActivity > fiveMinutesAgo)
      .length;
  }

  private calculateMetrics(): StreamingMetrics {
    return {
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnections(),
      eventsStreamed: this.metricsBuffer.length,
      averageLatency: 0, // Placeholder - would need actual measurement
      errorRate: 0, // Placeholder - would need actual measurement
    };
  }
}

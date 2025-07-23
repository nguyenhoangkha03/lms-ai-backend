import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class ProductionMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(ProductionMonitoringService.name);

  // Metrics
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'user_type'],
  });

  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  private readonly databaseConnectionsActive = new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections',
  });

  private readonly redisConnectionsActive = new Gauge({
    name: 'redis_connections_active',
    help: 'Number of active Redis connections',
  });

  private readonly systemResourceUsage = new Gauge({
    name: 'system_resource_usage_percent',
    help: 'System resource usage percentage',
    labelNames: ['resource_type'],
  });

  private readonly businessMetrics = new Counter({
    name: 'business_events_total',
    help: 'Total number of business events',
    labelNames: ['event_type', 'user_type'],
  });

  constructor(
    private configService: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {}

  onModuleInit() {
    if (this.configService.get('ENABLE_METRICS') === 'true') {
      this.setupMetrics();
      this.logger.log('Production monitoring initialized');
    }
  }

  private setupMetrics() {
    register.clear();

    collectDefaultMetrics({
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      eventLoopMonitoringPrecision: 10,
    });

    register.registerMetric(this.httpRequestsTotal);
    register.registerMetric(this.httpRequestDuration);
    register.registerMetric(this.databaseConnectionsActive);
    register.registerMetric(this.redisConnectionsActive);
    register.registerMetric(this.systemResourceUsage);
    register.registerMetric(this.businessMetrics);
  }

  // HTTP Metrics
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    userType: string = 'anonymous',
  ) {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode, user_type: userType });
  }

  recordHttpRequestDuration(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  }

  // Database Metrics
  updateDatabaseConnections(activeConnections: number) {
    this.databaseConnectionsActive.set(activeConnections);
  }

  // Redis Metrics
  updateRedisConnections(activeConnections: number) {
    this.redisConnectionsActive.set(activeConnections);
  }

  // System Resource Metrics
  updateSystemResourceUsage(resourceType: 'cpu' | 'memory' | 'disk', percentage: number) {
    this.systemResourceUsage.set({ resource_type: resourceType }, percentage);
  }

  recordBusinessEvent(eventType: string, userType: string = 'student') {
    this.businessMetrics.inc({ event_type: eventType, user_type: userType });
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
  @Cron(CronExpression.EVERY_30_SECONDS)
  async collectSystemMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      this.updateSystemResourceUsage('memory', memoryUsagePercent);
      const redisInfo = await this.redis.info('clients');
      const connectedClients = this.parseRedisInfo(redisInfo, 'connected_clients');
      this.updateRedisConnections(parseInt(connectedClients, 10) || 0);
    } catch (error) {
      this.logger.error('Failed to collect system metrics:', error.message);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async generateHealthReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
      };

      await this.redis.setex('monitoring:health_report', 300, JSON.stringify(report));
    } catch (error) {
      this.logger.error('Failed to generate health report:', error.message);
    }
  }

  // Alert system
  async sendAlert(
    level: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    details?: any,
  ) {
    const alert = {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      service: 'lms-ai-backend',
    };

    try {
      await this.redis.lpush('monitoring:alerts', JSON.stringify(alert));
      await this.redis.ltrim('monitoring:alerts', 0, 1000);

      if (this.configService.get('SENTRY_DSN')) {
        // Send to Sentry
        // Sentry.captureMessage(message, level);
      }

      // Log locally
      this.logger[level === 'critical' ? 'error' : level](`ALERT [${level}]: ${message}`, details);
    } catch (error) {
      this.logger.error('Failed to send alert:', error.message);
    }
  }

  private parseRedisInfo(info: string, key: string): string {
    const lines = info.split('\r\n');
    const line = lines.find(l => l.startsWith(key));
    return line ? line.split(':')[1] : '0';
  }

  // Performance monitoring
  async trackPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    const performanceData = {
      operation,
      duration,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Store performance data
    await this.redis.lpush('monitoring:performance', JSON.stringify(performanceData));
    await this.redis.ltrim('monitoring:performance', 0, 10000);

    // Alert if performance is degraded
    if (duration > 5000) {
      // 5 seconds
      await this.sendAlert('warning', `Slow operation detected: ${operation}`, {
        duration: `${duration}ms`,
        metadata,
      });
    }
  }
}

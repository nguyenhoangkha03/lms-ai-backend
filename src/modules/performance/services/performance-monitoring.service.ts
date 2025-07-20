import { Injectable } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { WinstonService } from '@/logger/winston.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errorRate: number;
  cacheHitRate: number;
  databaseMetrics: {
    queryTime: number;
    connectionPoolUsage: number;
    slowQueries: number;
  };
  memoryUsage: {
    heap: number;
    external: number;
    rss: number;
  };
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly metricsWindow = 60 * 60 * 1000;
  private readonly cleanupInterval = 24 * 60 * 60 * 1000;

  constructor(
    private readonly redis: RedisService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(PerformanceMonitoringService.name);
  }

  async recordRequestMetrics(data: {
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    userAgent?: string;
    userId?: string;
  }): Promise<void> {
    const timestamp = Date.now();
    const key = `metrics:requests:${timestamp}`;

    await this.redis.hsetMany(key, {
      endpoint: data.endpoint,
      method: data.method,
      responseTime: data.responseTime,
      statusCode: data.statusCode,
      userAgent: data.userAgent || '',
      userId: data.userId || 'anonymous',
      timestamp,
    });

    await this.redis.expire(key, 86400);

    await this.addToTimeSeries('response_times', data.responseTime, timestamp);
    await this.addToTimeSeries('request_count', 1, timestamp);

    if (data.statusCode >= 400) {
      await this.addToTimeSeries('error_count', 1, timestamp);
    }
  }

  async recordQueryMetrics(data: {
    query: string;
    executionTime: number;
    rowsAffected: number;
    cached: boolean;
  }): Promise<void> {
    const timestamp = Date.now();
    const key = `metrics:queries:${timestamp}`;

    await this.redis.hsetMany(key, {
      queryHash: this.hashQuery(data.query),
      executionTime: data.executionTime,
      rowsAffected: data.rowsAffected,
      cached: data.cached ? 1 : 0,
      timestamp,
    });

    await this.redis.expire(key, 86400);

    await this.addToTimeSeries('query_times', data.executionTime, timestamp);

    if (data.executionTime > 1000) {
      await this.recordSlowQuery(data);
    }
  }

  async recordCacheMetrics(operation: 'hit' | 'miss' | 'set', key: string): Promise<void> {
    const timestamp = Date.now();

    await this.addToTimeSeries(`cache_${operation}`, 1, timestamp);

    const keyStatsKey = `cache_stats:${this.hashKey(key)}`;
    await this.redis.hincrby(keyStatsKey, operation, 1);
    await this.redis.expire(keyStatsKey, 86400);
  }

  async getPerformanceMetrics(timeframe: number = this.metricsWindow): Promise<PerformanceMetrics> {
    const now = Date.now();
    const start = now - timeframe;

    const [responseTimes, requestCounts, errorCounts, cacheHits, cacheMisses, queryTimes] =
      await Promise.all([
        this.getTimeSeriesData('response_times', start, now),
        this.getTimeSeriesData('request_count', start, now),
        this.getTimeSeriesData('error_count', start, now),
        this.getTimeSeriesData('cache_hit', start, now),
        this.getTimeSeriesData('cache_miss', start, now),
        this.getTimeSeriesData('query_times', start, now),
      ]);

    const memory = process.memoryUsage();

    return {
      responseTime: this.calculateResponseTimeMetrics(responseTimes),
      throughput: this.calculateThroughputMetrics(requestCounts, timeframe),
      errorRate: this.calculateErrorRate(errorCounts, requestCounts),
      cacheHitRate: this.calculateCacheHitRate(cacheHits, cacheMisses),
      databaseMetrics: {
        queryTime: this.calculateAverage(queryTimes),
        connectionPoolUsage: await this.getConnectionPoolUsage(),
        slowQueries: await this.getSlowQueryCount(),
      },
      memoryUsage: {
        heap: memory.heapUsed,
        external: memory.external,
        rss: memory.rss,
      },
    };
  }

  async getEndpointMetrics(
    endpoint: string,
    timeframe: number = this.metricsWindow,
  ): Promise<{
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
    slowRequestCount: number;
  }> {
    const now = Date.now();
    const start = now - timeframe;

    const pattern = `metrics:requests:*`;
    const keys = await this.redis.keys(pattern);

    const endpointMetrics = {
      requestCount: 0,
      totalResponseTime: 0,
      errorCount: 0,
      slowRequestCount: 0,
    };

    for (const key of keys) {
      const metrics = await this.redis.hgetall(key);
      const timestamp = parseInt(metrics!.timestamp);

      if (timestamp >= start && timestamp <= now && metrics!.endpoint === endpoint) {
        endpointMetrics.requestCount++;
        endpointMetrics.totalResponseTime += parseFloat(metrics!.responseTime);

        if (parseInt(metrics!.statusCode) >= 400) {
          endpointMetrics.errorCount++;
        }

        if (parseFloat(metrics!.responseTime) > 1000) {
          endpointMetrics.slowRequestCount++;
        }
      }
    }

    return {
      requestCount: endpointMetrics.requestCount,
      avgResponseTime:
        endpointMetrics.requestCount > 0
          ? endpointMetrics.totalResponseTime / endpointMetrics.requestCount
          : 0,
      errorRate:
        endpointMetrics.requestCount > 0
          ? (endpointMetrics.errorCount / endpointMetrics.requestCount) * 100
          : 0,
      slowRequestCount: endpointMetrics.slowRequestCount,
    };
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: PerformanceMetrics;
  }> {
    const metrics = await this.getPerformanceMetrics();

    const checks = {
      responseTime: metrics.responseTime.avg < 500,
      errorRate: metrics.errorRate < 5,
      cacheHitRate: metrics.cacheHitRate > 80,
      memoryUsage: metrics.memoryUsage.heap < 1000000000,
      databaseHealth: metrics.databaseMetrics.queryTime < 100,
    };

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks, metrics };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldMetrics(): Promise<void> {
    this.logger.log('Starting metrics cleanup...');

    const cutoff = Date.now() - this.cleanupInterval;
    const patterns = ['metrics:requests:*', 'metrics:queries:*', 'cache_stats:*'];

    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const timestamp = await this.redis.hget(key, 'timestamp');
        if (timestamp && parseInt(timestamp) < cutoff) {
          await this.redis.del(key);
        }
      }
    }

    this.logger.log('Metrics cleanup completed');
  }

  private async addToTimeSeries(metric: string, value: number, timestamp: number): Promise<void> {
    const key = `timeseries:${metric}`;
    await this.redis.zadd(key, timestamp, `${timestamp}:${value}`);

    const cutoff = timestamp - 86400000;
    await this.redis.zremrangebyscore(key, 0, cutoff);
  }

  private async getTimeSeriesData(metric: string, start: number, end: number): Promise<number[]> {
    const key = `timeseries:${metric}`;
    const data = await this.redis.zrangebyscore(key, start, end);

    return data.map(item => {
      const [, value] = item.split(':');
      return parseFloat(value);
    });
  }

  private calculateResponseTimeMetrics(times: number[]): PerformanceMetrics['responseTime'] {
    if (times.length === 0) {
      return { avg: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const sorted = times.sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      avg: sum / times.length,
      p95: sorted[Math.floor(times.length * 0.95)],
      p99: sorted[Math.floor(times.length * 0.99)],
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  }

  private calculateThroughputMetrics(
    counts: number[],
    timeframe: number,
  ): PerformanceMetrics['throughput'] {
    const total = counts.reduce((a, b) => a + b, 0);
    const seconds = timeframe / 1000;
    const minutes = timeframe / 60000;

    return {
      requestsPerSecond: total / seconds,
      requestsPerMinute: total / minutes,
    };
  }

  private calculateErrorRate(errors: number[], requests: number[]): number {
    const totalErrors = errors.reduce((a, b) => a + b, 0);
    const totalRequests = requests.reduce((a, b) => a + b, 0);

    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }

  private calculateCacheHitRate(hits: number[], misses: number[]): number {
    const totalHits = hits.reduce((a, b) => a + b, 0);
    const totalMisses = misses.reduce((a, b) => a + b, 0);
    const totalRequests = totalHits + totalMisses;

    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private async getConnectionPoolUsage(): Promise<number> {
    // This would integrate with your database connection pool
    // For now, return a mock value
    return 75; // 75% usage
  }

  private async getSlowQueryCount(): Promise<number> {
    const pattern = 'slow_queries:*';
    const keys = await this.redis.keys(pattern);
    return keys.length;
  }

  private async recordSlowQuery(data: any): Promise<void> {
    const key = `slow_queries:${Date.now()}`;
    await this.redis.hsetMany(key, {
      queryHash: this.hashQuery(data.query),
      executionTime: data.executionTime,
      timestamp: Date.now(),
    });
    await this.redis.expire(key, 86400);
  }

  private hashQuery(query: string): string {
    return Buffer.from(query).toString('base64').slice(0, 16);
  }

  private hashKey(key: string): string {
    return Buffer.from(key).toString('base64').slice(0, 12);
  }
}

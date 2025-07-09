import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CacheService } from '@/cache/cache.service';
import { RedisService } from '@/redis/redis.service';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class DatabaseHealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly redisService: RedisService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(DatabaseHealthService.name);
  }

  async checkDatabaseHealth() {
    const healthChecks = {
      mysql: await this.checkMySQLHealth(),
      redis: await this.checkRedisHealth(),
      cache: await this.checkCacheHealth(),
    };

    const isHealthy = Object.values(healthChecks).every(check => check.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: healthChecks,
    };
  }

  private async checkMySQLHealth() {
    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      const [processlist] = await this.dataSource.query('SHOW PROCESSLIST');
      const activeConnections = processlist.length;

      const [variables] = await this.dataSource.query(`
        SHOW VARIABLES WHERE Variable_name IN (
          'max_connections',
          'thread_cache_size',
          'table_open_cache'
        )
      `);

      return {
        status: 'healthy',
        responseTime,
        activeConnections,
        configuration: variables.reduce((acc, row) => {
          acc[row.Variable_name] = row.Value;
          return acc;
        }, {}),
      };
    } catch (error) {
      this.logger.error('MySQL health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkRedisHealth() {
    try {
      const startTime = Date.now();
      const result = await this.redisService.ping();
      const responseTime = Date.now() - startTime;

      const info = await this.redisService.info();
      const memoryInfo = this.parseRedisInfo(info, 'memory');
      const clientsInfo = this.parseRedisInfo(info, 'clients');

      return {
        status: result === 'PONG' ? 'healthy' : 'unhealthy',
        responseTime,
        memory: memoryInfo,
        clients: clientsInfo,
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkCacheHealth() {
    try {
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();

      const startTime = Date.now();
      await this.cacheService.set(testKey, testValue, 10);
      const cachedValue = await this.cacheService.get(testKey);
      await this.cacheService.del(testKey);
      const responseTime = Date.now() - startTime;

      return {
        status: cachedValue === testValue ? 'healthy' : 'unhealthy',
        responseTime,
      };
    } catch (error) {
      this.logger.error('Cache health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private parseRedisInfo(info: string, section: string): any {
    const lines = info.split('\r\n');
    const sectionStart = lines.findIndex(
      line => line === `# ${section.charAt(0).toUpperCase() + section.slice(1)}`,
    );

    if (sectionStart === -1) return {};

    const sectionData = {};
    for (let i = sectionStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#') || line === '') break;

      const [key, value] = line.split(':');
      if (key && value) {
        sectionData[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    return sectionData;
  }
}

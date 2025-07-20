import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService } from '@/cache/cache.service';
import { REDIS_CLIENT } from '@/common/constants/redis.constant';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  serialize?: boolean;
  compress?: boolean;
  namespace?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
}

@Injectable()
export class AdvancedCacheService {
  private readonly logger = new Logger(AdvancedCacheService.name);
  private stats: Map<string, CacheStats> = new Map();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  // ==================== MULTI-LEVEL CACHING ====================

  async getMultiLevel<T>(
    key: string,
    levels: ('memory' | 'redis' | 'database')[] = ['memory', 'redis'],
    options?: CacheOptions,
  ): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.namespace);
    const startTime = Date.now();

    try {
      for (const level of levels) {
        let value: T | null = null;

        switch (level) {
          case 'memory':
            value = await this.getFromMemory<T>(fullKey);
            break;
          case 'redis':
            value = await this.getFromRedis<T>(fullKey);
            break;
          case 'database':
            // This would be handled by the caller
            break;
        }

        if (value !== null) {
          // Backfill higher levels
          await this.backfillHigherLevels(fullKey, value, levels, level, options);
          this.recordHit(fullKey, Date.now() - startTime);
          return value;
        }
      }

      this.recordMiss(fullKey, Date.now() - startTime);
      return null;
    } catch (error) {
      this.logger.error(`Multi-level cache get error for key ${fullKey}:`, error.message);
      return null;
    }
  }

  async setMultiLevel<T>(
    key: string,
    value: T,
    levels: ('memory' | 'redis')[] = ['memory', 'redis'],
    options?: CacheOptions,
  ): Promise<void> {
    const fullKey = this.buildKey(key, options?.namespace);

    try {
      const processedValue = await this.processValue(value, options);

      for (const level of levels) {
        switch (level) {
          case 'memory':
            await this.setInMemory(fullKey, processedValue, options?.ttl);
            break;
          case 'redis':
            await this.setInRedis(fullKey, processedValue, options?.ttl);
            break;
        }
      }

      // Handle cache tags
      if (options?.tags) {
        await this.addToTags(fullKey, options.tags);
      }
    } catch (error) {
      this.logger.error(`Multi-level cache set error for key ${fullKey}:`, error.message);
    }
  }

  // ==================== CACHE WARMING ====================

  async warmCache(
    patterns: string[],
    warmupFunction: (key: string) => Promise<any>,
  ): Promise<void> {
    this.logger.log(`Starting cache warming for ${patterns.length} patterns`);

    try {
      const warmupPromises = patterns.map(async pattern => {
        try {
          const data = await warmupFunction(pattern);
          await this.setMultiLevel(pattern, data, ['memory', 'redis'], { ttl: 3600 });
          this.logger.debug(`Warmed cache for pattern: ${pattern}`);
        } catch (error) {
          this.logger.warn(`Failed to warm cache for pattern ${pattern}:`, error.message);
        }
      });

      await Promise.allSettled(warmupPromises);
      this.logger.log('Cache warming completed');
    } catch (error) {
      this.logger.error('Cache warming failed:', error.message);
    }
  }

  // ==================== CACHE INVALIDATION ====================

  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      this.logger.debug(`Invalidating cache by pattern: ${pattern}`);

      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      // Remove from Redis
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();

      // Remove from memory cache
      for (const key of keys) {
        await this.cacheService.del(key);
      }

      this.logger.log(`Invalidated ${keys.length} cache keys for pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Cache invalidation error for pattern ${pattern}:`, error.message);
      return 0;
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalInvalidated = 0;

      for (const tag of tags) {
        const tagKey = `cache:tag:${tag}`;
        const keys = await this.redis.smembers(tagKey);

        if (keys.length > 0) {
          // Remove actual cache entries
          const pipeline = this.redis.pipeline();
          keys.forEach(key => {
            pipeline.del(key);
            pipeline.srem(tagKey, key);
          });
          await pipeline.exec();

          // Remove from memory cache
          for (const key of keys) {
            await this.cacheService.del(key);
          }

          totalInvalidated += keys.length;
        }
      }

      this.logger.log(`Invalidated ${totalInvalidated} cache keys for tags: ${tags.join(', ')}`);
      return totalInvalidated;
    } catch (error) {
      this.logger.error(`Cache invalidation error for tags ${tags.join(', ')}:`, error.message);
      return 0;
    }
  }

  // ==================== CACHE MONITORING ====================

  async getCacheStats(namespace?: string): Promise<Record<string, CacheStats>> {
    const _pattern = namespace ? `${namespace}:*` : '*';
    const statsEntries = Array.from(this.stats.entries()).filter(
      ([key]) => !namespace || key.startsWith(namespace),
    );

    return Object.fromEntries(statsEntries);
  }

  async getCacheInfo(): Promise<any> {
    try {
      const redisInfo = await this.redis.info('memory');
      const redisStats = await this.redis.info('stats');

      return {
        redis: {
          memory: this.parseRedisInfo(redisInfo),
          stats: this.parseRedisInfo(redisStats),
        },
        application: {
          totalStats: this.stats.size,
          overallStats: this.calculateOverallStats(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get cache info:', error.message);
      return {};
    }
  }

  // ==================== CACHE OPTIMIZATION ====================

  async optimizeCache(): Promise<void> {
    try {
      this.logger.log('Starting cache optimization');

      // Clean expired keys
      await this.cleanExpiredKeys();

      // Optimize memory usage
      await this.optimizeMemoryUsage();

      // Defragment Redis if needed
      await this.defragmentRedis();

      this.logger.log('Cache optimization completed');
    } catch (error) {
      this.logger.error('Cache optimization failed:', error.message);
    }
  }

  async cleanExpiredKeys(): Promise<number> {
    try {
      const keys = await this.redis.keys('*');
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -2) {
          // Key doesn't exist
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned ${cleanedCount} expired keys`);
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('Failed to clean expired keys:', error.message);
      return 0;
    }
  }

  // ==================== PRIVATE METHODS ====================

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private async processValue<T>(value: T, options?: CacheOptions): Promise<string> {
    const processedValue = options?.serialize !== false ? JSON.stringify(value) : (value as any);

    if (options?.compress && typeof processedValue === 'string') {
      // Implement compression logic here
      // For now, just return the stringified value
    }

    return processedValue;
  }

  private async getFromMemory<T>(key: string): Promise<T | null> {
    return await this.cacheService.get<T>(key);
  }

  private async getFromRedis<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      return JSON.parse(value);
    } catch (error) {
      this.logger.warn(`Failed to parse Redis value for key ${key}:`, error.message);
      return null;
    }
  }

  private async setInMemory<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheService.set(key, value, ttl);
  }

  private async setInRedis(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  private async backfillHigherLevels<T>(
    key: string,
    value: T,
    levels: string[],
    foundLevel: string,
    options?: CacheOptions,
  ): Promise<void> {
    const foundIndex = levels.indexOf(foundLevel);
    const higherLevels = levels.slice(0, foundIndex);

    for (const level of higherLevels) {
      try {
        switch (level) {
          case 'memory':
            await this.setInMemory(key, value, options?.ttl);
            break;
          case 'redis':
            const processedValue = await this.processValue(value, options);
            await this.setInRedis(key, processedValue, options?.ttl);
            break;
        }
      } catch (error) {
        this.logger.warn(`Failed to backfill ${level} cache for key ${key}:`, error.message);
      }
    }
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const tag of tags) {
      const tagKey = `cache:tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, 86400); // 24 hours
    }

    await pipeline.exec();
  }

  private recordHit(key: string, responseTime: number): void {
    const stats = this.getOrCreateStats(key);
    stats.hits++;
    stats.totalRequests++;
    stats.hitRate = (stats.hits / stats.totalRequests) * 100;
    stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
  }

  private recordMiss(key: string, responseTime: number): void {
    const stats = this.getOrCreateStats(key);
    stats.misses++;
    stats.totalRequests++;
    stats.hitRate = (stats.hits / stats.totalRequests) * 100;
    stats.avgResponseTime = (stats.avgResponseTime + responseTime) / 2;
  }

  private getOrCreateStats(key: string): CacheStats {
    if (!this.stats.has(key)) {
      this.stats.set(key, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
        avgResponseTime: 0,
      });
    }
    return this.stats.get(key)!;
  }

  private calculateOverallStats(): CacheStats {
    const allStats = Array.from(this.stats.values());

    if (allStats.length === 0) {
      return { hits: 0, misses: 0, hitRate: 0, totalRequests: 0, avgResponseTime: 0 };
    }

    const totalHits = allStats.reduce((sum, stats) => sum + stats.hits, 0);
    const totalMisses = allStats.reduce((sum, stats) => sum + stats.misses, 0);
    const totalRequests = totalHits + totalMisses;
    const avgResponseTime =
      allStats.reduce((sum, stats) => sum + stats.avgResponseTime, 0) / allStats.length;

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      totalRequests,
      avgResponseTime,
    };
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }

    return result;
  }

  private async optimizeMemoryUsage(): Promise<void> {
    // Implement memory optimization logic

    const memoryStats = await this.redis.memory('STATS');

    if (memoryStats) {
      this.logger.debug(`Current Redis memory usage: ${memoryStats} bytes`);
    }
  }

  private async defragmentRedis(): Promise<void> {
    try {
      // Check if defragmentation is needed
      const info = await this.redis.info('memory');
      const memoryStats = this.parseRedisInfo(info);

      const fragmentationRatio = memoryStats.mem_fragmentation_ratio || 1;

      if (fragmentationRatio > 1.5) {
        this.logger.log('Starting Redis memory defragmentation');
        // Note: MEMORY PURGE is available in Redis 4.0+
        await this.redis.call('MEMORY', 'PURGE');
        this.logger.log('Redis memory defragmentation completed');
      }
    } catch (error) {
      this.logger.warn('Redis defragmentation failed:', error.message);
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { WinstonLoggerService } from 'common/logger/winston-logger.service';
import Redis from 'ioredis';
// import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(RedisService.name);
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error.message);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error.message);
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.redis.hget(key, field);
    } catch (error) {
      this.logger.error(`Redis HGET error for key ${key}, field ${field}:`, error.message);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      await this.redis.hset(key, field, value);
    } catch (error) {
      this.logger.error(`Redis HSET error for key ${key}, field ${field}:`, error.message);
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(`Redis HGETALL error for key ${key}:`, error.message);
      return null;
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      return await this.redis.lpush(key, ...values);
    } catch (error) {
      this.logger.error(`Redis LPUSH error for key ${key}:`, error.message);
      return 0;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      return await this.redis.rpop(key);
    } catch (error) {
      this.logger.error(`Redis RPOP error for key ${key}:`, error.message);
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Redis EXPIRE error for key ${key}:`, error.message);
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Redis TTL error for key ${key}:`, error.message);
      return -1;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Redis KEYS error for pattern ${pattern}:`, error.message);
      return [];
    }
  }

  async flushdb(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('Redis database flushed');
    } catch (error) {
      this.logger.error('Redis FLUSHDB error:', error.message);
    }
  }

  async ping(): Promise<string> {
    try {
      return await this.redis.ping();
    } catch (error) {
      this.logger.error('Redis PING error:', error.message);
      return 'ERROR';
    }
  }

  async info(): Promise<string> {
    try {
      return await this.redis.info();
    } catch (error) {
      this.logger.error('Redis INFO error:', error.message);
      return '';
    }
  }

  // Pub/Sub methods for real-time features
  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.redis.publish(channel, message);
    } catch (error) {
      this.logger.error(`Redis PUBLISH error for channel ${channel}:`, error.message);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(channel);

      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(message);
        }
      });
    } catch (error) {
      this.logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error.message);
    }
  }

  // Learning analytics specific methods
  async incrementLearningActivity(userId: string, activityType: string): Promise<void> {
    const key = `learning:${userId}:${activityType}`;
    const today = new Date().toISOString().split('T')[0];
    await this.redis.hincrby(key, today, 1);
    await this.redis.expire(key, 86400 * 30); // Keep for 30 days
  }

  async getLearningActivity(
    userId: string,
    activityType: string,
  ): Promise<Record<string, string> | null> {
    const key = `learning:${userId}:${activityType}`;
    return await this.hgetall(key);
  }

  // Session rate limiting
  async isRateLimited(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
    }

    return current > limit;
  }
}

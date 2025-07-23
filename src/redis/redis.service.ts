import { Inject, Injectable } from '@nestjs/common';
import { WinstonService } from '@/logger/winston.service';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/common/constants/redis.constant';
@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly logger: WinstonService,
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

  // HSET user:101 <field1> <value1> <field2> <value2> .
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

  // Trả về một đối tượng (object) hoặc null.
  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(`Redis HGETALL error for key ${key}:`, error.message);
      return null;
    }
  }

  // thêm phần tử vào đầu danh sách: LPUSH key value [value ...]
  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      return await this.redis.lpush(key, ...values);
    } catch (error) {
      this.logger.error(`Redis LPUSH error for key ${key}:`, error.message);
      return 0;
    }
  }

  // Xóa và trả về phần tử cuối cùng của danh sách
  async rpop(key: string): Promise<string | null> {
    try {
      return await this.redis.rpop(key);
    } catch (error) {
      this.logger.error(`Redis RPOP error for key ${key}:`, error.message);
      return null;
    }
  }

  // Kiểm trả key có tồn tại không
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  // Thiết lập ttl cho key
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Redis EXPIRE error for key ${key}:`, error.message);
    }
  }

  // Lấy ttl
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Redis TTL error for key ${key}:`, error.message);
      return -1;
    }
  }

  // Lấy danh sách các key khớp với pattern
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Redis KEYS error for pattern ${pattern}:`, error.message);
      return [];
    }
  }

  // Xóa tất cả dữ liệu trong database hiện tại
  async flushdb(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.log('Redis database flushed');
    } catch (error) {
      this.logger.error('Redis FLUSHDB error:', error.message);
    }
  }

  // Kiểm tra kết nối
  async ping(): Promise<string> {
    try {
      return await this.redis.ping();
    } catch (error) {
      this.logger.error('Redis PING error:', error.message);
      return 'ERROR';
    }
  }

  // Lấy thông tin về Redis
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
      const subscriber = this.redis.duplicate(); // Redis client sau khi subscribe() không thể get, set... nên cần client riêng
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
    // Tăng giá trị của trường trong key
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

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.sadd(key, ...members);
    } catch (error) {
      this.logger.error(`Redis SADD error for key ${key}:`, error.message);
      return 0;
    }
  }

  multi() {
    return this.redis.multi();
  }

  async eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any> {
    try {
      return await this.redis.eval(script, numKeys, ...args);
    } catch (error) {
      this.logger.error('Redis EVAL error:', error.message);
      throw error;
    }
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.zrem(key, ...members);
    } catch (error) {
      this.logger.error(`Redis ZREM error for key ${key}:`, error.message);
      return 0;
    }
  }

  async hsetMany(key: string, data: Record<string, string | number>): Promise<void> {
    try {
      const entries = Object.entries(data).flat(); // Flatten to [key1, val1, key2, val2]
      await this.redis.hset(key, ...entries);
    } catch (error) {
      this.logger.error(`Redis HSET error for key ${key}:`, error.message);
      throw error;
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.redis.zadd(key, score, member);
    } catch (error) {
      this.logger.error(`Redis ZADD error for key ${key}:`, error.message);
      return 0;
    }
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    try {
      return await this.redis.zremrangebyscore(key, min, max);
    } catch (error) {
      this.logger.error(`Redis ZREMRANGEBYSCORE error for key ${key}:`, error.message);
      return 0;
    }
  }

  async zcard(key: string): Promise<number> {
    try {
      return await this.redis.zcard(key);
    } catch (error) {
      this.logger.error(`Redis ZCARD error for key ${key}:`, error.message);
      return 0;
    }
  }

  async zcount(key: string, min: number, max: number): Promise<number> {
    try {
      return await this.redis.zcount(key, min, max);
    } catch (error) {
      this.logger.error(`Redis ZCOUNT error for key ${key}:`, error.message);
      return 0;
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.redis.sismember(key, member);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis SISMEMBER error for key ${key}:`, error.message);
      return false;
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    try {
      return await this.redis.hincrby(key, field, increment);
    } catch (error) {
      this.logger.error(`Redis HINCRBY error for key ${key}, field ${field}:`, error.message);
      return 0;
    }
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    try {
      return await this.redis.zrangebyscore(key, min, max);
    } catch (error) {
      this.logger.error(`Redis ZRANGEBYSCORE error for key ${key}:`, error.message);
      return [];
    }
  }

  async ltrim(key: string, start: number, end: number): Promise<void> {
    try {
      await this.redis.ltrim(key, start, end);
    } catch (error) {
      this.logger.error(`Redis LTRIM error for key ${key}:`, error.message);
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      this.logger.error('Redis FLUSHALL error:', error.message);
    }
  }
}

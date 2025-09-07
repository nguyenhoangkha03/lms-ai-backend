import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CacheService.name);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      this.logger.debug(`Cache GET: ${key} - ${value ? 'HIT' : 'MISS'}`);
      return value || null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error.message);
      return null;
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    const store = this.cacheManager.store as any;
    if (typeof store.keys === 'function') {
      return await store.keys(pattern);
    }
    throw new Error('getKeys is not supported by current cache store');
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await (this.cacheManager as any).set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key} - TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error.message);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error.message);
    }
  }

  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('Cache reset completed');
    } catch (error) {
      this.logger.error('Cache reset error:', error.message);
    }
  }

  async setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<void> {
    await this.set(key, value, ttl);

    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = (await this.get<string[]>(tagKey)) || [];

      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await this.set(tagKey, taggedKeys, ttl);
      }
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    const tagKey = `tag:${tag}`;
    const taggedKeys = (await this.get<string[]>(tagKey)) || [];

    for (const key of taggedKeys) {
      await this.del(key);
    }

    await this.del(tagKey);
    this.logger.log(`Invalidated cache for tag: ${tag} (${taggedKeys.length} keys)`);
  }

  async getUserCache<T>(userId: string, key: string): Promise<T | null> {
    return this.get<T>(`user:${userId}:${key}`);
  }

  async setUserCache<T>(userId: string, key: string, value: T, ttl?: number): Promise<void> {
    await this.set(`user:${userId}:${key}`, value, ttl);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateByTag(`user:${userId}`);
  }

  async getCourseCache<T>(courseId: string, key: string): Promise<T | null> {
    return this.get<T>(`course:${courseId}:${key}`);
  }

  async setCourseCache<T>(courseId: string, key: string, value: T, ttl?: number): Promise<void> {
    await this.set(`course:${courseId}:${key}`, value, ttl);
  }

  async invalidateCourseCache(courseId: string): Promise<void> {
    await this.invalidateByTag(`course:${courseId}`);
  }

  // Session management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession<T>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      await this.setSession(sessionId, sessionData, ttl);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await this.getKeys(pattern);
    for (const key of keys) {
      await this.del(key);
    }
  }

  async flushAll(): Promise<void> {
    await this.cacheManager.reset();
  }
}

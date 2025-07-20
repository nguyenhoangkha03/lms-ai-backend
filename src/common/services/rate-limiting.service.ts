import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { RedisService } from '@/redis/redis.service';
import { WinstonService } from '@/logger/winston.service';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface ThrottleConfig {
  algorithm: 'token-bucket' | 'sliding-window' | 'fixed-window' | 'leaky-bucket';
  capacity: number;
  refillRate: number;
  windowSize: number;
  burstAllowance?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimitingService {
  private readonly defaultConfig: RateLimitConfig;

  constructor(
    private readonly redis: RedisService,
    private readonly logger: WinstonService,
    private readonly _configService: ConfigService,
  ) {
    this.logger.setContext(RateLimitingService.name);

    this.defaultConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
    };
  }

  /**
   * Sliding window rate limiting
   */
  async checkSlidingWindow(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const window = config.windowMs;
    const limit = config.max;

    const pipeline = this.redis.multi();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, now - window);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry
    pipeline.expire(key, Math.ceil(window / 1000));

    const results = await pipeline.exec();
    const count = results![1][1] as number;

    const allowed = count < limit;
    const remaining = Math.max(0, limit - count - 1);
    const resetTime = now + window;

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: count + 1,
      retryAfter: allowed ? undefined : Math.ceil(window / 1000),
    };
  }

  /**
   * Token bucket algorithm
   */
  async checkTokenBucket(key: string, config: ThrottleConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add
      local timePassed = math.max(0, now - lastRefill)
      local tokensToAdd = math.floor(timePassed / 1000 * refillRate)
      tokens = math.min(capacity, tokens + tokensToAdd)
      
      local allowed = tokens >= 1
      
      if allowed then
        tokens = tokens - 1
      end
      
      -- Update bucket
      redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
      redis.call('EXPIRE', key, 3600)
      
      return {allowed and 1 or 0, tokens, capacity}
    `;

    const result = (await this.redis.eval(
      script,
      1,
      key,
      config.capacity.toString(),
      config.refillRate.toString(),
      now.toString(),
    )) as [number, number, number];

    const [allowed, remaining, capacity] = result;

    return {
      allowed: allowed === 1,
      remaining,
      resetTime: now + ((capacity - remaining) / config.refillRate) * 1000,
      totalHits: capacity - remaining,
    };
  }

  /**
   * Leaky bucket algorithm
   */
  async checkLeakyBucket(key: string, config: ThrottleConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local leakRate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      
      local bucket = redis.call('HMGET', key, 'volume', 'lastLeak')
      local volume = tonumber(bucket[1]) or 0
      local lastLeak = tonumber(bucket[2]) or now
      
      -- Calculate leaked volume
      local timePassed = math.max(0, now - lastLeak)
      local volumeToLeak = timePassed / 1000 * leakRate
      volume = math.max(0, volume - volumeToLeak)
      
      local allowed = volume < capacity
      
      if allowed then
        volume = volume + 1
      end
      
      -- Update bucket
      redis.call('HMSET', key, 'volume', volume, 'lastLeak', now)
      redis.call('EXPIRE', key, 3600)
      
      return {allowed and 1 or 0, capacity - volume}
    `;

    const result = (await this.redis.eval(
      script,
      1,
      key,
      config.capacity.toString(),
      config.refillRate.toString(),
      now.toString(),
    )) as [number, number];

    const [allowed, remaining] = result;

    return {
      allowed: allowed === 1,
      remaining,
      resetTime: now + (remaining / config.refillRate) * 1000,
      totalHits: config.capacity - remaining,
    };
  }

  /**
   * Adaptive rate limiting based on system load
   */
  async checkAdaptiveRateLimit(key: string, baseConfig: RateLimitConfig): Promise<RateLimitResult> {
    const systemLoad = await this.getSystemLoad();
    const adaptedConfig = this.adaptConfigToLoad(baseConfig, systemLoad);

    return this.checkSlidingWindow(key, adaptedConfig);
  }

  /**
   * Distributed rate limiting across multiple instances
   */
  async checkDistributedRateLimit(
    key: string,
    config: RateLimitConfig,
    instanceId: string,
  ): Promise<RateLimitResult> {
    const distributedKey = `distributed:${key}`;
    const instanceKey = `${distributedKey}:${instanceId}`;

    // Get current distributed count
    const totalCount = await this.getDistributedCount(distributedKey);

    // Check local limit first
    const localResult = await this.checkSlidingWindow(instanceKey, {
      ...config,
      max: Math.ceil(config.max / (await this.getActiveInstanceCount())),
    });

    if (!localResult.allowed) {
      return localResult;
    }

    // Check global limit
    const globalAllowed = totalCount < config.max;

    if (!globalAllowed) {
      // Revert local increment
      await this.redis.zrem(instanceKey, `${Date.now()}-${Math.random()}`);

      return {
        ...localResult,
        allowed: false,
        retryAfter: Math.ceil(config.windowMs / 1000),
      };
    }

    // Update distributed counter
    await this.updateDistributedCount(distributedKey, config.windowMs);

    return localResult;
  }

  /**
   * Rate limit with different rules for different user types
   */
  async checkTieredRateLimit(
    key: string,
    userTier: 'free' | 'premium' | 'enterprise',
    endpoint: string,
  ): Promise<RateLimitResult> {
    const config = this.getTierConfig(userTier, endpoint);
    return this.checkSlidingWindow(key, config);
  }

  /**
   * Circuit breaker pattern for rate limiting
   */
  async checkWithCircuitBreaker(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const circuitKey = `circuit:${key}`;
    const circuitState = await this.redis.hgetall(circuitKey);

    const now = Date.now();
    const failureThreshold = 10;
    const timeout = 60000; // 1 minute

    // Check circuit breaker state
    if (circuitState!.state === 'open') {
      const lastFailure = parseInt(circuitState!.lastFailure || '0');

      if (now - lastFailure < timeout) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: lastFailure + timeout,
          totalHits: 0,
          retryAfter: Math.ceil((lastFailure + timeout - now) / 1000),
        };
      }

      // Try half-open state
      await this.redis.hset(circuitKey, 'state', 'half-open');
    }

    const result = await this.checkSlidingWindow(key, config);

    // Update circuit breaker
    if (!result.allowed) {
      const failures = parseInt(circuitState!.failures || '0') + 1;

      if (failures >= failureThreshold) {
        await this.redis.hsetMany(circuitKey, {
          state: 'open',
          failures: 0,
          lastFailure: now.toString(),
        });
        await this.redis.expire(circuitKey, Math.ceil(timeout / 1000));
      } else {
        await this.redis.hset(circuitKey, 'failures', failures.toString());
      }
    } else if (circuitState!.state === 'half-open') {
      // Success in half-open state, close circuit
      await this.redis.hsetMany(circuitKey, {
        state: 'closed',
        failures: 0,
      });
    }

    return result;
  }

  /**
   * Generate rate limit key based on multiple factors
   */
  generateRateLimitKey(
    req: Request,
    factors: ('ip' | 'user' | 'endpoint' | 'method')[] = ['ip'],
  ): string {
    const parts: string[] = [];

    if (factors.includes('ip')) {
      parts.push(`ip:${this.getClientIP(req)}`);
    }

    if (factors.includes('user')) {
      const userId = (req as any).user?.id || 'anonymous';
      parts.push(`user:${userId}`);
    }

    if (factors.includes('endpoint')) {
      parts.push(`endpoint:${req.route?.path || req.path}`);
    }

    if (factors.includes('method')) {
      parts.push(`method:${req.method}`);
    }

    return `rate_limit:${parts.join(':')}`;
  }

  // Private helper methods
  private async getSystemLoad(): Promise<number> {
    // This would integrate with system monitoring
    // For now, return a mock value
    return 0.5; // 50% load
  }

  private adaptConfigToLoad(config: RateLimitConfig, load: number): RateLimitConfig {
    const loadFactor = Math.max(0.1, 1 - load);

    return {
      ...config,
      max: Math.floor(config.max * loadFactor),
    };
  }

  private async getDistributedCount(key: string): Promise<number> {
    const pattern = `${key}:*`;
    const keys = await this.redis.keys(pattern);

    let total = 0;
    for (const instanceKey of keys) {
      const count = await this.redis.zcard(instanceKey);
      total += count;
    }

    return total;
  }

  private async getActiveInstanceCount(): Promise<number> {
    // This would be implemented based on your service discovery
    return 3; // Mock value
  }

  private async updateDistributedCount(key: string, windowMs: number): Promise<void> {
    const now = Date.now();
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.zremrangebyscore(key, 0, now - windowMs);
    await this.redis.expire(key, Math.ceil(windowMs / 1000));
  }

  private getTierConfig(tier: string, endpoint: string): RateLimitConfig {
    const tierConfigs = {
      free: { windowMs: 15 * 60 * 1000, max: 100 },
      premium: { windowMs: 15 * 60 * 1000, max: 500 },
      enterprise: { windowMs: 15 * 60 * 1000, max: 2000 },
    };

    const endpointMultipliers = {
      '/api/v1/ai/': 0.2, // AI endpoints more restrictive
      '/api/v1/upload': 0.1, // Upload endpoints very restrictive
      '/api/v1/auth': 2.0, // Auth endpoints less restrictive
    };

    const baseConfig = tierConfigs[tier] || tierConfigs.free;
    const multiplier =
      Object.entries(endpointMultipliers).find(([pattern]) => endpoint.includes(pattern))?.[1] || 1;

    return {
      ...baseConfig,
      max: Math.floor(baseConfig.max * multiplier),
    };
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    )
      .split(',')[0]
      .trim();
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(key: string): Promise<{
    currentCount: number;
    remainingRequests: number;
    resetTime: number;
    hitRate: number;
  }> {
    const now = Date.now();
    const windowMs = this.defaultConfig.windowMs;

    const count = await this.redis.zcard(key);
    const remaining = Math.max(0, this.defaultConfig.max - count);
    const resetTime = now + windowMs;

    // Calculate hit rate over last hour
    const hourAgo = now - 60 * 60 * 1000;
    const hourlyCount = await this.redis.zcount(key, hourAgo, now);
    const hitRate = hourlyCount / (60 * 60); // requests per second

    return {
      currentCount: count,
      remainingRequests: remaining,
      resetTime,
      hitRate,
    };
  }

  /**
   * Clear rate limit for a key
   */
  async clearRateLimit(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Whitelist an IP or user
   */
  async addToWhitelist(identifier: string, type: 'ip' | 'user'): Promise<void> {
    const whitelistKey = `whitelist:${type}`;
    await this.redis.sadd(whitelistKey, identifier);
  }

  /**
   * Check if identifier is whitelisted
   */
  async isWhitelisted(identifier: string, type: 'ip' | 'user'): Promise<boolean> {
    const whitelistKey = `whitelist:${type}`;
    return await this.redis.sismember(whitelistKey, identifier);
  }
}

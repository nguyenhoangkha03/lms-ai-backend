import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@/redis/redis.service';
import { WinstonService } from '@/logger/winston.service';

export const CACHE_CONFIG_KEY = 'cacheConfig';

export interface CacheConfig {
  ttl: number;
  key?: string;
  condition?: (request: Request) => boolean;
  tags?: string[];
  compress?: boolean;
}

@Injectable()
export class CachingInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CachingInterceptor.name);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const cacheConfig = this.reflector.getAllAndOverride<CacheConfig>(CACHE_CONFIG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!cacheConfig || request.method !== 'GET') {
      return next.handle();
    }

    // Check cache condition
    if (cacheConfig.condition && !cacheConfig.condition(request)) {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request, cacheConfig);

    try {
      // Try to get from cache
      const cachedResult = await this.redis.get(cacheKey);

      if (cachedResult) {
        response.setHeader('X-Cache', 'HIT');
        response.setHeader('X-Cache-Key', cacheKey);

        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return of(JSON.parse(cachedResult));
      }

      // Cache miss - execute handler and cache result
      return next.handle().pipe(
        tap(async data => {
          if (data && response.statusCode < 400) {
            const serializedData = JSON.stringify(data);
            await this.redis.set(cacheKey, serializedData, cacheConfig.ttl);

            // Add cache tags for invalidation
            if (cacheConfig.tags) {
              for (const tag of cacheConfig.tags) {
                await this.redis.sadd(`cache_tag:${tag}`, cacheKey);
              }
            }

            response.setHeader('X-Cache', 'MISS');
            response.setHeader('X-Cache-Key', cacheKey);
            this.logger.debug(`Cached result for key: ${cacheKey}`);
          }
        }),
      );
    } catch (error) {
      this.logger.error('Cache error:', error);
      return next.handle();
    }
  }

  private generateCacheKey(request: Request, config: CacheConfig): string {
    if (config.key) {
      return config.key;
    }

    const userId = (request as any).user?.id || 'anonymous';
    const queryString = new URLSearchParams(request.query as any).toString();

    return `cache:${request.path}:${userId}:${queryString}`;
  }
}

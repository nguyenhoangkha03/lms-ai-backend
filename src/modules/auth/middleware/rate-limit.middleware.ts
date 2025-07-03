import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService as CustomCacheService } from '@/cache/cache.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(
    private readonly cacheService: CustomCacheService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip;
    const isAuthEndpoint = req.path.includes('/auth/');

    const ttl = isAuthEndpoint
      ? this.configService.get<number>('auth.rateLimit.authTtl', 300)
      : this.configService.get<number>('auth.rateLimit.ttl', 60);

    const maxRequests = isAuthEndpoint
      ? this.configService.get<number>('auth.rateLimit.authMax', 5)
      : this.configService.get<number>('auth.rateLimit.max', 100);

    const key = `rate_limit:${ip}:${isAuthEndpoint ? 'auth' : 'general'}`;

    const current = await this.cacheService.get(key);
    const requests = current ? parseInt(current as string) : 0;

    if (requests >= maxRequests) {
      throw new HttpException(`Too many requests. Try again in ${ttl} seconds.`, 429);
    }

    await this.cacheService.set(key, (requests + 1).toString(), ttl);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests - 1));
    res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + ttl);

    next();
  }
}

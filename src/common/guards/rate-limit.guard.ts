import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitingService, RateLimitConfig } from '../services/rate-limiting.service';
import { WinstonService } from '@/logger/winston.service';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions extends RateLimitConfig {
  tier?: 'free' | 'premium' | 'enterprise';
  factors?: ('ip' | 'user' | 'endpoint' | 'method')[];
  algorithm?: 'sliding-window' | 'token-bucket' | 'leaky-bucket';
  circuitBreaker?: boolean;
  adaptive?: boolean;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitingService: RateLimitingService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(RateLimitGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get rate limit configuration from decorator
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    // Check if user is whitelisted
    const userId = (request as any).user?.id;
    const clientIP = this.getClientIP(request);

    if (userId && (await this.rateLimitingService.isWhitelisted(userId, 'user'))) {
      return true;
    }

    if (await this.rateLimitingService.isWhitelisted(clientIP, 'ip')) {
      return true;
    }

    // Generate rate limit key
    const key = this.rateLimitingService.generateRateLimitKey(
      request,
      rateLimitOptions.factors || ['ip'],
    );

    let result;

    try {
      // Apply appropriate rate limiting algorithm
      switch (rateLimitOptions.algorithm) {
        case 'token-bucket':
          result = await this.rateLimitingService.checkTokenBucket(key, {
            algorithm: 'token-bucket',
            capacity: rateLimitOptions.max,
            refillRate: rateLimitOptions.max / (rateLimitOptions.windowMs / 1000),
            windowSize: rateLimitOptions.windowMs,
          });
          break;

        case 'leaky-bucket':
          result = await this.rateLimitingService.checkLeakyBucket(key, {
            algorithm: 'leaky-bucket',
            capacity: rateLimitOptions.max,
            refillRate: rateLimitOptions.max / (rateLimitOptions.windowMs / 1000),
            windowSize: rateLimitOptions.windowMs,
          });
          break;

        default:
          if (rateLimitOptions.adaptive) {
            result = await this.rateLimitingService.checkAdaptiveRateLimit(key, rateLimitOptions);
          } else if (rateLimitOptions.circuitBreaker) {
            result = await this.rateLimitingService.checkWithCircuitBreaker(key, rateLimitOptions);
          } else {
            result = await this.rateLimitingService.checkSlidingWindow(key, rateLimitOptions);
          }
      }

      // Set rate limit headers
      this.setRateLimitHeaders(response, result, rateLimitOptions);

      if (!result.allowed) {
        this.logger.warn(`Rate limit exceeded for key: ${key}, {
          ${key},
          ${result.totalHits},
          ${result.remaining},
        }`);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            retryAfter: result.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      return true;
    }
  }

  private setRateLimitHeaders(response: Response, result: any, options: RateLimitOptions): void {
    if (options.standardHeaders !== false) {
      response.setHeader('X-RateLimit-Limit', options.max);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    }

    if (options.legacyHeaders) {
      response.setHeader('X-Rate-Limit-Limit', options.max);
      response.setHeader('X-Rate-Limit-Remaining', result.remaining);
      response.setHeader('X-Rate-Limit-Reset', Math.ceil(result.resetTime / 1000));
    }

    if (result.retryAfter) {
      response.setHeader('Retry-After', result.retryAfter);
    }
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    )
      .split(',')[0]
      .trim();
  }
}

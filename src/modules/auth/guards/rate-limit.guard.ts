import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from '@/cache/cache.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';

export interface RateLimitOptions {
  points: number; // Maximum number of requests
  duration: number; // Time window in seconds
  blockDuration?: number; // Block duration in seconds (default = duration)
  keyGenerator?: string; // Custom key generator method name
  skipIf?: string; // Condition to skip rate limiting
  message?: string; // Custom error message
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate cache key
    const key = await this.generateKey(request, rateLimitOptions);

    // Get current count
    const current = ((await this.cacheService.get(key)) as number) || 0;
    const remaining = Math.max(0, rateLimitOptions.points - current - 1);

    // Set headers
    response.setHeader('X-RateLimit-Limit', rateLimitOptions.points);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader(
      'X-RateLimit-Reset',
      new Date(Date.now() + rateLimitOptions.duration * 1000),
    );

    if (current >= rateLimitOptions.points) {
      const blockDuration = rateLimitOptions.blockDuration || rateLimitOptions.duration;
      const retryAfter = Math.ceil(blockDuration);

      response.setHeader('Retry-After', retryAfter);

      await this.logRateLimitExceeded(request, rateLimitOptions, current);

      throw new HttpException(
        rateLimitOptions.message || 'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    await this.cacheService.set(key, current + 1, rateLimitOptions.duration);

    return true;
  }

  private async generateKey(request: any, options: RateLimitOptions): Promise<string> {
    let identifier: string;

    if (options.keyGenerator) {
      // Custom key generator logic would go here
      identifier = request.ip; // Fallback
    } else {
      // Default: IP + User ID if authenticated
      identifier = request.user?.id ? `user:${request.user.id}` : `ip:${request.ip}`;
    }

    const route = `${request.method}:${request.route?.path || request.url}`;
    return `rate_limit:${route}:${identifier}`;
  }

  private async logRateLimitExceeded(
    request: any,
    options: RateLimitOptions,
    currentCount: number,
  ): Promise<void> {
    const description = `Rate limit exceeded: ${currentCount}/${options.points} requests in ${options.duration}s`;

    await this.auditLogService.createAuditLog({
      userId: request.user?.id,
      sessionId: request.sessionId,
      action: AuditAction.READ,
      description,
      level: AuditLevel.WARNING,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestUrl: request.url,
      httpMethod: request.method,
      context: {
        module: 'security',
        feature: 'rate_limiting',
        rateLimitExceeded: true,
        currentCount,
        limit: options.points,
        duration: options.duration,
      },
      securityInfo: {
        riskScore: 60, // Medium risk for rate limit violation
        threatIndicators: ['rate_limit_exceeded'],
      },
      tags: ['security', 'rate_limit', 'abuse_prevention'],
    });
  }
}

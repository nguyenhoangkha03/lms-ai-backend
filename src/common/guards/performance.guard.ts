import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { WinstonService } from '@/logger/winston.service';
import { RedisService } from '@/redis/redis.service';

export const PERFORMANCE_CONFIG_KEY = 'performanceConfig';

export interface PerformanceConfig {
  maxQueryComplexity?: number;
  maxExecutionTime?: number;
  maxMemoryUsage?: number;
  cacheDuration?: number;
  requireOptimization?: boolean;
}

@Injectable()
export class PerformanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: WinstonService,
    private readonly redis: RedisService,
  ) {
    this.logger.setContext(PerformanceGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const config = this.reflector.getAllAndOverride<PerformanceConfig>(PERFORMANCE_CONFIG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!config) {
      return true;
    }

    // Check query complexity
    if (
      config.maxQueryComplexity &&
      !this.isQueryComplexityValid(request, config.maxQueryComplexity)
    ) {
      throw new HttpException('Query too complex', HttpStatus.BAD_REQUEST);
    }

    // Check for required optimization headers
    if (config.requireOptimization && !this.hasOptimizationHeaders(request)) {
      throw new HttpException('Request must include optimization headers', HttpStatus.BAD_REQUEST);
    }

    // Set up performance monitoring
    (request as any).performanceConfig = config;
    (request as any).startTime = process.hrtime.bigint();

    return true;
  }

  private isQueryComplexityValid(request: Request, maxComplexity: number): boolean {
    const query = request.query;
    let complexity = 0;

    // Calculate query complexity based on various factors
    if (query.include) {
      const includes = Array.isArray(query.include) ? query.include : [query.include];
      complexity += includes.length * 2;
    }

    if (query.sort) {
      complexity += 1;
    }

    if (query.filter) {
      const filters = typeof query.filter === 'object' ? Object.keys(query.filter) : [query.filter];
      complexity += filters.length;
    }

    if (query.limit && parseInt(query.limit as string) > 100) {
      complexity += 3;
    }

    return complexity <= maxComplexity;
  }

  private hasOptimizationHeaders(request: Request): boolean {
    const requiredHeaders = ['accept-encoding', 'if-none-match'];
    return requiredHeaders.some(header => request.headers[header]);
  }
}

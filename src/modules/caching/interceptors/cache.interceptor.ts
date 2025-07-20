import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AdvancedCacheService } from '../services/advanced-cache.service';
import { CACHEABLE_METADATA, CacheableOptions } from '../decorators/cacheable.decorator';
import { CACHE_KEY_METADATA, CacheKeyOptions } from '../decorators/cache-key.decorator';
import * as crypto from 'crypto';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: AdvancedCacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheableOptions = this.reflector.get<CacheableOptions>(
      CACHEABLE_METADATA,
      context.getHandler(),
    );

    if (!cacheableOptions) {
      return next.handle();
    }

    const _request = context.switchToHttp().getRequest();
    const cacheKey = await this.generateCacheKey(context, cacheableOptions);

    // Check cache condition
    if (cacheableOptions.condition) {
      const args = this.extractMethodArgs(context);
      if (!cacheableOptions.condition(args)) {
        return next.handle();
      }
    }

    try {
      // Try to get from cache
      const cachedResult = await this.cacheService.getMultiLevel(
        cacheKey,
        cacheableOptions.levels,
        {
          namespace: cacheableOptions.namespace,
          ttl: cacheableOptions.ttl,
          tags: cacheableOptions.tags,
        },
      );

      if (cachedResult !== null) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return of(cachedResult);
      }

      this.logger.debug(`Cache miss for key: ${cacheKey}`);

      // Execute method and cache result
      return next.handle().pipe(
        tap(async result => {
          // Check unless condition
          if (cacheableOptions.unless && cacheableOptions.unless(result)) {
            return;
          }

          // Cache the result
          await this.cacheService.setMultiLevel(cacheKey, result, cacheableOptions.levels, {
            namespace: cacheableOptions.namespace,
            ttl: cacheableOptions.ttl,
            tags: cacheableOptions.tags,
            serialize: cacheableOptions.serialize,
            compress: cacheableOptions.compress,
          });

          this.logger.debug(`Cached result for key: ${cacheKey}`);
        }),
      );
    } catch (error) {
      this.logger.error(`Cache interceptor error for key ${cacheKey}:`, error.message);
      return next.handle();
    }
  }

  private async generateCacheKey(
    context: ExecutionContext,
    cacheableOptions: CacheableOptions,
  ): Promise<string> {
    const keyOptions = this.reflector.get<CacheKeyOptions>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (cacheableOptions.key) {
      return this.interpolateKey(cacheableOptions.key, context);
    }

    if (keyOptions?.template) {
      return this.interpolateKey(keyOptions.template, context, keyOptions);
    }

    // Generate default key
    return this.generateDefaultKey(context, cacheableOptions);
  }

  private interpolateKey(
    template: string,
    context: ExecutionContext,
    keyOptions?: CacheKeyOptions,
  ): string {
    const request = context.switchToHttp().getRequest();
    const args = this.extractMethodArgs(context);
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    let key = template
      .replace('{class}', className)
      .replace('{method}', methodName)
      .replace('{userId}', request.user?.id || 'anonymous');

    // Replace parameter placeholders
    const paramNames = this.getParameterNames(context.getHandler() as (...args: any[]) => any);
    paramNames.forEach((paramName, index) => {
      if (args[index] !== undefined) {
        const placeholder = `{${paramName}}`;
        if (key.includes(placeholder)) {
          key = key.replace(placeholder, String(args[index]));
        }
      }
    });

    // Apply key options
    if (keyOptions) {
      if (keyOptions.prefix) {
        key = `${keyOptions.prefix}:${key}`;
      }
      if (keyOptions.suffix) {
        key = `${key}:${keyOptions.suffix}`;
      }
      if (keyOptions.hash) {
        key = this.hashKey(key);
      }
    }

    return key;
  }

  private generateDefaultKey(
    context: ExecutionContext,
    cacheableOptions: CacheableOptions,
  ): string {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const args = this.extractMethodArgs(context);
    const request = context.switchToHttp().getRequest();

    const keyParts = [className, methodName];

    // Add user context if available
    if (request.user?.id) {
      keyParts.push(`user:${request.user.id}`);
    }

    // Add method arguments
    if (args.length > 0) {
      const argsString = JSON.stringify(args);
      keyParts.push(this.hashKey(argsString));
    }

    // Add query parameters for GET requests
    if (request.method === 'GET' && Object.keys(request.query).length > 0) {
      const queryString = JSON.stringify(request.query);
      keyParts.push(this.hashKey(queryString));
    }

    let key = keyParts.join(':');

    if (cacheableOptions.namespace) {
      key = `${cacheableOptions.namespace}:${key}`;
    }

    return key;
  }

  private extractMethodArgs(context: ExecutionContext): any[] {
    const _request = context.switchToHttp().getRequest();
    return context.getArgs().slice(1); // Skip request object
  }

  private getParameterNames(func: (...args: any[]) => any): string[] {
    const funcStr = func.toString();
    const match = funcStr.match(/\(([^)]*)\)/);
    if (!match || !match[1]) return [];

    return match[1]
      .split(',')
      .map(param => param.trim().split(' ')[0])
      .filter(param => param && !param.startsWith('@'));
  }

  private hashKey(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex');
  }
}

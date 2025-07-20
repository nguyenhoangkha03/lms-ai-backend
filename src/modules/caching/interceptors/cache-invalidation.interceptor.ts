import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import {
  CACHE_INVALIDATE_METADATA,
  CacheInvalidateOptions,
} from '../decorators/cache-invalidate.decorator';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly invalidationService: CacheInvalidationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const invalidateOptions = this.reflector.get<CacheInvalidateOptions>(
      CACHE_INVALIDATE_METADATA,
      context.getHandler(),
    );

    if (!invalidateOptions) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async result => {
        try {
          // Check invalidation condition
          if (invalidateOptions.condition) {
            const args = this.extractMethodArgs(context);
            if (!invalidateOptions.condition(args)) {
              return;
            }
          }

          const invalidationTask = async () => {
            await this.performInvalidation(context, invalidateOptions, result);
          };

          if (invalidateOptions.async) {
            // Perform invalidation asynchronously
            setImmediate(invalidationTask);
          } else {
            // Perform invalidation synchronously
            await invalidationTask();
          }
        } catch (error) {
          this.logger.error('Cache invalidation failed:', error.message);
        }
      }),
    );
  }

  private async performInvalidation(
    context: ExecutionContext,
    options: CacheInvalidateOptions,
    result: any,
  ): Promise<void> {
    const _request = context.switchToHttp().getRequest();
    const args = this.extractMethodArgs(context);

    // Invalidate by patterns
    if (options.patterns) {
      const interpolatedPatterns = options.patterns.map(pattern =>
        this.interpolatePattern(pattern, context, args, result),
      );
      await this.invalidationService.bulkInvalidation(interpolatedPatterns);
    }

    // Invalidate by tags
    if (options.tags) {
      const interpolatedTags = options.tags.map(tag =>
        this.interpolatePattern(tag, context, args, result),
      );
      await this.invalidationService.invalidateByTags(interpolatedTags);
    }

    // Invalidate by specific keys
    if (options.keys) {
      const interpolatedKeys = options.keys.map(key =>
        this.interpolatePattern(key, context, args, result),
      );
      await this.invalidationService.bulkInvalidation(interpolatedKeys);
    }

    this.logger.debug('Cache invalidation completed for method:', context.getHandler().name);
  }

  private interpolatePattern(
    pattern: string,
    context: ExecutionContext,
    args: any[],
    result: any,
  ): string {
    const request = context.switchToHttp().getRequest();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    let interpolated = pattern
      .replace('{class}', className)
      .replace('{method}', methodName)
      .replace('{userId}', request.user?.id || 'anonymous');

    // Replace parameter placeholders
    const paramNames = this.getParameterNames(context.getHandler() as (...args: any[]) => any);
    paramNames.forEach((paramName, index) => {
      if (args[index] !== undefined) {
        const placeholder = `{${paramName}}`;
        if (interpolated.includes(placeholder)) {
          interpolated = interpolated.replace(placeholder, String(args[index]));
        }
      }
    });

    // Replace result placeholders
    if (result && typeof result === 'object') {
      Object.keys(result).forEach(key => {
        const placeholder = `{result.${key}}`;
        if (interpolated.includes(placeholder)) {
          interpolated = interpolated.replace(placeholder, String(result[key]));
        }
      });
    }

    return interpolated;
  }

  private extractMethodArgs(context: ExecutionContext): any[] {
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
}

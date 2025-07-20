import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SelectQueryBuilder } from 'typeorm';
import { DatabaseCacheService } from '../services/database-cache.service';

@Injectable()
export class QueryCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryCacheInterceptor.name);

  constructor(private readonly databaseCacheService: DatabaseCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Only apply to GET requests by default
    if (request.method !== 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async result => {
        // Check if result contains query builders that can be cached
        if (this.isQueryBuilderResult(result)) {
          await this.handleQueryBuilderCaching(result, context);
        }
      }),
    );
  }

  private isQueryBuilderResult(result: any): boolean {
    return (
      result && typeof result === 'object' && result.constructor?.name === 'SelectQueryBuilder'
    );
  }

  private async handleQueryBuilderCaching(
    queryBuilder: SelectQueryBuilder<any>,
    _context: ExecutionContext,
  ): Promise<void> {
    try {
      const entityMetadata = queryBuilder.expressionMap.mainAlias?.metadata;
      if (!entityMetadata) return;

      const entityName = entityMetadata.name;
      const ttl = this.calculateTTL(entityName);
      const tags = [`entity:${entityName}`, 'database'];

      await this.databaseCacheService.cacheQuery(queryBuilder, {
        ttl,
        tags,
        namespace: 'auto_query',
      });
    } catch (error) {
      this.logger.warn('Auto query caching failed:', error.message);
    }
  }

  private calculateTTL(entityName: string): number {
    // Different TTL based on entity type
    const ttlMap: Record<string, number> = {
      User: 300, // 5 minutes
      Course: 600, // 10 minutes
      Lesson: 900, // 15 minutes
      Category: 3600, // 1 hour (more static)
      SystemSettings: 1800, // 30 minutes
    };

    return ttlMap[entityName] || 300; // Default 5 minutes
  }
}

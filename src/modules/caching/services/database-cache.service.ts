import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { AdvancedCacheService } from './advanced-cache.service';

export interface QueryCacheOptions {
  ttl?: number;
  tags?: string[];
  invalidateOnUpdate?: boolean;
  namespace?: string;
}

@Injectable()
export class DatabaseCacheService {
  private readonly logger = new Logger(DatabaseCacheService.name);

  constructor(private readonly advancedCacheService: AdvancedCacheService) {}

  // ==================== QUERY RESULT CACHING ====================

  async cacheQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options?: QueryCacheOptions,
  ): Promise<T[]> {
    const query = queryBuilder.getQuery();
    const parameters = queryBuilder.getParameters();
    const cacheKey = this.generateQueryCacheKey(query, parameters);

    try {
      // Try to get from cache first
      const cached = await this.advancedCacheService.getMultiLevel<T[]>(
        cacheKey,
        ['memory', 'redis'],
        {
          ttl: options?.ttl || 300,
          tags: options?.tags,
          namespace: options?.namespace || 'db_query',
        },
      );

      if (cached) {
        this.logger.debug(`Cache hit for query: ${cacheKey}`);
        return cached;
      }

      // Execute query if not in cache
      this.logger.debug(`Cache miss for query: ${cacheKey}`);
      const result = await queryBuilder.getMany();

      // Store in cache
      await this.advancedCacheService.setMultiLevel(cacheKey, result, ['memory', 'redis'], {
        ttl: options?.ttl || 300,
        tags: options?.tags,
        namespace: options?.namespace || 'db_query',
      });

      return result;
    } catch (error) {
      this.logger.error(`Query cache error for key ${cacheKey}:`, error.message);
      // Fallback to direct query execution
      return await queryBuilder.getMany();
    }
  }

  async cacheQueryOne<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options?: QueryCacheOptions,
  ): Promise<T | null> {
    const query = queryBuilder.getQuery();
    const parameters = queryBuilder.getParameters();
    const cacheKey = this.generateQueryCacheKey(query, parameters);

    try {
      const cached = await this.advancedCacheService.getMultiLevel<T>(
        cacheKey,
        ['memory', 'redis'],
        {
          ttl: options?.ttl || 300,
          tags: options?.tags,
          namespace: options?.namespace || 'db_query',
        },
      );

      if (cached) {
        return cached;
      }

      const result = await queryBuilder.getOne();

      if (result) {
        await this.advancedCacheService.setMultiLevel(cacheKey, result, ['memory', 'redis'], {
          ttl: options?.ttl || 300,
          tags: options?.tags,
          namespace: options?.namespace || 'db_query',
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Query cache error for key ${cacheKey}:`, error.message);
      return await queryBuilder.getOne();
    }
  }

  // ==================== ENTITY CACHING ====================

  async cacheEntity<T>(
    entity: T,
    entityName: string,
    id: string | number,
    options?: QueryCacheOptions,
  ): Promise<void> {
    const cacheKey = `entity:${entityName}:${id}`;

    try {
      await this.advancedCacheService.setMultiLevel(cacheKey, entity, ['memory', 'redis'], {
        ttl: options?.ttl || 600,
        tags: [`entity:${entityName}`, ...(options?.tags || [])],
        namespace: options?.namespace || 'db_entity',
      });
    } catch (error) {
      this.logger.error(`Entity cache error for ${entityName}:${id}:`, error.message);
    }
  }

  async getCachedEntity<T>(
    entityName: string,
    id: string | number,
    options?: QueryCacheOptions,
  ): Promise<T | null> {
    const cacheKey = `entity:${entityName}:${id}`;

    try {
      return await this.advancedCacheService.getMultiLevel<T>(cacheKey, ['memory', 'redis'], {
        namespace: options?.namespace || 'db_entity',
      });
    } catch (error) {
      this.logger.error(`Entity cache get error for ${entityName}:${id}:`, error.message);
      return null;
    }
  }

  async invalidateEntityCache(entityName: string, id?: string | number): Promise<void> {
    try {
      if (id) {
        // Invalidate specific entity
        const cacheKey = `entity:${entityName}:${id}`;
        await this.advancedCacheService.invalidateByPattern(`*${cacheKey}*`);
      } else {
        // Invalidate all entities of this type
        await this.advancedCacheService.invalidateByTags([`entity:${entityName}`]);
      }
    } catch (error) {
      this.logger.error(`Entity cache invalidation error for ${entityName}:`, error.message);
    }
  }

  // ==================== AGGREGATION CACHING ====================

  async cacheAggregation<T>(
    result: T,
    aggregationType: string,
    entityName: string,
    filters: Record<string, any> = {},
    options?: QueryCacheOptions,
  ): Promise<void> {
    const cacheKey = this.generateAggregationCacheKey(aggregationType, entityName, filters);

    try {
      await this.advancedCacheService.setMultiLevel(cacheKey, result, ['memory', 'redis'], {
        ttl: options?.ttl || 900, // 15 minutes for aggregations
        tags: [`aggregation:${entityName}`, ...(options?.tags || [])],
        namespace: options?.namespace || 'db_aggregation',
      });
    } catch (error) {
      this.logger.error(`Aggregation cache error for ${aggregationType}:`, error.message);
    }
  }

  async getCachedAggregation<T>(
    aggregationType: string,
    entityName: string,
    filters: Record<string, any> = {},
    options?: QueryCacheOptions,
  ): Promise<T | null> {
    const cacheKey = this.generateAggregationCacheKey(aggregationType, entityName, filters);

    try {
      return await this.advancedCacheService.getMultiLevel<T>(cacheKey, ['memory', 'redis'], {
        namespace: options?.namespace || 'db_aggregation',
      });
    } catch (error) {
      this.logger.error(`Aggregation cache get error for ${aggregationType}:`, error.message);
      return null;
    }
  }

  // ==================== PRIVATE METHODS ====================

  private generateQueryCacheKey(query: string, parameters: any): string {
    const parametersString = JSON.stringify(parameters);
    const hash = this.simpleHash(query + parametersString);
    return `query:${hash}`;
  }

  private generateAggregationCacheKey(
    aggregationType: string,
    entityName: string,
    filters: Record<string, any>,
  ): string {
    const filtersString = JSON.stringify(filters);
    const hash = this.simpleHash(aggregationType + entityName + filtersString);
    return `aggregation:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

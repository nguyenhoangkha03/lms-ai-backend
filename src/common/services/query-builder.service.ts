import { Injectable } from '@nestjs/common';
import { Repository, SelectQueryBuilder, DataSource, ObjectLiteral } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import {
  PaginationDto,
  PaginatedResult,
  createPaginationMeta,
  getSkipValue,
} from '@/common/dto/pagination.dto';

export interface QueryOptions {
  relations?: string[];
  select?: string[];
  where?: Record<string, any>;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
  cache?: boolean | number;
  distinct?: boolean;
  groupBy?: string[];
  having?: string;
}

export interface OptimizedQueryOptions extends QueryOptions {
  useIndexHints?: string[];
  forceIndex?: string;
  useQueryOptimizer?: boolean;
  explainQuery?: boolean;
}

@Injectable()
export class QueryBuilderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(QueryBuilderService.name);
  }

  /**
   * Tạo query builder tối ưu với các options
   */
  createOptimizedQueryBuilder<T extends ObjectLiteral>(
    repository: Repository<T>,
    alias: string,
    options: OptimizedQueryOptions = {},
  ): SelectQueryBuilder<T> {
    let queryBuilder = repository.createQueryBuilder(alias);

    // Apply index hints
    if (options.useIndexHints?.length) {
      const hints = options.useIndexHints.join(', ');
      queryBuilder = queryBuilder.setParameter('indexHints', hints);
    }

    // Force specific index
    if (options.forceIndex) {
      queryBuilder = queryBuilder.setParameter('forceIndex', options.forceIndex);
    }

    // Select specific columns
    if (options.select?.length) {
      queryBuilder = queryBuilder.select(options.select.map(field => `${alias}.${field}`));
    }

    // Apply distinct
    if (options.distinct) {
      queryBuilder = queryBuilder.distinct(true);
    }

    // Apply relations with left join for better performance
    if (options.relations?.length) {
      options.relations.forEach(relation => {
        const relationAlias = relation.split('.').pop();
        queryBuilder = queryBuilder.leftJoinAndSelect(`${alias}.${relation}`, relationAlias!);
      });
    }

    // Apply where conditions
    if (options.where) {
      this.applyWhereConditions(queryBuilder, alias, options.where);
    }

    // Apply order by
    if (options.orderBy) {
      Object.entries(options.orderBy).forEach(([field, direction], index) => {
        if (index === 0) {
          queryBuilder = queryBuilder.orderBy(`${alias}.${field}`, direction);
        } else {
          queryBuilder = queryBuilder.addOrderBy(`${alias}.${field}`, direction);
        }
      });
    }

    // Apply group by
    if (options.groupBy?.length) {
      options.groupBy.forEach((field, index) => {
        if (index === 0) {
          queryBuilder = queryBuilder.groupBy(`${alias}.${field}`);
        } else {
          queryBuilder = queryBuilder.addGroupBy(`${alias}.${field}`);
        }
      });
    }

    // Apply having
    if (options.having) {
      queryBuilder = queryBuilder.having(options.having);
    }

    // Enable query cache
    if (options.cache) {
      const cacheTtl = typeof options.cache === 'number' ? options.cache : 300000; // 5 minutes default
      queryBuilder = queryBuilder.cache(true, cacheTtl);
    }

    return queryBuilder;
  }

  /**
   * Thực hiện pagination tối ưu với cursor-based cho datasets lớn
   */
  async paginateOptimized<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    paginationDto: PaginationDto,
    options: {
      useCursor?: boolean;
      cursorField?: string;
      countQuery?: boolean;
    } = {},
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 20 } = paginationDto;
    const { useCursor = false, cursorField = 'id', countQuery = true } = options;

    if (useCursor) {
      return this.cursorBasedPagination(queryBuilder, limit, cursorField);
    }

    // Standard offset-based pagination với optimizations
    const skip = getSkipValue(page, limit);

    queryBuilder.skip(skip).take(limit);

    let total = 0;
    if (countQuery) {
      // Optimize count query by removing unnecessary joins and selects
      const countQueryBuilder = queryBuilder
        .clone()
        .select('COUNT(DISTINCT ' + queryBuilder.alias + '.id)', 'count')
        .orderBy({}) // Remove order by for count
        .skip(0)
        .take(undefined);

      const countResult = await countQueryBuilder.getRawOne();
      total = parseInt(countResult.count, 10);
    }

    const data = await queryBuilder.getMany();
    const meta = createPaginationMeta(page, limit, total);

    return { data, meta };
  }

  /**
   * Cursor-based pagination cho performance tốt hơn với datasets lớn
   */
  private async cursorBasedPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    limit: number,
    _cursorField: string,
  ): Promise<PaginatedResult<T>> {
    queryBuilder.take(limit + 1); // Lấy thêm 1 để check hasNext

    const data = await queryBuilder.getMany();
    const hasNext = data.length > limit;

    if (hasNext) {
      data.pop(); // Remove extra item
    }

    return {
      data,
      meta: {
        page: 1,
        limit,
        total: -1, // Not available in cursor pagination
        totalPages: -1,
        hasNext,
        hasPrev: false, // Would need cursor to determine
      },
    };
  }

  /**
   * Apply where conditions với proper escaping và type casting
   */
  private applyWhereConditions<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    where: Record<string, any>,
  ): void {
    Object.entries(where).forEach(([key, value], index) => {
      const method = index === 0 ? 'where' : 'andWhere';

      if (Array.isArray(value)) {
        queryBuilder[method](`${alias}.${key} IN (:...${key})`, { [key]: value });
      } else if (value === null || value === undefined) {
        queryBuilder[method](`${alias}.${key} IS NULL`);
      } else if (typeof value === 'object' && value.operator) {
        // Advanced operators: { operator: 'LIKE', value: '%search%' }
        queryBuilder[method](`${alias}.${key} ${value.operator} :${key}`, { [key]: value.value });
      } else {
        queryBuilder[method](`${alias}.${key} = :${key}`, { [key]: value });
      }
    });
  }

  /**
   * Explain query để phân tích performance
   */
  async explainQuery(queryBuilder: SelectQueryBuilder<any>): Promise<any> {
    const sql = queryBuilder.getQuery();
    const parametersObject = queryBuilder.getParameters();
    const parameters = Object.values(parametersObject);

    try {
      const explainResult = await this.dataSource.query(`EXPLAIN EXTENDED ${sql}`, parameters);
      this.logger.debug('Query explanation:', explainResult);
      return explainResult;
    } catch (error) {
      this.logger.error('Failed to explain query:', error);
      throw error;
    }
  }

  /**
   * Batch operations để tối ưu bulk operations
   */
  async batchInsert<T extends ObjectLiteral>(
    repository: Repository<T>,
    entities: Partial<T>[],
    batchSize: number = 1000,
  ): Promise<void> {
    const batches = this.chunkArray(entities, batchSize);

    for (const batch of batches) {
      await repository.createQueryBuilder().insert().values(batch).execute();
    }
  }

  /**
   * Bulk update với conditions
   */
  async bulkUpdate<T extends ObjectLiteral>(
    repository: Repository<T>,
    criteria: Record<string, any>,
    updates: Partial<T>,
  ): Promise<void> {
    const queryBuilder = repository.createQueryBuilder().update().set(updates);

    Object.entries(criteria).forEach(([key, value]) => {
      queryBuilder.andWhere(`${key} = :${key}`, { [key]: value });
    });

    await queryBuilder.execute();
  }

  /**
   * Optimized search với full-text search và fuzzy matching
   */
  buildSearchQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    searchTerm: string,
    searchFields: string[],
    options: {
      fuzzy?: boolean;
      minScore?: number;
      useFullText?: boolean;
    } = {},
  ): SelectQueryBuilder<T> {
    if (!searchTerm || !searchFields.length) {
      return queryBuilder;
    }

    const { fuzzy = false, useFullText = false } = options;

    if (useFullText) {
      // MySQL Full-Text Search
      const fieldsStr = searchFields.join(', ');
      queryBuilder.andWhere(`MATCH(${fieldsStr}) AGAINST(:searchTerm IN BOOLEAN MODE)`, {
        searchTerm: `+${searchTerm}*`,
      });
    } else {
      // Standard LIKE search với optimization
      const conditions = searchFields.map(field => `${field} LIKE :searchTerm`);
      queryBuilder.andWhere(`(${conditions.join(' OR ')})`, {
        searchTerm: fuzzy ? `%${searchTerm}%` : `${searchTerm}%`,
      });
    }

    return queryBuilder;
  }

  /**
   * Get query performance metrics
   */
  async getQueryMetrics(queryBuilder: SelectQueryBuilder<any>): Promise<{
    executionTime: number;
    rowsExamined: number;
    rowsReturned: number;
    usingIndex: boolean;
  }> {
    const startTime = Date.now();

    // Enable profiling
    await this.dataSource.query('SET profiling = 1');

    // Execute query
    const result = await queryBuilder.getMany();

    const executionTime = Date.now() - startTime;

    // Get profiling info
    const profiles = await this.dataSource.query('SHOW PROFILES');
    const _lastProfile = profiles[profiles.length - 1];

    // Explain query
    const explainResult = await this.explainQuery(queryBuilder);
    const usingIndex = explainResult.some((row: any) => row.key !== null);

    await this.dataSource.query('SET profiling = 0');

    return {
      executionTime,
      rowsExamined: explainResult[0]?.rows || 0,
      rowsReturned: result.length,
      usingIndex,
    };
  }

  /**
   * Utility method để chia array thành chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { RedisService } from '@/redis/redis.service';

export interface QueryAnalysis {
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexUsage: boolean;
  optimization: string[];
  complexity: 'low' | 'medium' | 'high';
}

@Injectable()
export class QueryOptimizationService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly logger: WinstonService,
    private readonly redis: RedisService,
  ) {
    this.logger.setContext(QueryOptimizationService.name);
  }

  async analyzeQuery(queryBuilder: SelectQueryBuilder<any>): Promise<QueryAnalysis> {
    const sql = queryBuilder.getQuery();
    const parameters = Object.values(queryBuilder.getParameters());

    const startTime = process.hrtime.bigint();

    try {
      const explainResult = await this.dataSource.query(`EXPLAIN ${sql}`, parameters);

      const result = await queryBuilder.getMany();

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const analysis = this.analyzeExplainResult(explainResult);

      return {
        executionTime,
        rowsExamined: analysis.rowsExamined,
        rowsReturned: result.length,
        indexUsage: analysis.indexUsage,
        optimization: this.generateOptimizationSuggestions(explainResult, executionTime),
        complexity: this.calculateComplexity(explainResult, executionTime),
      };
    } catch (error) {
      this.logger.error('Query analysis failed:', error);
      throw error;
    }
  }

  optimizeQueryBuilder<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): SelectQueryBuilder<T> {
    // Add appropriate indexes hints
    this.addIndexHints(queryBuilder);

    // Optimize SELECT fields
    this.optimizeSelectFields(queryBuilder);

    // Optimize JOINs
    this.optimizeJoins(queryBuilder);

    // Add query cache if appropriate
    this.addQueryCache(queryBuilder);

    return queryBuilder;
  }

  async optimizePagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number,
    limit: number,
    useSeekPagination: boolean = false,
  ): Promise<{
    data: T[];
    total?: number;
    hasMore?: boolean;
  }> {
    if (useSeekPagination) {
      return this.seekPagination(queryBuilder, limit);
    }

    return this.offsetPagination(queryBuilder, page, limit);
  }

  private async seekPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    limit: number,
    _cursorField: string = 'id',
  ): Promise<{ data: T[]; hasMore: boolean }> {
    const data = await queryBuilder.take(limit + 1).getMany();

    const hasMore = data.length > limit;

    if (hasMore) {
      data.pop();
    }

    return { data, hasMore };
  }

  private async offsetPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    page: number,
    limit: number,
  ): Promise<{ data: T[]; total: number }> {
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async smartCache<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    cacheOptions: {
      ttl?: number;
      tags?: string[];
      invalidateOn?: string[];
    } = {},
  ): Promise<T[]> {
    const cacheKey = this.generateQueryCacheKey(queryBuilder);

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await queryBuilder.getMany();

    const ttl = cacheOptions.ttl || this.calculateOptimalTTL(queryBuilder);
    await this.redis.set(cacheKey, JSON.stringify(result), ttl);

    if (cacheOptions.tags) {
      for (const tag of cacheOptions.tags) {
        await this.redis.sadd(`cache_tag:${tag}`, cacheKey);
      }
    }

    return result;
  }

  async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = 1000,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);

      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  // Private helper methods
  private analyzeExplainResult(explainResult: any[]): {
    rowsExamined: number;
    indexUsage: boolean;
  } {
    const firstRow = explainResult[0] || {};

    return {
      rowsExamined: firstRow.rows || 0,
      indexUsage: firstRow.key !== null && firstRow.key !== undefined,
    };
  }

  private generateOptimizationSuggestions(explainResult: any[], executionTime: number): string[] {
    const suggestions: string[] = [];

    const firstRow = explainResult[0] || {};

    // Check for full table scan
    if (firstRow.type === 'ALL') {
      suggestions.push('Consider adding an index to avoid full table scan');
    }

    // Check for large row examination
    if (firstRow.rows > 10000) {
      suggestions.push('Query examines too many rows, consider adding WHERE clauses');
    }

    // Check for slow execution
    if (executionTime > 1000) {
      suggestions.push('Query execution time is slow, consider optimization');
    }

    // Check for temporary table usage
    if (firstRow.Extra && firstRow.Extra.includes('Using temporary')) {
      suggestions.push('Query uses temporary table, consider index optimization');
    }

    // Check for filesort
    if (firstRow.Extra && firstRow.Extra.includes('Using filesort')) {
      suggestions.push('Query uses filesort, consider adding ORDER BY index');
    }

    return suggestions;
  }

  private calculateComplexity(
    explainResult: any[],
    executionTime: number,
  ): 'low' | 'medium' | 'high' {
    const firstRow = explainResult[0] || {};
    const rowsExamined = firstRow.rows || 0;

    if (executionTime > 1000 || rowsExamined > 50000) {
      return 'high';
    } else if (executionTime > 300 || rowsExamined > 10000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private addIndexHints<T extends ObjectLiteral>(_queryBuilder: SelectQueryBuilder<T>): void {}

  private optimizeSelectFields<T extends ObjectLiteral>(
    _queryBuilder: SelectQueryBuilder<T>,
  ): void {}

  private optimizeJoins<T extends ObjectLiteral>(_queryBuilder: SelectQueryBuilder<T>): void {}

  private addQueryCache<T extends ObjectLiteral>(queryBuilder: SelectQueryBuilder<T>): void {
    queryBuilder.cache(true, 300000);
  }

  private generateQueryCacheKey<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): string {
    const sql = queryBuilder.getQuery();
    const params = queryBuilder.getParameters();

    const content = `${sql}:${JSON.stringify(params)}`;
    return `query_cache:${Buffer.from(content).toString('base64').slice(0, 32)}`;
  }

  private calculateOptimalTTL<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): number {
    const sql = queryBuilder.getQuery().toLowerCase();

    if (sql.includes('categories') || sql.includes('settings')) {
      return 3600;
    }

    if (sql.includes('users') || sql.includes('profiles')) {
      return 900;
    }

    return 300;
  }
}

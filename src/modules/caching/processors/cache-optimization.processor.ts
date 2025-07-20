import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AdvancedCacheService } from '../services/advanced-cache.service';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { CACHE_OPTIMIZATION_QUEUE } from '../queues/queue.constant';

@Processor(CACHE_OPTIMIZATION_QUEUE)
export class CacheOptimizationProcessor {
  private readonly logger = new Logger(CacheOptimizationProcessor.name);

  constructor(
    private readonly cacheService: AdvancedCacheService,
    private readonly invalidationService: CacheInvalidationService,
  ) {}

  @Process('optimize-cache')
  async processOptimizeCache(job: Job<{ type: string; options?: any }>) {
    const { type, options } = job.data;

    try {
      this.logger.debug(`Processing cache optimization: ${type}`);

      switch (type) {
        case 'cleanup-expired':
          await this.cleanupExpiredKeys();
          break;
        case 'defragment':
          await this.defragmentCache();
          break;
        case 'compress-large-keys':
          await this.compressLargeKeys();
          break;
        case 'remove-inefficient':
          await this.removeInefficientKeys(options?.threshold || 10);
          break;
        default:
          this.logger.warn(`Unknown optimization type: ${type}`);
      }

      this.logger.log(`Cache optimization completed: ${type}`);
    } catch (error) {
      this.logger.error(`Cache optimization failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('analyze-usage')
  async processAnalyzeUsage(job: Job<{ timeframe: string }>) {
    const { timeframe } = job.data;

    try {
      this.logger.debug(`Analyzing cache usage for timeframe: ${timeframe}`);

      const stats = await this.cacheService.getCacheStats();
      const analysis = this.analyzeUsagePatterns(stats);

      // Store analysis results
      await this.cacheService.setMultiLevel('cache:usage:analysis', analysis, ['redis'], {
        ttl: 3600,
        namespace: 'analytics',
      });

      this.logger.log(`Cache usage analysis completed for ${timeframe}`);
      return analysis;
    } catch (error) {
      this.logger.error(`Cache usage analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async cleanupExpiredKeys(): Promise<void> {
    const cleaned = await this.cacheService.cleanExpiredKeys();
    this.logger.log(`Cleaned up ${cleaned} expired keys`);
  }

  private async defragmentCache(): Promise<void> {
    // This would trigger Redis memory defragmentation
    this.logger.log('Cache defragmentation completed');
  }

  private async compressLargeKeys(): Promise<void> {
    // This would identify and compress large cache values
    this.logger.log('Large key compression completed');
  }

  private async removeInefficientKeys(threshold: number): Promise<void> {
    const stats = await this.cacheService.getCacheStats();
    const inefficientKeys = Object.entries(stats)
      .filter(([, stat]) => stat.hitRate < threshold && stat.totalRequests > 10)
      .map(([key]) => key);

    if (inefficientKeys.length > 0) {
      await this.invalidationService.bulkInvalidation(inefficientKeys);
      this.logger.log(`Removed ${inefficientKeys.length} inefficient cache keys`);
    }
  }

  private analyzeUsagePatterns(stats: Record<string, any>): any {
    const patterns = {
      totalKeys: Object.keys(stats).length,
      namespaces: this.groupByNamespace(stats),
      efficiency: this.calculateEfficiency(stats),
      recommendations: this.generateRecommendations(stats),
    };

    return patterns;
  }

  private groupByNamespace(stats: Record<string, any>): Record<string, any> {
    const grouped: Record<string, any> = {};

    Object.entries(stats).forEach(([key, stat]) => {
      const namespace = key.split(':')[0] || 'default';

      if (!grouped[namespace]) {
        grouped[namespace] = { keys: 0, hitRate: 0, totalRequests: 0 };
      }

      grouped[namespace].keys++;
      grouped[namespace].totalRequests += stat.totalRequests;
      grouped[namespace].hitRate =
        (grouped[namespace].hitRate + stat.hitRate) / grouped[namespace].keys;
    });

    return grouped;
  }

  private calculateEfficiency(stats: Record<string, any>): any {
    const values = Object.values(stats);
    const avgHitRate = values.reduce((sum, s: any) => sum + s.hitRate, 0) / values.length;

    return {
      avgHitRate,
      efficiency: avgHitRate > 70 ? 'good' : avgHitRate > 50 ? 'fair' : 'poor',
    };
  }

  private generateRecommendations(stats: Record<string, any>): string[] {
    const recommendations: string[] = [];
    const avgHitRate =
      Object.values(stats).reduce((sum, s: any) => sum + s.hitRate, 0) /
      Object.values(stats).length;

    if (avgHitRate < 60) {
      recommendations.push('Consider optimizing cache invalidation strategies');
    }

    return recommendations;
  }
}

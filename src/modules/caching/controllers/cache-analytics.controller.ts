import { Controller, Get, Query, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { AdvancedCacheService } from '../services/advanced-cache.service';
import { DatabaseCacheService } from '../services/database-cache.service';

@ApiTags('Cache Analytics')
@Controller('cache-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CacheAnalyticsController {
  constructor(
    private readonly cacheService: AdvancedCacheService,
    private readonly databaseCacheService: DatabaseCacheService,
  ) {}

  @Get('overview')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get cache analytics overview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache analytics overview retrieved successfully',
  })
  async getAnalyticsOverview() {
    const info = await this.cacheService.getCacheInfo();
    const stats = await this.cacheService.getCacheStats();

    // Calculate additional metrics
    const overallStats = Object.values(stats).reduce(
      (acc, stat) => ({
        totalHits: acc.totalHits + stat.hits,
        totalMisses: acc.totalMisses + stat.misses,
        totalRequests: acc.totalRequests + stat.totalRequests,
        avgResponseTime: (acc.avgResponseTime + stat.avgResponseTime) / 2,
      }),
      { totalHits: 0, totalMisses: 0, totalRequests: 0, avgResponseTime: 0 },
    );

    const hitRate =
      overallStats.totalRequests > 0
        ? (overallStats.totalHits / overallStats.totalRequests) * 100
        : 0;

    return {
      overview: {
        hitRate: Math.round(hitRate * 100) / 100,
        totalRequests: overallStats.totalRequests,
        avgResponseTime: Math.round(overallStats.avgResponseTime * 100) / 100,
        memoryUsage: info.redis?.memory || {},
      },
      stats,
      recommendations: this.generateRecommendations(hitRate, overallStats),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('performance')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get cache performance metrics' })
  @ApiQuery({ name: 'timeframe', required: false, description: 'Time frame for metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache performance metrics retrieved successfully',
  })
  async getPerformanceMetrics(@Query('timeframe') timeframe: string = '24h') {
    const stats = await this.cacheService.getCacheStats();

    // Group stats by namespace
    const namespaceStats = this.groupStatsByNamespace(stats);

    return {
      timeframe,
      performance: {
        byNamespace: namespaceStats,
        overall: this.calculateOverallPerformance(stats),
        trends: await this.getPerformanceTrends(timeframe),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('usage')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get cache usage analytics' })
  @ApiQuery({ name: 'groupBy', required: false, description: 'Group usage by category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache usage analytics retrieved successfully',
  })
  async getUsageAnalytics(@Query('groupBy') groupBy: string = 'namespace') {
    const stats = await this.cacheService.getCacheStats();
    const info = await this.cacheService.getCacheInfo();

    const usage = {
      memory: {
        used: info.redis?.memory?.used_memory_human || 'N/A',
        peak: info.redis?.memory?.used_memory_peak_human || 'N/A',
        fragmentation: info.redis?.memory?.mem_fragmentation_ratio || 'N/A',
      },
      keys: {
        total: Object.keys(stats).length,
        byType: this.categorizeKeys(Object.keys(stats)),
      },
      operations: {
        hits: Object.values(stats).reduce((sum, s) => sum + s.hits, 0),
        misses: Object.values(stats).reduce((sum, s) => sum + s.misses, 0),
      },
    };

    return {
      usage,
      breakdown: groupBy === 'namespace' ? this.groupStatsByNamespace(stats) : stats,
      efficiency: this.calculateEfficiencyMetrics(usage),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('hotkeys')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get most accessed cache keys' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of keys to return' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hot cache keys retrieved successfully',
  })
  async getHotKeys(@Query('limit') limit: number = 20) {
    const stats = await this.cacheService.getCacheStats();

    const hotKeys = Object.entries(stats)
      .sort(([, a], [, b]) => b.totalRequests - a.totalRequests)
      .slice(0, limit)
      .map(([key, stat]) => ({
        key: this.maskSensitiveData(key),
        requests: stat.totalRequests,
        hitRate: stat.hitRate,
        avgResponseTime: stat.avgResponseTime,
      }));

    return {
      hotKeys,
      totalKeys: Object.keys(stats).length,
      analysisTime: new Date().toISOString(),
    };
  }

  @Get('inefficient')
  @Roles('admin')
  @ApiOperation({ summary: 'Get inefficient cache patterns' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Hit rate threshold' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inefficient cache patterns retrieved successfully',
  })
  async getInefficientPatterns(@Query('threshold') threshold: number = 50) {
    const stats = await this.cacheService.getCacheStats();

    const inefficientKeys = Object.entries(stats)
      .filter(([, stat]) => stat.hitRate < threshold && stat.totalRequests > 10)
      .sort(([, a], [, b]) => a.hitRate - b.hitRate)
      .map(([key, stat]) => ({
        key: this.maskSensitiveData(key),
        hitRate: stat.hitRate,
        totalRequests: stat.totalRequests,
        wastedRequests: stat.misses,
        recommendation: this.getOptimizationRecommendation(stat),
      }));

    return {
      inefficientKeys,
      threshold,
      totalAnalyzed: Object.keys(stats).length,
      recommendations: this.generateOptimizationRecommendations(inefficientKeys),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('report')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate comprehensive cache report' })
  @ApiQuery({ name: 'format', required: false, description: 'Report format' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache report generated successfully',
  })
  async generateCacheReport(@Query('format') format: string = 'json') {
    const [info, stats] = await Promise.all([
      this.cacheService.getCacheInfo(),
      this.cacheService.getCacheStats(),
    ]);

    const report = {
      summary: {
        reportDate: new Date().toISOString(),
        totalKeys: Object.keys(stats).length,
        overallHitRate: this.calculateOverallHitRate(stats),
        memoryUsage: info.redis?.memory || {},
      },
      performance: {
        topPerformers: this.getTopPerformers(stats, 10),
        underPerformers: this.getUnderPerformers(stats, 10),
        avgResponseTime: this.calculateAverageResponseTime(stats),
      },
      usage: {
        byNamespace: this.groupStatsByNamespace(stats),
        keyDistribution: this.categorizeKeys(Object.keys(stats)),
        growthTrend: 'stable', // This would be calculated from historical data
      },
      recommendations: {
        immediate: this.getImmediateRecommendations(stats),
        longTerm: this.getLongTermRecommendations(info, stats),
      },
      health: {
        status: this.assessCacheHealth(info, stats),
        issues: this.identifyIssues(info, stats),
        score: this.calculateHealthScore(info, stats),
      },
    };

    if (format === 'pdf') {
      // In a real implementation, this would generate a PDF report
      return {
        message: 'PDF report generation not implemented',
        downloadUrl: '/cache-reports/latest.pdf',
      };
    }

    return report;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private generateRecommendations(hitRate: number, stats: any): string[] {
    const recommendations: string[] = [];

    if (hitRate < 50) {
      recommendations.push('Consider increasing TTL for frequently accessed data');
      recommendations.push('Review cache invalidation strategies');
    }

    if (hitRate > 90) {
      recommendations.push('Cache is performing well, consider expanding coverage');
    }

    if (stats.avgResponseTime > 100) {
      recommendations.push('Consider optimizing cache storage or network latency');
    }

    return recommendations;
  }

  private groupStatsByNamespace(stats: Record<string, any>): Record<string, any> {
    const grouped: Record<string, any> = {};

    Object.entries(stats).forEach(([key, stat]) => {
      const namespace = key.split(':')[0] || 'default';

      if (!grouped[namespace]) {
        grouped[namespace] = {
          keys: 0,
          totalHits: 0,
          totalMisses: 0,
          totalRequests: 0,
          avgResponseTime: 0,
        };
      }

      grouped[namespace].keys++;
      grouped[namespace].totalHits += stat.hits;
      grouped[namespace].totalMisses += stat.misses;
      grouped[namespace].totalRequests += stat.totalRequests;
      grouped[namespace].avgResponseTime =
        (grouped[namespace].avgResponseTime + stat.avgResponseTime) / 2;
    });

    // Calculate hit rates
    Object.values(grouped).forEach((group: any) => {
      group.hitRate = group.totalRequests > 0 ? (group.totalHits / group.totalRequests) * 100 : 0;
    });

    return grouped;
  }

  private calculateOverallPerformance(stats: Record<string, any>): any {
    const values = Object.values(stats);

    return {
      totalKeys: values.length,
      avgHitRate: values.reduce((sum, s: any) => sum + s.hitRate, 0) / values.length,
      avgResponseTime: values.reduce((sum, s: any) => sum + s.avgResponseTime, 0) / values.length,
      totalRequests: values.reduce((sum, s: any) => sum + s.totalRequests, 0),
    };
  }

  private async getPerformanceTrends(timeframe: string): Promise<any> {
    // In a real implementation, this would query historical data
    return {
      timeframe,
      trend: 'improving',
      dataPoints: [
        { time: '1h ago', hitRate: 75.2, responseTime: 45 },
        { time: '30m ago', hitRate: 78.1, responseTime: 42 },
        { time: 'now', hitRate: 80.5, responseTime: 38 },
      ],
    };
  }

  private categorizeKeys(keys: string[]): Record<string, number> {
    const categories: Record<string, number> = {};

    keys.forEach(key => {
      const category = key.split(':')[0] || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }

  private calculateEfficiencyMetrics(usage: any): any {
    const totalOperations = usage.operations.hits + usage.operations.misses;
    const hitRate = totalOperations > 0 ? (usage.operations.hits / totalOperations) * 100 : 0;

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      efficiency: hitRate > 80 ? 'excellent' : hitRate > 60 ? 'good' : 'needs improvement',
      memoryEfficiency: usage.memory.fragmentation < 1.5 ? 'good' : 'needs optimization',
    };
  }

  private maskSensitiveData(key: string): string {
    // Mask potential sensitive data in cache keys
    return key.replace(/:\w{8,}/g, ':***');
  }

  private getOptimizationRecommendation(stat: any): string {
    if (stat.hitRate < 20) {
      return 'Consider removing this cache key or reviewing its purpose';
    } else if (stat.hitRate < 50) {
      return 'Review TTL settings or cache invalidation logic';
    }
    return 'Monitor for improvement';
  }

  private generateOptimizationRecommendations(inefficientKeys: any[]): string[] {
    const recommendations: string[] = [];

    if (inefficientKeys.length > 0) {
      recommendations.push(`Found ${inefficientKeys.length} inefficient cache patterns`);
      recommendations.push('Consider reviewing cache invalidation strategies');
      recommendations.push('Evaluate TTL settings for low-performing keys');
    }

    return recommendations;
  }

  private calculateOverallHitRate(stats: Record<string, any>): number {
    const values = Object.values(stats);
    const totalHits = values.reduce((sum, s: any) => sum + s.hits, 0);
    const totalRequests = values.reduce((sum, s: any) => sum + s.totalRequests, 0);

    return totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
  }

  private getTopPerformers(stats: Record<string, any>, limit: number): any[] {
    return Object.entries(stats)
      .filter(([, stat]: [string, any]) => stat.totalRequests > 10)
      .sort(([, a], [, b]: [string, any]) => b.hitRate - a.hitRate)
      .slice(0, limit)
      .map(([key, stat]) => ({
        key: this.maskSensitiveData(key),
        hitRate: stat.hitRate,
        totalRequests: stat.totalRequests,
      }));
  }

  private getUnderPerformers(stats: Record<string, any>, limit: number): any[] {
    return Object.entries(stats)
      .filter(([, stat]: [string, any]) => stat.totalRequests > 10)
      .sort(([, a], [, b]: [string, any]) => a.hitRate - b.hitRate)
      .slice(0, limit)
      .map(([key, stat]) => ({
        key: this.maskSensitiveData(key),
        hitRate: stat.hitRate,
        totalRequests: stat.totalRequests,
      }));
  }

  private calculateAverageResponseTime(stats: Record<string, any>): number {
    const values = Object.values(stats);
    return values.reduce((sum, s: any) => sum + s.avgResponseTime, 0) / values.length;
  }

  private getImmediateRecommendations(stats: Record<string, any>): string[] {
    const recommendations: string[] = [];
    const overallHitRate = this.calculateOverallHitRate(stats);

    if (overallHitRate < 60) {
      recommendations.push('Optimize cache invalidation strategies');
      recommendations.push('Review TTL settings for frequently accessed data');
    }

    const inefficientCount = Object.values(stats).filter(
      (s: any) => s.hitRate < 30 && s.totalRequests > 10,
    ).length;

    if (inefficientCount > 5) {
      recommendations.push('Remove or optimize inefficient cache keys');
    }

    return recommendations;
  }

  private getLongTermRecommendations(info: any, stats: Record<string, any>): string[] {
    const recommendations: string[] = [];

    recommendations.push('Implement cache warming for critical data');
    recommendations.push('Consider implementing cache clustering for high availability');
    recommendations.push('Set up automated cache performance monitoring');

    if (Object.keys(stats).length > 10000) {
      recommendations.push('Consider implementing cache key lifecycle management');
    }

    return recommendations;
  }

  private assessCacheHealth(info: any, stats: Record<string, any>): string {
    const overallHitRate = this.calculateOverallHitRate(stats);
    const fragmentation = info.redis?.memory?.mem_fragmentation_ratio || 1;

    if (overallHitRate > 80 && fragmentation < 1.5) return 'excellent';
    if (overallHitRate > 60 && fragmentation < 2.0) return 'good';
    if (overallHitRate > 40) return 'fair';
    return 'poor';
  }

  private identifyIssues(info: any, stats: Record<string, any>): string[] {
    const issues: string[] = [];
    const overallHitRate = this.calculateOverallHitRate(stats);
    const fragmentation = info.redis?.memory?.mem_fragmentation_ratio || 1;

    if (overallHitRate < 50) {
      issues.push('Low cache hit rate detected');
    }

    if (fragmentation > 2.0) {
      issues.push('High memory fragmentation detected');
    }

    const avgResponseTime = this.calculateAverageResponseTime(stats);
    if (avgResponseTime > 100) {
      issues.push('High average response time detected');
    }

    return issues;
  }

  private calculateHealthScore(info: any, stats: Record<string, any>): number {
    const overallHitRate = this.calculateOverallHitRate(stats);
    const fragmentation = info.redis?.memory?.mem_fragmentation_ratio || 1;
    const avgResponseTime = this.calculateAverageResponseTime(stats);

    let score = 100;

    // Deduct points for low hit rate
    if (overallHitRate < 80) score -= (80 - overallHitRate) * 0.5;

    // Deduct points for high fragmentation
    if (fragmentation > 1.5) score -= (fragmentation - 1.5) * 20;

    // Deduct points for high response time
    if (avgResponseTime > 50) score -= (avgResponseTime - 50) * 0.2;

    return Math.max(0, Math.min(100, score));
  }
}

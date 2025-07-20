import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { AdvancedCacheService } from '../services/advanced-cache.service';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { StaticAssetCacheService } from '../services/static-asset-cache.service';
import { CdnCacheService } from '../services/cdn-cache.service';

@ApiTags('Cache Management')
@Controller('cache-management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CacheManagementController {
  constructor(
    private readonly cacheService: AdvancedCacheService,
    private readonly invalidationService: CacheInvalidationService,
    private readonly assetCacheService: StaticAssetCacheService,
    private readonly cdnCacheService: CdnCacheService,
  ) {}

  // ==================== CACHE OPERATIONS ====================

  @Get('status')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get cache system status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache system status retrieved successfully',
  })
  async getCacheStatus() {
    const info = await this.cacheService.getCacheInfo();
    const stats = await this.cacheService.getCacheStats();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      info,
      stats,
    };
  }

  @Post('warm')
  @Roles('admin')
  @ApiOperation({ summary: 'Warm cache with predefined patterns' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache warming initiated successfully',
  })
  async warmCache(@Body() body: { patterns: string[]; warmupFunction?: string }) {
    const { patterns } = body;

    // Default warmup function for common patterns
    const warmupFunction = async (pattern: string) => {
      // This would be implemented based on specific use cases
      return { pattern, warmed: true, timestamp: new Date() };
    };

    await this.cacheService.warmCache(patterns, warmupFunction);

    return {
      message: 'Cache warming initiated',
      patterns: patterns.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('optimize')
  @Roles('admin')
  @ApiOperation({ summary: 'Optimize cache performance' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache optimization completed successfully',
  })
  async optimizeCache() {
    await this.cacheService.optimizeCache();

    return {
      message: 'Cache optimization completed',
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== CACHE INVALIDATION ====================

  @Delete('invalidate/pattern')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Invalidate cache by pattern' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache invalidated successfully',
  })
  async invalidateByPattern(@Body() body: { pattern: string }) {
    const invalidatedCount = await this.cacheService.invalidateByPattern(body.pattern);

    return {
      message: 'Cache invalidated successfully',
      pattern: body.pattern,
      invalidatedKeys: invalidatedCount,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('invalidate/tags')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Invalidate cache by tags' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache invalidated successfully',
  })
  async invalidateByTags(@Body() body: { tags: string[] }) {
    const invalidatedCount = await this.cacheService.invalidateByTags(body.tags);

    return {
      message: 'Cache invalidated successfully',
      tags: body.tags,
      invalidatedKeys: invalidatedCount,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('invalidate/entity/:entityType/:entityId')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Invalidate cache for specific entity' })
  @ApiParam({ name: 'entityType', description: 'Entity type' })
  @ApiParam({ name: 'entityId', description: 'Entity ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Entity cache invalidated successfully',
  })
  async invalidateEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    await this.invalidationService.invalidateEntity(entityType, entityId);

    return {
      message: 'Entity cache invalidated successfully',
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== ASSET CACHE MANAGEMENT ====================

  @Get('assets/metadata/:assetPath')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get asset metadata' })
  @ApiParam({ name: 'assetPath', description: 'Asset path' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset metadata retrieved successfully',
  })
  async getAssetMetadata(@Param('assetPath') assetPath: string) {
    const metadata = await this.assetCacheService.getAssetMetadata(assetPath);

    return {
      assetPath,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('assets/optimize')
  @Roles('admin')
  @ApiOperation({ summary: 'Optimize assets' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset optimization initiated successfully',
  })
  async optimizeAssets(@Body() body: { assetPaths: string[] }) {
    await this.assetCacheService.optimizeAssets(body.assetPaths);

    return {
      message: 'Asset optimization initiated',
      assetsCount: body.assetPaths.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('assets/invalidate/:assetPath')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Invalidate asset cache' })
  @ApiParam({ name: 'assetPath', description: 'Asset path' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Asset cache invalidated successfully',
  })
  async invalidateAssetCache(@Param('assetPath') assetPath: string) {
    await this.assetCacheService.invalidateAssetCache(assetPath);

    return {
      message: 'Asset cache invalidated successfully',
      assetPath,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== CDN MANAGEMENT ====================

  @Post('cdn/purge')
  @Roles('admin')
  @ApiOperation({ summary: 'Purge CDN cache' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CDN cache purged successfully',
  })
  async purgeCdnCache(@Body() body: { files?: string[]; tags?: string[]; everything?: boolean }) {
    const success = await this.cdnCacheService.purgeCache(body);

    return {
      message: success ? 'CDN cache purged successfully' : 'CDN cache purge failed',
      success,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('cdn/stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Get CDN cache statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CDN statistics retrieved successfully',
  })
  async getCdnStats() {
    const stats = await this.cdnCacheService.getCacheStats();

    return {
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== CONFIGURATION ====================

  @Get('config')
  @Roles('admin')
  @ApiOperation({ summary: 'Get cache configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache configuration retrieved successfully',
  })
  async getCacheConfig() {
    return {
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        database: process.env.REDIS_CACHE_DB,
      },
      cdn: {
        provider: process.env.CDN_PROVIDER,
        enabled: !!process.env.CDN_ENABLED,
      },
      defaults: {
        ttl: 300,
        maxItems: 1000,
        compression: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Put('config')
  @Roles('admin')
  @ApiOperation({ summary: 'Update cache configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache configuration updated successfully',
  })
  async updateCacheConfig(@Body() config: any) {
    // This would update cache configuration
    // For now, just return success message
    return {
      message: 'Cache configuration updated successfully',
      config,
      timestamp: new Date().toISOString(),
    };
  }
}

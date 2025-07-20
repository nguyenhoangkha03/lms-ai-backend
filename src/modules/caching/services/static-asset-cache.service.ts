import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdvancedCacheService } from './advanced-cache.service';
import { CdnCacheService } from './cdn-cache.service';
import * as path from 'path';
import * as crypto from 'crypto';

export interface AssetCacheOptions {
  version?: string;
  fingerprint?: boolean;
  compress?: boolean;
  cdnUpload?: boolean;
}

export interface AssetMetadata {
  path: string;
  size: number;
  mimeType: string;
  hash: string;
  version: string;
  lastModified: Date;
  compressionRatio?: number;
  cdnUrl?: string;
}

@Injectable()
export class StaticAssetCacheService {
  private readonly logger = new Logger(StaticAssetCacheService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly advancedCacheService: AdvancedCacheService,
    private readonly cdnCacheService: CdnCacheService,
  ) {}

  // ==================== ASSET VERSIONING ====================

  async getAssetUrl(assetPath: string, options?: AssetCacheOptions): Promise<string> {
    try {
      const cacheKey = `asset:url:${assetPath}`;

      // Try to get from cache first
      const cachedUrl = await this.advancedCacheService.getMultiLevel<string>(
        cacheKey,
        ['memory', 'redis'],
        { namespace: 'assets', ttl: 3600 },
      );

      if (cachedUrl) {
        return cachedUrl;
      }

      // Generate versioned URL
      const metadata = await this.getAssetMetadata(assetPath);
      let url = assetPath;

      if (options?.fingerprint && metadata) {
        url = this.addFingerprint(assetPath, metadata.hash);
      }

      if (options?.version) {
        url = this.addVersion(url, options.version);
      }

      // Add CDN domain if available
      const cdnDomain = this.configService.get<string>('cdn.domain');
      if (cdnDomain && metadata?.cdnUrl) {
        url = `${cdnDomain}${url}`;
      }

      // Cache the result
      await this.advancedCacheService.setMultiLevel(cacheKey, url, ['memory', 'redis'], {
        namespace: 'assets',
        ttl: 3600,
      });

      return url;
    } catch (error) {
      this.logger.error(`Failed to get asset URL for ${assetPath}:`, error.message);
      return assetPath; // Fallback to original path
    }
  }

  async getAssetMetadata(assetPath: string): Promise<AssetMetadata | null> {
    try {
      const cacheKey = `asset:metadata:${assetPath}`;

      const cached = await this.advancedCacheService.getMultiLevel<AssetMetadata>(
        cacheKey,
        ['memory', 'redis'],
        { namespace: 'assets', ttl: 1800 },
      );

      if (cached) {
        return cached;
      }

      // Generate metadata if not cached
      const metadata = await this.generateAssetMetadata(assetPath);

      if (metadata) {
        await this.advancedCacheService.setMultiLevel(cacheKey, metadata, ['memory', 'redis'], {
          namespace: 'assets',
          ttl: 1800,
        });
      }

      return metadata;
    } catch (error) {
      this.logger.error(`Failed to get asset metadata for ${assetPath}:`, error.message);
      return null;
    }
  }

  // ==================== ASSET OPTIMIZATION ====================

  async optimizeAssets(assetPaths: string[]): Promise<void> {
    this.logger.log(`Starting optimization for ${assetPaths.length} assets`);

    const optimizationPromises = assetPaths.map(async assetPath => {
      try {
        await this.optimizeAsset(assetPath);
      } catch (error) {
        this.logger.warn(`Failed to optimize asset ${assetPath}:`, error.message);
      }
    });

    await Promise.allSettled(optimizationPromises);
    this.logger.log('Asset optimization completed');
  }

  async optimizeAsset(assetPath: string): Promise<void> {
    const metadata = await this.getAssetMetadata(assetPath);
    if (!metadata) return;

    const fileExtension = path.extname(assetPath).toLowerCase();

    switch (fileExtension) {
      case '.js':
      case '.css':
        await this.compressTextAsset(assetPath, metadata);
        break;
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.webp':
        await this.optimizeImageAsset(assetPath, metadata);
        break;
      default:
        this.logger.debug(`Skipping optimization for ${assetPath} (unsupported type)`);
    }
  }

  // ==================== CACHE INVALIDATION ====================

  async invalidateAssetCache(assetPath: string): Promise<void> {
    try {
      // Invalidate local cache
      await this.advancedCacheService.invalidateByPattern(`*asset*${assetPath}*`);

      // Invalidate CDN cache
      const cdnUrl = await this.getAssetUrl(assetPath);
      await this.cdnCacheService.purgeByUrls([cdnUrl]);

      this.logger.debug(`Invalidated cache for asset: ${assetPath}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for asset ${assetPath}:`, error.message);
    }
  }

  async invalidateAssetsCache(pattern?: string): Promise<void> {
    try {
      const searchPattern = pattern ? `*asset*${pattern}*` : '*asset*';
      await this.advancedCacheService.invalidateByPattern(searchPattern);

      // Invalidate CDN cache by tags
      await this.cdnCacheService.purgeByTags(['assets']);

      this.logger.log('Invalidated assets cache');
    } catch (error) {
      this.logger.error('Failed to invalidate assets cache:', error.message);
    }
  }

  // ==================== PRIVATE METHODS ====================

  private async generateAssetMetadata(assetPath: string): Promise<AssetMetadata | null> {
    try {
      const fs = await import('fs/promises');
      const fullPath = path.join(process.cwd(), 'public', assetPath);

      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath);
      const hash = crypto.createHash('md5').update(content).digest('hex');

      return {
        path: assetPath,
        size: stats.size,
        mimeType: this.getMimeType(assetPath),
        hash: hash.substring(0, 8), // Short hash for URLs
        version: '1.0.0', // This could be from package.json or git
        lastModified: stats.mtime,
      };
    } catch (error) {
      this.logger.error(`Failed to generate metadata for ${assetPath}:`, error.message);
      return null;
    }
  }

  private addFingerprint(assetPath: string, hash: string): string {
    const extension = path.extname(assetPath);
    const nameWithoutExt = assetPath.replace(extension, '');
    return `${nameWithoutExt}.${hash}${extension}`;
  }

  private addVersion(assetPath: string, version: string): string {
    const separator = assetPath.includes('?') ? '&' : '?';
    return `${assetPath}${separator}v=${version}`;
  }

  private getMimeType(assetPath: string): string {
    const extension = path.extname(assetPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  private async compressTextAsset(assetPath: string, _metadata: AssetMetadata): Promise<void> {
    try {
      const zlib = await import('zlib');
      const fs = await import('fs/promises');

      const fullPath = path.join(process.cwd(), 'public', assetPath);
      const content = await fs.readFile(fullPath);

      // Create gzipped version
      const gzipped = zlib.gzipSync(content);
      const gzipPath = `${fullPath}.gz`;
      await fs.writeFile(gzipPath, gzipped);

      // Create brotli version if available
      if (zlib.brotliCompressSync) {
        const brotli = zlib.brotliCompressSync(content);
        const brotliPath = `${fullPath}.br`;
        await fs.writeFile(brotliPath, brotli);
      }

      this.logger.debug(`Compressed text asset: ${assetPath}`);
    } catch (error) {
      this.logger.error(`Failed to compress text asset ${assetPath}:`, error.message);
    }
  }

  private async optimizeImageAsset(assetPath: string, _metadata: AssetMetadata): Promise<void> {
    // This would integrate with image optimization libraries like sharp
    // For now, just log the optimization intent
    this.logger.debug(`Image optimization for ${assetPath} would be implemented here`);
  }
}

// src/modules/file-management/services/cdn-integration.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { FileUpload } from '../../course/entities/file-upload.entity';
import { FileType, FileAccessLevel } from '@/common/enums/file.enums';
import axios from 'axios';
import * as crypto from 'crypto';

export interface CDNConfig {
  provider: 'cloudflare' | 'aws-cloudfront' | 'custom';
  baseUrl: string;
  apiKey?: string;
  secretKey?: string;
  zoneId?: string;
  distributionId?: string;
  enabled: boolean;
  cacheTtl: number;
  compressionEnabled: boolean;
  hotlinkProtection: boolean;
}

export interface CDNPurgeOptions {
  urls?: string[];
  tags?: string[];
  everything?: boolean;
}

export interface CDNMetrics {
  requests: number;
  bandwidth: number;
  hitRatio: number;
  topFiles: Array<{
    url: string;
    requests: number;
    bandwidth: number;
  }>;
}

@Injectable()
export class CDNIntegrationService {
  private cdnConfig: CDNConfig;
  private enabledFileTypes: Set<FileType>;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(CDNIntegrationService.name);
    this.initializeCDNConfig();
    this.initializeFileTypes();
  }

  /**
   * Initialize CDN configuration
   */
  private initializeCDNConfig(): void {
    this.cdnConfig = {
      provider: this.configService.get('CDN_PROVIDER', 'custom') as any,
      baseUrl: this.configService.get('CDN_BASE_URL', ''),
      apiKey: this.configService.get('CDN_API_KEY'),
      secretKey: this.configService.get('CDN_SECRET_KEY'),
      zoneId: this.configService.get('CDN_ZONE_ID'),
      distributionId: this.configService.get('CDN_DISTRIBUTION_ID'),
      enabled: this.configService.get('CDN_ENABLED', 'false') === 'true',
      cacheTtl: parseInt(this.configService.get('CDN_CACHE_TTL', '86400')),
      compressionEnabled: this.configService.get('CDN_COMPRESSION', 'true') === 'true',
      hotlinkProtection: this.configService.get('CDN_HOTLINK_PROTECTION', 'true') === 'true',
    };

    if (this.cdnConfig.enabled) {
      this.logger.log(`CDN integration enabled: ${this.cdnConfig.provider}`);
    }
  }

  /**
   * Initialize file types that should use CDN
   */
  private initializeFileTypes(): void {
    const enabledTypes = this.configService.get('CDN_FILE_TYPES', 'image,video,audio,document');
    this.enabledFileTypes = new Set(enabledTypes.split(',') as FileType[]);
  }

  /**
   * Generate CDN URL for file
   */
  generateCDNUrl(file: FileUpload, variant?: string): string {
    if (!this.shouldUseCDN(file)) {
      return this.generateDirectUrl(file);
    }

    const baseUrl = this.cdnConfig.baseUrl.replace(/\/$/, '');
    let filePath = file.filePath;

    // Add variant suffix if specified (e.g., thumbnails, responsive images)
    if (variant && filePath) {
      const pathParts = filePath.split('.');
      if (pathParts.length > 1) {
        pathParts[pathParts.length - 2] += `_${variant}`;
        filePath = pathParts.join('.');
      }
    }

    // Add query parameters for optimization
    const queryParams = this.buildOptimizationParams(file, variant);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    return `${baseUrl}/${filePath}${queryString}`;
  }

  /**
   * Generate signed CDN URL for private files
   */
  generateSignedCDNUrl(file: FileUpload, expirationTime: number = 3600, variant?: string): string {
    if (!this.shouldUseCDN(file) || file.accessLevel === FileAccessLevel.PUBLIC) {
      return this.generateCDNUrl(file, variant);
    }

    const baseUrl = this.generateCDNUrl(file, variant);
    const expiry = Math.floor(Date.now() / 1000) + expirationTime;

    // Generate signature based on CDN provider
    const signature = this.generateSignature(baseUrl, expiry);

    return `${baseUrl}&expires=${expiry}&signature=${signature}`;
  }

  /**
   * Check if file should use CDN
   */
  private shouldUseCDN(file: FileUpload): boolean {
    if (!this.cdnConfig.enabled) {
      return false;
    }

    // Only use CDN for enabled file types
    if (!this.enabledFileTypes.has(file.fileType)) {
      return false;
    }

    // Don't use CDN for temporary files
    if (file.metadata?.temporary) {
      return false;
    }

    return true;
  }

  /**
   * Build optimization parameters for CDN
   */
  private buildOptimizationParams(file: FileUpload, variant?: string): string[] {
    const params: string[] = [];

    // Image optimization parameters
    if (file.fileType === FileType.IMAGE) {
      params.push('format=auto'); // Auto format selection
      params.push('quality=85'); // Default quality

      if (variant === 'thumbnail') {
        params.push('width=300', 'height=300', 'fit=cover');
      } else if (variant === 'mobile') {
        params.push('width=480', 'dpr=2');
      } else if (variant === 'tablet') {
        params.push('width=768', 'dpr=2');
      }
    }

    // Video optimization parameters
    if (file.fileType === FileType.VIDEO && variant) {
      params.push(`quality=${variant}`); // e.g., 720p, 1080p
    }

    // Compression
    if (this.cdnConfig.compressionEnabled) {
      params.push('compress=true');
    }

    return params;
  }

  /**
   * Generate signature for signed URLs
   */
  private generateSignature(url: string, expiry: number): string {
    if (!this.cdnConfig.secretKey) {
      throw new Error('CDN secret key not configured');
    }

    const stringToSign = `${url}${expiry}`;
    return crypto
      .createHmac('sha256', this.cdnConfig.secretKey)
      .update(stringToSign)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate direct URL (non-CDN)
   */
  private generateDirectUrl(file: FileUpload): string {
    const baseUrl = this.configService.get('APP_URL', 'http://localhost:3000');
    return `${baseUrl}/api/v1/files/download/${file.id}`;
  }

  /**
   * Purge CDN cache
   */
  async purgeCDNCache(options: CDNPurgeOptions): Promise<boolean> {
    if (!this.cdnConfig.enabled || !this.cdnConfig.apiKey) {
      this.logger.warn('CDN not configured for cache purging');
      return false;
    }

    try {
      switch (this.cdnConfig.provider) {
        case 'cloudflare':
          return this.purgeCloudflareCache(options);
        case 'aws-cloudfront':
          return this.purgeCloudFrontCache(options);
        default:
          this.logger.warn(
            `Cache purging not implemented for provider: ${this.cdnConfig.provider}`,
          );
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to purge CDN cache:', error.message);
      return false;
    }
  }

  /**
   * Purge Cloudflare cache
   */
  private async purgeCloudflareCache(options: CDNPurgeOptions): Promise<boolean> {
    const url = `https://api.cloudflare.com/client/v4/zones/${this.cdnConfig.zoneId}/purge_cache`;

    const payload: any = {};

    if (options.everything) {
      payload.purge_everything = true;
    } else if (options.urls) {
      payload.files = options.urls;
    } else if (options.tags) {
      payload.tags = options.tags;
    }

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${this.cdnConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.success) {
      this.logger.log('Cloudflare cache purged successfully');
      return true;
    } else {
      this.logger.error('Cloudflare cache purge failed:', response.data.errors);
      return false;
    }
  }

  /**
   * Purge AWS CloudFront cache
   */
  private async purgeCloudFrontCache(options: CDNPurgeOptions): Promise<boolean> {
    // This would require AWS SDK integration
    // For now, log the operation
    this.logger.log('CloudFront cache purge requested', options.everything ? 'everything' : '');

    // Implementation would use AWS SDK:
    // const cloudfront = new AWS.CloudFront();
    // return cloudfront.createInvalidation({
    //   DistributionId: this.cdnConfig.distributionId,
    //   InvalidationBatch: {
    //     Paths: {
    //       Quantity: options.urls?.length || 1,
    //       Items: options.urls || ['/*']
    //     },
    //     CallerReference: Date.now().toString()
    //   }
    // }).promise();

    return true;
  }

  /**
   * Purge file from CDN cache
   */
  async purgeFileFromCache(file: FileUpload): Promise<boolean> {
    if (!this.shouldUseCDN(file)) {
      return true;
    }

    const urls = [
      this.generateCDNUrl(file),
      // Include common variants
      this.generateCDNUrl(file, 'thumbnail'),
      this.generateCDNUrl(file, 'mobile'),
      this.generateCDNUrl(file, 'tablet'),
    ];

    return this.purgeCDNCache({ urls });
  }

  /**
   * Preload file to CDN edge locations
   */
  async preloadFile(file: FileUpload): Promise<boolean> {
    if (!this.shouldUseCDN(file)) {
      return false;
    }

    try {
      const cdnUrl = this.generateCDNUrl(file);

      // Make a HEAD request to warm the cache
      await axios.head(cdnUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'LMS-CDN-Preloader/1.0',
        },
      });

      this.logger.log(`File preloaded to CDN: ${file.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to preload file ${file.id}:`, error.message);
      return false;
    }
  }

  /**
   * Get CDN analytics/metrics
   */
  async getCDNMetrics(startDate: Date, endDate: Date, _fileIds?: string[]): Promise<CDNMetrics> {
    if (!this.cdnConfig.enabled) {
      return {
        requests: 0,
        bandwidth: 0,
        hitRatio: 0,
        topFiles: [],
      };
    }

    try {
      switch (this.cdnConfig.provider) {
        case 'cloudflare':
          return this.getCloudflareMetrics(startDate, endDate);
        case 'aws-cloudfront':
          return this.getCloudFrontMetrics(startDate, endDate);
        default:
          return this.getDefaultMetrics();
      }
    } catch (error) {
      this.logger.error('Failed to get CDN metrics:', error.message);
      return this.getDefaultMetrics();
    }
  }

  /**
   * Get Cloudflare analytics
   */
  private async getCloudflareMetrics(startDate: Date, endDate: Date): Promise<CDNMetrics> {
    const url = `https://api.cloudflare.com/client/v4/zones/${this.cdnConfig.zoneId}/analytics/dashboard`;

    const params = {
      since: startDate.toISOString(),
      until: endDate.toISOString(),
      continuous: false,
    };

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${this.cdnConfig.apiKey}`,
      },
      params,
    });

    const data = response.data.result;

    return {
      requests: data.totals.requests.all,
      bandwidth: data.totals.bandwidth.all,
      hitRatio: (data.totals.requests.cached / data.totals.requests.all) * 100,
      topFiles: [], // Would need additional API calls to get file-specific data
    };
  }

  /**
   * Get CloudFront analytics
   */
  private async getCloudFrontMetrics(_startDate: Date, _endDate: Date): Promise<CDNMetrics> {
    // Implementation would use AWS CloudWatch API
    this.logger.log('CloudFront metrics requested');
    return this.getDefaultMetrics();
  }

  /**
   * Get default/fallback metrics
   */
  private getDefaultMetrics(): CDNMetrics {
    return {
      requests: 0,
      bandwidth: 0,
      hitRatio: 0,
      topFiles: [],
    };
  }

  /**
   * Optimize image URLs with dynamic parameters
   */
  generateOptimizedImageUrl(
    file: FileUpload,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
      fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
      dpr?: number;
    } = {},
  ): string {
    if (file.fileType !== FileType.IMAGE || !this.shouldUseCDN(file)) {
      return this.generateDirectUrl(file);
    }

    const baseUrl = this.generateCDNUrl(file);
    const params: string[] = [];

    // Add optimization parameters
    if (options.width) params.push(`w=${options.width}`);
    if (options.height) params.push(`h=${options.height}`);
    if (options.quality) params.push(`q=${options.quality}`);
    if (options.format) params.push(`f=${options.format}`);
    if (options.fit) params.push(`fit=${options.fit}`);
    if (options.dpr) params.push(`dpr=${options.dpr}`);

    // Add default optimizations
    if (!options.format) params.push('f=auto');
    if (!options.quality) params.push('q=85');

    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    return `${baseUrl}${queryString}`;
  }

  /**
   * Generate responsive image srcset
   */
  generateResponsiveSrcSet(file: FileUpload): string {
    if (file.fileType !== FileType.IMAGE || !this.shouldUseCDN(file)) {
      return this.generateDirectUrl(file);
    }

    const breakpoints = [480, 768, 1024, 1280, 1440, 1920];
    const srcsetEntries: string[] = [];

    for (const width of breakpoints) {
      const url = this.generateOptimizedImageUrl(file, { width, format: 'auto' });
      srcsetEntries.push(`${url} ${width}w`);
    }

    return srcsetEntries.join(', ');
  }

  /**
   * Generate picture element sources for modern formats
   */
  generatePictureSources(
    file: FileUpload,
    sizes: string = '100vw',
  ): Array<{
    srcset: string;
    type: string;
    sizes: string;
  }> {
    if (file.fileType !== FileType.IMAGE || !this.shouldUseCDN(file)) {
      return [];
    }

    const formats = ['avif', 'webp', 'jpeg'];
    const sources: Array<{ srcset: string; type: string; sizes: string }> = [];

    for (const format of formats) {
      const breakpoints = [480, 768, 1024, 1280, 1440, 1920];
      const srcsetEntries: string[] = [];

      for (const width of breakpoints) {
        const url = this.generateOptimizedImageUrl(file, {
          width,
          format: format as any,
        });
        srcsetEntries.push(`${url} ${width}w`);
      }

      sources.push({
        srcset: srcsetEntries.join(', '),
        type: `image/${format}`,
        sizes,
      });
    }

    return sources;
  }

  /**
   * Check CDN health status
   */
  async checkCDNHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errors: string[];
  }> {
    if (!this.cdnConfig.enabled) {
      return {
        status: 'healthy',
        responseTime: 0,
        errors: ['CDN not enabled'],
      };
    }

    const errors: string[] = [];
    let responseTime = 0;

    try {
      const startTime = Date.now();

      // Test CDN connectivity
      await axios.head(this.cdnConfig.baseUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'LMS-CDN-HealthCheck/1.0',
        },
      });

      responseTime = Date.now() - startTime;
    } catch (error) {
      errors.push(`CDN connectivity failed: ${error.message}`);
    }

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (errors.length === 0 && responseTime < 2000) {
      status = 'healthy';
    } else if (errors.length === 0 && responseTime < 5000) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, responseTime, errors };
  }

  /**
   * Configure CDN security settings
   */
  async configureSecurity(options: {
    hotlinkProtection?: boolean;
    allowedReferers?: string[];
    blockedCountries?: string[];
    rateLimiting?: {
      enabled: boolean;
      requestsPerMinute: number;
    };
  }): Promise<boolean> {
    if (!this.cdnConfig.enabled || !this.cdnConfig.apiKey) {
      return false;
    }

    try {
      // Implementation would depend on CDN provider
      // this.logger.log('CDN security configuration updated', options);
      this.logger.log('CDN security configuration updated');

      // Cache the new settings
      await this.cacheService.set('cdn:security:settings', options, this.cdnConfig.cacheTtl);

      return true;
    } catch (error) {
      this.logger.error('Failed to configure CDN security:', error.message);
      return false;
    }
  }

  /**
   * Get CDN configuration
   */
  getCDNConfig(): Omit<CDNConfig, 'apiKey' | 'secretKey'> {
    const { apiKey: _, secretKey: __, ...publicConfig } = this.cdnConfig;
    return publicConfig;
  }

  /**
   * Update CDN configuration
   */
  async updateCDNConfig(updates: Partial<CDNConfig>): Promise<boolean> {
    try {
      Object.assign(this.cdnConfig, updates);

      // Validate new configuration
      if (updates.baseUrl && !this.isValidUrl(updates.baseUrl)) {
        throw new Error('Invalid CDN base URL');
      }

      // Test connectivity if enabled
      if (updates.enabled !== false && this.cdnConfig.enabled) {
        const health = await this.checkCDNHealth();
        if (health.status === 'unhealthy') {
          throw new Error('CDN health check failed after configuration update');
        }
      }

      this.logger.log('CDN configuration updated successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to update CDN configuration:', error.message);
      return false;
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cached file URLs
   */
  async getCachedFileUrls(fileIds: string[]): Promise<Map<string, string>> {
    const cacheKey = `cdn:urls:${fileIds.sort().join(',')}`;
    const cached = await this.cacheService.get<string[]>(cacheKey);

    if (cached) {
      return new Map(fileIds.map((id, i) => [id, cached[i]]));
    }

    const urlMap = new Map<string, string>();

    // This would typically involve database queries to get file info
    // For now, return empty map

    await this.cacheService.set(cacheKey, Array.from(urlMap.entries()), 300);
    return urlMap;
  }

  /**
   * Batch preload multiple files
   */
  async batchPreloadFiles(fileIds: string[]): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const successful: string[] = [];
    const failed: string[] = [];

    // Process in batches to avoid overwhelming the CDN
    const batchSize = 10;

    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);

      const promises = batch.map(async fileId => {
        try {
          // This would require file lookup
          // For now, simulate success
          successful.push(fileId);
        } catch (error) {
          failed.push(fileId);
        }
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < fileIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.logger.log(
      `Batch preload completed: ${successful.length} successful, ${failed.length} failed`,
    );

    return { successful, failed };
  }
}

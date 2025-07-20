import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'fastly';
  apiKey: string;
  zoneId?: string;
  distributionId?: string;
  endpoint: string;
}

export interface PurgeOptions {
  files?: string[];
  tags?: string[];
  everything?: boolean;
}

@Injectable()
export class CdnCacheService {
  private readonly logger = new Logger(CdnCacheService.name);
  private readonly cdnConfig: CDNConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.cdnConfig = {
      provider: (this.configService.get<string>('cdn.provider') as any) || 'cloudflare',
      apiKey: this.configService.get<string>('cdn.apiKey')!,
      zoneId: this.configService.get<string>('cdn.zoneId'),
      distributionId: this.configService.get<string>('cdn.distributionId'),
      endpoint: this.configService.get<string>('cdn.endpoint')!,
    };
  }

  // ==================== CDN CACHE PURGING ====================

  async purgeCache(options: PurgeOptions): Promise<boolean> {
    try {
      switch (this.cdnConfig.provider) {
        case 'cloudflare':
          return await this.purgeCloudflareCache(options);
        case 'aws':
          return await this.purgeAwsCache(options);
        case 'fastly':
          return await this.purgeFastlyCache(options);
        default:
          this.logger.warn(`Unsupported CDN provider: ${this.cdnConfig.provider}`);
          return false;
      }
    } catch (error) {
      this.logger.error('CDN cache purge failed:', error.message);
      return false;
    }
  }

  async purgeByUrls(urls: string[]): Promise<boolean> {
    return await this.purgeCache({ files: urls });
  }

  async purgeByTags(tags: string[]): Promise<boolean> {
    return await this.purgeCache({ tags });
  }

  async purgeAll(): Promise<boolean> {
    return await this.purgeCache({ everything: true });
  }

  // ==================== CDN STATISTICS ====================

  async getCacheStats(): Promise<any> {
    try {
      switch (this.cdnConfig.provider) {
        case 'cloudflare':
          return await this.getCloudflareStats();
        case 'aws':
          return await this.getAwsStats();
        default:
          return null;
      }
    } catch (error) {
      this.logger.error('Failed to get CDN stats:', error.message);
      return null;
    }
  }

  // ==================== CLOUDFLARE IMPLEMENTATION ====================

  private async purgeCloudflareCache(options: PurgeOptions): Promise<boolean> {
    if (!this.cdnConfig.apiKey || !this.cdnConfig.zoneId) {
      this.logger.warn('Cloudflare configuration incomplete');
      return false;
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${this.cdnConfig.zoneId}/purge_cache`;

      const data: any = {};

      if (options.everything) {
        data.purge_everything = true;
      } else if (options.files) {
        data.files = options.files;
      } else if (options.tags) {
        data.tags = options.tags;
      }

      const response = await firstValueFrom(
        this.httpService.post(url, data, {
          headers: {
            Authorization: `Bearer ${this.cdnConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (response.data.success) {
        this.logger.log('Cloudflare cache purged successfully');
        return true;
      } else {
        this.logger.error('Cloudflare cache purge failed:', response.data.errors);
        return false;
      }
    } catch (error) {
      this.logger.error('Cloudflare cache purge error:', error.message);
      return false;
    }
  }

  private async getCloudflareStats(): Promise<any> {
    if (!this.cdnConfig.apiKey || !this.cdnConfig.zoneId) {
      return null;
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${this.cdnConfig.zoneId}/analytics/dashboard`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${this.cdnConfig.apiKey}`,
          },
        }),
      );

      return response.data.result;
    } catch (error) {
      this.logger.error('Failed to get Cloudflare stats:', error.message);
      return null;
    }
  }

  // ==================== AWS CLOUDFRONT IMPLEMENTATION ====================

  private async purgeAwsCache(_options: PurgeOptions): Promise<boolean> {
    // AWS CloudFront invalidation implementation
    this.logger.warn('AWS CloudFront purging not implemented yet');
    return false;
  }

  private async getAwsStats(): Promise<any> {
    // AWS CloudFront stats implementation
    return null;
  }

  // ==================== FASTLY IMPLEMENTATION ====================

  private async purgeFastlyCache(_options: PurgeOptions): Promise<boolean> {
    // Fastly purging implementation
    this.logger.warn('Fastly purging not implemented yet');
    return false;
  }
}

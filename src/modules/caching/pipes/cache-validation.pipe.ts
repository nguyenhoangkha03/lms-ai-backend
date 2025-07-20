import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';

export interface CacheValidationOptions {
  maxCacheSize?: number;
  maxTTL?: number;
  allowedNamespaces?: string[];
  requireAuth?: boolean;
}

@Injectable()
export class CacheValidationPipe implements PipeTransform {
  private readonly logger = new Logger(CacheValidationPipe.name);
  private options: CacheValidationOptions;

  constructor() {
    this.options = {};
  }

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && this.isCacheRequest(value)) {
      this.validateCacheRequest(value);
    }

    if (metadata.type === 'query' && this.isCacheQuery(value)) {
      this.validateCacheQuery(value);
    }

    return value;
  }

  private isCacheRequest(value: any): boolean {
    return value && (value.cacheKey || value.namespace || value.ttl !== undefined);
  }

  private isCacheQuery(value: any): boolean {
    return value && (value.cache === 'false' || value.refresh === 'true');
  }

  private validateCacheRequest(request: any): void {
    // Validate TTL
    if (request.ttl !== undefined) {
      const ttl = Number(request.ttl);
      if (isNaN(ttl) || ttl < 0) {
        throw new BadRequestException('TTL must be a positive number');
      }

      const maxTTL = this.options.maxTTL || 86400; // 24 hours default
      if (ttl > maxTTL) {
        throw new BadRequestException(`TTL cannot exceed ${maxTTL} seconds`);
      }
    }

    // Validate namespace
    if (request.namespace && this.options.allowedNamespaces) {
      if (!this.options.allowedNamespaces.includes(request.namespace)) {
        throw new BadRequestException('Invalid cache namespace');
      }
    }

    // Validate cache key format
    if (request.cacheKey && typeof request.cacheKey === 'string') {
      if (request.cacheKey.length > 250) {
        throw new BadRequestException('Cache key too long (max 250 characters)');
      }

      if (!/^[a-zA-Z0-9:_-]+$/.test(request.cacheKey)) {
        throw new BadRequestException('Cache key contains invalid characters');
      }
    }
  }

  private validateCacheQuery(query: any): void {
    // Validate cache bypass parameters
    if (query.cache === 'false' || query.refresh === 'true') {
      this.logger.debug('Cache bypass requested via query parameters');
    }

    // Validate other cache-related query parameters
    if (query.ttl) {
      const ttl = Number(query.ttl);
      if (isNaN(ttl) || ttl < 0) {
        throw new BadRequestException('Query TTL must be a positive number');
      }
    }
  }
}

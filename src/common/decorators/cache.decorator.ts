import { SetMetadata } from '@nestjs/common';
import { CACHE_CONFIG_KEY, CacheConfig } from '../interceptors/caching.interceptor';

export const Cache = (config: CacheConfig) => SetMetadata(CACHE_CONFIG_KEY, config);

export const CacheResponse = (ttl: number = 300) => Cache({ ttl });

export const CacheWithTags = (ttl: number, tags: string[]) => Cache({ ttl, tags });

export const ConditionalCache = (ttl: number, condition: (req: any) => boolean) =>
  Cache({ ttl, condition });

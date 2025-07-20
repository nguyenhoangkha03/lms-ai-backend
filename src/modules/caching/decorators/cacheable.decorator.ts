import { SetMetadata } from '@nestjs/common';

export interface CacheableOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
  namespace?: string;
  condition?: (args: any[]) => boolean;
  unless?: (result: any) => boolean;
  serialize?: boolean;
  compress?: boolean;
  levels?: ('memory' | 'redis')[];
}

export const CACHEABLE_METADATA = 'cacheable';

export const Cacheable = (options: CacheableOptions = {}) => {
  return SetMetadata(CACHEABLE_METADATA, {
    ttl: 300,
    levels: ['memory', 'redis'],
    serialize: true,
    ...options,
  });
};

// Specific decorators for common use cases
export const CacheQueries = (ttl: number = 300) => {
  return Cacheable({
    ttl,
    namespace: 'db_query',
    tags: ['database'],
    levels: ['memory', 'redis'],
  });
};

export const CacheApiResponse = (ttl: number = 60) => {
  return Cacheable({
    ttl,
    namespace: 'api',
    tags: ['api_response'],
    levels: ['memory', 'redis'],
  });
};

export const CacheStaticData = (ttl: number = 3600) => {
  return Cacheable({
    ttl,
    namespace: 'static',
    tags: ['static_data'],
    levels: ['memory', 'redis'],
  });
};

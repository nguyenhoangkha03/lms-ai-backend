import { SetMetadata } from '@nestjs/common';

export interface CacheKeyOptions {
  prefix?: string;
  template?: string;
  suffix?: string;
  include?: string[];
  exclude?: string[];
  hash?: boolean;
}

export const CACHE_KEY_METADATA = 'cache_key';

export const CacheKey = (template: string, options: CacheKeyOptions = {}) => {
  return SetMetadata(CACHE_KEY_METADATA, {
    template,
    ...options,
  });
};

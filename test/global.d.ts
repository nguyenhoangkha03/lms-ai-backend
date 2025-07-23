/* eslint-disable no-var */
import type { CacheService } from '../src/cache/cache.service';

declare global {
  var createMockCacheService: () => Partial<CacheService>;
  var createMockRepository: () => Partial<Repository<any>>;
}

export {};

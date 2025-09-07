import { Provider } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { PerformanceGuard } from '@/common/guards/performance.guard';

import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';
import { CachingInterceptor } from '@/common/interceptors/caching.interceptor';

import { PerformanceExceptionFilter } from '../filters/performance-exception.filter';

export const performanceProviders: Provider[] = [
  {
    provide: APP_GUARD,
    useClass: RateLimitGuard,
  },
  {
    provide: APP_GUARD,
    useClass: PerformanceGuard,
  },

  {
    provide: APP_INTERCEPTOR,
    useClass: PerformanceInterceptor,
  },
  // Temporarily disable caching interceptor to test date serialization
  // {
  //   provide: APP_INTERCEPTOR,
  //   useClass: CachingInterceptor,
  // },

  {
    provide: APP_FILTER,
    useClass: PerformanceExceptionFilter,
  },
];

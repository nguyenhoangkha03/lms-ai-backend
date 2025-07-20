import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

// Import existing cache module
import { CustomCacheModule } from '@/cache/cache.module';
import { RedisModule } from '@/redis/redis.module';

// Services
import { AdvancedCacheService } from './services/advanced-cache.service';
import { DatabaseCacheService } from './services/database-cache.service';
import { CdnCacheService } from './services/cdn-cache.service';
import { StaticAssetCacheService } from './services/static-asset-cache.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';

// Controllers
import { CacheManagementController } from './controllers/cache-management.controller';
import { CacheAnalyticsController } from './controllers/cache-analytics.controller';

// Interceptors
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { CacheInvalidationInterceptor } from './interceptors/cache-invalidation.interceptor';
import { QueryCacheInterceptor } from './interceptors/query-cache.interceptor';

// Guards
import { CacheBypassGuard } from './guards/cache-bypass.guard';

// Middleware
import { CacheHeadersMiddleware } from './middleware/cache-headers.middleware';

// Pipes
import { CacheValidationPipe } from './pipes/cache-validation.pipe';

// Processors
import { CacheOptimizationProcessor } from './processors/cache-optimization.processor';
import { CacheWarmupProcessor } from './processors/cache-warmup.processor';

// Queue names
import { CACHE_OPTIMIZATION_QUEUE, CACHE_WARMUP_QUEUE } from './queues/queue.constant';

// Other module
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(),
    CustomCacheModule,
    RedisModule,
    AuthModule,
    BullModule.registerQueue({ name: CACHE_OPTIMIZATION_QUEUE }, { name: CACHE_WARMUP_QUEUE }),
  ],
  controllers: [CacheManagementController, CacheAnalyticsController],
  providers: [
    // Core Services
    AdvancedCacheService,
    DatabaseCacheService,
    CdnCacheService,
    StaticAssetCacheService,
    CacheInvalidationService,

    // Interceptors
    CacheInterceptor,
    CacheInvalidationInterceptor,
    QueryCacheInterceptor,

    // Guards
    CacheBypassGuard,

    // Middleware
    CacheHeadersMiddleware,

    // Pipes
    CacheValidationPipe,

    // Processors
    CacheOptimizationProcessor,
    CacheWarmupProcessor,
  ],
  exports: [
    AdvancedCacheService,
    DatabaseCacheService,
    CdnCacheService,
    StaticAssetCacheService,
    CacheInvalidationService,
    CacheInterceptor,
    CacheInvalidationInterceptor,
    QueryCacheInterceptor,
    CacheBypassGuard,
    CacheHeadersMiddleware,
    CacheValidationPipe,
  ],
})
export class CachingModule {}

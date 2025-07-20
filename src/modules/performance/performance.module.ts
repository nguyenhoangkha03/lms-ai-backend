import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '@/redis/redis.module';
import { WinstonModule } from '@/logger/winston.module';

// Services
import { QueryBuilderService } from '@/common/services/query-builder.service';
import { SerializationService } from '@/common/services/serialization.service';
import { RateLimitingService } from '@/common/services/rate-limiting.service';
import { PerformanceMonitoringService } from './services/performance-monitoring.service';
import { QueryOptimizationService } from './services/query-optimization.service';

// Guards
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { PerformanceGuard } from '@/common/guards/performance.guard';

// Interceptors
import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';
import { CachingInterceptor } from '@/common/interceptors/caching.interceptor';

// Middleware
import { CompressionMiddleware } from '@/common/middleware/compression.middleware';
import { ResponseOptimizationMiddleware } from '@/common/middleware/response-optimization.middleware';
import { PerformanceController } from './controllers/performance.controller';

// Controllers

@Global()
@Module({
  imports: [
    ConfigModule,
    RedisModule,
    WinstonModule,
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: 60,
            limit: 100,
          },
        ],
      }),
    }),
  ],
  providers: [
    // Core services
    QueryBuilderService,
    SerializationService,
    RateLimitingService,
    PerformanceMonitoringService,
    QueryOptimizationService,

    // Guards
    RateLimitGuard,
    PerformanceGuard,

    // Interceptors
    PerformanceInterceptor,
    CachingInterceptor,

    // Middleware
    CompressionMiddleware,
    ResponseOptimizationMiddleware,
  ],
  controllers: [PerformanceController],
  exports: [
    QueryBuilderService,
    SerializationService,
    RateLimitingService,
    PerformanceMonitoringService,
    QueryOptimizationService,
    RateLimitGuard,
    PerformanceGuard,
    PerformanceInterceptor,
    CachingInterceptor,
  ],
})
export class PerformanceModule {}

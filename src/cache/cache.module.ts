import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';
import { LoggerModule } from 'common/logger/logger.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore as any, // Dùng Redis làm store cho cache (thay vì memory mặc định)
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db'),
          ttl: 300, // thời gian sống mặc định (300 giây = 5 phút)
          max: 1000, // Giới hạn số lượng cache tối đa là 1000 item.

          // Redis specific options
          retry_unfulfilled_commands: true, // thử lại các lệnh chưa được thực thi.
          retry_delay_on_failover: 100, // Độ trễ (tính bằng mili giây) trước khi thử lại lệnh trong kịch bản "failover".
          enable_offline_queue: false, // Bật/Tắt hàng đợi lệnh ngoại tuyến.

          // Connection options
          socket: {
            keepAlive: true,
            initialDelay: 0,
            reconnectDelay: 50,
          },
        };
      },
    }),
    LoggerModule,
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class CustomCacheModule {}

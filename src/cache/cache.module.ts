import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';
import { LoggerModule } from '@/logger/logger.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // CacheModule.register({
    //   ttl: 5000, // 5 giây
    //   max: 100, // tối đa 100 items
    // }),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          store: redisStore, // Dùng Redis làm store cho cache (thay vì memory mặc định)
          host: configService.get<string>('redis.host') || 'localhost',
          port: configService.get<number>('redis.port') || 6379,
          //   password: configService.get<string>('redis.password') || 'khagom12',
          database: configService.get<number>('redis.db') || 0,
          ttl: 300, // thời gian sống mặc định (300 giây = 5 phút)
          max: 1000, // Giới hạn số lượng cache tối đa là 1000 item.

          // Redis specific options
          //   retry_unfulfilled_commands: true, // thử lại các lệnh chưa được thực thi.
          //   retry_delay_on_failover: 100, // Độ trễ (tính bằng mili giây) trước khi thử lại lệnh trong kịch bản "failover".
          //   enable_offline_queue: false, // Bật/Tắt hàng đợi lệnh ngoại tuyến.

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
  exports: [CacheService],
})
export class CustomCacheModule {}

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';
import { WinstonModule } from '@/logger/winston.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
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

          // Connection options
          socket: {
            keepAlive: true, // Giữ kết nối Redis lâu dài, không tự ngắt sau thời gian rảnh
            initialDelay: 0, // Độ trễ ban đầu trước khi bắt đầu keep-alive (0 = không trễ)
            reconnectDelay: 50, // 	Thời gian chờ giữa các lần reconnect nếu mất kết nối (ms)
          },
        };
      },
    }),
    WinstonModule,
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CustomCacheModule {}

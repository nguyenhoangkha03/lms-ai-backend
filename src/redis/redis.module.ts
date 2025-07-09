import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { WinstonModule } from '@/logger/winston.module';
import { REDIS_CLIENT } from '@/common/constants/redis.constant';

@Module({
  imports: [WinstonModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db'),

          // Connection options
          maxRetriesPerRequest: 3, // Thứ lại 3 lần
          enableOfflineQueue: false, // Không xếp hàng lệnh khi đang mất kết nối

          // Reconnection
          lazyConnect: true, // Chỉ kết nối khi có lệnh đầu tiên
          keepAlive: 30000, // Gửi lệnh PING mỗi 30 giây để giữ kết nối
          connectTimeout: 10000, // Thời gian chờ kết nối tối đa 10 giây
          commandTimeout: 5000, // Thời gian chờ lệnh tối đa 5 giây

          // Key prefix for this application
          keyPrefix: 'lms-ai:', // Tiền tố cho tất cả các khóa Redis

          // Thử lại kết nối
          retryStrategy: times => {
            return Math.min(times * 100, 2000); // Retry sau 100ms, 200ms... tối đa 2s
          },

          // Điều kiện tái kết nối khi gặp lỗi
          reconnectOnError: err => {
            const targetErrors = ['READONLY', 'ETIMEDOUT'];
            return targetErrors.some(msg => err.message.includes(msg));
          },
        });

        redis.on('connect', () => {
          console.log('✅ Redis connected successfully');
        });

        redis.on('error', error => {
          console.error('❌ Redis connection error:', error);
        });

        redis.on('ready', () => {
          console.log('✅ Redis is ready to receive commands');
        });

        return redis;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { LoggerModule } from '@/logger/logger.module';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [LoggerModule],
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
          //   retryDelayOnFailover: 100,
          //   retryDelayOnClusterDown: 300,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,

          // Reconnection
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000,

          // Key prefix for this application
          keyPrefix: 'lms-ai:',

          retryStrategy: times => {
            return Math.min(times * 100, 2000); // Retry sau 100ms, 200ms... tối đa 2s
          },
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

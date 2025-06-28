import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '@/config/configuration';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'common/logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { CustomCacheModule } from './cache/cache.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseController } from './database/database.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration], // truyền vào hàm trả về đối tượng, không truyền thẳng đối tượng vì sẽ load trước
      isGlobal: true, // các module khác sử dụng k cần import
      cache: true, //sẽ chỉ chạy hàm configuration và đọc các tệp .env một lần duy nhất khi ứng dụng khởi động. Kết quả sẽ được lưu vào bộ nhớ đệm (cache).
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('security.rateLimit.ttl', 60000),
            limit: configService.get<number>('security.rateLimit.limit', 10),
          },
        ],
      }),
    }),

    LoggerModule,
    DatabaseModule,
    CustomCacheModule,
    RedisModule,
  ],
  controllers: [AppController, DatabaseController],
  providers: [AppService],
})
export class AppModule {}

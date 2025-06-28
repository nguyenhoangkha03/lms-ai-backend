import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from 'config/configuration';
import { DatabaseService } from './database.service';
import { LoggerModule } from 'common/logger/logger.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomCacheModule } from '@/cache/cache.module';
import { RedisModule } from '@/redis/redis.module';
import { SeedModule } from './seeds/seed.module';
import { DatabaseOptimizationService } from './database-optimization.service';
import { DatabaseHealthService } from './database-health.service';
import { BackupService } from './backup.service';
import { DatabaseMonitoringService } from './monitoring.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');

        return {
          type: 'mysql',
          host: dbConfig?.host,
          port: dbConfig?.port,
          username: dbConfig?.username,
          password: dbConfig?.password,
          database: dbConfig?.database,

          // Entity configuration
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],

          // Development settings
          synchronize: dbConfig?.synchronize, // false in production
          logging: dbConfig?.logging,

          // Connection pool settings
          extra: {
            connectionLimit: 20,
            // acquireTimeout: 60000,
            // timeout: 60000,
            // reconnect: true,
            charset: 'utf8mb4',
          },

          // SSL configuration for production
          ssl: dbConfig?.ssl
            ? {
                rejectUnauthorized: false,
              }
            : false,

          // Migration settings
          migrationsRun: false, // We'll run manually
          migrationsTableName: 'migrations_history',

          // Timezone handling
          timezone: '+00:00',

          // Performance optimizations
          cache: {
            duration: 30000, // 30 seconds
            type: 'redis',
            options: {
              host: configService.get<string>('redis.host'),
              port: configService.get<number>('redis.port'),
              password: configService.get<string>('redis.password'),
              db: 1, // Use DB 1 for TypeORM cache
            },
          },
        };
      },
    }),
    LoggerModule,
    ScheduleModule.forRoot(),
    CustomCacheModule,
    RedisModule,
    SeedModule,
  ],
  providers: [
    DatabaseService,
    DatabaseOptimizationService,
    DatabaseHealthService,
    BackupService,
    DatabaseMonitoringService,
  ],
  exports: [
    DatabaseService,
    DatabaseOptimizationService,
    DatabaseHealthService,
    BackupService,
    DatabaseMonitoringService,
  ],
})
export class DatabaseModule {}

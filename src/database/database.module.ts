import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from '@/config/configuration';
import { DatabaseService } from './services/database.service';
import { WinstonModule } from '@/logger/winston.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomCacheModule } from '@/cache/cache.module';
import { RedisModule } from '@/redis/redis.module';
import { SeedModule } from './seeds/seed.module';
import { DatabaseOptimizationService } from './services/database-optimization.service';
import { DatabaseHealthService } from './services/database-health.service';
import { BackupService } from './services/backup.service';
import { DatabaseMonitoringService } from './services/monitoring.service';

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
          synchronize: dbConfig?.synchronize,
          logging: dbConfig?.logging,

          // Connection pool settings
          extra: {
            connectionLimit: 20,
            charset: 'utf8mb4',
          },

          // SSL configuration for production
          ssl: dbConfig?.ssl
            ? {
                rejectUnauthorized: false,
              }
            : false,

          // Migration settings
          migrationsRun: false,
          migrationsTableName: 'migrations_history',

          // Timezone handling
          timezone: '+00:00',
          
          // Date transformation
          dateStrings: false,

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
    WinstonModule,
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

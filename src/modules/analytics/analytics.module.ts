import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { CustomCacheModule as CacheModule } from '@/cache/cache.module';

// Entities
import { LearningActivity } from './entities/learning-activity.entity';
import { LearningSession } from './entities/learning-session.entity';
import { LearningAnalytics } from './entities/learning-analytics.entity';

// Controllers
import { AnalyticsController } from './controllers/analytics.controller';
import { DataCollectionController } from './controllers/data-collection.controller';

// Services
import { DataCollectionService } from './services/data-collection.service';
import { RealTimeStreamingService } from './services/real-time-streaming.service';
import { BehaviorAnalyticsService } from './services/behavior-analytics.service';

// Gateways
import { AnalyticsGateway } from './gateways/analytics.gateway';

// Listeners
import { AnalyticsEventsListener } from './listeners/analytics-events.listener';
import { WinstonModule } from '@/logger/winston.module';
import { RedisModule } from '@/redis/redis.module';
import { AuthModule } from '../auth/auth.module';

// Processors (for background jobs)
// import { AnalyticsProcessor } from './processors/analytics.processor';
import { AnalyticsProcessingService } from './services/analytics-processing.service';
import { AnalyticsProcessingController } from './controllers/analytics-processing.controller';
import { ComparativeAnalyticsService } from './services/comparative-analytics.service';
import { PredictiveModelingService } from './services/predictive-modeling.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LearningActivity, LearningSession, LearningAnalytics]),
    EventEmitterModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    BullModule.registerQueue({
      name: 'analytics',
    }),
    WinstonModule,
    CacheModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [AnalyticsController, DataCollectionController, AnalyticsProcessingController],
  providers: [
    DataCollectionService,
    RealTimeStreamingService,
    BehaviorAnalyticsService,
    AnalyticsGateway,
    AnalyticsEventsListener,
    AnalyticsProcessingService,
    ComparativeAnalyticsService,
    PredictiveModelingService,
    // AnalyticsProcessor,
  ],
  exports: [
    TypeOrmModule,
    DataCollectionService,
    RealTimeStreamingService,
    BehaviorAnalyticsService,
    AnalyticsGateway,
  ],
})
export class AnalyticsModule {}

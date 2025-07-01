import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningActivity } from './entities/learning-activity.entity';
import { LearningSession } from './entities/learning-session.entity';
import { LearningAnalytics } from './entities/learning-analytics.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LearningActivity, LearningSession, LearningAnalytics])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [TypeOrmModule],
})
export class AnalyticsModule {}

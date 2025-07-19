import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { RecommendationService } from './recommendation.service';

@Injectable()
export class RecommendationCronService {
  private readonly logger = new Logger(RecommendationCronService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectQueue('recommendation')
    private readonly recommendationQueue: Queue,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyRecommendations(): Promise<void> {
    try {
      this.logger.log('Starting daily recommendation generation');

      // Get active users from last 30 days
      const activeUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.lastLoginAt > :date', {
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .getMany();

      this.logger.log(`Found ${activeUsers.length} active users for recommendation generation`);

      // Queue recommendation generation for each user
      for (const user of activeUsers) {
        await this.recommendationQueue.add(
          'generate-personalized-recommendations',
          { userId: user.id },
          {
            delay: Math.random() * 60000, // Random delay up to 1 minute
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000, // hoặc delay theo ý bạn
            },
          },
        );
      }

      this.logger.log('Daily recommendation generation jobs queued successfully');
    } catch (error) {
      this.logger.error(`Failed to generate daily recommendations: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateActiveUserRecommendations(): Promise<void> {
    try {
      this.logger.log('Updating recommendations for currently active users');

      // Get users active in the last hour
      const recentlyActiveUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.lastActivityAt > :date', {
          date: new Date(Date.now() - 60 * 60 * 1000),
        })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .take(100) // Limit to 100 users per hour to avoid overload
        .getMany();

      this.logger.log(
        `Updating recommendations for ${recentlyActiveUsers.length} recently active users`,
      );

      // Update recommendations for recently active users
      for (const user of recentlyActiveUsers) {
        await this.recommendationQueue.add(
          'generate-personalized-recommendations',
          { userId: user.id, priority: 'high' },
          {
            priority: 1, // High priority for active users
            attempts: 2,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update active user recommendations: ${error.message}`);
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async updateCollaborativeFilteringModel(): Promise<void> {
    try {
      this.logger.log('Updating collaborative filtering model');

      // Get recent user interactions
      const recentInteractions = await this.getRecentInteractions();

      if (recentInteractions.length > 100) {
        // Only update if significant new data
        await this.recommendationQueue.add(
          'update-collaborative-filtering',
          {
            interactions: recentInteractions,
            updateType: 'incremental',
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000, // hoặc delay theo ý bạn
            },
          },
        );

        this.logger.log(
          `Queued collaborative filtering update with ${recentInteractions.length} interactions`,
        );
      } else {
        this.logger.log('Insufficient new interactions for model update');
      }
    } catch (error) {
      this.logger.error(`Failed to update collaborative filtering model: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weeklyRecommendationCleanup(): Promise<void> {
    try {
      this.logger.log('Starting weekly recommendation cleanup');

      // Clean up old recommendations
      await this.recommendationService.cleanupOldRecommendations();

      // Regenerate recommendations for users who haven't been active
      const inactiveUsers = await this.userRepository
        .createQueryBuilder('user')
        .where('user.lastLoginAt BETWEEN :start AND :end', {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
          end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .take(500) // Limit weekly batch
        .getMany();

      for (const user of inactiveUsers) {
        await this.recommendationQueue.add(
          'generate-personalized-recommendations',
          { userId: user.id, type: 'reengagement' },
          {
            delay: Math.random() * 3600000, // Random delay up to 1 hour
            attempts: 2,
          },
        );
      }

      this.logger.log(
        `Weekly cleanup completed. Regenerating recommendations for ${inactiveUsers.length} inactive users`,
      );
    } catch (error) {
      this.logger.error(`Failed weekly recommendation cleanup: ${error.message}`);
    }
  }

  @Cron('0 0 1 * *') // Monthly on the 1st at midnight
  async monthlyModelRetraining(): Promise<void> {
    try {
      this.logger.log('Starting monthly model retraining');

      // Trigger full model retraining with accumulated data
      await this.recommendationQueue.add(
        'retrain-recommendation-models',
        {
          modelTypes: ['collaborative_filtering', 'content_based', 'hybrid'],
          retrainingType: 'full',
        },
        {
          attempts: 1,
          timeout: 3600000, // 1 hour timeout
        },
      );

      this.logger.log('Monthly model retraining job queued');
    } catch (error) {
      this.logger.error(`Failed to queue monthly model retraining: ${error.message}`);
    }
  }

  private async getRecentInteractions(): Promise<any[]> {
    try {
      // This would query recent user interactions from the analytics module
      // For now, return empty array as placeholder
      return [];
    } catch (error) {
      this.logger.error(`Failed to get recent interactions: ${error.message}`);
      return [];
    }
  }
}

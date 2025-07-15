import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AIRecommendation } from '../entities/ai-recommendation.entity';
import { RecommendationStatus } from '@/common/enums/ai.enums';
// import { UserType } from '@/common/enums/user.enums';

@Injectable()
export class RecommendationCronService {
  private readonly logger = new Logger(RecommendationCronService.name);

  constructor(
    @InjectQueue('recommendation') private readonly recommendationQueue: Queue,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AIRecommendation)
    private readonly recommendationRepository: Repository<AIRecommendation>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async generateDailyRecommendations() {
    this.logger.log('Starting daily recommendation generation');

    try {
      // Get active users who haven't received recommendations in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const usersNeedingRecommendations = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.recommendations', 'rec', 'rec.createdAt > :yesterday', { yesterday })
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('user.role = :role', { role: 'student' })
        .andWhere('rec.id IS NULL') // Users without recent recommendations
        .select(['user.id'])
        .getMany();

      if (usersNeedingRecommendations.length === 0) {
        this.logger.log('No users need daily recommendations');
        return;
      }

      // Queue bulk recommendation generation
      await this.recommendationQueue.add(
        'bulk-generate',
        {
          userIds: usersNeedingRecommendations.map(u => u.id),
          types: ['learning_path', 'content'],
          forceRegenerate: false,
        },
        {
          priority: 5,
          attempts: 3,
          backoff: 1,
        },
      );

      this.logger.log(
        `Queued daily recommendations for ${usersNeedingRecommendations.length} users`,
      );
    } catch (error) {
      this.logger.error('Failed to queue daily recommendations:', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async updateActiveRecommendations() {
    this.logger.log('Updating active recommendations');

    try {
      // Mark expired recommendations
      const now = new Date();
      const expiredCount = await this.recommendationRepository
        .createQueryBuilder()
        .update(AIRecommendation)
        .set({ status: RecommendationStatus.EXPIRED })
        .where('expiresAt < :now', { now })
        .andWhere('status IN (:...statuses)', {
          statuses: [RecommendationStatus.PENDING, RecommendationStatus.ACTIVE],
        })
        .execute();

      this.logger.log(`Marked ${expiredCount.affected} recommendations as expired`);

      // Activate pending recommendations that should be shown now
      const activatedCount = await this.recommendationRepository
        .createQueryBuilder()
        .update(AIRecommendation)
        .set({ status: RecommendationStatus.ACTIVE })
        .where('status = :status', { status: RecommendationStatus.PENDING })
        .andWhere('(expiresAt IS NULL OR expiresAt > :now)', { now })
        .andWhere('createdAt <= :activationTime', {
          activationTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        })
        .execute();

      this.logger.log(`Activated ${activatedCount.affected} pending recommendations`);
    } catch (error) {
      this.logger.error('Failed to update active recommendations:', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldRecommendations() {
    this.logger.log('Starting weekly recommendation cleanup');

    try {
      await this.recommendationQueue.add(
        'cleanup-expired',
        {
          olderThanDays: 30,
          status: ['expired', 'dismissed'],
        },
        {
          priority: 1,
          attempts: 2,
        },
      );

      this.logger.log('Queued weekly recommendation cleanup');
    } catch (error) {
      this.logger.error('Failed to queue recommendation cleanup:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generatePerformanceBasedRecommendations() {
    this.logger.log('Checking for performance-based recommendation triggers');

    try {
      // Find users with recent poor performance who might need difficulty adjustments
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // This is a simplified query - in practice, you'd analyze assessment scores
      const strugglingUsers = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.assessmentAttempts', 'attempt')
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('attempt.createdAt > :sevenDaysAgo', { sevenDaysAgo })
        .andWhere('attempt.score < :threshold', { threshold: 60 })
        .groupBy('user.id')
        .having('COUNT(attempt.id) >= :minAttempts', { minAttempts: 3 })
        .select(['user.id'])
        .getMany();

      if (strugglingUsers.length > 0) {
        // Queue difficulty adjustment recommendations for struggling users
        for (const user of strugglingUsers) {
          await this.recommendationQueue.add(
            'user-recommendations',
            {
              userId: user.id,
              type: 'difficulty',
            },
            {
              priority: 8, // High priority for struggling users
              attempts: 2,
            },
          );
        }

        this.logger.log(
          `Queued difficulty adjustments for ${strugglingUsers.length} struggling users`,
        );
      }

      // Find high-performing users who might be ready for more challenges
      const excellentUsers = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.assessmentAttempts', 'attempt')
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('attempt.createdAt > :sevenDaysAgo', { sevenDaysAgo })
        .andWhere('attempt.score >= :threshold', { threshold: 85 })
        .groupBy('user.id')
        .having('COUNT(attempt.id) >= :minAttempts', { minAttempts: 3 })
        .andHaving('AVG(attempt.score) >= :avgThreshold', { avgThreshold: 85 })
        .select(['user.id'])
        .getMany();

      if (excellentUsers.length > 0) {
        // Queue advanced content recommendations for excellent users
        for (const user of excellentUsers) {
          await this.recommendationQueue.add(
            'user-recommendations',
            {
              userId: user.id,
              type: 'content',
              options: { difficultyLevel: 'advanced' },
            },
            {
              priority: 6,
              attempts: 2,
            },
          );
        }

        this.logger.log(`Queued advanced content for ${excellentUsers.length} excellent users`);
      }
    } catch (error) {
      this.logger.error('Failed to generate performance-based recommendations:', error);
    }
  }

  @Cron('0 0 1 * *') // First day of every month
  async generateMonthlyLearningPaths() {
    this.logger.log('Generating monthly learning path updates');

    try {
      // Get all active students
      const activeStudents = await this.userRepository.find({
        where: {
          isActive: true,
        },
        select: ['id'],
      });

      if (activeStudents.length === 0) {
        this.logger.log('No active students found for monthly learning paths');
        return;
      }

      // Queue learning path generation for all active students
      await this.recommendationQueue.add(
        'bulk-generate',
        {
          userIds: activeStudents.map(s => s.id),
          types: ['learning_path', 'schedule'],
          forceRegenerate: true,
        },
        {
          priority: 3,
          attempts: 3,
          backoff: 1,
        },
      );

      this.logger.log(`Queued monthly learning path updates for ${activeStudents.length} students`);
    } catch (error) {
      this.logger.error('Failed to generate monthly learning paths:', error);
    }
  }

  @Cron('0 */4 * * *') // Every 4 hours
  async generateAdaptiveRecommendations() {
    this.logger.log('Generating adaptive recommendations based on recent activity');

    try {
      // Find users with recent activity but no recent recommendations
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const activeUsers = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.learningActivities', 'activity', 'activity.timestamp > :fourHoursAgo', {
          fourHoursAgo,
        })
        .leftJoin('user.recommendations', 'rec', 'rec.createdAt > :oneDayAgo', { oneDayAgo })
        .where('user.isActive = :isActive', { isActive: true })
        .andWhere('rec.id IS NULL')
        .select(['user.id'])
        .groupBy('user.id')
        .having('COUNT(activity.id) >= :minActivities', { minActivities: 5 })
        .getMany();

      if (activeUsers.length > 0) {
        // Queue adaptive recommendations for recently active users
        for (const user of activeUsers) {
          await this.recommendationQueue.add(
            'user-recommendations',
            {
              userId: user.id,
              type: 'all',
            },
            {
              priority: 7,
              attempts: 2,
            },
          );
        }

        this.logger.log(`Queued adaptive recommendations for ${activeUsers.length} active users`);
      }
    } catch (error) {
      this.logger.error('Failed to generate adaptive recommendations:', error);
    }
  }

  async triggerImmediateRecommendations(userId: string, trigger: string) {
    this.logger.log(`Triggering immediate recommendations for user ${userId} due to: ${trigger}`);

    try {
      let recommendationType: string;
      let priority = 5;

      switch (trigger) {
        case 'course_completed':
          recommendationType = 'content';
          priority = 9;
          break;
        case 'assessment_failed':
          recommendationType = 'difficulty';
          priority = 10;
          break;
        case 'long_inactivity':
          recommendationType = 'schedule';
          priority = 8;
          break;
        case 'new_enrollment':
          recommendationType = 'learning_path';
          priority = 9;
          break;
        default:
          recommendationType = 'all';
          priority = 6;
      }

      await this.recommendationQueue.add(
        'user-recommendations',
        {
          userId,
          type: recommendationType,
          options: { trigger },
        },
        {
          priority,
          attempts: 2,
        },
      );

      this.logger.log(`Queued immediate ${recommendationType} recommendations for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to trigger immediate recommendations for user ${userId}:`, error);
    }
  }
}

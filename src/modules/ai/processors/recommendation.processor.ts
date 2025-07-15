import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RecommendationService } from '../services/recommendation.service';

export interface BulkRecommendationJob {
  userIds: string[];
  types?: string[];
  forceRegenerate?: boolean;
}

export interface UserRecommendationJob {
  userId: string;
  type: 'all' | 'learning_path' | 'content' | 'difficulty' | 'schedule' | 'performance';
  options?: Record<string, any>;
}

export interface RecommendationCleanupJob {
  olderThanDays: number;
  status?: string[];
}

@Processor('recommendation')
export class RecommendationProcessor {
  private readonly logger = new Logger(RecommendationProcessor.name);

  constructor(private readonly recommendationService: RecommendationService) {}

  @Process('bulk-generate')
  async handleBulkGeneration(job: Job<BulkRecommendationJob>) {
    this.logger.log(
      `Processing bulk recommendation generation for ${job.data.userIds.length} users`,
    );

    let processed = 0;
    let failed = 0;

    for (const userId of job.data.userIds) {
      try {
        // Update job progress
        const progress = Math.round((processed / job.data.userIds.length) * 100);
        await job.progress(progress);

        await this.recommendationService.generateAllRecommendations(userId);
        processed++;

        this.logger.debug(
          `Generated recommendations for user ${userId} (${processed}/${job.data.userIds.length})`,
        );
      } catch (error) {
        failed++;
        this.logger.error(`Failed to generate recommendations for user ${userId}:`, error);
      }
    }

    await job.progress(100);
    this.logger.log(`Bulk generation completed: ${processed} successful, ${failed} failed`);

    return {
      processed,
      failed,
      total: job.data.userIds.length,
    };
  }

  @Process('user-recommendations')
  async handleUserRecommendations(job: Job<UserRecommendationJob>) {
    this.logger.log(`Generating ${job.data.type} recommendations for user: ${job.data.userId}`);

    try {
      let result;

      switch (job.data.type) {
        case 'all':
          result = await this.recommendationService.generateAllRecommendations(job.data.userId);
          break;
        case 'learning_path':
          result = await this.recommendationService.generatePersonalizedLearningPath(
            job.data.userId,
          );
          break;
        case 'content':
          result = await this.recommendationService.generateContentRecommendations(job.data.userId);
          break;
        case 'difficulty':
          result = await this.recommendationService.generateDifficultyAdjustments(job.data.userId);
          break;
        case 'schedule':
          result = await this.recommendationService.generateStudyScheduleOptimization(
            job.data.userId,
          );
          break;
        case 'performance':
          result = await this.recommendationService.generatePerformanceImprovements(
            job.data.userId,
          );
          break;
        default:
          throw new Error(`Unknown recommendation type: ${job.data.type}`);
      }

      this.logger.log(
        `Successfully generated ${job.data.type} recommendations for user: ${job.data.userId}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to generate recommendations for user ${job.data.userId}:`, error);
      throw error;
    }
  }

  @Process('cleanup-expired')
  async handleCleanupExpired(job: Job<RecommendationCleanupJob>) {
    this.logger.log(
      `Cleaning up expired recommendations older than ${job.data.olderThanDays} days`,
    );

    try {
      // Implementation would clean up expired recommendations
      // This is a placeholder for the actual cleanup logic
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - job.data.olderThanDays);

      // Query to count recommendations to be cleaned up
      // const cleanupCount = await this.recommendationRepository.count({
      //   where: {
      //     expiresAt: LessThan(cutoffDate),
      //     status: In(job.data.status || ['expired'])
      //   }
      // });

      // Actual cleanup
      // await this.recommendationRepository.delete({
      //   expiresAt: LessThan(cutoffDate),
      //   status: In(job.data.status || ['expired'])
      // });

      const cleanupCount = 0; // Placeholder
      this.logger.log(`Cleaned up ${cleanupCount} expired recommendations`);

      return { cleanedUp: cleanupCount };
    } catch (error) {
      this.logger.error('Failed to cleanup expired recommendations:', error);
      throw error;
    }
  }
}

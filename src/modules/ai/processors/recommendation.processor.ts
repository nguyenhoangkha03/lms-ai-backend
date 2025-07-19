import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RecommendationService } from '../services/recommendation.service';

@Processor('recommendation')
export class RecommendationProcessor {
  private readonly logger = new Logger(RecommendationProcessor.name);

  constructor(private readonly recommendationService: RecommendationService) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing recommendation job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(
      `Completed recommendation job ${job.id} with result: ${JSON.stringify(result)}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Failed recommendation job ${job.id}: ${err.message}`);
  }

  @Process('generate-personalized-recommendations')
  async generatePersonalizedRecommendations(job: Job<{ userId: string; options?: any }>) {
    const { userId, options: _ } = job.data;

    try {
      const recommendations =
        await this.recommendationService.generatePersonalizedLearningPath(userId);

      return {
        success: true,
        userId,
        recommendationsCount: recommendations.length,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate recommendations for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Process('update-collaborative-filtering')
  async updateCollaborativeFiltering(job: Job<{ userId: string; interactionData: any }>) {
    const { userId, interactionData } = job.data;

    try {
      // Update collaborative filtering model with new interaction data
      await this.recommendationService.updateUserInteractionData(userId, interactionData);

      return {
        success: true,
        userId,
        dataUpdated: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to update collaborative filtering for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  @Process('generate-content-similarity')
  async generateContentSimilarity(job: Job<{ contentId: string; contentType: string }>) {
    const { contentId, contentType } = job.data;

    try {
      // This would trigger content similarity analysis
      this.logger.log(`Generating content similarity for ${contentType}: ${contentId}`);

      return {
        success: true,
        contentId,
        similarityGenerated: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate content similarity for ${contentId}: ${error.message}`);
      throw error;
    }
  }

  @Process('batch-recommendation-update')
  async batchRecommendationUpdate(job: Job<{ userIds: string[]; updateType: string }>) {
    const { userIds, updateType } = job.data;

    try {
      let successCount = 0;
      let failureCount = 0;

      for (const userId of userIds) {
        try {
          await this.recommendationService.generatePersonalizedLearningPath(userId);
          successCount++;
        } catch (error) {
          this.logger.warn(`Failed to update recommendations for user ${userId}: ${error.message}`);
          failureCount++;
        }
      }

      return {
        success: true,
        updateType,
        totalUsers: userIds.length,
        successCount,
        failureCount,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed batch recommendation update: ${error.message}`);
      throw error;
    }
  }
}

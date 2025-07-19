import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ContentTaggingService } from '../services/content-tagging.service';

@Processor('tag-generation')
export class TagGenerationProcessor {
  private readonly logger = new Logger(TagGenerationProcessor.name);

  constructor(private readonly contentTaggingService: ContentTaggingService) {}

  @Process('generate-tags')
  async handleTagGeneration(
    job: Job<{
      contentType: 'course' | 'lesson';
      contentId: string;
      userId?: string;
      options?: any;
    }>,
  ): Promise<any> {
    const { contentType, contentId, userId, options = {} } = job.data;

    this.logger.log(`Generating tags for ${contentType}:${contentId}`);

    try {
      const tags = await this.contentTaggingService.generateTags(
        {
          contentType,
          contentId,
          maxTags: options.maxTags || 15,
          minConfidence: options.minConfidence || 0.6,
          categories: options.categories,
          forceRegenerate: options.forceRegenerate || false,
        },
        userId,
      );

      this.logger.log(`Generated ${tags.length} tags for ${contentType}:${contentId}`);
      return tags;
    } catch (error) {
      this.logger.error(`Tag generation failed for ${contentType}:${contentId}`, error);
      throw error;
    }
  }

  @Process('bulk-tag-generation')
  async handleBulkTagGeneration(
    job: Job<{
      contentType: 'course' | 'lesson';
      contentIds: string[];
      userId?: string;
      options?: any;
    }>,
  ): Promise<any> {
    const { contentType, contentIds, userId, options = {} } = job.data;

    this.logger.log(`Bulk generating tags for ${contentIds.length} ${contentType}s`);

    const results: any[] = [];
    const totalItems = contentIds.length;

    for (let i = 0; i < contentIds.length; i++) {
      const contentId = contentIds[i];

      try {
        const tags = await this.contentTaggingService.generateTags(
          {
            contentType,
            contentId,
            maxTags: options.maxTags || 10,
            minConfidence: options.minConfidence || 0.7,
            categories: options.categories,
            forceRegenerate: false,
          },
          userId,
        );

        results.push({
          contentId,
          success: true,
          tags,
          tagCount: tags.length,
        });

        const progress = Math.round(((i + 1) / totalItems) * 100);
        await job.progress(progress);
      } catch (error) {
        this.logger.error(`Tag generation failed for ${contentType}:${contentId}`, error);
        results.push({
          contentId,
          success: false,
          error: error.message,
          tagCount: 0,
        });
      }
    }

    this.logger.log(`Completed bulk tag generation for ${contentIds.length} items`);
    return {
      totalProcessed: contentIds.length,
      results,
      summary: {
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalTags: results.reduce((sum, r) => sum + r.tagCount, 0),
      },
    };
  }
}

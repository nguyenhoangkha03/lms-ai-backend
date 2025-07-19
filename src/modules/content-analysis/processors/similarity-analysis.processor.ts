import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SimilarityDetectionService } from '../services/similarity-detection.service';
import { SimilarityType } from '../entities/content-similarity.entity';

@Processor('similarity-analysis')
export class SimilarityAnalysisProcessor {
  private readonly logger = new Logger(SimilarityAnalysisProcessor.name);

  constructor(private readonly similarityDetectionService: SimilarityDetectionService) {}

  @Process('analyze-similarity')
  async handleSimilarityAnalysis(
    job: Job<{
      sourceContentType: 'course' | 'lesson';
      sourceContentId: string;
      targetContentType: 'course' | 'lesson';
      targetContentId: string;
      similarityType: SimilarityType;
      forceRecalculation?: boolean;
    }>,
  ): Promise<any> {
    const {
      sourceContentType,
      sourceContentId,
      targetContentType,
      targetContentId,
      similarityType,
      forceRecalculation,
    } = job.data;

    this.logger.log(`Analyzing similarity between ${sourceContentId} and ${targetContentId}`);

    try {
      const similarity = await this.similarityDetectionService.analyzeSimilarity({
        sourceContentType,
        sourceContentId,
        targetContentType,
        targetContentId,
        similarityType,
        forceRecalculation: forceRecalculation || false,
      });

      this.logger.log(
        `Similarity calculated: ${similarity.similarityScore} between ${sourceContentId} and ${targetContentId}`,
      );
      return similarity;
    } catch (error) {
      this.logger.error(
        `Similarity analysis failed between ${sourceContentId} and ${targetContentId}`,
        error,
      );
      throw error;
    }
  }

  @Process('bulk-similarity-analysis')
  async handleBulkSimilarityAnalysis(
    job: Job<{
      sourceContentType: 'course' | 'lesson';
      sourceContentId: string;
      targetContentIds: string[];
      similarityTypes: SimilarityType[];
      minSimilarityThreshold?: number;
    }>,
  ): Promise<any> {
    const {
      sourceContentType,
      sourceContentId,
      targetContentIds,
      similarityTypes,
      minSimilarityThreshold,
    } = job.data;

    this.logger.log(
      `Bulk similarity analysis for ${sourceContentId} against ${targetContentIds.length} targets`,
    );

    try {
      const similarities = await this.similarityDetectionService.bulkAnalyzeSimilarity({
        sourceContentType,
        sourceContentId,
        targetContentIds,
        similarityTypes,
        minSimilarityThreshold: minSimilarityThreshold || 0.1,
      });

      this.logger.log(
        `Bulk similarity analysis completed: ${similarities.length} similarities found`,
      );
      return similarities;
    } catch (error) {
      this.logger.error(`Bulk similarity analysis failed for ${sourceContentId}`, error);
      throw error;
    }
  }
}

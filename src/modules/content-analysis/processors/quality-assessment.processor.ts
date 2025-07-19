import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ContentQualityAssessmentService } from '../services/content-quality-assessment.service';

@Processor('quality-assessment')
export class QualityAssessmentProcessor {
  private readonly logger = new Logger(QualityAssessmentProcessor.name);

  constructor(private readonly qualityAssessmentService: ContentQualityAssessmentService) {}

  @Process('assess-quality')
  async handleQualityAssessment(
    job: Job<{
      contentType: 'course' | 'lesson';
      contentId: string;
      options?: any;
    }>,
  ): Promise<any> {
    const { contentType, contentId, options = {} } = job.data;

    this.logger.log(`Assessing quality for ${contentType}:${contentId}`);

    try {
      const assessment = await this.qualityAssessmentService.assessContentQuality({
        contentType,
        contentId,
        dimensions: options.dimensions,
        includeDetailedAnalysis: options.includeDetailedAnalysis !== false,
        generateSuggestions: options.generateSuggestions !== false,
        forceReassessment: options.forceReassessment || false,
      });

      this.logger.log(
        `Quality assessed for ${contentType}:${contentId} - Score: ${assessment.overallScore}`,
      );
      return assessment;
    } catch (error) {
      this.logger.error(`Quality assessment failed for ${contentType}:${contentId}`, error);
      throw error;
    }
  }

  @Process('bulk-quality-assessment')
  async handleBulkQualityAssessment(
    job: Job<{
      contentType: 'course' | 'lesson';
      contentIds: string[];
      options?: any;
    }>,
  ): Promise<any> {
    const { contentType, contentIds, options = {} } = job.data;

    this.logger.log(`Bulk quality assessment for ${contentIds.length} ${contentType}s`);

    try {
      const assessments = await this.qualityAssessmentService.bulkAssessContentQuality({
        contentType,
        contentIds,
        dimensions: options.dimensions,
        includeDetailedAnalysis: options.includeDetailedAnalysis || false,
      });

      this.logger.log(`Bulk quality assessment completed: ${assessments.length} assessments`);
      return assessments;
    } catch (error) {
      this.logger.error(`Bulk quality assessment failed for ${contentType}`, error);
      throw error;
    }
  }
}

import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PlagiarismDetectionService } from '../services/plagiarism-detection.service';

@Processor('plagiarism-check')
export class PlagiarismCheckProcessor {
  private readonly logger = new Logger(PlagiarismCheckProcessor.name);

  constructor(private readonly plagiarismDetectionService: PlagiarismDetectionService) {}

  @Process('check-plagiarism')
  async handlePlagiarismCheck(
    job: Job<{
      contentType: 'course' | 'lesson' | 'assignment' | 'forum_post';
      contentId: string;
      userId?: string;
      options?: any;
    }>,
  ): Promise<any> {
    const { contentType, contentId, userId, options = {} } = job.data;

    this.logger.log(`Checking plagiarism for ${contentType}:${contentId}`);

    try {
      const check = await this.plagiarismDetectionService.checkPlagiarism(
        {
          contentType,
          contentId,
          checkWebSources: options.checkWebSources !== false,
          checkAcademicSources: options.checkAcademicSources !== false,
          checkInternalContent: options.checkInternalContent !== false,
          checkStudentSubmissions: options.checkStudentSubmissions || false,
          sensitivityLevel: options.sensitivityLevel || 'medium',
          excludedSources: options.excludedSources || [],
          forceNewScan: options.forceNewScan || false,
        },
        userId,
      );

      this.logger.log(
        `Plagiarism check completed for ${contentType}:${contentId} - Similarity: ${check.overallSimilarity}%`,
      );
      return check;
    } catch (error) {
      this.logger.error(`Plagiarism check failed for ${contentType}:${contentId}`, error);
      throw error;
    }
  }

  @Process('bulk-plagiarism-check')
  async handleBulkPlagiarismCheck(
    job: Job<{
      contentType: 'course' | 'lesson' | 'assignment' | 'forum_post';
      contentIds: string[];
      userId?: string;
      options?: any;
    }>,
  ): Promise<any> {
    const { contentType, contentIds, userId, options = {} } = job.data;

    this.logger.log(`Bulk plagiarism check for ${contentIds.length} ${contentType}s`);

    try {
      const checks = await this.plagiarismDetectionService.bulkCheckPlagiarism(
        {
          contentType,
          contentIds,
          checkWebSources: options.checkWebSources !== false,
          checkAcademicSources: options.checkAcademicSources !== false,
          checkInternalContent: options.checkInternalContent !== false,
          sensitivityLevel: options.sensitivityLevel || 'medium',
        },
        userId,
      );

      this.logger.log(`Bulk plagiarism check completed: ${checks.length} checks`);
      return checks;
    } catch (error) {
      this.logger.error(`Bulk plagiarism check failed for ${contentType}`, error);
      throw error;
    }
  }
}

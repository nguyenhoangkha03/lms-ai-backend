import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ContentTaggingService } from '../services/content-tagging.service';
import { SimilarityDetectionService } from '../services/similarity-detection.service';
import { ContentQualityAssessmentService } from '../services/content-quality-assessment.service';
import { QuizGenerationService } from '../services/quiz-generation.service';
import { PlagiarismDetectionService } from '../services/plagiarism-detection.service';

@Processor('content-analysis')
export class ContentAnalysisProcessor {
  private readonly logger = new Logger(ContentAnalysisProcessor.name);

  constructor(
    private readonly contentTaggingService: ContentTaggingService,
    private readonly similarityDetectionService: SimilarityDetectionService,
    private readonly qualityAssessmentService: ContentQualityAssessmentService,
    private readonly quizGenerationService: QuizGenerationService,
    private readonly plagiarismDetectionService: PlagiarismDetectionService,
  ) {}

  @Process('comprehensive-analysis')
  async handleComprehensiveAnalysis(
    job: Job<{
      contentType: 'course' | 'lesson';
      contentId: string;
      userId?: string;
      options?: {
        includeTags?: boolean;
        includeQuality?: boolean;
        includePlagiarism?: boolean;
        includeQuizGeneration?: boolean;
        includeSimilarity?: boolean;
      };
    }>,
  ): Promise<any> {
    const { contentType, contentId, userId, options = {} } = job.data;

    this.logger.log(`Starting comprehensive analysis for ${contentType}:${contentId}`);

    const results: any = {
      contentType,
      contentId,
      analysisResults: {},
      errors: [],
    };

    try {
      if (options.includeTags !== false) {
        try {
          await job.progress(10);
          const tags = await this.contentTaggingService.generateTags(
            {
              contentType,
              contentId,
              maxTags: 15,
              minConfidence: 0.6,
              forceRegenerate: false,
            },
            userId,
          );
          results.analysisResults.tags = tags;
          this.logger.log(`Generated ${tags.length} tags for ${contentType}:${contentId}`);
        } catch (error) {
          this.logger.error(`Tag generation failed for ${contentType}:${contentId}`, error);
          results.errors.push({ type: 'tag_generation', error: error.message });
        }
      }

      if (options.includeQuality !== false) {
        try {
          await job.progress(30);
          const quality = await this.qualityAssessmentService.assessContentQuality({
            contentType,
            contentId,
            includeDetailedAnalysis: true,
            generateSuggestions: true,
            forceReassessment: false,
          });
          results.analysisResults.quality = quality;
          this.logger.log(
            `Assessed quality for ${contentType}:${contentId} - Score: ${quality.overallScore}`,
          );
        } catch (error) {
          this.logger.error(`Quality assessment failed for ${contentType}:${contentId}`, error);
          results.errors.push({ type: 'quality_assessment', error: error.message });
        }
      }

      // Check plagiarism if requested
      if (options.includePlagiarism !== false) {
        try {
          await job.progress(50);
          const plagiarism = await this.plagiarismDetectionService.checkPlagiarism(
            {
              contentType,
              contentId,
              checkWebSources: true,
              checkAcademicSources: true,
              checkInternalContent: true,
              sensitivityLevel: 'medium',
              forceNewScan: false,
            },
            userId,
          );
          results.analysisResults.plagiarism = plagiarism;
          this.logger.log(
            `Checked plagiarism for ${contentType}:${contentId} - Similarity: ${plagiarism.overallSimilarity}%`,
          );
        } catch (error) {
          this.logger.error(`Plagiarism check failed for ${contentType}:${contentId}`, error);
          results.errors.push({ type: 'plagiarism_check', error: error.message });
        }
      }

      if (options.includeQuizGeneration !== false && contentType === 'lesson') {
        try {
          await job.progress(70);
          const quiz = await this.quizGenerationService.generateQuiz(
            {
              lessonId: contentId,
              title: `Auto-generated Quiz`,
              questionCount: 5,
              difficultyLevel: 'medium',
              includeExplanations: true,
            },
            userId,
          );
          results.analysisResults.quiz = quiz;
          this.logger.log(
            `Generated quiz for lesson:${contentId} with ${quiz.questionCount} questions`,
          );
        } catch (error) {
          this.logger.error(`Quiz generation failed for lesson:${contentId}`, error);
          results.errors.push({ type: 'quiz_generation', error: error.message });
        }
      }

      if (options.includeSimilarity !== false) {
        try {
          await job.progress(90);
          const similarContent = await this.similarityDetectionService.getSimilarContent(
            contentType,
            contentId,
            10,
            0.3,
          );
          results.analysisResults.similarContent = similarContent;
          this.logger.log(
            `Found ${similarContent.length} similar content for ${contentType}:${contentId}`,
          );
        } catch (error) {
          this.logger.error(`Similarity detection failed for ${contentType}:${contentId}`, error);
          results.errors.push({ type: 'similarity_detection', error: error.message });
        }
      }

      await job.progress(100);
      this.logger.log(`Completed comprehensive analysis for ${contentType}:${contentId}`);

      return results;
    } catch (error) {
      this.logger.error(`Comprehensive analysis failed for ${contentType}:${contentId}`, error);
      throw error;
    }
  }

  @Process('bulk-content-analysis')
  async handleBulkContentAnalysis(
    job: Job<{
      contentType: 'course' | 'lesson';
      contentIds: string[];
      userId?: string;
      analysisTypes: string[];
    }>,
  ): Promise<any> {
    const { contentType, contentIds, userId, analysisTypes } = job.data;

    this.logger.log(`Starting bulk analysis for ${contentIds.length} ${contentType}s`);

    const results: any[] = [];
    const totalItems = contentIds.length;

    for (let i = 0; i < contentIds.length; i++) {
      const contentId = contentIds[i];

      try {
        const itemResults: any = {
          contentId,
          contentType,
          results: {},
          errors: [],
        };

        if (analysisTypes.includes('tags')) {
          try {
            const tags = await this.contentTaggingService.generateTags(
              {
                contentType,
                contentId,
                maxTags: 10,
                minConfidence: 0.7,
                forceRegenerate: false,
              },
              userId,
            );
            itemResults.results.tags = tags;
          } catch (error) {
            itemResults.errors.push({ type: 'tags', error: error.message });
          }
        }

        if (analysisTypes.includes('quality')) {
          try {
            const quality = await this.qualityAssessmentService.assessContentQuality({
              contentType,
              contentId,
              includeDetailedAnalysis: false,
              generateSuggestions: false,
              forceReassessment: false,
            });
            itemResults.results.quality = quality;
          } catch (error) {
            itemResults.errors.push({ type: 'quality', error: error.message });
          }
        }

        if (analysisTypes.includes('plagiarism')) {
          try {
            const plagiarism = await this.plagiarismDetectionService.checkPlagiarism(
              {
                contentType,
                contentId,
                checkWebSources: true,
                checkAcademicSources: false,
                checkInternalContent: true,
                sensitivityLevel: 'medium',
                forceNewScan: false,
              },
              userId,
            );
            itemResults.results.plagiarism = plagiarism;
          } catch (error) {
            itemResults.errors.push({ type: 'plagiarism', error: error.message });
          }
        }

        results.push(itemResults);

        const progress = Math.round(((i + 1) / totalItems) * 100);
        await job.progress(progress);
      } catch (error) {
        this.logger.error(`Bulk analysis failed for ${contentType}:${contentId}`, error);
        results.push({
          contentId,
          contentType,
          results: {},
          errors: [{ type: 'general', error: error.message }],
        });
      }
    }

    this.logger.log(`Completed bulk analysis for ${contentIds.length} items`);
    return {
      totalProcessed: contentIds.length,
      results,
      summary: {
        successful: results.filter(r => r.errors.length === 0).length,
        failed: results.filter(r => r.errors.length > 0).length,
      },
    };
  }
}

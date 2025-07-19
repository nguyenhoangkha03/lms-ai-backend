import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  ContentSimilarity,
  SimilarityType,
  SimilarityStatus,
} from '../entities/content-similarity.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import {
  AnalyzeSimilarityDto,
  BulkSimilarityAnalysisDto,
  SimilarityQueryDto,
} from '../dto/similarity-detection.dto';
import { SimilarityResponseDto } from '../dto/content-analysis-responses.dto';
import { CourseLevel } from '@/common/enums/course.enums';

@Injectable()
export class SimilarityDetectionService {
  private readonly logger = new Logger(SimilarityDetectionService.name);

  constructor(
    @InjectRepository(ContentSimilarity)
    private similarityRepository: Repository<ContentSimilarity>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    private pythonAiService: PythonAiServiceService,
  ) {}

  async analyzeSimilarity(
    analyzeSimilarityDto: AnalyzeSimilarityDto,
  ): Promise<SimilarityResponseDto> {
    const {
      sourceContentType,
      sourceContentId,
      targetContentType,
      targetContentId,
      similarityType,
      forceRecalculation,
    } = analyzeSimilarityDto;

    // Check if similarity already exists
    if (!forceRecalculation) {
      const existingSimilarity = await this.similarityRepository.findOne({
        where: {
          sourceContentType,
          sourceContentId,
          targetContentType,
          targetContentId,
          similarityType,
          status: SimilarityStatus.CALCULATED,
        },
      });

      if (existingSimilarity) {
        this.logger.log(`Found existing similarity for ${sourceContentId} -> ${targetContentId}`);
        return this.mapToResponseDto(existingSimilarity);
      }
    }

    // Get source and target content
    const sourceContent = await this.getContent(sourceContentType, sourceContentId);
    const targetContent = await this.getContent(targetContentType, targetContentId);

    if (!sourceContent || !targetContent) {
      throw new NotFoundException('Source or target content not found');
    }

    // Create or update similarity record
    let similarity = await this.similarityRepository.findOne({
      where: {
        sourceContentType,
        sourceContentId,
        targetContentType,
        targetContentId,
        similarityType,
      },
    });

    if (!similarity) {
      similarity = this.similarityRepository.create({
        sourceContentType,
        sourceContentId,
        targetContentType,
        targetContentId,
        similarityType,
        status: SimilarityStatus.PROCESSING,
      });
    } else {
      similarity.status = SimilarityStatus.PROCESSING;
    }

    await this.similarityRepository.save(similarity);

    try {
      // Analyze similarity using AI service
      const aiResponse = await this.pythonAiService.analyzeContentSimilarity({
        targetContent: {
          id: sourceContentId,
          title: sourceContent.title,
          description: sourceContent.description || '',
          tags: this.extractTags(sourceContent),
          difficulty: this.extractDifficulty(sourceContent),
        },
        candidateContents: [
          {
            id: targetContentId,
            title: targetContent.title,
            description: targetContent.description || '',
            tags: this.extractTags(targetContent),
            difficulty: this.extractDifficulty(targetContent),
          },
        ],
        similarityType: this.mapSimilarityType(similarityType),
      });

      const result = aiResponse.similarities[0];

      similarity.similarityScore = result.similarityScore;
      similarity.status = SimilarityStatus.CALCULATED;
      similarity.calculatedAt = new Date();
      similarity.algorithmVersion = aiResponse.algorithm_used;
      similarity.analysis = {
        commonTopics: result.similarityReasons,
        // recommendationStrength: result.recommendationStrength,
        processingTime: aiResponse.processing_info.processing_time_ms,
      };

      const savedSimilarity = await this.similarityRepository.save(similarity);
      this.logger.log(
        `Calculated similarity: ${result.similarityScore} for ${sourceContentId} -> ${targetContentId}`,
      );

      return this.mapToResponseDto(savedSimilarity);
    } catch (error) {
      this.logger.error(
        `Failed to calculate similarity for ${sourceContentId} -> ${targetContentId}`,
        error,
      );

      // Update status to failed
      similarity.status = SimilarityStatus.FAILED;
      await this.similarityRepository.save(similarity);

      throw error;
    }
  }

  async bulkAnalyzeSimilarity(
    bulkDto: BulkSimilarityAnalysisDto,
  ): Promise<SimilarityResponseDto[]> {
    const {
      sourceContentType,
      sourceContentId,
      targetContentIds,
      similarityTypes,
      minSimilarityThreshold,
    } = bulkDto;

    const results: SimilarityResponseDto[] = [];

    for (const targetContentId of targetContentIds) {
      for (const similarityType of similarityTypes) {
        try {
          const result = await this.analyzeSimilarity({
            sourceContentType,
            sourceContentId,
            targetContentType: sourceContentType, // Assuming same type for bulk
            targetContentId,
            similarityType,
            forceRecalculation: false,
          });

          if (result.similarityScore >= minSimilarityThreshold!) {
            results.push(result);
          }
        } catch (error) {
          this.logger.error(`Failed bulk similarity analysis for ${targetContentId}`, error);
          continue;
        }
      }
    }

    this.logger.log(`Completed bulk similarity analysis: ${results.length} results`);
    return results;
  }

  async getSimilarities(queryDto: SimilarityQueryDto): Promise<SimilarityResponseDto[]> {
    const {
      sourceContentType,
      sourceContentId,
      targetContentType,
      similarityType,
      minSimilarityScore,
      maxSimilarityScore,
      sortBySimilarity,
    } = queryDto;

    const where: any = {
      status: SimilarityStatus.CALCULATED,
    };

    if (sourceContentType) where.sourceContentType = sourceContentType;
    if (sourceContentId) where.sourceContentId = sourceContentId;
    if (targetContentType) where.targetContentType = targetContentType;
    if (similarityType) where.similarityType = similarityType;

    if (minSimilarityScore !== undefined || maxSimilarityScore !== undefined) {
      where.similarityScore = Between(minSimilarityScore || 0, maxSimilarityScore || 1);
    }

    const similarities = await this.similarityRepository.find({
      where,
      order: {
        similarityScore: sortBySimilarity === 'asc' ? 'ASC' : 'DESC',
        calculatedAt: 'DESC',
      },
    });

    return similarities.map(similarity => this.mapToResponseDto(similarity));
  }

  async getSimilarContent(
    contentType: 'course' | 'lesson',
    contentId: string,
    limit: number = 10,
    minSimilarity: number = 0.5,
  ): Promise<SimilarityResponseDto[]> {
    const similarities = await this.similarityRepository.find({
      where: [
        {
          sourceContentType: contentType,
          sourceContentId: contentId,
          status: SimilarityStatus.CALCULATED,
          similarityScore: Between(minSimilarity, 1),
        },
        {
          targetContentType: contentType,
          targetContentId: contentId,
          status: SimilarityStatus.CALCULATED,
          similarityScore: Between(minSimilarity, 1),
        },
      ],
      order: { similarityScore: 'DESC' },
      take: limit,
    });

    return similarities.map(similarity => this.mapToResponseDto(similarity));
  }

  private async getContent(
    contentType: 'course' | 'lesson',
    contentId: string,
  ): Promise<Course | Lesson | null> {
    if (contentType === 'course') {
      return this.courseRepository.findOne({ where: { id: contentId } });
    } else {
      return this.lessonRepository.findOne({ where: { id: contentId } });
    }
  }

  private extractTags(content: Course | Lesson): string[] {
    if ('tags' in content && content.tags) {
      return Array.isArray(content.tags) ? content.tags : [];
    }
    return [];
  }

  private extractDifficulty(content: Course | Lesson): CourseLevel | string {
    if ('level' in content && content.level) {
      return content.level;
    }
    // if ('difficultyLevel' in content && content.difficultyLevel) {
    //   return content.difficultyLevel;
    // }
    return 'medium';
  }

  private mapSimilarityType(
    type: SimilarityType,
  ): 'semantic' | 'topic' | 'difficulty' | 'comprehensive' {
    const typeMap: Record<SimilarityType, 'semantic' | 'topic' | 'difficulty' | 'comprehensive'> = {
      [SimilarityType.SEMANTIC]: 'semantic',
      [SimilarityType.TOPIC]: 'topic',
      [SimilarityType.DIFFICULTY]: 'difficulty',
      [SimilarityType.COMPREHENSIVE]: 'comprehensive',
      [SimilarityType.STRUCTURAL]: 'comprehensive',
    };

    return typeMap[type] || 'semantic';
  }

  private mapToResponseDto(similarity: ContentSimilarity): SimilarityResponseDto {
    return {
      id: similarity.id,
      sourceContentType: similarity.sourceContentType,
      sourceContentId: similarity.sourceContentId,
      targetContentType: similarity.targetContentType,
      targetContentId: similarity.targetContentId,
      similarityType: similarity.similarityType,
      similarityScore: similarity.similarityScore,
      status: similarity.status,
      calculatedAt: similarity.calculatedAt,
      analysis: similarity.analysis,
      metadata: similarity.metadata,
    };
  }
}

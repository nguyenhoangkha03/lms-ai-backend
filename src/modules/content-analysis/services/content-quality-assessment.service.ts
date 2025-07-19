import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  ContentQualityAssessment,
  QualityLevel,
  QualityDimension,
} from '../entities/content-quality-assessment.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import {
  AssessContentQualityDto,
  BulkQualityAssessmentDto,
  QualityAssessmentQueryDto,
} from '../dto/quality-assessment.dto';
import { QualityAssessmentResponseDto } from '../dto/content-analysis-responses.dto';

@Injectable()
export class ContentQualityAssessmentService {
  private readonly logger = new Logger(ContentQualityAssessmentService.name);

  constructor(
    @InjectRepository(ContentQualityAssessment)
    private assessmentRepository: Repository<ContentQualityAssessment>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    private pythonAiService: PythonAiServiceService,
  ) {}

  async assessContentQuality(
    assessDto: AssessContentQualityDto,
  ): Promise<QualityAssessmentResponseDto> {
    const {
      contentType,
      contentId,
      dimensions,
      includeDetailedAnalysis,
      generateSuggestions,
      forceReassessment,
    } = assessDto;

    // Check if recent assessment exists
    if (!forceReassessment) {
      const recentAssessment = await this.assessmentRepository.findOne({
        where: {
          contentType,
          contentId,
          isLatest: true,
        },
        order: { assessedAt: 'DESC' },
      });

      if (recentAssessment && this.isRecentAssessment(recentAssessment.assessedAt)) {
        this.logger.log(`Found recent assessment for ${contentType}:${contentId}`);
        return this.mapToResponseDto(recentAssessment);
      }
    }

    // Get content
    const content = await this.getContent(contentType, contentId);
    if (!content) {
      throw new NotFoundException(`${contentType} with ID ${contentId} not found`);
    }

    try {
      // Mark previous assessments as not latest
      await this.assessmentRepository.update(
        { contentType, contentId, isLatest: true },
        { isLatest: false },
      );

      // Analyze content quality using AI service
      const contentText = this.extractContentText(content);
      const aiResponse = await this.pythonAiService.assessContentQuality({
        content: {
          id: contentId,
          type: contentType,
          title: content.title,
          description: content.description || '',
          text: contentText,
          metadata: this.extractContentMetadata(content),
        },
        assessmentCriteria: {
          dimensions: dimensions || Object.values(QualityDimension),
          includeReadability: true,
          includeAccessibility: true,
          includeEngagement: true,
          detailedAnalysis: includeDetailedAnalysis,
          generateImprovements: generateSuggestions,
        },
      });

      // Create assessment record
      const assessment = this.assessmentRepository.create({
        contentType,
        contentId,
        overallScore: aiResponse.overall_score,
        qualityLevel: this.mapScoreToQualityLevel(aiResponse.overall_score),
        assessedAt: new Date(),
        isLatest: true,
        aiModelVersion: aiResponse.model_version,
        dimensionScores: {
          clarity: aiResponse.dimension_scores.clarity,
          coherence: aiResponse.dimension_scores.coherence,
          completeness: aiResponse.dimension_scores.completeness,
          accuracy: aiResponse.dimension_scores.accuracy,
          engagement: aiResponse.dimension_scores.engagement,
          accessibility: aiResponse.dimension_scores.accessibility,
          structure: aiResponse.dimension_scores.structure,
          relevance: aiResponse.dimension_scores.relevance,
        },
        analysis: includeDetailedAnalysis
          ? {
              strengths: aiResponse.analysis?.strengths || [],
              weaknesses: aiResponse.analysis?.weaknesses || [],
              suggestions: aiResponse.analysis?.suggestions || [],
              readabilityScore: aiResponse.analysis?.readability_score,
              complexityLevel: aiResponse.analysis?.complexity_level,
              targetAudienceMatch: aiResponse.analysis?.target_audience_match,
              contentLength: contentText.length,
              vocabularyLevel: aiResponse.analysis?.vocabulary_level,
              grammarScore: aiResponse.analysis?.grammar_score,
            }
          : undefined,
        improvements: generateSuggestions
          ? aiResponse.improvements?.map(improvement => ({
              priority: improvement.priority,
              dimension: this.mapAIDimensionToQualityDimension(improvement.dimension),
              suggestion: improvement.suggestion,
              impact: improvement.impact,
            }))
          : undefined,
        metadata: {
          processingTime: aiResponse.processing_time,
          confidence: aiResponse.confidence,
          textStatistics: {
            wordCount: this.countWords(contentText),
            sentenceCount: this.countSentences(contentText),
            paragraphCount: this.countParagraphs(contentText),
            averageSentenceLength: this.calculateAverageSentenceLength(contentText),
          },
        },
      });

      const savedAssessment = await this.assessmentRepository.save(assessment);
      this.logger.log(
        `Assessed content quality for ${contentType}:${contentId} - Score: ${aiResponse.overall_score}`,
      );

      return this.mapToResponseDto(savedAssessment);
    } catch (error) {
      this.logger.error(`Failed to assess content quality for ${contentType}:${contentId}`, error);

      // Create fallback assessment
      return this.createFallbackAssessment(contentType, contentId, content);
    }
  }

  async bulkAssessContentQuality(
    bulkDto: BulkQualityAssessmentDto,
  ): Promise<QualityAssessmentResponseDto[]> {
    const { contentType, contentIds, dimensions, includeDetailedAnalysis } = bulkDto;

    const results: QualityAssessmentResponseDto[] = [];

    for (const contentId of contentIds) {
      try {
        const result = await this.assessContentQuality({
          contentType,
          contentId,
          dimensions,
          includeDetailedAnalysis,
          generateSuggestions: false, // Skip suggestions for bulk processing
          forceReassessment: false,
        });
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed bulk quality assessment for ${contentId}`, error);
        continue;
      }
    }

    this.logger.log(`Completed bulk quality assessment: ${results.length} assessments`);
    return results;
  }

  async getQualityAssessments(
    queryDto: QualityAssessmentQueryDto,
  ): Promise<QualityAssessmentResponseDto[]> {
    const {
      contentType,
      contentId,
      minOverallScore,
      maxOverallScore,
      qualityLevel,
      latestOnly,
      sortByScore,
    } = queryDto;

    const where: any = {};

    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;
    if (qualityLevel) where.qualityLevel = qualityLevel;
    if (latestOnly !== false) where.isLatest = true;

    if (minOverallScore !== undefined || maxOverallScore !== undefined) {
      where.overallScore = Between(minOverallScore || 0, maxOverallScore || 100);
    }

    const assessments = await this.assessmentRepository.find({
      where,
      order: {
        overallScore: sortByScore === 'asc' ? 'ASC' : 'DESC',
        assessedAt: 'DESC',
      },
    });

    return assessments.map(assessment => this.mapToResponseDto(assessment));
  }

  async getContentQualityTrends(
    contentType: 'course' | 'lesson',
    contentId: string,
    limit: number = 10,
  ): Promise<QualityAssessmentResponseDto[]> {
    const assessments = await this.assessmentRepository.find({
      where: { contentType, contentId },
      order: { assessedAt: 'DESC' },
      take: limit,
    });

    return assessments.map(assessment => this.mapToResponseDto(assessment));
  }

  async getQualityStatistics(contentType?: 'course' | 'lesson'): Promise<{
    totalAssessments: number;
    averageScore: number;
    qualityDistribution: Record<QualityLevel, number>;
    topPerformingContent: Array<{
      contentId: string;
      contentType: string;
      score: number;
    }>;
  }> {
    const where: any = { isLatest: true };
    if (contentType) where.contentType = contentType;

    const assessments = await this.assessmentRepository.find({ where });

    const totalAssessments = assessments.length;
    const averageScore = assessments.reduce((sum, a) => sum + a.overallScore, 0) / totalAssessments;

    const qualityDistribution = assessments.reduce(
      (dist, assessment) => {
        dist[assessment.qualityLevel] = (dist[assessment.qualityLevel] || 0) + 1;
        return dist;
      },
      {} as Record<QualityLevel, number>,
    );

    const topPerformingContent = assessments
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10)
      .map(assessment => ({
        contentId: assessment.contentId,
        contentType: assessment.contentType,
        score: assessment.overallScore,
      }));

    return {
      totalAssessments,
      averageScore,
      qualityDistribution,
      topPerformingContent,
    };
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

  private extractContentText(content: Course | Lesson): string {
    let text = content.title + '\n';

    if (content.description) {
      text += content.description + '\n';
    }

    // For lessons, extract content
    if ('content' in content && content.content) {
      text += content.content + '\n';
    }

    // For courses, extract additional information
    if ('whatYouWillLearn' in content && content.whatYouWillLearn) {
      text += JSON.stringify(content.whatYouWillLearn) + '\n';
    }

    if ('requirements' in content && content.requirements) {
      text += JSON.stringify(content.requirements) + '\n';
    }

    return text;
  }

  private extractContentMetadata(content: Course | Lesson): any {
    const metadata: any = {};

    if ('level' in content) metadata.difficultyLevel = content.level;
    if ('language' in content) metadata.language = content.language;
    if ('durationHours' in content) metadata.duration = content.durationHours;
    if ('estimatedDuration' in content) metadata.estimatedDuration = content.estimatedDuration;

    return metadata;
  }

  private mapScoreToQualityLevel(score: number): QualityLevel {
    if (score >= 90) return QualityLevel.EXCELLENT;
    if (score >= 80) return QualityLevel.GOOD;
    if (score >= 70) return QualityLevel.SATISFACTORY;
    if (score >= 60) return QualityLevel.NEEDS_IMPROVEMENT;
    return QualityLevel.POOR;
  }

  private mapAIDimensionToQualityDimension(aiDimension: string): QualityDimension {
    const dimensionMap: Record<string, QualityDimension> = {
      clarity: QualityDimension.CLARITY,
      coherence: QualityDimension.COHERENCE,
      completeness: QualityDimension.COMPLETENESS,
      accuracy: QualityDimension.ACCURACY,
      engagement: QualityDimension.ENGAGEMENT,
      accessibility: QualityDimension.ACCESSIBILITY,
      structure: QualityDimension.STRUCTURE,
      relevance: QualityDimension.RELEVANCE,
    };

    return dimensionMap[aiDimension.toLowerCase()] || QualityDimension.CLARITY;
  }

  private isRecentAssessment(assessedAt: Date): boolean {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return assessedAt > oneWeekAgo;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private countSentences(text: string): number {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  private countParagraphs(text: string): number {
    return text.split(/\n\s*\n/).filter(paragraph => paragraph.trim().length > 0).length;
  }

  private calculateAverageSentenceLength(text: string): number {
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    return sentences > 0 ? words / sentences : 0;
  }

  private async createFallbackAssessment(
    contentType: 'course' | 'lesson',
    contentId: string,
    content: Course | Lesson,
  ): Promise<QualityAssessmentResponseDto> {
    const contentText = this.extractContentText(content);
    const wordCount = this.countWords(contentText);

    // Simple fallback scoring based on content length and basic checks
    let score = 50; // Base score

    if (content.title && content.title.length > 10) score += 10;
    if (content.description && content.description.length > 50) score += 10;
    if (wordCount > 100) score += 10;
    if (wordCount > 500) score += 10;

    const assessment = this.assessmentRepository.create({
      contentType,
      contentId,
      overallScore: Math.min(score, 100),
      qualityLevel: this.mapScoreToQualityLevel(score),
      assessedAt: new Date(),
      isLatest: true,
      aiModelVersion: 'fallback-v1.0',
      dimensionScores: {
        clarity: score,
        coherence: score,
        completeness: score * 0.8,
        accuracy: score,
        engagement: score * 0.9,
        accessibility: score,
        structure: score,
        relevance: score,
      },
      metadata: {
        processingTime: 100,
        confidence: 0.5,
        textStatistics: {
          wordCount,
          sentenceCount: this.countSentences(contentText),
          paragraphCount: this.countParagraphs(contentText),
          averageSentenceLength: this.calculateAverageSentenceLength(contentText),
        },
      },
    });

    const savedAssessment = await this.assessmentRepository.save(assessment);
    return this.mapToResponseDto(savedAssessment);
  }

  private mapToResponseDto(assessment: ContentQualityAssessment): QualityAssessmentResponseDto {
    return {
      id: assessment.id,
      contentType: assessment.contentType,
      contentId: assessment.contentId,
      overallScore: assessment.overallScore,
      qualityLevel: assessment.qualityLevel,
      assessedAt: assessment.assessedAt,
      isLatest: assessment.isLatest,
      dimensionScores: assessment.dimensionScores,
      analysis: assessment.analysis,
      improvements: assessment.improvements,
      metadata: assessment.metadata,
    };
  }
}

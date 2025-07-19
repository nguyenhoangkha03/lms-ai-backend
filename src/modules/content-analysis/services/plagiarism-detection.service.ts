import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import {
  PlagiarismCheck,
  PlagiarismStatus,
  PlagiarismLevel,
} from '../entities/plagiarism-check.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import {
  CheckPlagiarismDto,
  BulkPlagiarismCheckDto,
  PlagiarismQueryDto,
} from '../dto/plagiarism-detection.dto';
import { PlagiarismCheckResponseDto } from '../dto/content-analysis-responses.dto';

@Injectable()
export class PlagiarismDetectionService {
  private readonly logger = new Logger(PlagiarismDetectionService.name);

  constructor(
    @InjectRepository(PlagiarismCheck)
    private plagiarismRepository: Repository<PlagiarismCheck>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    private pythonAiService: PythonAiServiceService,
  ) {}

  async checkPlagiarism(
    checkDto: CheckPlagiarismDto,
    userId?: string,
  ): Promise<PlagiarismCheckResponseDto> {
    const {
      contentType,
      contentId,
      checkWebSources,
      checkAcademicSources,
      checkInternalContent,
      checkStudentSubmissions,
      sensitivityLevel,
      excludedSources,
      forceNewScan,
    } = checkDto;

    // Get content
    const content = await this.getContent(contentType, contentId);
    if (!content) {
      throw new NotFoundException(`${contentType} with ID ${contentId} not found`);
    }

    const contentText = this.extractContentText(content);
    const contentHash = this.generateContentHash(contentText);

    // Check for existing scan if not forcing new scan
    if (!forceNewScan) {
      const existingCheck = await this.plagiarismRepository.findOne({
        where: {
          contentType,
          contentId,
          contentHash,
          status: PlagiarismStatus.COMPLETED,
        },
        order: { scanCompletedAt: 'DESC' },
      });

      if (existingCheck && this.isRecentScan(existingCheck.scanCompletedAt)) {
        this.logger.log(`Found recent plagiarism check for ${contentType}:${contentId}`);
        return this.mapToResponseDto(existingCheck);
      }
    }

    // Create new plagiarism check record
    const plagiarismCheck = this.plagiarismRepository.create({
      contentType,
      contentId,
      contentHash,
      status: PlagiarismStatus.SCANNING,
      scanStartedAt: new Date(),
      initiatedBy: userId,
      scanConfiguration: {
        checkWebSources: checkWebSources !== false,
        checkAcademicSources: checkAcademicSources !== false,
        checkInternalContent: checkInternalContent !== false,
        checkStudentSubmissions: checkStudentSubmissions === true,
        sensitivityLevel: sensitivityLevel || 'medium',
        excludedSources: excludedSources || [],
      },
    });

    await this.plagiarismRepository.save(plagiarismCheck);

    try {
      // Perform plagiarism check using AI service
      const aiResponse = await this.pythonAiService.checkPlagiarism({
        content: {
          id: contentId,
          type: contentType,
          text: contentText,
          title: content.title,
        },
        scanOptions: {
          checkWebSources: checkWebSources !== false,
          checkAcademicSources: checkAcademicSources !== false,
          checkInternalSources: checkInternalContent !== false,
          checkStudentWork: checkStudentSubmissions === true,
          sensitivityLevel: sensitivityLevel || 'medium',
          excludedSources: excludedSources || [],
        },
      });

      // Update plagiarism check with results
      plagiarismCheck.status = PlagiarismStatus.COMPLETED;
      plagiarismCheck.scanCompletedAt = new Date();
      plagiarismCheck.overallSimilarity = aiResponse.overall_similarity;
      plagiarismCheck.plagiarismLevel = this.mapScoreToPlagiarismLevel(
        aiResponse.overall_similarity,
      );
      plagiarismCheck.sourcesChecked = aiResponse.sources_checked;
      plagiarismCheck.matchesFound = aiResponse.matches?.length || 0;
      plagiarismCheck.matches = aiResponse.matches?.map((match: any) => ({
        sourceUrl: match.source_url,
        sourceTitle: match.source_title,
        similarity: match.similarity,
        matchedText: match.matched_text,
        startPosition: match.start_position,
        endPosition: match.end_position,
        sourceType: match.source_type,
        confidence: match.confidence,
      }));
      plagiarismCheck.analysis = {
        uniqueContentPercentage: aiResponse.analysis?.unique_content_percentage || 0,
        paraphrasedContentPercentage: aiResponse.analysis?.paraphrased_content_percentage || 0,
        directCopyPercentage: aiResponse.analysis?.direct_copy_percentage || 0,
        citationAnalysis: aiResponse.analysis?.citation_analysis,
        recommendations: aiResponse.analysis?.recommendations || [],
      };
      plagiarismCheck.metadata = {
        textLength: contentText.length,
        wordsAnalyzed: this.countWords(contentText),
        processingTime: aiResponse.processing_time,
        scanProvider: aiResponse.scan_provider || 'internal',
        scanVersion: aiResponse.scan_version || '1.0',
        confidence: aiResponse.confidence || 0.8,
      };

      const updatedCheck = await this.plagiarismRepository.save(plagiarismCheck);
      this.logger.log(
        `Completed plagiarism check for ${contentType}:${contentId} - Similarity: ${aiResponse.overall_similarity}%`,
      );

      return this.mapToResponseDto(updatedCheck);
    } catch (error) {
      this.logger.error(`Failed to check plagiarism for ${contentType}:${contentId}`, error);

      // Update status to failed
      plagiarismCheck.status = PlagiarismStatus.FAILED;
      await this.plagiarismRepository.save(plagiarismCheck);

      throw error;
    }
  }

  async bulkCheckPlagiarism(
    bulkDto: BulkPlagiarismCheckDto,
    userId?: string,
  ): Promise<PlagiarismCheckResponseDto[]> {
    const {
      contentType,
      contentIds,
      checkWebSources,
      checkAcademicSources,
      checkInternalContent,
      sensitivityLevel,
    } = bulkDto;

    const results: PlagiarismCheckResponseDto[] = [];

    for (const contentId of contentIds) {
      try {
        const result = await this.checkPlagiarism(
          {
            contentType,
            contentId,
            checkWebSources,
            checkAcademicSources,
            checkInternalContent,
            checkStudentSubmissions: false, // Skip for bulk processing
            sensitivityLevel,
            forceNewScan: false,
          },
          userId,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed bulk plagiarism check for ${contentId}`, error);
        continue;
      }
    }

    this.logger.log(`Completed bulk plagiarism check: ${results.length} scans`);
    return results;
  }

  async getPlagiarismChecks(queryDto: PlagiarismQueryDto): Promise<PlagiarismCheckResponseDto[]> {
    const { contentType, contentId, status, plagiarismLevel, initiatedBy, sortByDate } = queryDto;

    const where: any = {};

    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;
    if (status) where.status = status;
    if (plagiarismLevel) where.plagiarismLevel = plagiarismLevel;
    if (initiatedBy) where.initiatedBy = initiatedBy;

    const checks = await this.plagiarismRepository.find({
      where,
      order: {
        scanCompletedAt: sortByDate === 'asc' ? 'ASC' : 'DESC',
      },
    });

    return checks.map(check => this.mapToResponseDto(check));
  }

  async getPlagiarismCheckById(checkId: string): Promise<PlagiarismCheckResponseDto> {
    const check = await this.plagiarismRepository.findOne({ where: { id: checkId } });

    if (!check) {
      throw new NotFoundException(`Plagiarism check with ID ${checkId} not found`);
    }

    return this.mapToResponseDto(check);
  }

  async getPlagiarismStatistics(): Promise<{
    totalChecks: number;
    averageSimilarity: number;
    plagiarismDistribution: Record<PlagiarismLevel, number>;
    flaggedContent: Array<{
      contentId: string;
      contentType: string;
      similarity: number;
      plagiarismLevel: PlagiarismLevel;
    }>;
  }> {
    const checks = await this.plagiarismRepository.find({
      where: { status: PlagiarismStatus.COMPLETED },
    });

    const totalChecks = checks.length;
    const averageSimilarity =
      checks.reduce((sum, check) => sum + (check.overallSimilarity || 0), 0) / totalChecks;

    const plagiarismDistribution = checks.reduce(
      (dist, check) => {
        if (check.plagiarismLevel) {
          dist[check.plagiarismLevel] = (dist[check.plagiarismLevel] || 0) + 1;
        }
        return dist;
      },
      {} as Record<PlagiarismLevel, number>,
    );

    const flaggedContent = checks
      .filter(
        check =>
          check.plagiarismLevel && ['moderate', 'high', 'severe'].includes(check.plagiarismLevel),
      )
      .sort((a, b) => (b.overallSimilarity || 0) - (a.overallSimilarity || 0))
      .slice(0, 20)
      .map(check => ({
        contentId: check.contentId,
        contentType: check.contentType,
        similarity: check.overallSimilarity || 0,
        plagiarismLevel: check.plagiarismLevel!,
      }));

    return {
      totalChecks,
      averageSimilarity,
      plagiarismDistribution,
      flaggedContent,
    };
  }

  private async getContent(
    contentType: 'course' | 'lesson' | 'assignment' | 'forum_post',
    contentId: string,
  ): Promise<Course | Lesson | null> {
    if (contentType === 'course') {
      return this.courseRepository.findOne({ where: { id: contentId } });
    } else if (contentType === 'lesson') {
      return this.lessonRepository.findOne({ where: { id: contentId } });
    }
    // Add handlers for assignment and forum_post when those entities are available
    return null;
  }

  private extractContentText(content: Course | Lesson): string {
    let text = content.title + '\n';

    if (content.description) {
      text += content.description + '\n';
    }

    if ('content' in content && content.content) {
      text += content.content + '\n';
    }

    return text;
  }

  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private mapScoreToPlagiarismLevel(similarity: number): PlagiarismLevel {
    if (similarity >= 80) return PlagiarismLevel.SEVERE;
    if (similarity >= 60) return PlagiarismLevel.HIGH;
    if (similarity >= 30) return PlagiarismLevel.MODERATE;
    if (similarity >= 10) return PlagiarismLevel.LOW;
    return PlagiarismLevel.NONE;
  }

  private isRecentScan(scanDate?: Date): boolean {
    if (!scanDate) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return scanDate > oneWeekAgo;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private mapToResponseDto(check: PlagiarismCheck): PlagiarismCheckResponseDto {
    return {
      id: check.id,
      contentType: check.contentType,
      contentId: check.contentId,
      status: check.status,
      overallSimilarity: check.overallSimilarity,
      plagiarismLevel: check.plagiarismLevel,
      sourcesChecked: check.sourcesChecked,
      matchesFound: check.matchesFound,
      scanStartedAt: check.scanStartedAt,
      scanCompletedAt: check.scanCompletedAt,
      matches: check.matches,
      analysis: check.analysis,
      metadata: check.metadata,
      createdAt: check.createdAt,
    };
  }
}

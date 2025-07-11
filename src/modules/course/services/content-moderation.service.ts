// src/modules/course/services/content-moderation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { WinstonService } from '@/logger/winston.service';
import { Lesson } from '../entities/lesson.entity';
import { FileUpload } from '../entities/file-upload.entity';
import { ContentModerationStatus } from '@/common/enums/content.enums';
import * as natural from 'natural';
import axios from 'axios';

export interface ModerationJob {
  contentId: string;
  contentType: 'lesson' | 'file';
  contentData: any;
  options?: ModerationOptions;
}

export interface ModerationOptions {
  checkProfanity?: boolean;
  checkSpam?: boolean;
  checkCopyright?: boolean;
  checkQuality?: boolean;
  aiModeration?: boolean;
  manualReview?: boolean;
}

export interface ModerationResult {
  status: ContentModerationStatus;
  score: number;
  flags: ModerationFlag[];
  suggestions: string[];
  requiresManualReview: boolean;
}

export interface ModerationFlag {
  type: 'profanity' | 'spam' | 'copyright' | 'quality' | 'inappropriate' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number;
  location?: string; // Where in content the issue was found
}

@Injectable()
export class ContentModerationService {
  private readonly aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  private readonly profanityWords: Set<string>;
  private readonly spamPatterns: RegExp[];

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    @InjectQueue('content-moderation')
    private readonly moderationQueue: Queue<ModerationJob>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(ContentModerationService.name);
    this.initializeProfanityFilter();
    this.initializeSpamPatterns();
  }

  /**
   * Queue content for moderation
   */
  async queueContentModeration(
    contentId: string,
    contentType: 'lesson' | 'file',
    options: ModerationOptions = {},
  ): Promise<void> {
    let contentData: any;

    if (contentType === 'lesson') {
      const lesson = await this.lessonRepository.findOne({
        where: { id: contentId },
        relations: ['course'],
      });

      if (!lesson) {
        throw new BadRequestException('Lesson not found');
      }

      contentData = {
        title: lesson.title,
        description: lesson.description,
        content: lesson.content,
        type: lesson.lessonType,
      };
    } else {
      const file = await this.fileRepository.findOne({
        where: { id: contentId },
      });

      if (!file) {
        throw new BadRequestException('File not found');
      }

      contentData = {
        fileName: file.originalName,
        fileType: file.fileType,
        mimeType: file.mimeType,
        filePath: file.filePath,
      };
    }

    // Add job to moderation queue
    await this.moderationQueue.add('moderate-content', {
      contentId,
      contentType,
      contentData,
      options: {
        checkProfanity: true,
        checkSpam: true,
        checkQuality: true,
        aiModeration: true,
        ...options,
      },
    });

    this.logger.log(`Queued content moderation for ${contentType} ${contentId}`);
  }

  /**
   * Moderate content
   */
  async moderateContent(job: ModerationJob): Promise<ModerationResult> {
    const { contentId, contentType, contentData, options } = job;

    try {
      this.logger.log(`Starting moderation for ${contentType} ${contentId}`);

      const flags: ModerationFlag[] = [];
      let totalScore = 100; // Start with perfect score, deduct for issues

      // Text-based checks for lessons
      if (contentType === 'lesson') {
        if (options.checkProfanity) {
          const profanityFlags = await this.checkProfanity(contentData);
          flags.push(...profanityFlags);
          totalScore -= profanityFlags.length * 15;
        }

        if (options.checkSpam) {
          const spamFlags = await this.checkSpam(contentData);
          flags.push(...spamFlags);
          totalScore -= spamFlags.length * 20;
        }

        if (options.checkQuality) {
          const qualityFlags = await this.checkContentQuality(contentData);
          flags.push(...qualityFlags);
          totalScore -= qualityFlags.length * 10;
        }

        if (options.aiModeration) {
          const aiFlags = await this.performAIModeration(contentData);
          flags.push(...aiFlags);
          totalScore -= aiFlags.filter(f => f.severity === 'high').length * 25;
          totalScore -= aiFlags.filter(f => f.severity === 'medium').length * 15;
          totalScore -= aiFlags.filter(f => f.severity === 'low').length * 5;
        }
      }

      // File-based checks
      if (contentType === 'file') {
        if (options.checkQuality) {
          const fileQualityFlags = await this.checkFileQuality(contentData);
          flags.push(...fileQualityFlags);
          totalScore -= fileQualityFlags.length * 10;
        }
      }

      // Determine moderation status
      const result = this.calculateModerationResult(totalScore, flags, options.manualReview);

      // Update content with moderation result
      await this.updateContentModerationStatus(contentId, contentType, result);

      this.logger.log(`Moderation completed for ${contentType} ${contentId}: ${result.status}`);
      return result;
    } catch (error) {
      this.logger.error(`Moderation failed for ${contentType} ${contentId}:`, error.message);

      // Mark as requiring manual review on error
      const errorResult: ModerationResult = {
        status: ContentModerationStatus.REQUIRES_CHANGES,
        score: 0,
        flags: [
          {
            type: 'other',
            severity: 'high',
            description: 'Automated moderation failed',
            confidence: 1.0,
          },
        ],
        suggestions: ['Manual review required due to processing error'],
        requiresManualReview: true,
      };

      await this.updateContentModerationStatus(contentId, contentType, errorResult);
      throw error;
    }
  }

  /**
   * Manual moderation by admin
   */
  async performManualModeration(
    contentId: string,
    contentType: 'lesson' | 'file',
    status: ContentModerationStatus,
    reason?: string,
    moderatorId?: string,
  ): Promise<void> {
    const repository = contentType === 'lesson' ? this.lessonRepository : this.fileRepository;

    await repository.update(contentId, {
      moderationStatus: status,
      moderationReason: reason,
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
    });

    this.logger.log(`Manual moderation completed for ${contentType} ${contentId}: ${status}`);
  }

  /**
   * Check for profanity in text content
   */
  private async checkProfanity(contentData: any): Promise<ModerationFlag[]> {
    const flags: ModerationFlag[] = [];
    const textToCheck = [contentData.title, contentData.description, contentData.content]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const words = natural.WordTokenizer.tokenize(textToCheck);
    const foundProfanity: string[] = [];

    for (const word of words) {
      if (this.profanityWords.has(word)) {
        foundProfanity.push(word);
      }
    }

    if (foundProfanity.length > 0) {
      flags.push({
        type: 'profanity',
        severity: foundProfanity.length > 3 ? 'high' : 'medium',
        description: `Found inappropriate language: ${foundProfanity.slice(0, 3).join(', ')}${foundProfanity.length > 3 ? '...' : ''}`,
        confidence: 0.9,
      });
    }

    return flags;
  }

  /**
   * Check for spam patterns
   */
  private async checkSpam(contentData: any): Promise<ModerationFlag[]> {
    const flags: ModerationFlag[] = [];
    const textToCheck = [contentData.title, contentData.description, contentData.content]
      .filter(Boolean)
      .join(' ');

    for (const pattern of this.spamPatterns) {
      if (pattern.test(textToCheck)) {
        flags.push({
          type: 'spam',
          severity: 'medium',
          description: 'Content matches spam pattern',
          confidence: 0.7,
        });
        break;
      }
    }

    // Check for excessive links
    const linkCount = (textToCheck.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 5) {
      flags.push({
        type: 'spam',
        severity: 'medium',
        description: `Excessive number of links found: ${linkCount}`,
        confidence: 0.8,
      });
    }

    // Check for repeated content
    const sentences = textToCheck.split(/[.!?]+/);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    const repetitionRate = 1 - uniqueSentences.size / sentences.length;

    if (repetitionRate > 0.5) {
      flags.push({
        type: 'spam',
        severity: 'low',
        description: 'High content repetition detected',
        confidence: 0.6,
      });
    }

    return flags;
  }

  /**
   * Check content quality
   */
  private async checkContentQuality(contentData: any): Promise<ModerationFlag[]> {
    const flags: ModerationFlag[] = [];

    // Check title length
    if (!contentData.title || contentData.title.length < 10) {
      flags.push({
        type: 'quality',
        severity: 'medium',
        description: 'Title is too short or missing',
        confidence: 1.0,
      });
    }

    // Check description
    if (!contentData.description || contentData.description.length < 50) {
      flags.push({
        type: 'quality',
        severity: 'low',
        description: 'Description is too short or missing',
        confidence: 1.0,
      });
    }

    // Check content length for text lessons
    if (contentData.type === 'text' && (!contentData.content || contentData.content.length < 200)) {
      flags.push({
        type: 'quality',
        severity: 'medium',
        description: 'Content is too short for a meaningful lesson',
        confidence: 0.9,
      });
    }

    // Check for proper formatting
    if (contentData.content) {
      const hasHeaders = /<h[1-6]/.test(contentData.content);
      const hasParagraphs =
        /<p>/.test(contentData.content) || contentData.content.split('\n').length > 3;

      if (!hasHeaders && !hasParagraphs) {
        flags.push({
          type: 'quality',
          severity: 'low',
          description: 'Content lacks proper structure (headers, paragraphs)',
          confidence: 0.7,
        });
      }
    }

    return flags;
  }

  /**
   * Check file quality
   */
  private async checkFileQuality(contentData: any): Promise<ModerationFlag[]> {
    const flags: ModerationFlag[] = [];

    // Check file name
    if (contentData.fileName.length < 5) {
      flags.push({
        type: 'quality',
        severity: 'low',
        description: 'File name is too short',
        confidence: 0.8,
      });
    }

    // Check for suspicious file extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs'];
    const extension = contentData.fileName.toLowerCase().split('.').pop();

    if (suspiciousExtensions.includes(`.${extension}`)) {
      flags.push({
        type: 'inappropriate',
        severity: 'critical',
        description: 'Potentially dangerous file type detected',
        confidence: 1.0,
      });
    }

    return flags;
  }

  /**
   * Perform AI-based moderation
   */
  private async performAIModeration(contentData: any): Promise<ModerationFlag[]> {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/api/v1/moderate`,
        {
          title: contentData.title,
          description: contentData.description,
          content: contentData.content,
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const aiResult = response.data;
      const flags: ModerationFlag[] = [];

      if (aiResult.inappropriate_content) {
        flags.push({
          type: 'inappropriate',
          severity: aiResult.inappropriate_content.severity,
          description: aiResult.inappropriate_content.reason,
          confidence: aiResult.inappropriate_content.confidence,
        });
      }

      if (aiResult.copyright_concerns) {
        flags.push({
          type: 'copyright',
          severity: 'high',
          description: 'Potential copyright infringement detected',
          confidence: aiResult.copyright_concerns.confidence,
        });
      }

      return flags;
    } catch (error) {
      this.logger.warn('AI moderation service unavailable:', error.message);
      return [];
    }
  }

  /**
   * Calculate final moderation result
   */
  private calculateModerationResult(
    score: number,
    flags: ModerationFlag[],
    forceManualReview?: boolean,
  ): ModerationResult {
    let status: ContentModerationStatus;
    let requiresManualReview = forceManualReview || false;

    const criticalFlags = flags.filter(f => f.severity === 'critical');
    const highFlags = flags.filter(f => f.severity === 'high');

    if (criticalFlags.length > 0) {
      status = ContentModerationStatus.REJECTED;
      requiresManualReview = true;
    } else if (highFlags.length > 0 || score < 60) {
      status = ContentModerationStatus.REQUIRES_CHANGES;
      requiresManualReview = true;
    } else if (score < 80 || flags.length > 0) {
      status = ContentModerationStatus.FLAGGED;
      requiresManualReview = true;
    } else {
      status = ContentModerationStatus.APPROVED;
    }

    const suggestions = this.generateSuggestions(flags);

    return {
      status,
      score: Math.max(0, score),
      flags,
      suggestions,
      requiresManualReview,
    };
  }

  /**
   * Generate improvement suggestions based on flags
   */
  private generateSuggestions(flags: ModerationFlag[]): string[] {
    const suggestions: string[] = [];

    const flagTypes = [...new Set(flags.map(f => f.type))];

    for (const type of flagTypes) {
      switch (type) {
        case 'profanity':
          suggestions.push('Remove inappropriate language and maintain professional tone');
          break;
        case 'spam':
          suggestions.push('Reduce promotional content and focus on educational value');
          break;
        case 'quality':
          suggestions.push('Improve content structure with proper headings and formatting');
          break;
        case 'inappropriate':
          suggestions.push('Review content for appropriateness and educational relevance');
          break;
        case 'copyright':
          suggestions.push('Ensure all content is original or properly attributed');
          break;
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Content meets quality standards');
    }

    return suggestions;
  }

  /**
   * Update content moderation status
   */
  private async updateContentModerationStatus(
    contentId: string,
    contentType: 'lesson' | 'file',
    result: ModerationResult,
  ): Promise<void> {
    const repository = contentType === 'lesson' ? this.lessonRepository : this.fileRepository;

    await repository.update(contentId, {
      moderationStatus: result.status,
      moderationReason: result.suggestions.join('; '),
      moderatedAt: new Date(),
      metadata: {
        ...((await repository.findOne({ where: { id: contentId } }))?.metadata || {}),
        moderationResult: {
          score: result.score,
          flags: result.flags,
          suggestions: result.suggestions,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Initialize profanity filter
   */
  private initializeProfanityFilter(): void {
    // This would typically load from a comprehensive database
    const profanityList = [
      // Add profanity words here - keeping minimal for example
      'badword1',
      'badword2',
      'inappropriate',
    ];

    this.profanityWords = new Set(profanityList);
  }

  /**
   * Initialize spam patterns
   */
  private initializeSpamPatterns(): void {
    this.spamPatterns = [
      /buy\s+now/gi,
      /click\s+here/gi,
      /free\s+money/gi,
      /get\s+rich\s+quick/gi,
      /\$\d+\s*\/\s*(hour|day|week)/gi,
      /work\s+from\s+home/gi,
    ];
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const query = this.lessonRepository
      .createQueryBuilder('lesson')
      .select('lesson.moderationStatus', 'status')
      .addSelect('COUNT(*)', 'count');

    if (dateFrom) {
      query.andWhere('lesson.moderatedAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('lesson.moderatedAt <= :dateTo', { dateTo });
    }

    const results = await query.groupBy('lesson.moderationStatus').getRawMany();

    return results.reduce((acc, result) => {
      acc[result.status] = parseInt(result.count);
      return acc;
    }, {});
  }
}

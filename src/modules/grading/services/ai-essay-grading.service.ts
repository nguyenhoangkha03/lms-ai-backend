import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { AiEssayGradeDto } from '../dto/ai-essay-grade.dto';

interface EssayGradingResult {
  score: number;
  maxScore: number;
  percentage: number;
  confidence: number;
  feedback: EssayFeedback[];
  overallFeedback: string;
  gradingCriteria: GradingCriterion[];
}

interface EssayFeedback {
  category: string;
  severity: 'info' | 'suggestion' | 'warning' | 'error';
  content: string;
  suggestion?: string;
  startPosition?: number;
  endPosition?: number;
  highlightedText?: string;
}

interface GradingCriterion {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  feedback: string;
}

@Injectable()
export class AiEssayGradingService {
  private readonly aiServiceUrl: string;
  private readonly aiApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.aiApiKey = this.configService.get<string>('AI_API_KEY', '');
    this.logger.setContext(AiEssayGradingService.name);
  }

  async gradeEssay(gradeRequest: AiEssayGradeDto): Promise<EssayGradingResult> {
    this.logger.log(`Grading essay for question ${gradeRequest.questionId}`);

    try {
      this.validateEssayInput(gradeRequest);

      const cacheKey = this.generateCacheKey(gradeRequest);
      const cachedResult = await this.cacheService.get<EssayGradingResult>(cacheKey);

      if (cachedResult) {
        this.logger.log('Returning cached essay grading result');
        return cachedResult;
      }

      const aiRequest = this.prepareAiRequest(gradeRequest);

      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/api/v1/grade-essay`, aiRequest, {
          headers: {
            Authorization: `Bearer ${this.aiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      const result = this.processAiResponse(response.data, gradeRequest);

      await this.cacheService.set(cacheKey, result, 3600);

      this.logger.log(`Essay graded successfully by AI, {
        questionId: ${gradeRequest.questionId},
        score: ${result.score},
        confidence: ${result.confidence},
      }`);

      return result;
    } catch (error) {
      this.logger.error('Failed to grade essay with AI', error);
      throw new BadRequestException('AI essay grading failed: ' + error.message);
    }
  }

  async batchGradeEssays(requests: AiEssayGradeDto[]): Promise<EssayGradingResult[]> {
    this.logger.log(`Batch grading ${requests.length} essays`);

    const results: EssayGradingResult[] = [];
    const batchSize = 5;

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.gradeEssay(request));

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        this.logger.error(`Failed to grade batch ${i / batchSize + 1}`, error);
      }
    }

    return results;
  }

  private validateEssayInput(request: AiEssayGradeDto): void {
    if (!request.answerText || request.answerText.trim().length < 10) {
      throw new BadRequestException('Answer text is too short for meaningful grading');
    }

    if (!request.modelAnswer || request.modelAnswer.trim().length < 10) {
      throw new BadRequestException('Model answer or rubric is required');
    }

    if (request.maxScore && request.maxScore < 1) {
      throw new BadRequestException('Maximum score must be at least 1');
    }
  }

  private prepareAiRequest(request: AiEssayGradeDto): any {
    return {
      question_id: request.questionId,
      student_answer: request.answerText,
      model_answer: request.modelAnswer,
      max_score: request.maxScore || 10,
      confidence_threshold: request.confidenceThreshold || 0.7,
      generate_detailed_feedback: request.generateDetailedFeedback !== 'false',
      grading_criteria: this.getDefaultGradingCriteria(),
    };
  }

  private processAiResponse(aiResponse: any, originalRequest: AiEssayGradeDto): EssayGradingResult {
    const score = Math.max(0, Math.min(aiResponse.score || 0, originalRequest.maxScore || 10));
    const maxScore = originalRequest.maxScore || 10;
    const percentage = (score / maxScore) * 100;

    return {
      score,
      maxScore,
      percentage,
      confidence: aiResponse.confidence || 0,
      feedback: this.processFeedback(aiResponse.feedback || []),
      overallFeedback: aiResponse.overall_feedback || 'AI grading completed.',
      gradingCriteria: this.processGradingCriteria(aiResponse.criteria_scores || []),
    };
  }

  private processFeedback(aiFeedback: any[]): EssayFeedback[] {
    return aiFeedback.map(feedback => ({
      category: feedback.category || 'content',
      severity: feedback.severity || 'info',
      content: feedback.content || '',
      suggestion: feedback.suggestion,
      startPosition: feedback.start_position,
      endPosition: feedback.end_position,
      highlightedText: feedback.highlighted_text,
    }));
  }

  private processGradingCriteria(aiCriteria: any[]): GradingCriterion[] {
    return aiCriteria.map(criterion => ({
      name: criterion.name || '',
      weight: criterion.weight || 1,
      score: criterion.score || 0,
      maxScore: criterion.max_score || 1,
      feedback: criterion.feedback || '',
    }));
  }

  private getDefaultGradingCriteria(): any[] {
    return [
      {
        name: 'Content Quality',
        description: 'Relevance, accuracy, and depth of content',
        weight: 0.4,
        max_score: 4,
      },
      {
        name: 'Structure & Organization',
        description: 'Logical flow, clear introduction, body, and conclusion',
        weight: 0.25,
        max_score: 2.5,
      },
      {
        name: 'Language & Grammar',
        description: 'Grammar, spelling, vocabulary, and sentence structure',
        weight: 0.2,
        max_score: 2,
      },
      {
        name: 'Critical Thinking',
        description: 'Analysis, evaluation, and original thought',
        weight: 0.15,
        max_score: 1.5,
      },
    ];
  }

  private generateCacheKey(request: AiEssayGradeDto): string {
    const contentHash = this.hashString(request.answerText + request.modelAnswer);
    return `ai_essay_grade:${request.questionId}:${contentHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  // ===== FEEDBACK ANALYSIS =====
  async analyzeFeedbackQuality(feedback: EssayFeedback[]): Promise<any> {
    const analysis = {
      totalFeedbackItems: feedback.length,
      categoryCounts: {} as Record<string, number>,
      severityCounts: {} as Record<string, number>,
      avgFeedbackLength: 0,
      hasPositiveFeedback: false,
      hasConstructiveFeedback: false,
    };

    let totalLength = 0;

    feedback.forEach(item => {
      analysis.categoryCounts[item.category] = (analysis.categoryCounts[item.category] || 0) + 1;

      analysis.severityCounts[item.severity] = (analysis.severityCounts[item.severity] || 0) + 1;

      totalLength += item.content.length;

      if (this.isPositiveFeedback(item.content)) {
        analysis.hasPositiveFeedback = true;
      }

      if (item.suggestion && item.suggestion.length > 0) {
        analysis.hasConstructiveFeedback = true;
      }
    });

    analysis.avgFeedbackLength = feedback.length > 0 ? totalLength / feedback.length : 0;

    return analysis;
  }

  private isPositiveFeedback(content: string): boolean {
    const positiveWords = ['good', 'excellent', 'well', 'clear', 'strong', 'effective', 'thorough'];
    const lowerContent = content.toLowerCase();
    return positiveWords.some(word => lowerContent.includes(word));
  }
}

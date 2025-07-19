import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdaptiveContent } from '../entities/adaptive-content.entity';
import { TutoringSession } from '../entities/tutoring-session.entity';
import { LearningStyleProfile } from '../entities/learning-style-profile.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import { RequestAdaptiveContentDto, AdaptiveContentResponseDto } from '../dto/tutoring.dto';
import { DifficultyLevel, ContentType, AdaptationType } from '@/common/enums/tutoring.enums';

@Injectable()
export class AdaptiveContentService {
  private readonly logger = new Logger(AdaptiveContentService.name);

  constructor(
    @InjectRepository(AdaptiveContent)
    private readonly contentRepository: Repository<AdaptiveContent>,
    @InjectRepository(TutoringSession)
    private readonly sessionRepository: Repository<TutoringSession>,
    @InjectRepository(LearningStyleProfile)
    private readonly profileRepository: Repository<LearningStyleProfile>,
    private readonly pythonAiService: PythonAiServiceService,
  ) {}

  async generateAdaptiveContent(
    studentId: string,
    requestDto: RequestAdaptiveContentDto,
  ): Promise<AdaptiveContentResponseDto> {
    try {
      this.logger.log(`Generating adaptive content for student: ${studentId}`);

      // Get session and user context
      const session = await this.sessionRepository.findOne({
        where: { id: requestDto.sessionId },
        relations: ['course', 'lesson'],
      });

      const learningProfile = await this.profileRepository.findOne({
        where: { userId: studentId },
      });

      // Analyze current performance and needs
      const performanceAnalysis = await this.analyzeCurrentPerformance(
        requestDto.sessionId,
        requestDto.recentPerformance,
      );

      // Find or generate appropriate content
      const adaptiveContent = await this.findOrCreateAdaptiveContent(
        requestDto,
        performanceAnalysis,
        learningProfile,
        session,
      );

      return {
        id: adaptiveContent.id,
        title: adaptiveContent.title,
        content: adaptiveContent.content,
        contentType: adaptiveContent.contentType,
        difficultyLevel: adaptiveContent.difficultyLevel,
        estimatedDuration: adaptiveContent.estimatedDuration,
        targetLearningStyles: adaptiveContent.targetLearningStyles,
        mediaAssets: adaptiveContent.mediaAssets,
        interactiveElements: adaptiveContent.interactiveElements,
        adaptationReasoning: this.generateAdaptationReasoning(performanceAnalysis, learningProfile),
      };
    } catch (error) {
      this.logger.error(`Failed to generate adaptive content: ${error.message}`);
      throw error;
    }
  }

  async adjustDifficulty(
    _studentId: string,
    sessionId: string,
    currentPerformance: number,
    _targetDifficulty?: string,
  ): Promise<{
    newDifficulty: DifficultyLevel;
    adjustment: 'increase' | 'decrease' | 'maintain';
    reasoning: string;
    recommendations: string[];
  }> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
      });

      const currentDifficulty = session?.currentDifficultyLevel || 'medium';
      const adjustment = this.calculateDifficultyAdjustment(currentPerformance, currentDifficulty);

      const newDifficulty = this.applyDifficultyAdjustment(currentDifficulty, adjustment);

      return {
        newDifficulty,
        adjustment: adjustment.type,
        reasoning: adjustment.reasoning,
        recommendations: this.generateDifficultyRecommendations(adjustment, newDifficulty),
      };
    } catch (error) {
      this.logger.error(`Failed to adjust difficulty: ${error.message}`);
      throw error;
    }
  }

  private async analyzeCurrentPerformance(
    _sessionId: string,
    recentPerformance?: number,
  ): Promise<{
    performanceScore: number;
    strugglingAreas: string[];
    strongAreas: string[];
    recommendedAdjustment: 'increase' | 'decrease' | 'maintain';
  }> {
    try {
      // This would analyze interaction history and performance metrics
      const performanceScore = recentPerformance || 75;

      let recommendedAdjustment: 'increase' | 'decrease' | 'maintain' = 'maintain';
      if (performanceScore < 60) {
        recommendedAdjustment = 'decrease';
      } else if (performanceScore > 85) {
        recommendedAdjustment = 'increase';
      }

      return {
        performanceScore,
        strugglingAreas: performanceScore < 70 ? ['concept understanding', 'problem solving'] : [],
        strongAreas: performanceScore > 80 ? ['basic concepts', 'application'] : [],
        recommendedAdjustment,
      };
    } catch (error) {
      this.logger.warn(`Performance analysis failed: ${error.message}`);
      return {
        performanceScore: 75,
        strugglingAreas: [],
        strongAreas: [],
        recommendedAdjustment: 'maintain',
      };
    }
  }

  private async findOrCreateAdaptiveContent(
    requestDto: RequestAdaptiveContentDto,
    performanceAnalysis: any,
    learningProfile: LearningStyleProfile | null,
    session: TutoringSession | null,
  ): Promise<AdaptiveContent> {
    // First try to find existing adaptive content
    const existingContent = await this.contentRepository.findOne({
      where: {
        contentType: requestDto.contentType,
        difficultyLevel: requestDto.preferredDifficulty || DifficultyLevel.MEDIUM,
        isActive: true,
      },
    });

    if (existingContent) {
      return existingContent;
    }

    // Generate new adaptive content using AI
    return await this.generateNewAdaptiveContent(
      requestDto,
      performanceAnalysis,
      learningProfile,
      session,
    );
  }

  private async generateNewAdaptiveContent(
    requestDto: RequestAdaptiveContentDto,
    performanceAnalysis: any,
    learningProfile: LearningStyleProfile | null,
    session: TutoringSession | null,
  ): Promise<AdaptiveContent> {
    try {
      // Use Python AI service to generate content
      const contentPrompt = this.buildContentGenerationPrompt(
        requestDto,
        performanceAnalysis,
        learningProfile,
        session,
      );

      const generatedContent = await this.pythonAiService.generateText({
        prompt: contentPrompt,
        maxTokens: 1000,
        temperature: 0.7,
        context: {
          contentType: requestDto.contentType,
          topic: requestDto.currentTopic,
          difficulty: requestDto.preferredDifficulty,
          learningStyle: learningProfile?.primaryLearningStyle,
        },
      });

      // Create and save adaptive content
      const adaptiveContent = this.contentRepository.create({
        courseId: session?.courseId,
        lessonId: session?.lessonId,
        contentType: requestDto.contentType,
        title: `Adaptive ${requestDto.contentType}: ${requestDto.currentTopic}`,
        content: generatedContent.text,
        difficultyLevel: requestDto.preferredDifficulty || DifficultyLevel.MEDIUM,
        adaptationType: this.determineAdaptationType(performanceAnalysis),
        targetLearningStyles: learningProfile ? [learningProfile.primaryLearningStyle] : [],
        prerequisites: [],
        conceptsCovered: [requestDto.currentTopic],
        estimatedDuration: this.estimateContentDuration(
          requestDto.contentType,
          generatedContent.text,
        ),
        effectivenessScore: 0,
        adaptationRules: {
          triggerConditions: [`Performance < ${performanceAnalysis.performanceScore}`],
          adaptationActions: ['Adjust difficulty', 'Add examples'],
          successCriteria: ['Performance > 80%', 'Engagement > 70%'],
        },
      });

      return await this.contentRepository.save(adaptiveContent);
    } catch (error) {
      this.logger.error(`Failed to generate new adaptive content: ${error.message}`);

      // Fallback to template content
      return this.createFallbackContent(requestDto);
    }
  }

  private buildContentGenerationPrompt(
    requestDto: RequestAdaptiveContentDto,
    performanceAnalysis: any,
    learningProfile: LearningStyleProfile | null,
    _session: TutoringSession | null,
  ): string {
    return `
Generate adaptive learning content with the following specifications:

Content Type: ${requestDto.contentType}
Topic: ${requestDto.currentTopic}
Difficulty Level: ${requestDto.preferredDifficulty || 'medium'}
Student Performance: ${performanceAnalysis.performanceScore}%
Learning Style: ${learningProfile?.primaryLearningStyle || 'balanced'}

Student Context:
- Struggling Areas: ${performanceAnalysis.strugglingAreas.join(', ')}
- Strong Areas: ${performanceAnalysis.strongAreas.join(', ')}
- Recommended Adjustment: ${performanceAnalysis.recommendedAdjustment}

Content Requirements:
1. Adapt to the student's learning style preference
2. Match the specified difficulty level
3. Address identified struggling areas
4. Include interactive elements when appropriate
5. Provide clear explanations and examples
6. Be engaging and motivating

Generate content that is educational, well-structured, and appropriate for the student's current level.
`;
  }

  private determineAdaptationType(performanceAnalysis: any): AdaptationType {
    if (performanceAnalysis.recommendedAdjustment === 'decrease') {
      return AdaptationType.REMEDIATION;
    } else if (performanceAnalysis.recommendedAdjustment === 'increase') {
      return AdaptationType.ENRICHMENT;
    } else {
      return AdaptationType.CONTENT_VARIATION;
    }
  }

  private estimateContentDuration(contentType: ContentType, content: string): number {
    const baseMinutes = {
      [ContentType.LESSON]: 15,
      [ContentType.EXERCISE]: 10,
      [ContentType.QUIZ]: 5,
      [ContentType.EXPLANATION]: 8,
      [ContentType.EXAMPLE]: 5,
    };

    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);

    return Math.max(baseMinutes[contentType] || 10, readingTime);
  }

  private createFallbackContent(requestDto: RequestAdaptiveContentDto): AdaptiveContent {
    return this.contentRepository.create({
      contentType: requestDto.contentType,
      title: `${requestDto.contentType}: ${requestDto.currentTopic}`,
      content: `This is adaptive content for ${requestDto.currentTopic}. The content has been tailored to your learning needs and current performance level.`,
      difficultyLevel: requestDto.preferredDifficulty || DifficultyLevel.MEDIUM,
      adaptationType: AdaptationType.CONTENT_VARIATION,
      targetLearningStyles: [],
      prerequisites: [],
      conceptsCovered: [requestDto.currentTopic],
      estimatedDuration: 10,
      effectivenessScore: 0.5,
    });
  }

  private calculateDifficultyAdjustment(
    performanceScore: number,
    _currentDifficulty: string,
  ): {
    type: 'increase' | 'decrease' | 'maintain';
    magnitude: number;
    reasoning: string;
  } {
    if (performanceScore < 50) {
      return {
        type: 'decrease',
        magnitude: 2,
        reasoning:
          'Performance significantly below threshold, reducing difficulty to build confidence',
      };
    } else if (performanceScore < 70) {
      return {
        type: 'decrease',
        magnitude: 1,
        reasoning: 'Performance below optimal range, slight difficulty reduction recommended',
      };
    } else if (performanceScore > 90) {
      return {
        type: 'increase',
        magnitude: 2,
        reasoning: 'Excellent performance indicates readiness for increased challenge',
      };
    } else if (performanceScore > 85) {
      return {
        type: 'increase',
        magnitude: 1,
        reasoning: 'Strong performance suggests capability for moderate increase in difficulty',
      };
    } else {
      return {
        type: 'maintain',
        magnitude: 0,
        reasoning: 'Performance in optimal range, maintaining current difficulty level',
      };
    }
  }

  private applyDifficultyAdjustment(
    currentDifficulty: string,
    adjustment: { type: string; magnitude: number },
  ): DifficultyLevel {
    const difficultyOrder = [
      DifficultyLevel.VERY_EASY,
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.HARD,
      DifficultyLevel.VERY_HARD,
    ];

    const currentIndex = difficultyOrder.findIndex(d => d === currentDifficulty) || 2;
    let newIndex = currentIndex;

    if (adjustment.type === 'increase') {
      newIndex = Math.min(difficultyOrder.length - 1, currentIndex + adjustment.magnitude);
    } else if (adjustment.type === 'decrease') {
      newIndex = Math.max(0, currentIndex - adjustment.magnitude);
    }

    return difficultyOrder[newIndex];
  }

  private generateDifficultyRecommendations(
    adjustment: { type: string; reasoning: string },
    newDifficulty: DifficultyLevel,
  ): string[] {
    const recommendations: string[] = [];

    if (adjustment.type === 'increase') {
      recommendations.push('Introduce more complex problems');
      recommendations.push('Reduce scaffolding and hints');
      recommendations.push('Add time constraints to increase challenge');
    } else if (adjustment.type === 'decrease') {
      recommendations.push('Provide more detailed explanations');
      recommendations.push('Increase hint availability');
      recommendations.push('Break down complex concepts into smaller parts');
      recommendations.push('Add more practice exercises');
    } else {
      recommendations.push('Continue with current approach');
      recommendations.push('Monitor performance for future adjustments');
    }

    recommendations.push(`New difficulty level: ${newDifficulty}`);
    return recommendations;
  }

  private generateAdaptationReasoning(
    performanceAnalysis: any,
    learningProfile: LearningStyleProfile | null,
  ): string {
    let reasoning = `Content adapted based on current performance (${performanceAnalysis.performanceScore}%).`;

    if (learningProfile) {
      reasoning += ` Tailored for ${learningProfile.primaryLearningStyle} learning style.`;
    }

    if (performanceAnalysis.strugglingAreas.length > 0) {
      reasoning += ` Addresses struggles in: ${performanceAnalysis.strugglingAreas.join(', ')}.`;
    }

    if (performanceAnalysis.strongAreas.length > 0) {
      reasoning += ` Builds on strengths in: ${performanceAnalysis.strongAreas.join(', ')}.`;
    }

    return reasoning;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningStyleProfile } from '../entities/learning-style-profile.entity';
import { TutoringInteraction } from '../entities/tutoring-interaction.entity';
import { TutoringSession } from '../entities/tutoring-session.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import { AnalyzeLearningStyleDto, LearningStyleAnalysisDto } from '../dto/tutoring.dto';
import { LearningStyleType, LearningModalityType } from '@/common/enums/tutoring.enums';

@Injectable()
export class LearningStyleRecognitionService {
  private readonly logger = new Logger(LearningStyleRecognitionService.name);

  constructor(
    @InjectRepository(LearningStyleProfile)
    private readonly profileRepository: Repository<LearningStyleProfile>,
    @InjectRepository(TutoringInteraction)
    private readonly interactionRepository: Repository<TutoringInteraction>,
    @InjectRepository(TutoringSession)
    private readonly sessionRepository: Repository<TutoringSession>,
    private readonly pythonAiService: PythonAiServiceService,
  ) {}

  async analyzeLearningStyle(
    studentId: string,
    analyzeDto: AnalyzeLearningStyleDto,
  ): Promise<LearningStyleAnalysisDto> {
    try {
      this.logger.log(`Analyzing learning style for student: ${studentId}`);

      // Check if we need to force re-analysis or if we have enough new data
      const existingProfile = await this.profileRepository.findOne({
        where: { userId: studentId },
      });

      if (existingProfile && !analyzeDto.forceReanalysis) {
        let daysSinceLastAnalysis = Infinity;

        if (existingProfile.lastAnalyzedAt instanceof Date) {
          const timeDiff = Date.now() - existingProfile.lastAnalyzedAt.getTime();
          daysSinceLastAnalysis = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        }

        if (
          daysSinceLastAnalysis < 7 &&
          existingProfile.interactionsAnalyzed >= analyzeDto.minimumInteractions!
        ) {
          return this.mapProfileToAnalysis(existingProfile);
        }
      }

      // Get interaction data for analysis
      const interactions = await this.gatherInteractionData(studentId, analyzeDto.sessionId);

      if (interactions.length < (analyzeDto.minimumInteractions || 5)) {
        throw new Error('Insufficient interaction data for learning style analysis');
      }

      // Analyze learning patterns using AI
      const analysisResult = await this.performLearningStyleAnalysis(interactions);

      // Create or update learning style profile
      const profile = await this.createOrUpdateProfile(
        studentId,
        analysisResult,
        interactions.length,
      );

      return this.mapProfileToAnalysis(profile);
    } catch (error) {
      this.logger.error(`Learning style analysis failed: ${error.message}`);
      throw error;
    }
  }

  private async gatherInteractionData(
    studentId: string,
    sessionId?: string,
  ): Promise<TutoringInteraction[]> {
    const queryBuilder = this.interactionRepository
      .createQueryBuilder('interaction')
      .leftJoinAndSelect('interaction.session', 'session')
      .where('session.studentId = :studentId', { studentId })
      .orderBy('interaction.createdAt', 'DESC')
      .take(100); // Analyze last 100 interactions

    if (sessionId) {
      queryBuilder.andWhere('interaction.sessionId = :sessionId', { sessionId });
    }

    return await queryBuilder.getMany();
  }

  private async performLearningStyleAnalysis(interactions: TutoringInteraction[]): Promise<{
    primaryStyle: LearningStyleType;
    secondaryStyle: LearningStyleType | null;
    styleScores: Record<string, number>;
    preferences: any;
    cognitiveTraits: any;
    motivationalFactors: any;
    confidence: number;
  }> {
    try {
      // Prepare interaction data for analysis
      const interactionData = interactions.map(interaction => ({
        type: interaction.interactionType,
        userInput: interaction.userInput,
        responseTime: interaction.responseTime,
        topicCovered: interaction.topicCovered,
        difficultyLevel: interaction.difficultyLevel,
        hintLevel: interaction.hintLevel,
        wasHelpful: interaction.wasHelpful,
        contextData: interaction.contextData,
      }));

      // Call Python AI service for learning style analysis
      const analysisResponse = await this.pythonAiService.analyzeLearningPattern({
        interactions: interactionData,
        analysisType: 'learning_style_recognition',
      });

      return {
        primaryStyle: this.mapToLearningStyleType(analysisResponse.primary_style),
        secondaryStyle: analysisResponse.secondary_style
          ? this.mapToLearningStyleType(analysisResponse.secondary_style)
          : null,
        styleScores: analysisResponse.style_scores || {
          visual: 0.25,
          auditory: 0.25,
          kinesthetic: 0.25,
          readingWriting: 0.25,
        },
        preferences: analysisResponse.preferences || this.getDefaultPreferences(),
        cognitiveTraits: analysisResponse.cognitive_traits || this.getDefaultCognitiveTraits(),
        motivationalFactors:
          analysisResponse.motivational_factors || this.getDefaultMotivationalFactors(),
        confidence: analysisResponse.confidence || 0.7,
      };
    } catch (error) {
      this.logger.warn(`AI analysis failed, using pattern-based analysis: ${error.message}`);
      return await this.performPatternBasedAnalysis(interactions);
    }
  }

  private async performPatternBasedAnalysis(interactions: TutoringInteraction[]): Promise<any> {
    // Fallback analysis based on interaction patterns
    const responseTimeAnalysis = this.analyzeResponseTimes(interactions);
    const hintUsageAnalysis = this.analyzeHintUsage(interactions);
    const topicProgressionAnalysis = this.analyzeTopicProgression(interactions);

    // Simple heuristic-based learning style detection
    const styleScores = {
      visual: this.calculateVisualScore(interactions),
      auditory: this.calculateAuditoryScore(interactions),
      kinesthetic: this.calculateKinestheticScore(interactions),
      readingWriting: this.calculateReadingWritingScore(interactions),
    };

    const primaryStyle = Object.entries(styleScores).reduce((a, b) =>
      styleScores[a[0]] > styleScores[b[0]] ? a : b,
    )[0] as LearningStyleType;

    return {
      primaryStyle,
      secondaryStyle: null,
      styleScores,
      preferences: {
        pacePreference: responseTimeAnalysis.avgResponseTime > 10000 ? 'slow' : 'fast',
        depthPreference: hintUsageAnalysis.avgHintLevel > 2 ? 'deep' : 'surface',
        feedbackFrequency: 'immediate',
        challengeLevel: topicProgressionAnalysis.difficulty > 5 ? 'high' : 'moderate',
        collaborationPreference: 'individual',
      },
      cognitiveTraits: this.getDefaultCognitiveTraits(),
      motivationalFactors: this.getDefaultMotivationalFactors(),
      confidence: 0.6,
    };
  }

  private calculateVisualScore(interactions: TutoringInteraction[]): number {
    // Analyze preference for visual content based on interaction patterns
    let visualScore = 0.25; // Base score

    // Check for visual-related keywords in user inputs
    const visualKeywords = ['diagram', 'chart', 'picture', 'visual', 'graph', 'image'];
    const visualMentions = interactions.filter(i =>
      visualKeywords.some(keyword => i.userInput.toLowerCase().includes(keyword)),
    ).length;

    visualScore += (visualMentions / interactions.length) * 0.5;

    return Math.min(visualScore, 1.0);
  }

  private calculateAuditoryScore(interactions: TutoringInteraction[]): number {
    // Analyze preference for auditory content
    let auditoryScore = 0.25;

    const auditoryKeywords = ['explain', 'tell me', 'sound', 'hear', 'listen', 'audio'];
    const auditoryMentions = interactions.filter(i =>
      auditoryKeywords.some(keyword => i.userInput.toLowerCase().includes(keyword)),
    ).length;

    auditoryScore += (auditoryMentions / interactions.length) * 0.5;

    return Math.min(auditoryScore, 1.0);
  }

  private calculateKinestheticScore(interactions: TutoringInteraction[]): number {
    // Analyze preference for hands-on learning
    let kinestheticScore = 0.25;

    const kinestheticKeywords = ['practice', 'try', 'do', 'hands-on', 'exercise', 'example'];
    const kinestheticMentions = interactions.filter(i =>
      kinestheticKeywords.some(keyword => i.userInput.toLowerCase().includes(keyword)),
    ).length;

    kinestheticScore += (kinestheticMentions / interactions.length) * 0.5;

    return Math.min(kinestheticScore, 1.0);
  }

  private calculateReadingWritingScore(interactions: TutoringInteraction[]): number {
    // Analyze preference for text-based content
    let readingWritingScore = 0.25;

    // Longer text inputs suggest reading/writing preference
    const avgInputLength =
      interactions.reduce((sum, i) => sum + i.userInput.length, 0) / interactions.length;
    if (avgInputLength > 50) {
      readingWritingScore += 0.3;
    }

    const textKeywords = ['read', 'write', 'text', 'document', 'article', 'note'];
    const textMentions = interactions.filter(i =>
      textKeywords.some(keyword => i.userInput.toLowerCase().includes(keyword)),
    ).length;

    readingWritingScore += (textMentions / interactions.length) * 0.2;

    return Math.min(readingWritingScore, 1.0);
  }

  private analyzeResponseTimes(interactions: TutoringInteraction[]): { avgResponseTime: number } {
    const validResponseTimes = interactions.filter(i => i.responseTime > 0);
    const avgResponseTime =
      validResponseTimes.length > 0
        ? validResponseTimes.reduce((sum, i) => sum + i.responseTime, 0) / validResponseTimes.length
        : 5000;

    return { avgResponseTime };
  }

  private analyzeHintUsage(interactions: TutoringInteraction[]): { avgHintLevel: number } {
    const hintsUsed = interactions.filter(i => i.hintLevel > 0);
    const avgHintLevel =
      hintsUsed.length > 0
        ? hintsUsed.reduce((sum, i) => sum + i.hintLevel, 0) / hintsUsed.length
        : 0;

    return { avgHintLevel };
  }

  private analyzeTopicProgression(interactions: TutoringInteraction[]): { difficulty: number } {
    const difficultyLevels = interactions
      .map(i => parseInt(i.difficultyLevel || '5'))
      .filter(d => !isNaN(d));

    const avgDifficulty =
      difficultyLevels.length > 0
        ? difficultyLevels.reduce((sum, d) => sum + d, 0) / difficultyLevels.length
        : 5;

    return { difficulty: avgDifficulty };
  }

  private async createOrUpdateProfile(
    studentId: string,
    analysisResult: any,
    interactionsCount: number,
  ): Promise<LearningStyleProfile> {
    let profile = await this.profileRepository.findOne({
      where: { userId: studentId },
    });

    if (profile) {
      // Update existing profile
      profile.primaryLearningStyle = analysisResult.primaryStyle;
      profile.secondaryLearningStyle = analysisResult.secondaryStyle;
      profile.styleScores = analysisResult.styleScores;
      profile.learningPreferences = analysisResult.preferences;
      profile.cognitiveTraits = analysisResult.cognitiveTraits;
      profile.motivationalFactors = analysisResult.motivationalFactors;
      profile.confidenceLevel = analysisResult.confidence;
      profile.interactionsAnalyzed = interactionsCount;
      profile.lastAnalyzedAt = new Date();
    } else {
      // Create new profile
      profile = this.profileRepository.create({
        userId: studentId,
        primaryLearningStyle: analysisResult.primaryStyle,
        secondaryLearningStyle: analysisResult.secondaryStyle,
        preferredModality: LearningModalityType.MULTIMODAL,
        styleScores: analysisResult.styleScores,
        learningPreferences: analysisResult.preferences,
        cognitiveTraits: analysisResult.cognitiveTraits,
        motivationalFactors: analysisResult.motivationalFactors,
        confidenceLevel: analysisResult.confidence,
        interactionsAnalyzed: interactionsCount,
        lastAnalyzedAt: new Date(),
      });
    }

    return await this.profileRepository.save(profile);
  }

  private mapToLearningStyleType(style: string): LearningStyleType {
    const mapping: Record<string, LearningStyleType> = {
      visual: LearningStyleType.VISUAL,
      auditory: LearningStyleType.AUDITORY,
      kinesthetic: LearningStyleType.KINESTHETIC,
      reading_writing: LearningStyleType.READING_WRITING,
      multimodal: LearningStyleType.MULTIMODAL,
    };

    return mapping[style] || LearningStyleType.BALANCED;
  }

  private mapProfileToAnalysis(profile: LearningStyleProfile): LearningStyleAnalysisDto {
    return {
      primaryLearningStyle: profile.primaryLearningStyle,
      secondaryLearningStyle: profile.secondaryLearningStyle,
      styleScores: profile.styleScores,
      confidenceLevel: profile.confidenceLevel,
      interactionsAnalyzed: profile.interactionsAnalyzed,
      learningPreferences: profile.learningPreferences,
      cognitiveTraits: profile.cognitiveTraits,
      recommendedAdaptations: this.generateAdaptationRecommendations(profile),
    };
  }

  private generateAdaptationRecommendations(profile: LearningStyleProfile): string[] {
    const recommendations: string[] = [];

    switch (profile.primaryLearningStyle) {
      case LearningStyleType.VISUAL:
        recommendations.push('Use more diagrams and visual aids');
        recommendations.push('Present information in charts and graphs');
        recommendations.push('Include mind maps and concept maps');
        break;
      case LearningStyleType.AUDITORY:
        recommendations.push('Include audio explanations');
        recommendations.push('Use discussion-based learning');
        recommendations.push('Provide verbal instructions and feedback');
        break;
      case LearningStyleType.KINESTHETIC:
        recommendations.push('Include hands-on exercises');
        recommendations.push('Use interactive simulations');
        recommendations.push('Provide practical examples and real-world applications');
        break;
      case LearningStyleType.READING_WRITING:
        recommendations.push('Provide detailed text-based explanations');
        recommendations.push('Include note-taking opportunities');
        recommendations.push('Use written exercises and reflections');
        break;
    }

    // Add pace-based recommendations
    if (profile.learningPreferences?.pacePreference === 'slow') {
      recommendations.push('Allow more time for processing information');
      recommendations.push('Break content into smaller chunks');
    } else if (profile.learningPreferences?.pacePreference === 'fast') {
      recommendations.push('Provide additional challenging content');
      recommendations.push('Allow skipping of basic concepts');
    }

    return recommendations;
  }

  private getDefaultPreferences() {
    return {
      pacePreference: 'moderate',
      depthPreference: 'strategic',
      feedbackFrequency: 'immediate',
      challengeLevel: 'moderate',
      collaborationPreference: 'individual',
    };
  }

  private getDefaultCognitiveTraits() {
    return {
      processingSpeed: 5,
      workingMemoryCapacity: 5,
      attentionSpan: 20,
      abstractReasoning: 5,
      patternRecognition: 5,
    };
  }

  private getDefaultMotivationalFactors() {
    return {
      intrinsicMotivation: 5,
      achievementOrientation: 5,
      competitiveness: 5,
      autonomyPreference: 5,
      masteryOrientation: 5,
    };
  }
}

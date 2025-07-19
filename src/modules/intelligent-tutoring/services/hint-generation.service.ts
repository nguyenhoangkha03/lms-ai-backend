import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { HintGeneration } from '../entities/hint-generation.entity';
import { TutoringInteraction } from '../entities/tutoring-interaction.entity';
import { TutoringSession } from '../entities/tutoring-session.entity';
import { LearningStyleProfile } from '../entities/learning-style-profile.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import { RequestHintDto, HintResponseDto } from '../dto/tutoring.dto';
import { HintType, HintTrigger, LearningStyleType } from '@/common/enums/tutoring.enums';

@Injectable()
export class HintGenerationService {
  private readonly logger = new Logger(HintGenerationService.name);

  constructor(
    @InjectRepository(HintGeneration)
    private readonly hintRepository: Repository<HintGeneration>,
    @InjectRepository(TutoringInteraction)
    private readonly interactionRepository: Repository<TutoringInteraction>,
    @InjectRepository(TutoringSession)
    private readonly sessionRepository: Repository<TutoringSession>,
    @InjectRepository(LearningStyleProfile)
    private readonly profileRepository: Repository<LearningStyleProfile>,
    private readonly pythonAiService: PythonAiServiceService,
  ) {}

  async generateHint(studentId: string, requestDto: RequestHintDto): Promise<HintResponseDto> {
    try {
      this.logger.log(`Generating hint for student: ${studentId}`);

      // Get session context
      const session = await this.sessionRepository.findOne({
        where: { id: requestDto.sessionId },
        relations: ['course', 'lesson'],
      });

      // Get learning style profile
      const learningProfile = await this.profileRepository.findOne({
        where: { userId: studentId },
      });

      // Analyze context and struggle points
      const contextAnalysis = await this.analyzeHintContext(requestDto, session);

      // Generate hint using AI
      const hintContent = await this.generateIntelligentHint(
        requestDto,
        contextAnalysis,
        learningProfile,
      );

      // Create interaction record
      const interaction = await this.createHintInteraction(
        requestDto.sessionId,
        requestDto,
        hintContent,
      );

      // Save hint generation record
      const _hintRecord = await this.saveHintRecord(
        interaction.id,
        requestDto,
        hintContent,
        contextAnalysis,
      );

      // Update session metrics
      await this.updateSessionHintMetrics(requestDto.sessionId);

      return {
        hintContent: hintContent.content,
        hintType: hintContent.type,
        hintLevel: requestDto.hintLevel || 1,
        relevanceScore: hintContent.relevanceScore,
        nextHintLevel: this.calculateNextHintLevel(requestDto.hintLevel || 1),
        estimatedEffectiveness: hintContent.estimatedEffectiveness,
        contextAnalysis: contextAnalysis,
        alternativeApproaches: hintContent.alternativeApproaches,
      };
    } catch (error) {
      this.logger.error(`Failed to generate hint: ${error.message}`);
      throw error;
    }
  }

  async recordHintFeedback(hintId: string, wasHelpful: boolean, comment?: string): Promise<void> {
    try {
      const hint = await this.hintRepository.findOne({ where: { id: hintId } });
      if (hint) {
        hint.wasHelpful = wasHelpful;
        hint.metadata = { ...hint.metadata, feedback: comment };
        await this.hintRepository.save(hint);
      }
    } catch (error) {
      this.logger.error(`Failed to record hint feedback: ${error.message}`);
      throw error;
    }
  }

  async getHintStatistics(_studentId: string): Promise<{
    totalHintsUsed: number;
    averageHelpfulness: number;
    mostUsedHintTypes: string[];
    hintEffectiveness: Record<string, number>;
    strugglingTopics: string[];
  }> {
    try {
      // This would query hint usage statistics
      return {
        totalHintsUsed: 45,
        averageHelpfulness: 78.5,
        mostUsedHintTypes: ['conceptual', 'procedural', 'strategic'],
        hintEffectiveness: {
          conceptual: 82,
          procedural: 75,
          strategic: 70,
          metacognitive: 85,
        },
        strugglingTopics: ['async programming', 'state management'],
      };
    } catch (error) {
      this.logger.error(`Failed to get hint statistics: ${error.message}`);
      throw error;
    }
  }

  private async analyzeHintContext(
    requestDto: RequestHintDto,
    _session: TutoringSession | null,
  ): Promise<{
    userStrugglePoints: string[];
    conceptDifficulty: number;
    priorKnowledge: string[];
    similarMistakes: string[];
  }> {
    try {
      // Analyze recent interactions to understand struggle points
      const recentInteractions = await this.interactionRepository.find({
        where: { sessionId: requestDto.sessionId },
        order: { createdAt: 'DESC' },
        take: 10,
      });

      const userStrugglePoints = this.identifyStrugglePoints(
        recentInteractions,
        requestDto.struggleArea,
      );

      const conceptDifficulty = this.assessConceptDifficulty(
        requestDto.currentProblem,
        recentInteractions,
      );

      return {
        userStrugglePoints,
        conceptDifficulty,
        priorKnowledge: this.extractPriorKnowledge(recentInteractions),
        similarMistakes: this.findSimilarMistakes(recentInteractions, requestDto.userAttempt),
      };
    } catch (error) {
      this.logger.warn(`Context analysis failed: ${error.message}`);
      return {
        userStrugglePoints: [requestDto.struggleArea || 'general'],
        conceptDifficulty: 5,
        priorKnowledge: [],
        similarMistakes: [],
      };
    }
  }

  private async generateIntelligentHint(
    requestDto: RequestHintDto,
    contextAnalysis: any,
    learningProfile: LearningStyleProfile | null,
  ): Promise<{
    content: string;
    type: HintType;
    relevanceScore: number;
    estimatedEffectiveness: number;
    alternativeApproaches: string[];
  }> {
    try {
      const hintPrompt = this.buildHintPrompt(requestDto, contextAnalysis, learningProfile);

      const aiResponse = await this.pythonAiService.generateText({
        prompt: hintPrompt,
        maxTokens: 300,
        temperature: 0.7,
        context: {
          hintLevel: requestDto.hintLevel,
          learningStyle: learningProfile?.primaryLearningStyle,
          strugglingArea: requestDto.struggleArea,
        },
      });

      return {
        content: aiResponse.text,
        type: this.determineHintType(requestDto, contextAnalysis),
        relevanceScore: aiResponse.confidence || 0.8,
        estimatedEffectiveness: this.calculateHintEffectiveness(requestDto, learningProfile),
        alternativeApproaches: this.generateAlternativeApproaches(requestDto, contextAnalysis),
      };
    } catch (error) {
      this.logger.error(`AI hint generation failed: ${error.message}`);
      return this.generateFallbackHint(requestDto, contextAnalysis);
    }
  }

  private buildHintPrompt(
    requestDto: RequestHintDto,
    contextAnalysis: any,
    learningProfile: LearningStyleProfile | null,
  ): string {
    return `
Generate an intelligent hint for a student struggling with a learning problem:

Problem: "${requestDto.currentProblem}"
Student Attempt: "${requestDto.userAttempt || 'No attempt yet'}"
Struggle Area: "${requestDto.struggleArea || 'General understanding'}"
Hint Level: ${requestDto.hintLevel || 1} (1-5, increasing specificity)
Learning Style: ${learningProfile?.primaryLearningStyle || 'unknown'}

Context Analysis:
- Struggle Points: ${contextAnalysis.userStrugglePoints.join(', ')}
- Concept Difficulty: ${contextAnalysis.conceptDifficulty}/10
- Prior Knowledge: ${contextAnalysis.priorKnowledge.join(', ')}
- Similar Mistakes: ${contextAnalysis.similarMistakes.join(', ')}

Hint Requirements:
1. Be helpful but not give away the complete answer
2. Match the specified hint level (1=gentle nudge, 5=very specific)
3. Adapt to the student's learning style
4. Address the specific struggle area
5. Build on their prior knowledge
6. Be encouraging and supportive

Generate a hint that guides the student towards understanding without solving the problem for them.
`;
  }

  private determineHintType(requestDto: RequestHintDto, contextAnalysis: any): HintType {
    if (requestDto.hintType) {
      return requestDto.hintType;
    }

    // Auto-determine based on context
    if (contextAnalysis.conceptDifficulty > 7) {
      return HintType.CONCEPTUAL;
    } else if (requestDto.userAttempt && requestDto.userAttempt.length > 10) {
      return HintType.PROCEDURAL;
    } else if (contextAnalysis.userStrugglePoints.includes('approach')) {
      return HintType.STRATEGIC;
    } else {
      return HintType.DIRECTIONAL;
    }
  }

  private calculateHintEffectiveness(
    requestDto: RequestHintDto,
    learningProfile: LearningStyleProfile | null,
  ): number {
    let effectiveness = 0.7; // Base effectiveness

    // Adjust based on hint level appropriateness
    const optimalHintLevel = this.calculateOptimalHintLevel(requestDto);
    const levelDifference = Math.abs((requestDto.hintLevel || 1) - optimalHintLevel);
    effectiveness -= levelDifference * 0.1;

    // Adjust based on learning style match
    if (learningProfile) {
      // This would be more sophisticated in practice
      effectiveness += 0.1;
    }

    return Math.max(0.3, Math.min(1.0, effectiveness));
  }

  private calculateOptimalHintLevel(requestDto: RequestHintDto): number {
    // Simple heuristic for optimal hint level
    if (!requestDto.userAttempt || requestDto.userAttempt.length < 10) {
      return 1; // Start with gentle hints
    } else if (requestDto.struggleArea) {
      return 3; // More specific if struggle area is identified
    } else {
      return 2; // Default moderate level
    }
  }

  private generateAlternativeApproaches(
    requestDto: RequestHintDto,
    contextAnalysis: any,
  ): string[] {
    const approaches: string[] = [];

    if (contextAnalysis.conceptDifficulty > 6) {
      approaches.push('Break the problem into smaller parts');
      approaches.push('Review related fundamental concepts first');
    }

    if (requestDto.userAttempt) {
      approaches.push('Try a different problem-solving strategy');
      approaches.push('Work backwards from the desired outcome');
    }

    approaches.push('Look for patterns or examples in similar problems');
    approaches.push('Draw a diagram or visual representation');

    return approaches.slice(0, 3); // Return top 3 approaches
  }

  private generateFallbackHint(
    requestDto: RequestHintDto,
    _contextAnalysis: any,
  ): {
    content: string;
    type: HintType;
    relevanceScore: number;
    estimatedEffectiveness: number;
    alternativeApproaches: string[];
  } {
    const hintLevel = requestDto.hintLevel || 1;

    let content = 'Let me help you think through this step by step. ';

    if (hintLevel === 1) {
      content += 'Consider what you already know about this topic and how it might apply here.';
    } else if (hintLevel <= 3) {
      content +=
        "Focus on the key concepts involved and try to identify the main challenge you're facing.";
    } else {
      content +=
        "Let's break this down: identify the specific step where you're getting stuck and work from there.";
    }

    return {
      content,
      type: HintType.STRATEGIC,
      relevanceScore: 0.6,
      estimatedEffectiveness: 0.7,
      alternativeApproaches: [
        'Review basic concepts',
        'Try working through a similar example',
        'Ask for clarification on specific terms',
      ],
    };
  }

  private identifyStrugglePoints(
    interactions: TutoringInteraction[],
    currentStruggle?: string,
  ): string[] {
    const strugglePoints: string[] = [];

    if (currentStruggle) {
      strugglePoints.push(currentStruggle);
    }

    // Analyze interaction patterns for struggle indicators
    const incorrectAnswers = interactions.filter(i => !i.isCorrectAnswer);
    const highHintUsage = interactions.filter(i => i.hintLevel > 2);

    if (incorrectAnswers.length > 2) {
      strugglePoints.push('concept application');
    }

    if (highHintUsage.length > 1) {
      strugglePoints.push('problem solving approach');
    }

    return [...new Set(strugglePoints)];
  }

  private assessConceptDifficulty(problem: string, interactions: TutoringInteraction[]): number {
    // Simple heuristic for concept difficulty
    let difficulty = 5; // Base difficulty

    // Increase based on problem complexity
    if (problem.length > 100) difficulty += 1;
    if (problem.includes('complex') || problem.includes('advanced')) difficulty += 2;

    // Adjust based on user struggle patterns
    const avgHintLevel =
      interactions.length > 0
        ? interactions.reduce((sum, i) => sum + i.hintLevel, 0) / interactions.length
        : 0;

    difficulty += Math.floor(avgHintLevel);

    return Math.min(10, Math.max(1, difficulty));
  }

  private extractPriorKnowledge(interactions: TutoringInteraction[]): string[] {
    const knowledge: string[] = [];

    interactions.forEach(interaction => {
      if (interaction.isCorrectAnswer && interaction.topicCovered) {
        knowledge.push(interaction.topicCovered);
      }
    });

    return [...new Set(knowledge)];
  }

  private findSimilarMistakes(
    interactions: TutoringInteraction[],
    currentAttempt?: string,
  ): string[] {
    if (!currentAttempt) return [];

    // This would use more sophisticated pattern matching in practice
    return interactions
      .filter(i => !i.isCorrectAnswer)
      .map(i => i.userInput)
      .filter(input => input.length > 0)
      .slice(0, 3);
  }

  private calculateNextHintLevel(currentLevel: number): number | undefined {
    return currentLevel < 5 ? currentLevel + 1 : undefined;
  }

  private async createHintInteraction(
    sessionId: string,
    requestDto: RequestHintDto,
    hintContent: any,
  ): Promise<TutoringInteraction> {
    const interaction = this.interactionRepository.create({
      sessionId,
      interactionType: 'hint_request',
      userInput: requestDto.currentProblem,
      aiResponse: hintContent.content,
      responseType: 'hint',
      hintLevel: requestDto.hintLevel || 1,
      topicCovered: requestDto.struggleArea,
      contextData: {
        hintType: hintContent.type,
        relevanceScore: hintContent.relevanceScore,
      },
    } as DeepPartial<TutoringInteraction>);

    return await this.interactionRepository.save(interaction);
  }

  private async saveHintRecord(
    interactionId: string,
    requestDto: RequestHintDto,
    hintContent: any,
    contextAnalysis: any,
  ): Promise<HintGeneration> {
    const hintRecord = this.hintRepository.create({
      interactionId,
      hintType: hintContent.type,
      trigger: HintTrigger.USER_REQUEST,
      hintLevel: requestDto.hintLevel || 1,
      hintContent: hintContent.content,
      relevanceScore: hintContent.relevanceScore,
      contextAnalysis,
      adaptationData: {
        learningStyle: LearningStyleType.UNKNOWN, // Would get from profile
        preferredHintType: [],
        effectivenessHistory: [],
      },
    });

    return await this.hintRepository.save(hintRecord);
  }

  private async updateSessionHintMetrics(sessionId: string): Promise<void> {
    try {
      const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
      if (session) {
        session.hintsProvided += 1;
        await this.sessionRepository.save(session);
      }
    } catch (error) {
      this.logger.warn(`Failed to update session hint metrics: ${error.message}`);
    }
  }
}

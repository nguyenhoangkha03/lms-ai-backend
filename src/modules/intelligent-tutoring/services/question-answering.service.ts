import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutoringInteraction } from '../entities/tutoring-interaction.entity';
import { TutoringSession } from '../entities/tutoring-session.entity';
import { AiService } from '../../ai/services/ai.service';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import { AskQuestionDto, QuestionAnswerResponseDto } from '../dto/tutoring.dto';
import {
  InteractionType,
  ResponseType,
  QuestionAnsweringType,
} from '@/common/enums/tutoring.enums';

@Injectable()
export class QuestionAnsweringService {
  private readonly logger = new Logger(QuestionAnsweringService.name);

  constructor(
    @InjectRepository(TutoringInteraction)
    private readonly interactionRepository: Repository<TutoringInteraction>,
    @InjectRepository(TutoringSession)
    private readonly sessionRepository: Repository<TutoringSession>,
    private readonly aiService: AiService,
    private readonly pythonAiService: PythonAiServiceService,
  ) {}

  async answerQuestion(
    studentId: string,
    askQuestionDto: AskQuestionDto,
  ): Promise<QuestionAnswerResponseDto> {
    try {
      this.logger.log(`Processing question for student: ${studentId}`);

      // Get session context
      const session = await this.sessionRepository.findOne({
        where: { id: askQuestionDto.sessionId },
        relations: ['course', 'lesson', 'student'],
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Analyze question type and complexity
      const questionAnalysis = await this.analyzeQuestion(
        askQuestionDto.question,
        askQuestionDto.context,
      );

      // Get relevant context from course/lesson content
      const contextData = await this.gatherContextData(session, askQuestionDto.currentTopic);

      // Generate AI response using Python AI service
      const aiResponse = await this.generateAIResponse(
        askQuestionDto.question,
        questionAnalysis,
        contextData,
        session.detectedLearningStyle,
      );

      // Record the interaction
      const interaction = await this.recordInteraction(
        askQuestionDto.sessionId,
        askQuestionDto.question,
        aiResponse.answer,
        aiResponse.responseType,
        questionAnalysis,
      );

      // Update session metrics
      await this.updateSessionProgress(session, interaction, questionAnalysis);

      this.logger.log(`Question answered for session: ${askQuestionDto.sessionId}`);

      return {
        answer: aiResponse.answer,
        responseType: aiResponse.responseType,
        confidenceScore: aiResponse.confidenceScore,
        relatedConcepts: aiResponse.relatedConcepts,
        followUpQuestions: aiResponse.followUpQuestions,
        estimatedDifficulty: questionAnalysis.difficulty,
        learningObjectives: aiResponse.learningObjectives,
      };
    } catch (error) {
      this.logger.error(`Failed to answer question: ${error.message}`);
      throw error;
    }
  }

  private async analyzeQuestion(
    question: string,
    context?: string,
  ): Promise<{
    type: QuestionAnsweringType;
    difficulty: number;
    concepts: string[];
    complexity: string;
  }> {
    try {
      // Use Python AI service for question analysis
      const analysis = await this.pythonAiService.analyzeText({
        text: question,
        context: context || '',
        analysisType: 'question_classification',
      });

      return {
        type: this.mapToQuestionType(analysis.classification!),
        difficulty: analysis.difficulty_score || 5,
        concepts: analysis.concepts || [],
        complexity: analysis.complexity || 'moderate',
      };
    } catch (error) {
      this.logger.warn(`Question analysis failed, using defaults: ${error.message}`);
      return {
        type: QuestionAnsweringType.CONCEPTUAL,
        difficulty: 5,
        concepts: [],
        complexity: 'moderate',
      };
    }
  }

  private async gatherContextData(
    session: TutoringSession,
    _currentTopic?: string,
  ): Promise<{
    courseContent: string;
    lessonContent: string;
    previousInteractions: string[];
    learningObjectives: string[];
  }> {
    try {
      // Get recent interactions for context
      const recentInteractions = await this.interactionRepository.find({
        where: { sessionId: session.id },
        order: { createdAt: 'DESC' },
        take: 5,
      });

      return {
        courseContent: session.course?.description || '',
        lessonContent: session.lesson?.content || '',
        previousInteractions: recentInteractions.map(i => `Q: ${i.userInput} A: ${i.aiResponse}`),
        learningObjectives: session.sessionGoals?.topics || [],
      };
    } catch (error) {
      this.logger.warn(`Failed to gather context data: ${error.message}`);
      return {
        courseContent: '',
        lessonContent: '',
        previousInteractions: [],
        learningObjectives: [],
      };
    }
  }

  private async generateAIResponse(
    question: string,
    questionAnalysis: any,
    contextData: any,
    learningStyle?: string,
  ): Promise<{
    answer: string;
    responseType: ResponseType;
    confidenceScore: number;
    relatedConcepts: string[];
    followUpQuestions: string[];
    learningObjectives: string[];
  }> {
    try {
      // Prepare prompt for AI response generation
      const prompt = this.buildResponsePrompt(
        question,
        questionAnalysis,
        contextData,
        learningStyle,
      );

      // Call Python AI service for response generation
      const response = await this.pythonAiService.generateText({
        prompt,
        maxTokens: 500,
        temperature: 0.7,
        context: {
          questionType: questionAnalysis.type,
          learningStyle,
          difficulty: questionAnalysis.difficulty,
        },
      });

      return {
        answer: response.text,
        responseType: this.determineResponseType(questionAnalysis, response),
        confidenceScore: response.confidence || 0.8,
        relatedConcepts: response.metadata?.relatedConcepts || [],
        followUpQuestions: response.metadata?.followUpQuestions || [],
        learningObjectives: response.metadata?.learningObjectives || [],
      };
    } catch (error) {
      this.logger.error(`AI response generation failed: ${error.message}`);

      // Fallback response
      return {
        answer:
          "I understand your question. Let me help you explore this concept step by step. Could you provide more specific details about what aspect you'd like to understand better?",
        responseType: ResponseType.SOCRATIC_QUESTION,
        confidenceScore: 0.6,
        relatedConcepts: questionAnalysis.concepts,
        followUpQuestions: [
          'What specific part are you having trouble with?',
          'Have you encountered similar concepts before?',
        ],
        learningObjectives: [],
      };
    }
  }

  private buildResponsePrompt(
    question: string,
    questionAnalysis: any,
    contextData: any,
    learningStyle?: string,
  ): string {
    return `
As an intelligent tutoring system, provide a helpful response to this student question:

Question: "${question}"
Question Type: ${questionAnalysis.type}
Difficulty Level: ${questionAnalysis.difficulty}/10
Learning Style: ${learningStyle || 'unknown'}

Context:
- Course: ${contextData.courseContent}
- Current Lesson: ${contextData.lessonContent}
- Recent Interactions: ${contextData.previousInteractions.join('; ')}
- Learning Objectives: ${contextData.learningObjectives.join(', ')}

Instructions:
1. Provide a clear, educational response appropriate for the student's level
2. Use the student's preferred learning style when possible
3. Include relevant examples or analogies
4. Suggest follow-up questions to deepen understanding
5. Identify related concepts the student should explore
6. Adapt the response complexity to match the question difficulty

Response format should be conversational and encouraging.
`;
  }

  private determineResponseType(questionAnalysis: any, aiResponse: any): ResponseType {
    // Logic to determine the most appropriate response type
    if (questionAnalysis.type === QuestionAnsweringType.FACTUAL) {
      return ResponseType.DIRECT_ANSWER;
    } else if (questionAnalysis.complexity === 'complex') {
      return ResponseType.SOCRATIC_QUESTION;
    } else if (aiResponse.text?.includes('example') || aiResponse.text?.includes('for instance')) {
      return ResponseType.EXAMPLE;
    } else if (aiResponse.text?.includes('like') || aiResponse.text?.includes('similar to')) {
      return ResponseType.ANALOGY;
    }

    return ResponseType.EXPLANATION;
  }

  private mapToQuestionType(classification: string): QuestionAnsweringType {
    const mapping: Record<string, QuestionAnsweringType> = {
      factual: QuestionAnsweringType.FACTUAL,
      conceptual: QuestionAnsweringType.CONCEPTUAL,
      procedural: QuestionAnsweringType.PROCEDURAL,
      analytical: QuestionAnsweringType.ANALYTICAL,
      evaluative: QuestionAnsweringType.EVALUATIVE,
    };

    return mapping[classification] || QuestionAnsweringType.CONCEPTUAL;
  }

  private async recordInteraction(
    sessionId: string,
    userInput: string,
    aiResponse: string,
    responseType: ResponseType,
    questionAnalysis: any,
  ): Promise<TutoringInteraction> {
    const interaction = this.interactionRepository.create({
      sessionId,
      interactionType: InteractionType.QUESTION,
      userInput,
      aiResponse,
      responseType,
      responseTime: 0, // Would be calculated from actual processing time
      topicCovered: questionAnalysis.concepts[0] || 'general',
      difficultyLevel: questionAnalysis.difficulty.toString(),
      confidenceScore: 0.8, // Would come from AI response
      contextData: {
        conceptTags: questionAnalysis.concepts,
        prerequisitesCovered: true,
        userStrugglePoints: [],
      },
    });

    return await this.interactionRepository.save(interaction);
  }

  private async updateSessionProgress(
    session: TutoringSession,
    interaction: TutoringInteraction,
    questionAnalysis: any,
  ): Promise<void> {
    // Update session metrics based on the interaction
    session.questionsAsked += 1;

    // Update concept mastery
    if (!session.performanceMetrics.conceptMastery) {
      session.performanceMetrics.conceptMastery = {};
    }

    for (const concept of questionAnalysis.concepts) {
      const currentMastery = session.performanceMetrics.conceptMastery[concept] || 0;
      session.performanceMetrics.conceptMastery[concept] = Math.min(currentMastery + 0.1, 1.0);
    }

    await this.sessionRepository.save(session);
  }
}

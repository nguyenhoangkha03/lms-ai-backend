import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QuizGenerationService } from '../services/quiz-generation.service';

@Processor('quiz-generation')
export class QuizGenerationProcessor {
  private readonly logger = new Logger(QuizGenerationProcessor.name);

  constructor(private readonly quizGenerationService: QuizGenerationService) {}

  @Process('generate-quiz')
  async handleQuizGeneration(
    job: Job<{
      lessonId: string;
      userId?: string;
      options?: any;
    }>,
  ): Promise<any> {
    const { lessonId, userId, options = {} } = job.data;

    this.logger.log(`Generating quiz for lesson:${lessonId}`);

    try {
      const quiz = await this.quizGenerationService.generateQuiz(
        {
          lessonId,
          title: options.title || `AI-Generated Quiz`,
          description: options.description,
          questionCount: options.questionCount || 5,
          difficultyLevel: options.difficultyLevel || 'medium',
          questionTypes: options.questionTypes,
          timeLimit: options.timeLimit,
          targetLearningObjectives: options.targetLearningObjectives,
          customPrompt: options.customPrompt,
          includeExplanations: options.includeExplanations !== false,
        },
        userId,
      );

      this.logger.log(`Quiz generated for lesson:${lessonId} with ${quiz.questionCount} questions`);
      return quiz;
    } catch (error) {
      this.logger.error(`Quiz generation failed for lesson:${lessonId}`, error);
      throw error;
    }
  }
}

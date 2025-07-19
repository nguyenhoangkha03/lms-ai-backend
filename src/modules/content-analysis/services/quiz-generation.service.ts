import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GeneratedQuiz,
  QuizGenerationStatus,
  QuestionType,
} from '../entities/generated-quiz.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { User } from '../../user/entities/user.entity';
import { PythonAiServiceService } from '../../ai/services/python-ai-service.service';
import {
  GenerateQuizDto,
  ReviewGeneratedQuizDto,
  UpdateGeneratedQuizDto,
  QuizGenerationQueryDto,
} from '../dto/quiz-generation.dto';
import { GeneratedQuizResponseDto } from '../dto/content-analysis-responses.dto';

@Injectable()
export class QuizGenerationService {
  private readonly logger = new Logger(QuizGenerationService.name);

  constructor(
    @InjectRepository(GeneratedQuiz)
    private quizRepository: Repository<GeneratedQuiz>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private pythonAiService: PythonAiServiceService,
  ) {}

  async generateQuiz(
    generateQuizDto: GenerateQuizDto,
    userId?: string,
  ): Promise<GeneratedQuizResponseDto> {
    const {
      lessonId,
      title,
      description,
      questionCount,
      difficultyLevel,
      questionTypes,
      timeLimit,
      targetLearningObjectives,
      customPrompt,
      includeExplanations,
    } = generateQuizDto;

    // Check if lesson exists
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    // Create quiz record
    const quiz = this.quizRepository.create({
      lessonId,
      title,
      description,
      status: QuizGenerationStatus.GENERATING,
      questionCount: questionCount || 5,
      difficultyLevel: difficultyLevel || 'medium',
      timeLimit,
      generatedBy: userId,
      questions: [], // Will be populated by AI
    });

    const _savedQuiz = await this.quizRepository.save(quiz);

    try {
      // Generate quiz using AI service
      const lessonContent = this.extractLessonContent(lesson);
      const aiResponse = await this.pythonAiService.generateQuiz({
        content: {
          id: lessonId,
          title: lesson.title,
          description: lesson.description || '',
          text: lessonContent,
          course_context: {
            title: lesson.course?.title || '',
            level: lesson.course?.level || 'medium',
          },
        },
        requirements: {
          questionCount: questionCount || 5,
          difficultyLevel: difficultyLevel || 'medium',
          questionTypes: questionTypes || [QuestionType.MULTIPLE_CHOICE],
          targetObjectives: targetLearningObjectives || [],
          includeExplanations: includeExplanations !== false,
          customPrompt,
          timeLimit,
        },
      });

      // Process AI response and update quiz
      const generatedQuestions = aiResponse.questions.map((q: any, index: number) => ({
        id: `q_${index + 1}`,
        type: this.mapAIQuestionType(q.type),
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty || difficultyLevel,
        points: q.points || 1,
        estimatedTime: q.estimated_time || 60,
        keywords: q.keywords || [],
      }));

      // Update quiz with generated content
      quiz.status = QuizGenerationStatus.COMPLETED;
      quiz.questions = generatedQuestions;
      quiz.qualityScore = aiResponse.quality_assessment?.overall_score;
      quiz.aiModelVersion = aiResponse.model_version;
      quiz.generationPrompt = aiResponse.generation_prompt;
      quiz.generationAnalysis = {
        sourceTextLength: lessonContent.length,
        keyConceptsExtracted: aiResponse.analysis?.key_concepts || [],
        difficultyAnalysis: aiResponse.analysis?.difficulty_analysis || '',
        coverageScore: aiResponse.analysis?.coverage_score || 0,
        generationTime: aiResponse.processing_time,
        confidence: aiResponse.confidence || 0.8,
      };
      quiz.metadata = {
        targetLearningObjectives: targetLearningObjectives,
        bloomsTaxonomyLevels: aiResponse.analysis?.blooms_levels || [],
        estimatedCompletionTime: generatedQuestions.reduce(
          (total, q) => total + q.estimatedTime,
          0,
        ),
        languageComplexity: aiResponse.analysis?.language_complexity || 'medium',
      };

      const updatedQuiz = await this.quizRepository.save(quiz);
      this.logger.log(
        `Generated quiz for lesson ${lessonId} with ${generatedQuestions.length} questions`,
      );

      return this.mapToResponseDto(updatedQuiz);
    } catch (error) {
      this.logger.error(`Failed to generate quiz for lesson ${lessonId}`, error);

      // Update status to failed
      quiz.status = QuizGenerationStatus.FAILED;
      await this.quizRepository.save(quiz);

      throw error;
    }
  }

  async reviewQuiz(
    quizId: string,
    reviewDto: ReviewGeneratedQuizDto,
    reviewerId: string,
  ): Promise<GeneratedQuizResponseDto> {
    const { qualityRating, feedback, suggestedChanges, approved } = reviewDto;

    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    if (quiz.status !== QuizGenerationStatus.COMPLETED) {
      throw new BadRequestException('Only completed quizzes can be reviewed');
    }

    // Update quiz with review
    quiz.status = approved ? QuizGenerationStatus.APPROVED : QuizGenerationStatus.REVIEWED;
    quiz.reviewedBy = reviewerId;
    quiz.review = {
      qualityRating,
      feedback,
      suggestedChanges: suggestedChanges || [],
      reviewedAt: new Date(),
    };

    const updatedQuiz = await this.quizRepository.save(quiz);
    this.logger.log(`Reviewed quiz ${quizId} - Rating: ${qualityRating}, Approved: ${approved}`);

    return this.mapToResponseDto(updatedQuiz);
  }

  async updateQuiz(
    quizId: string,
    updateDto: UpdateGeneratedQuizDto,
    _userId?: string,
  ): Promise<GeneratedQuizResponseDto> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    // Update quiz properties
    if (updateDto.title) quiz.title = updateDto.title;
    if (updateDto.description) quiz.description = updateDto.description;
    if (updateDto.timeLimit) quiz.timeLimit = updateDto.timeLimit;
    if (updateDto.questions) {
      quiz.questions = updateDto.questions;
      quiz.questionCount = updateDto.questions.length;
    }

    const updatedQuiz = await this.quizRepository.save(quiz);
    this.logger.log(`Updated quiz ${quizId}`);

    return this.mapToResponseDto(updatedQuiz);
  }

  async deleteQuiz(quizId: string): Promise<void> {
    const result = await this.quizRepository.softDelete(quizId);
    if (result.affected === 0) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }
    this.logger.log(`Deleted quiz ${quizId}`);
  }

  async getQuizzes(queryDto: QuizGenerationQueryDto): Promise<GeneratedQuizResponseDto[]> {
    const { lessonId, status, difficultyLevel, generatedBy, minQualityScore, sortByDate } =
      queryDto;

    const where: any = {};

    if (lessonId) where.lessonId = lessonId;
    if (status) where.status = status;
    if (difficultyLevel) where.difficultyLevel = difficultyLevel;
    if (generatedBy) where.generatedBy = generatedBy;
    if (minQualityScore !== undefined) {
      where.qualityScore = minQualityScore;
    }

    const quizzes = await this.quizRepository.find({
      where,
      order: {
        createdAt: sortByDate === 'asc' ? 'ASC' : 'DESC',
      },
      relations: ['lesson', 'generator', 'reviewer'],
    });

    return quizzes.map(quiz => this.mapToResponseDto(quiz));
  }

  async getQuizById(quizId: string): Promise<GeneratedQuizResponseDto> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['lesson', 'generator', 'reviewer'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    return this.mapToResponseDto(quiz);
  }

  async getQuizzesByLesson(lessonId: string): Promise<GeneratedQuizResponseDto[]> {
    const quizzes = await this.quizRepository.find({
      where: { lessonId },
      order: { createdAt: 'DESC' },
      relations: ['generator', 'reviewer'],
    });

    return quizzes.map(quiz => this.mapToResponseDto(quiz));
  }

  async approveQuiz(quizId: string, userId: string): Promise<GeneratedQuizResponseDto> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    quiz.status = QuizGenerationStatus.APPROVED;
    quiz.reviewedBy = userId;

    const updatedQuiz = await this.quizRepository.save(quiz);
    this.logger.log(`Approved quiz ${quizId}`);

    return this.mapToResponseDto(updatedQuiz);
  }

  async rejectQuiz(
    quizId: string,
    reason: string,
    userId: string,
  ): Promise<GeneratedQuizResponseDto> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    quiz.status = QuizGenerationStatus.REJECTED;
    quiz.reviewedBy = userId;
    quiz.review = {
      ...quiz.review,
      qualityRating: quiz.review?.qualityRating || 1,
      feedback: reason,
      reviewedAt: new Date(),
    };

    const updatedQuiz = await this.quizRepository.save(quiz);
    this.logger.log(`Rejected quiz ${quizId}: ${reason}`);

    return this.mapToResponseDto(updatedQuiz);
  }

  private extractLessonContent(lesson: Lesson): string {
    let content = lesson.title + '\n';

    if (lesson.description) {
      content += lesson.description + '\n';
    }

    if (lesson.content) {
      content += lesson.content + '\n';
    }

    if (lesson.objectives) {
      content += 'Learning Objectives:\n' + JSON.stringify(lesson.objectives) + '\n';
    }

    return content;
  }

  private mapAIQuestionType(aiType: string): QuestionType {
    const typeMap: Record<string, QuestionType> = {
      multiple_choice: QuestionType.MULTIPLE_CHOICE,
      true_false: QuestionType.TRUE_FALSE,
      short_answer: QuestionType.SHORT_ANSWER,
      fill_blank: QuestionType.FILL_IN_BLANK,
      matching: QuestionType.MATCHING,
      ordering: QuestionType.ORDERING,
    };

    return typeMap[aiType] || QuestionType.MULTIPLE_CHOICE;
  }

  private mapToResponseDto(quiz: GeneratedQuiz): GeneratedQuizResponseDto {
    return {
      id: quiz.id,
      lessonId: quiz.lessonId,
      title: quiz.title,
      description: quiz.description,
      status: quiz.status,
      questionCount: quiz.questionCount,
      difficultyLevel: quiz.difficultyLevel,
      timeLimit: quiz.timeLimit,
      qualityScore: quiz.qualityScore,
      questions: quiz.questions,
      review: quiz.review,
      generationAnalysis: quiz.generationAnalysis,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }
}

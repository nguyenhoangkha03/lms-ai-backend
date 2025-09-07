import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { Question } from '../entities/question.entity';
import { User } from '@/modules/user/entities/user.entity';
import { CreateQuestionBankDto, QuestionBankQueryDto } from '../dto/question-bank.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { QuestionType, DifficultyLevel } from '@/common/enums/assessment.enums';

@Injectable()
export class QuestionBankService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(QuestionBankService.name);
  }

  async createQuestion(createQuestionDto: CreateQuestionBankDto, creator: User): Promise<Question> {
    this.logger.log(`Creating question in bank by user: ${creator.id}`);

    const question = this.questionRepository.create({
      ...createQuestionDto,
      assessmentId: null,
      options: createQuestionDto.options 
        ? (typeof createQuestionDto.options === 'string' ? createQuestionDto.options : JSON.stringify(createQuestionDto.options))
        : null,
      correctAnswer: JSON.stringify(createQuestionDto.correctAnswer),
      tags: createQuestionDto.tags ? JSON.stringify(createQuestionDto.tags) : null,
      attachments: createQuestionDto.attachments
        ? JSON.stringify(createQuestionDto.attachments)
        : null,
      metadata: createQuestionDto.metadata ? JSON.stringify(createQuestionDto.metadata) : null,
      createdBy: creator.id,
      updatedBy: creator.id,
    });

    const savedQuestion = await this.questionRepository.save(question);

    await this.cacheService.deletePattern(`question-bank:${creator.id}:*`);

    return savedQuestion;
  }

  async getQuestions(
    queryDto: QuestionBankQueryDto,
    user: User,
  ): Promise<PaginatedResult<Question>> {
    const {
      page = 1,
      limit = 20,
      search,
      searchQuery, // Frontend sends searchQuery
      courseId,
      questionType,
      difficulty,
      subject,
      topic,
      tags,
      createdBy,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    // Use searchQuery if provided, otherwise use search
    const searchTerm = searchQuery || search;

    const cacheKey = `question-bank:${user.id}:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheService.get<PaginatedResult<Question>>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.assessmentId IS NULL');

    // Filter question bank questions (those not assigned to assessments) by courseId
    // Since question bank questions have assessmentId = NULL, we need to filter differently
    // For question bank, we might need to store courseId differently or join with assessments where questions are used
    // For now, let's skip courseId filtering for question bank questions since they're generic
    if (courseId) {
      // Option 1: Join with assessments to find questions used in this course
      // But this would only show questions already used in assessments from this course
      
      // Option 2: For question bank, ignore courseId filter since these are generic questions
      // that can be used across courses
      
      // For now, let's comment this out since question bank questions don't have direct courseId
      // queryBuilder.andWhere('question.courseId = :courseId', { courseId });
    }

    if (user.userType === 'teacher') {
      queryBuilder.andWhere('question.createdBy = :userId', { userId: user.id });
    } else if (user.userType === 'student') {
      queryBuilder.andWhere('question.isActive = :isActive', { isActive: true });
    }

    if (searchTerm) {
      queryBuilder.andWhere('question.questionText LIKE :search', { search: `%${searchTerm}%` });
    }

    if (questionType) {
      queryBuilder.andWhere('question.questionType = :questionType', { questionType });
    }

    if (difficulty) {
      queryBuilder.andWhere('question.difficulty = :difficulty', { difficulty });
    }

    if (subject) {
      queryBuilder.andWhere('JSON_EXTRACT(question.metadata, "$.subject") = :subject', { subject });
    }

    if (topic) {
      queryBuilder.andWhere('JSON_EXTRACT(question.metadata, "$.topic") = :topic', { topic });
    }

    if (tags) {
      const tagList = tags.split(',').map(tag => tag.trim());
      queryBuilder.andWhere('JSON_OVERLAPS(question.tags, :tags)', {
        tags: JSON.stringify(tagList),
      });
    }

    if (createdBy && user.userType === 'admin') {
      queryBuilder.andWhere('question.createdBy = :createdBy', { createdBy });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('question.isActive = :isActive', { isActive });
    }

    queryBuilder.orderBy(`question.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [questions, total] = await queryBuilder.getManyAndCount();

    const result = {
      data: questions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    await this.cacheService.set(cacheKey, result, 600);

    return result;
  }

  async getQuestionById(id: string, user: User): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, assessmentId: IsNull() },
    });

    if (!question) {
      throw new NotFoundException('Question not found in question bank');
    }

    if (user.userType === 'teacher' && question.createdBy !== user.id) {
      throw new ForbiddenException('You can only access your own questions');
    }

    return question;
  }

  async updateQuestion(
    id: string,
    updateData: Partial<CreateQuestionBankDto>,
    user: User,
  ): Promise<Question> {
    const question = await this.getQuestionById(id, user);

    if (question.createdBy !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only update your own questions');
    }

    const updatedData = {
      ...updateData,
      options: updateData.options 
        ? (typeof updateData.options === 'string' ? updateData.options : JSON.stringify(updateData.options))
        : question.options,
      correctAnswer: updateData.correctAnswer
        ? JSON.stringify(updateData.correctAnswer)
        : question.correctAnswer,
      tags: updateData.tags ? JSON.stringify(updateData.tags) : question.tags,
      attachments: updateData.attachments
        ? JSON.stringify(updateData.attachments)
        : question.attachments,
      metadata: updateData.metadata ? JSON.stringify(updateData.metadata) : question.metadata,
      updatedBy: user.id,
    };

    await this.questionRepository.update(id, updatedData);

    await this.cacheService.deletePattern(`question-bank:${user.id}:*`);

    return this.getQuestionById(id, user);
  }

  async deleteQuestion(id: string, user: User): Promise<void> {
    const question = await this.getQuestionById(id, user);

    if (question.createdBy !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only delete your own questions');
    }

    await this.questionRepository.softDelete(id);

    await this.cacheService.deletePattern(`question-bank:${user.id}:*`);

    this.logger.log(`Question ${id} deleted from question bank by user ${user.id}`);
  }

  async importQuestionsToAssessment(
    questionIds: string[],
    assessmentId: string,
    user: User,
  ): Promise<Question[]> {
    const questions = await this.questionRepository.find({
      where: {
        id: In(questionIds),
        assessmentId: IsNull(),
      },
    });

    if (questions.length !== questionIds.length) {
      throw new NotFoundException('Some questions not found in question bank');
    }

    for (const question of questions) {
      if (user.userType === 'teacher' && question.createdBy !== user.id) {
        throw new ForbiddenException(
          `You don't have access to question: ${question.questionText.substring(0, 50)}...`,
        );
      }
    }

    const copiedQuestions: Question[] = [];

    for (const [index, question] of questions.entries()) {
      const copiedQuestion = this.questionRepository.create({
        questionText: question.questionText,
        questionType: question.questionType,
        explanation: question.explanation,
        points: question.points,
        difficulty: question.difficulty,
        orderIndex: index,
        timeLimit: question.timeLimit,
        hint: question.hint,
        options: question.options,
        correctAnswer: question.correctAnswer,
        tags: question.tags,
        attachments: question.attachments,
        validationRules: question.validationRules,
        metadata: question.metadata,
        assessmentId,
        createdBy: user.id,
        updatedBy: user.id,
      });

      const saved = await this.questionRepository.save(copiedQuestion);
      copiedQuestions.push(saved);

      // Note: usageCount column doesn't exist, so we skip incrementing it
      // In future, we could add usageCount column or track usage in separate table
    }

    this.logger.log(`Imported ${copiedQuestions.length} questions to assessment ${assessmentId}`);

    return copiedQuestions;
  }

  async getQuestionBankStatistics(user: User, courseId?: string): Promise<any> {
    const cacheKey = `question-bank:stats:${user.id}:${courseId || 'all'}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.assessmentId IS NULL');

    // Skip courseId filtering for question bank statistics since question bank questions 
    // don't have direct courseId (they're generic questions that can be used across courses)
    if (courseId) {
      // For question bank, we ignore courseId filter since these are generic questions
      // If needed, we could join with assessments to find questions used in specific courses
      // but that would be a different query
    }

    if (user.userType === 'teacher') {
      queryBuilder.andWhere('question.createdBy = :userId', { userId: user.id });
    }

    const totalQuestions = await queryBuilder.getCount();

    // Create separate query builders for aggregation queries
    const typeStatsBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.assessmentId IS NULL');
    
    if (user.userType === 'teacher') {
      typeStatsBuilder.andWhere('question.createdBy = :userId', { userId: user.id });
    }

    const typeStats = await typeStatsBuilder
      .select('question.questionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('question.questionType')
      .getRawMany();

    const difficultyStatsBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.assessmentId IS NULL');
    
    if (user.userType === 'teacher') {
      difficultyStatsBuilder.andWhere('question.createdBy = :userId', { userId: user.id });
    }

    const difficultyStats = await difficultyStatsBuilder
      .select('question.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .groupBy('question.difficulty')
      .getRawMany();

    // Create separate query builder for mostUsed
    const mostUsedBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.assessmentId IS NULL');
    
    if (user.userType === 'teacher') {
      mostUsedBuilder.andWhere('question.createdBy = :userId', { userId: user.id });
    }

    // Since we don't have usageCount column, order by creation date instead
    const mostUsed = await mostUsedBuilder.orderBy('question.createdAt', 'DESC').limit(10).getMany();

    const statistics = {
      totalQuestions,
      questionsByType: typeStats.reduce((acc, stat) => {
        acc[stat.type] = parseInt(stat.count);
        return acc;
      }, {}),
      questionsByDifficulty: difficultyStats.reduce((acc, stat) => {
        acc[stat.difficulty] = parseInt(stat.count);
        return acc;
      }, {}),
      averagePoints: 0, // Placeholder since we don't calculate this
      mostUsedTags: [], // Placeholder since we don't have tags analytics yet
      mostUsed: mostUsed.map(q => ({
        id: q.id,
        questionText: q.questionText.substring(0, 100) + '...',
        questionType: q.questionType,
        difficulty: q.difficulty,
        createdAt: q.createdAt,
      })),
    };

    await this.cacheService.set(cacheKey, statistics, 1800);

    return statistics;
  }

  async getRandomQuestions(
    count: number,
    criteria: {
      questionType?: QuestionType;
      difficulty?: DifficultyLevel;
      subject?: string;
      topic?: string;
      excludeIds?: string[];
    },
    user: User,
  ): Promise<Question[]> {
    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .where('question.assessmentId IS NULL')
      .andWhere('question.isActive = :isActive', { isActive: true });

    if (user.userType === 'teacher') {
      queryBuilder.andWhere('question.createdBy = :userId', { userId: user.id });
    }

    if (criteria.questionType) {
      queryBuilder.andWhere('question.questionType = :questionType', {
        questionType: criteria.questionType,
      });
    }

    if (criteria.difficulty) {
      queryBuilder.andWhere('question.difficulty = :difficulty', {
        difficulty: criteria.difficulty,
      });
    }

    if (criteria.subject) {
      queryBuilder.andWhere('JSON_EXTRACT(question.metadata, "$.subject") = :subject', {
        subject: criteria.subject,
      });
    }

    if (criteria.topic) {
      queryBuilder.andWhere('JSON_EXTRACT(question.metadata, "$.topic") = :topic', {
        topic: criteria.topic,
      });
    }

    if (criteria.excludeIds?.length) {
      queryBuilder.andWhere('question.id NOT IN (:...excludeIds)', {
        excludeIds: criteria.excludeIds,
      });
    }

    queryBuilder.orderBy('RAND()').take(count);

    return queryBuilder.getMany();
  }
}

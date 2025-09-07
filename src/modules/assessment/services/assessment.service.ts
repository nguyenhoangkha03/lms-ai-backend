import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { AuditLogService } from '@/modules/system/services/audit-log.service';
import { Assessment } from '../entities/assessment.entity';
import { Question } from '../entities/question.entity';
import { AssessmentAttempt } from '../entities/assessment-attempt.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { Lesson } from '@/modules/course/entities/lesson.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { AssessmentQueryDto } from '../dto/assessment-query.dto';
import { ConfigureAssessmentDto } from '../dto/assessment-configuration.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';
import { AssessmentStatus, QuestionType } from '@/common/enums/assessment.enums';
import { AuditAction } from '@/common/enums/system.enums';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
  ) {
    this.logger.setContext(AssessmentService.name);
  }

  async createAssessment(
    createAssessmentDto: CreateAssessmentDto,
    creator: User,
  ): Promise<Assessment> {
    this.logger.log(`Creating assessment: ${createAssessmentDto.title}`);

    await this.validateOwnership(
      createAssessmentDto.courseId,
      createAssessmentDto.lessonId,
      creator,
    );

    const assessment = this.assessmentRepository.create({
      ...createAssessmentDto,
      teacherId: creator.id,
      createdBy: creator.id,
      updatedBy: creator.id,
      status: AssessmentStatus.DRAFT,
      settings: createAssessmentDto.settings ? JSON.stringify(createAssessmentDto.settings) : null,
      antiCheatSettings: createAssessmentDto.antiCheatSettings
        ? JSON.stringify(createAssessmentDto.antiCheatSettings)
        : null,
      metadata: createAssessmentDto.metadata ? JSON.stringify(createAssessmentDto.metadata) : null,
    } as DeepPartial<Assessment>);

    const savedAssessment = await this.assessmentRepository.save(assessment);

    if (createAssessmentDto.questions?.length) {
      await this.addQuestionsToAssessment(
        savedAssessment.id,
        createAssessmentDto.questions,
        creator,
      );
    }

    await this.clearAssessmentCache(creator.id, createAssessmentDto.courseId);

    await this.auditLogService.createAuditLog({
      userId: creator.id,
      action: AuditAction.CREATE_ASSESSMENT,
      entityType: 'Assessment',
      entityId: savedAssessment.id,
      description: `Created assessment: ${savedAssessment.title}`,
      metadata: { assessmentType: savedAssessment.assessmentType },
    });

    return this.getAssessmentById(savedAssessment.id, creator, true);
  }

  async getAssessments(
    queryDto: AssessmentQueryDto,
    user: User,
  ): Promise<PaginatedResult<Assessment>> {
    const {
      page = 1,
      limit = 10,
      search,
      assessmentType,
      status,
      courseId,
      lessonId,
      teacherId,
      gradingMethod,
      isMandatory,
      isProctored,
      availableFrom,
      availableUntil,
      includeQuestions,
      includeAttempts,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const cacheKey = `assessments:${user.id}:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheService.get<PaginatedResult<Assessment>>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.teacher', 'teacher')
      .leftJoinAndSelect('assessment.course', 'course')
      .leftJoinAndSelect('assessment.lesson', 'lesson');

    if (includeQuestions) {
      queryBuilder
        .leftJoinAndSelect('assessment.questions', 'questions')
        .addOrderBy('questions.orderIndex', 'ASC');
    }

    if (includeAttempts) {
      queryBuilder
        .leftJoinAndSelect('assessment.attempts', 'attempts')
        .addSelect([
          'COUNT(DISTINCT attempts.id) as totalAttempts',
          'COUNT(DISTINCT CASE WHEN attempts.status = "submitted" THEN attempts.studentId END) as completedAttempts',
          'AVG(CASE WHEN attempts.status = "submitted" THEN attempts.percentage END) as averageScore',
        ])
        .groupBy('assessment.id');
    }

    if (user.userType === 'teacher') {
      queryBuilder.where('assessment.teacherId = :teacherId', { teacherId: user.id });
    } else if (user.userType === 'student') {
      queryBuilder
        .where('assessment.status = :status', { status: AssessmentStatus.PUBLISHED })
        .andWhere('(assessment.availableFrom IS NULL OR assessment.availableFrom <= :now)', {
          now: new Date(),
        })
        .andWhere('(assessment.availableUntil IS NULL OR assessment.availableUntil >= :now)', {
          now: new Date(),
        });
    }

    if (search) {
      queryBuilder.andWhere(
        '(assessment.title LIKE :search OR assessment.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (assessmentType) {
      queryBuilder.andWhere('assessment.assessmentType = :assessmentType', { assessmentType });
    }

    if (status) {
      queryBuilder.andWhere('assessment.status = :status', { status });
    }

    if (courseId) {
      queryBuilder.andWhere('assessment.courseId = :courseId', { courseId });
    }

    if (lessonId) {
      queryBuilder.andWhere('assessment.lessonId = :lessonId', { lessonId });
    }

    if (teacherId && user.userType === 'admin') {
      queryBuilder.andWhere('assessment.teacherId = :teacherId', { teacherId });
    }

    if (gradingMethod) {
      queryBuilder.andWhere('assessment.gradingMethod = :gradingMethod', { gradingMethod });
    }

    if (typeof isMandatory === 'boolean') {
      queryBuilder.andWhere('assessment.isMandatory = :isMandatory', { isMandatory });
    }

    if (typeof isProctored === 'boolean') {
      queryBuilder.andWhere('assessment.isProctored = :isProctored', { isProctored });
    }

    if (availableFrom) {
      queryBuilder.andWhere('assessment.availableFrom >= :availableFrom', { availableFrom });
    }

    if (availableUntil) {
      queryBuilder.andWhere('assessment.availableUntil <= :availableUntil', { availableUntil });
    }

    queryBuilder.orderBy(`assessment.${sortBy}`, sortOrder?.toUpperCase() as 'ASC' | 'DESC');

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [assessments, total] = await queryBuilder.getManyAndCount();

    const result = {
      data: assessments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  async getAssessmentById(
    id: string,
    user: User,
    includeQuestions: boolean = false,
  ): Promise<Assessment> {
    const cacheKey = `assessment:${id}:${user.id}:${includeQuestions}`;
    const cached = await this.cacheService.get<Assessment>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.assessmentRepository
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.teacher', 'teacher')
      .leftJoinAndSelect('assessment.course', 'course')
      .leftJoinAndSelect('assessment.lesson', 'lesson')
      .where('assessment.id = :id', { id });

    if (includeQuestions) {
      queryBuilder
        .leftJoinAndSelect('assessment.questions', 'questions')
        .addOrderBy('questions.orderIndex', 'ASC');
    }

    const assessment = await queryBuilder.getOne();

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    await this.checkAssessmentAccess(assessment, user);

    await this.cacheService.set(cacheKey, assessment, 600);

    return assessment;
  }

  async updateAssessment(
    id: string,
    updateAssessmentDto: UpdateAssessmentDto,
    user: User,
  ): Promise<Assessment> {
    const assessment = await this.getAssessmentById(id, user);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only update your own assessments');
    }

    if (assessment.status === AssessmentStatus.PUBLISHED) {
      const hasAttempts = await this.attemptRepository.count({
        where: { assessmentId: id },
      });

      if (hasAttempts > 0 && user.userType !== 'admin') {
        throw new BadRequestException('Cannot modify published assessment with existing attempts');
      }
    }

    const updatedData = {
      ...updateAssessmentDto,
      updatedBy: user.id,
      settings: updateAssessmentDto.settings
        ? JSON.stringify(updateAssessmentDto.settings)
        : assessment.settings,
      antiCheatSettings: updateAssessmentDto.antiCheatSettings
        ? JSON.stringify(updateAssessmentDto.antiCheatSettings)
        : assessment.antiCheatSettings,
      metadata: updateAssessmentDto.metadata
        ? JSON.stringify(updateAssessmentDto.metadata)
        : assessment.metadata,
    };

    await this.assessmentRepository.update(id, updatedData);

    await this.clearAssessmentCache(user.id, assessment.courseId);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.UPDATE_ASSESSMENT,
      entityType: 'Assessment',
      entityId: id,
      description: `Updated assessment: ${assessment.title}`,
      changes: [{ field: 'assessment', oldValue: assessment, newValue: updatedData }],
    });

    return this.getAssessmentById(id, user, true);
  }

  async deleteAssessment(id: string, user: User): Promise<void> {
    const assessment = await this.getAssessmentById(id, user);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only delete your own assessments');
    }

    const hasAttempts = await this.attemptRepository.count({
      where: { assessmentId: id },
    });

    if (hasAttempts > 0 && user.userType !== 'admin') {
      throw new BadRequestException('Cannot delete assessment with existing attempts');
    }

    await this.assessmentRepository.softDelete(id);

    await this.clearAssessmentCache(user.id, assessment.courseId);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.DELETE_ASSESSMENT,
      entityType: 'Assessment',
      entityId: id,
      description: `Deleted assessment: ${assessment.title}`,
    });

    this.logger.log(`Assessment ${id} deleted by user ${user.id}`);
  }

  async configureAssessment(
    id: string,
    configDto: ConfigureAssessmentDto,
    user: User,
  ): Promise<Assessment> {
    const assessment = await this.getAssessmentById(id, user);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only configure your own assessments');
    }

    const updatedData: Partial<Assessment> = {
      updatedBy: user.id,
    };

    if (configDto.status) {
      updatedData.status = configDto.status;
    }

    if (configDto.availableFrom) {
      updatedData.availableFrom = new Date(configDto.availableFrom);
    }

    if (configDto.availableUntil) {
      updatedData.availableUntil = new Date(configDto.availableUntil);
    }

    if (configDto.settings) {
      const currentSettings = assessment.settingsJson;
      updatedData.settings = JSON.stringify({ ...currentSettings, ...configDto.settings });
    }

    if (configDto.antiCheatSettings) {
      const currentAntiCheat = assessment.antiCheatSettingsJson;
      updatedData.antiCheatSettings = JSON.stringify({
        ...currentAntiCheat,
        ...configDto.antiCheatSettings,
      });
    }

    if (configDto.metadata) {
      const currentMetadata = assessment.metadataJson;
      updatedData.metadata = JSON.stringify({ ...currentMetadata, ...configDto.metadata });
    }

    await this.assessmentRepository.update(id, updatedData);

    await this.clearAssessmentCache(user.id, assessment.courseId);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.CONFIGURE_ASSESSMENT,
      entityType: 'Assessment',
      entityId: id,
      description: `Configured assessment: ${assessment.title}`,
      changes: [{ field: 'assessment', oldValue: assessment, newValue: updatedData }],
    });

    return this.getAssessmentById(id, user, true);
  }

  async publishAssessment(id: string, user: User): Promise<Assessment> {
    const assessment = await this.getAssessmentById(id, user, true);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only publish your own assessments');
    }

    await this.validateAssessmentForPublishing(assessment);

    await this.assessmentRepository.update(id, {
      status: AssessmentStatus.PUBLISHED,
      updatedBy: user.id,
    });

    await this.clearAssessmentCache(user.id, assessment.courseId);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.PUBLISH_ASSESSMENT,
      entityType: 'Assessment',
      entityId: id,
      description: `Published assessment: ${assessment.title}`,
    });

    this.logger.log(`Assessment ${id} published by user ${user.id}`);

    return this.getAssessmentById(id, user, true);
  }

  async archiveAssessment(id: string, user: User): Promise<Assessment> {
    const assessment = await this.getAssessmentById(id, user);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only archive your own assessments');
    }

    await this.assessmentRepository.update(id, {
      status: AssessmentStatus.ARCHIVED,
      updatedBy: user.id,
    });

    await this.clearAssessmentCache(user.id, assessment.courseId);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.ARCHIVE_ASSESSMENT,
      entityType: 'Assessment',
      entityId: id,
      description: `Archived assessment: ${assessment.title}`,
    });

    return this.getAssessmentById(id, user);
  }

  async duplicateAssessment(id: string, user: User): Promise<Assessment> {
    const originalAssessment = await this.getAssessmentById(id, user, true);

    if (originalAssessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only duplicate assessments you have access to');
    }

    const newAssessment = this.assessmentRepository.create({
      title: `${originalAssessment.title} (Copy)`,
      description: originalAssessment.description,
      instructions: originalAssessment.instructions,
      assessmentType: originalAssessment.assessmentType,
      timeLimit: originalAssessment.timeLimit,
      maxAttempts: originalAssessment.maxAttempts,
      passingScore: originalAssessment.passingScore,
      totalPoints: originalAssessment.totalPoints,
      randomizeQuestions: originalAssessment.randomizeQuestions,
      randomizeAnswers: originalAssessment.randomizeAnswers,
      showResults: originalAssessment.showResults,
      showCorrectAnswers: originalAssessment.showCorrectAnswers,
      isMandatory: originalAssessment.isMandatory,
      isProctored: originalAssessment.isProctored,
      gradingMethod: originalAssessment.gradingMethod,
      weight: originalAssessment.weight,
      settings: originalAssessment.settings,
      antiCheatSettings: originalAssessment.antiCheatSettings,
      courseId: originalAssessment.courseId,
      lessonId: originalAssessment.lessonId,
      teacherId: user.id,
      status: AssessmentStatus.DRAFT,
      createdBy: user.id,
      updatedBy: user.id,
    });

    const savedAssessment = await this.assessmentRepository.save(newAssessment);

    if (originalAssessment.questions?.length) {
      for (const originalQuestion of originalAssessment.questions) {
        const newQuestion = this.questionRepository.create({
          questionText: originalQuestion.questionText,
          questionType: originalQuestion.questionType,
          explanation: originalQuestion.explanation,
          points: originalQuestion.points,
          difficulty: originalQuestion.difficulty,
          orderIndex: originalQuestion.orderIndex,
          timeLimit: originalQuestion.timeLimit,
          hint: originalQuestion.hint,
          options: originalQuestion.options,
          correctAnswer: originalQuestion.correctAnswer,
          tags: originalQuestion.tags,
          attachments: originalQuestion.attachments,
          validationRules: originalQuestion.validationRules,
          metadata: originalQuestion.metadata,
          assessmentId: savedAssessment.id,
          createdBy: user.id,
          updatedBy: user.id,
        });

        await this.questionRepository.save(newQuestion);
      }
    }

    await this.clearAssessmentCache(user.id, originalAssessment.courseId);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.DUPLICATE_ASSESSMENT,
      entityType: 'Assessment',
      entityId: savedAssessment.id,
      description: `Duplicated assessment: ${originalAssessment.title}`,
      metadata: { originalAssessmentId: id },
    });

    return this.getAssessmentById(savedAssessment.id, user, true);
  }

  async getAssessmentStatistics(id: string, user: User): Promise<any> {
    const assessment = await this.getAssessmentById(id, user);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only view statistics for your own assessments');
    }

    const cacheKey = `assessment:stats:${id}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const attempts = await this.attemptRepository
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.student', 'student')
      .where('attempt.assessmentId = :assessmentId', { assessmentId: id })
      .getMany();

    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.status === 'submitted').length;
    const averageScore =
      completedAttempts > 0
        ? attempts
            .filter(a => a.percentage !== null)
            .reduce((sum, a) => sum + (a.percentage || 0), 0) / completedAttempts
        : 0;

    const passedAttempts = attempts.filter(
      a => a.percentage && a.percentage >= assessment.passingScore,
    ).length;
    const passRate = completedAttempts > 0 ? (passedAttempts / completedAttempts) * 100 : 0;

    const scores = attempts.filter(a => a.percentage !== null).map(a => a.percentage!);
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const questionStats = await this.getQuestionStatistics(id);

    const statistics = {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        type: assessment.assessmentType,
        totalQuestions: assessment.questionsCount,
        totalPoints: assessment.totalPoints,
      },
      attempts: {
        total: totalAttempts,
        completed: completedAttempts,
        inProgress: totalAttempts - completedAttempts,
        completionRate: totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
      },
      scores: {
        average: averageScore,
        highest: highestScore,
        lowest: lowestScore,
        passRate,
        distribution: this.calculateScoreDistribution(scores),
      },
      questions: questionStats,
      timeAnalysis: {
        averageTimeSpent: this.calculateAverageTimeSpent(attempts),
        timeDistribution: this.calculateTimeDistribution(attempts),
      },
    };

    await this.cacheService.set(cacheKey, statistics, 300);

    return statistics;
  }

  async addQuestionsToAssessment(
    assessmentId: string,
    questions: any[],
    user: User,
  ): Promise<Question[]> {
    const assessment = await this.getAssessmentById(assessmentId, user);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only add questions to your own assessments');
    }

    // Clear existing questions first to prevent duplicates
    await this.questionRepository.delete({ assessmentId });

    const savedQuestions: Question[] = [];

    for (const [index, questionData] of questions.entries()) {
      const question = this.questionRepository.create({
        ...questionData,
        assessmentId,
        orderIndex: questionData.orderIndex ?? index,
        options: (() => {
          console.log('=== BACKEND: Processing question options ===');
          console.log('Received questionData.options:', questionData.options);
          console.log('Type of questionData.options:', typeof questionData.options);
          
          if (!questionData.options) {
            console.log('Options is null/undefined');
            return null;
          }
          
          if (typeof questionData.options === 'string') {
            console.log('Options already string, using as-is:', questionData.options);
            return questionData.options;
          } else {
            console.log('Options is not string, stringifying:', questionData.options);
            const stringified = JSON.stringify(questionData.options);
            console.log('Stringified result:', stringified);
            return stringified;
          }
        })(),
        correctAnswer: JSON.stringify(questionData.correctAnswer),
        tags: questionData.tags ? JSON.stringify(questionData.tags) : null,
        attachments: questionData.attachments ? JSON.stringify(questionData.attachments) : null,
        validationRules: questionData.validationRules
          ? JSON.stringify(questionData.validationRules)
          : null,
        metadata: questionData.metadata ? JSON.stringify(questionData.metadata) : null,
        createdBy: user.id,
        updatedBy: user.id,
      } as DeepPartial<Question>);

      const savedQuestion = await this.questionRepository.save(question);
      savedQuestions.push(savedQuestion);
    }

    // Calculate total points from all saved questions
    const totalPoints = savedQuestions.reduce((sum, q) => {
      const points = Number(q.points || 0);
      if (isNaN(points)) {
        throw new BadRequestException(`Invalid point value in question: ${q.points}`);
      }
      return sum + points;
    }, 0);

    // Set total points to the sum of all questions (not adding to existing)
    await this.assessmentRepository.update(assessmentId, {
      totalPoints: parseFloat(totalPoints.toFixed(2)),
      updatedBy: user.id,
    });

    // Clear cache
    await this.clearAssessmentCache(user.id, assessment.courseId);

    return savedQuestions;
  }

  async removeQuestionFromAssessment(
    assessmentId: string,
    questionId: string,
    user: User,
  ): Promise<void> {
    const assessment = await this.getAssessmentById(assessmentId, user);

    if (assessment.teacherId !== user.id && user.userType !== 'admin') {
      throw new ForbiddenException('You can only remove questions from your own assessments');
    }

    const question = await this.questionRepository.findOne({
      where: { id: questionId, assessmentId },
    });

    if (!question) {
      throw new NotFoundException('Question not found in this assessment');
    }

    await this.questionRepository.softDelete(questionId);

    await this.assessmentRepository.update(assessmentId, {
      totalPoints: (assessment.totalPoints || 0) - (question.points || 0),
      updatedBy: user.id,
    });

    await this.reorderQuestions(assessmentId);

    await this.clearAssessmentCache(user.id, assessment.courseId);

    await this.auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.REMOVE_QUESTION,
      entityType: 'Question',
      entityId: questionId,
      description: `Removed question from assessment: ${assessment.title}`,
    });
  }

  async reorderQuestions(assessmentId: string, questionIds?: string[]): Promise<void> {
    if (questionIds) {
      for (const [index, questionId] of questionIds.entries()) {
        await this.questionRepository.update(
          { id: questionId, assessmentId },
          { orderIndex: index },
        );
      }
    } else {
      const questions = await this.questionRepository.find({
        where: { assessmentId },
        order: { orderIndex: 'ASC' },
      });

      for (const [index, question] of questions.entries()) {
        if (question.orderIndex !== index) {
          await this.questionRepository.update(question.id, { orderIndex: index });
        }
      }
    }
  }

  private async validateAssessmentForPublishing(assessment: Assessment): Promise<void> {
    const errors: string[] = [];

    if (!assessment.questions || assessment.questions.length === 0) {
      errors.push('Assessment must have at least one question');
    }

    for (const question of assessment.questions || []) {
      if (
        !question.correctAnswer ||
        question.correctAnswer === '{}' ||
        question.correctAnswer === '[]'
      ) {
        errors.push(
          `Question "${question.questionText.substring(0, 50)}..." must have a correct answer`,
        );
      }

      if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
        const options = question.optionsJson;
        if (!options || options.length < 2) {
          errors.push(
            `Multiple choice question "${question.questionText.substring(0, 50)}..." must have at least 2 options`,
          );
        }
      }
    }

    if (assessment.availableFrom && assessment.availableUntil) {
      if (assessment.availableFrom >= assessment.availableUntil) {
        errors.push('Available from date must be before available until date');
      }
    }

    if (assessment.courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: assessment.courseId },
      });
      if (!course) {
        errors.push('Associated course not found');
      }
    }

    if (assessment.lessonId) {
      const lesson = await this.lessonRepository.findOne({
        where: { id: assessment.lessonId },
      });
      if (!lesson) {
        errors.push('Associated lesson not found');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Cannot publish assessment: ${errors.join(', ')}`);
    }
  }

  private async validateOwnership(
    courseId?: string,
    lessonId?: string,
    user?: User,
  ): Promise<void> {
    if (user?.userType === 'admin') return;

    if (courseId) {
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (course.teacherId !== user?.id) {
        throw new ForbiddenException('You can only create assessments for your own courses');
      }
    }

    if (lessonId) {
      const lesson = await this.lessonRepository.findOne({
        where: { id: lessonId },
        relations: ['course'],
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      if (lesson.course?.teacherId !== user?.id) {
        throw new ForbiddenException('You can only create assessments for your own lessons');
      }
    }
  }
  private async checkAssessmentAccess(assessment: Assessment, user: User): Promise<void> {
    if (user.userType === 'admin') return;

    if (user.userType === 'teacher' && assessment.teacherId === user.id) return;

    if (user.userType === 'student') {
      if (assessment.status !== AssessmentStatus.PUBLISHED) {
        throw new ForbiddenException('Assessment is not published');
      }

      if (!assessment.isAvailable) {
        throw new ForbiddenException('Assessment is not currently available');
      }

      return;
    }

    throw new ForbiddenException('You do not have access to this assessment');
  }

  private async getQuestionStatistics(assessmentId: string): Promise<any[]> {
    const questions = await this.questionRepository.find({
      where: { assessmentId },
      order: { orderIndex: 'ASC' },
    });

    const questionStats: any[] = [];

    for (const question of questions) {
      const attempts = await this.attemptRepository
        .createQueryBuilder('attempt')
        .where('attempt.assessmentId = :assessmentId', { assessmentId })
        .andWhere('attempt.status = :status', { status: 'submitted' })
        .getMany();

      const questionAnswers = attempts
        .map(attempt => {
          const answers = attempt.answersJson;
          return answers[question.id];
        })
        .filter(answer => answer !== undefined);

      const correctAnswers = questionAnswers.filter(answer => {
        return JSON.stringify(answer) === question.correctAnswer;
      }).length;

      const totalAnswers = questionAnswers.length;
      const correctPercentage = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      questionStats.push({
        questionId: question.id,
        questionText: question.questionText.substring(0, 100) + '...',
        questionType: question.questionType,
        difficulty: question.difficulty,
        points: question.points,
        totalAnswers,
        correctAnswers,
        correctPercentage,
        difficulty_actual: this.calculateActualDifficulty(correctPercentage),
      });
    }

    return questionStats;
  }

  private calculateScoreDistribution(scores: number[]): any {
    if (scores.length === 0) return {};

    const ranges = [
      { min: 0, max: 20, label: '0-20%' },
      { min: 21, max: 40, label: '21-40%' },
      { min: 41, max: 60, label: '41-60%' },
      { min: 61, max: 80, label: '61-80%' },
      { min: 81, max: 100, label: '81-100%' },
    ];

    const distribution = {};

    for (const range of ranges) {
      const count = scores.filter(score => score >= range.min && score <= range.max).length;
      distribution[range.label] = {
        count,
        percentage: (count / scores.length) * 100,
      };
    }

    return distribution;
  }

  private calculateAverageTimeSpent(attempts: AssessmentAttempt[]): number {
    const completedAttempts = attempts.filter(a => a.timeTaken !== null);
    if (completedAttempts.length === 0) return 0;

    const totalTime = completedAttempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0);
    return totalTime / completedAttempts.length;
  }

  private calculateTimeDistribution(attempts: AssessmentAttempt[]): any {
    const completedAttempts = attempts.filter(a => a.timeTaken !== null);
    if (completedAttempts.length === 0) return {};

    const times = completedAttempts.map(a => a.timeTaken!);
    const avgTime = this.calculateAverageTimeSpent(attempts);

    return {
      fastest: Math.min(...times),
      slowest: Math.max(...times),
      average: avgTime,
      median: this.calculateMedian(times),
    };
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
  }

  private calculateActualDifficulty(correctPercentage: number): string {
    if (correctPercentage >= 80) return 'easy';
    if (correctPercentage >= 60) return 'medium';
    if (correctPercentage >= 40) return 'hard';
    return 'expert';
  }

  private async clearAssessmentCache(userId: string, courseId?: string): Promise<void> {
    const patterns = [
      `assessments:${userId}:*`,
      'assessment:*',
      courseId ? `course:${courseId}:*` : null,
    ].filter(Boolean);

    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern!);
    }
  }
}

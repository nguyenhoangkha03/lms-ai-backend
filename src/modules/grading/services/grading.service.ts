import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';

import { Grade, GradeStatus } from '../entities/grade.entity';
import { Feedback } from '../entities/feedback.entity';
import { AssessmentAttempt } from '../../assessment/entities/assessment-attempt.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';
import { Question } from '../../assessment/entities/question.entity';

import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';
import { BulkGradeDto } from '../dto/bulk-grade.dto';
import { GradeQueryDto } from '../dto/grade-query.dto';
import { PaginatedResult } from '@/common/dto/pagination.dto';

@Injectable()
export class GradingService {
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(GradingService.name);
  }

  // ===== CORE GRADING OPERATIONS =====
  async createGrade(createGradeDto: CreateGradeDto, graderId: string): Promise<Grade> {
    this.logger.log(`Creating grade for student ${createGradeDto.studentId}`);

    const attempt = await this.attemptRepository.findOne({
      where: { id: createGradeDto.attemptId },
      relations: ['assessment'],
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }

    const existingGrade = await this.gradeRepository.findOne({
      where: {
        studentId: createGradeDto.studentId,
        assessmentId: createGradeDto.assessmentId,
        attemptId: createGradeDto.attemptId,
      },
    });

    if (existingGrade) {
      throw new BadRequestException('Grade already exists for this attempt');
    }

    const percentage = (createGradeDto.score / createGradeDto.maxScore) * 100;

    const grade = this.gradeRepository.create({
      ...createGradeDto,
      graderId,
      percentage,
      createdBy: graderId,
      updatedBy: graderId,
      gradedAt: new Date(),
    });

    const savedGrade = await this.gradeRepository.save(grade);

    await this.clearGradeCache(createGradeDto.studentId, createGradeDto.assessmentId);

    this.eventEmitter.emit('grade.created', {
      gradeId: savedGrade.id,
      studentId: createGradeDto.studentId,
      assessmentId: createGradeDto.assessmentId,
      score: createGradeDto.score,
      percentage,
    });

    this.logger.log(`Grade created successfully {
      gradeId: ${savedGrade.id},
      studentId: ${createGradeDto.studentId},
      score: ${createGradeDto.score},
    }`);

    return savedGrade;
  }

  async updateGrade(id: string, updateGradeDto: UpdateGradeDto, graderId: string): Promise<Grade> {
    const grade = await this.gradeRepository.findOne({ where: { id } });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (updateGradeDto.score !== undefined || updateGradeDto.maxScore !== undefined) {
      const score = updateGradeDto.score ?? grade.score;
      const maxScore = updateGradeDto.maxScore ?? grade.maxScore;
      updateGradeDto.percentage = (score / maxScore) * 100;
    }

    Object.assign(grade, updateGradeDto, {
      updatedBy: graderId,
      gradedAt: new Date(),
    });

    const savedGrade = await this.gradeRepository.save(grade);

    await this.clearGradeCache(grade.studentId, grade.assessmentId);

    this.eventEmitter.emit('grade.updated', {
      gradeId: savedGrade.id,
      studentId: grade.studentId,
      assessmentId: grade.assessmentId,
      changes: updateGradeDto,
    });

    return savedGrade;
  }

  async deleteGrade(id: string): Promise<void> {
    const grade = await this.gradeRepository.findOne({ where: { id } });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    await this.gradeRepository.softDelete(id);

    await this.clearGradeCache(grade.studentId, grade.assessmentId);

    this.eventEmitter.emit('grade.deleted', {
      gradeId: id,
      studentId: grade.studentId,
      assessmentId: grade.assessmentId,
    });
  }

  // ===== AUTOMATIC GRADING =====
  async autoGradeMultipleChoice(attemptId: string, graderId: string): Promise<Grade> {
    this.logger.log(`Auto-grading multiple choice for attempt ${attemptId}`);

    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ['assessment', 'assessment.questions'],
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }

    const questions = attempt.assessment.questions;
    const answers = JSON.parse(attempt.answers || '{}');

    let totalScore = 0;
    let maxScore = 0;
    const questionScores: Record<string, any> = {};

    for (const question of questions!) {
      if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
        const correctAnswer = JSON.parse(question.correctAnswer!);
        const studentAnswer = answers[question.id];

        const questionMaxScore = question.points || 1;
        maxScore += questionMaxScore;

        let questionScore = 0;
        if (this.isAnswerCorrect(studentAnswer, correctAnswer)) {
          questionScore = questionMaxScore;
          totalScore += questionScore;
        }

        questionScores[question.id] = {
          score: questionScore,
          maxScore: questionMaxScore,
          isCorrect: questionScore > 0,
          studentAnswer,
          correctAnswer,
        };
      }
    }

    const createGradeDto: CreateGradeDto = {
      studentId: attempt.studentId,
      assessmentId: attempt.assessmentId,
      attemptId: attempt.id,
      score: totalScore,
      maxScore,
      status: GradeStatus.GRADED,
      isAiGraded: true,
      aiConfidence: 1.0,
      questionScores: JSON.stringify(questionScores),
      overallFeedback: `Automatically graded. Score: ${totalScore}/${maxScore} (${((totalScore / maxScore) * 100).toFixed(1)}%)`,
    };

    return this.createGrade(createGradeDto, graderId);
  }

  private isAnswerCorrect(studentAnswer: any, correctAnswer: any): boolean {
    if (Array.isArray(correctAnswer)) {
      if (Array.isArray(studentAnswer)) {
        return (
          studentAnswer.length === correctAnswer.length &&
          studentAnswer.every(ans => correctAnswer.includes(ans))
        );
      }
      return correctAnswer.includes(studentAnswer);
    }

    return studentAnswer === correctAnswer;
  }

  // ===== BULK OPERATIONS =====
  async bulkGrade(bulkGradeDto: BulkGradeDto, graderId: string): Promise<Grade[]> {
    this.logger.log(`Bulk grading ${bulkGradeDto.grades.length} submissions`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const grades: Grade[] = [];

      for (const gradeDto of bulkGradeDto.grades) {
        const percentage = (gradeDto.score / gradeDto.maxScore) * 100;

        const grade = queryRunner.manager.create(Grade, {
          ...gradeDto,
          graderId,
          percentage,
          createdBy: graderId,
          updatedBy: graderId,
          gradedAt: new Date(),
          isPublished: bulkGradeDto.publishImmediately || false,
          publishedAt: bulkGradeDto.publishImmediately ? new Date() : undefined,
          overallFeedback: gradeDto.overallFeedback || bulkGradeDto.commonFeedback,
        });

        const savedGrade = await queryRunner.manager.save(grade);
        grades.push(savedGrade);
      }

      await queryRunner.commitTransaction();

      for (const grade of grades) {
        await this.clearGradeCache(grade.studentId, grade.assessmentId);
      }

      this.eventEmitter.emit('grades.bulk_created', {
        count: grades.length,
        graderId,
        publishedImmediately: bulkGradeDto.publishImmediately,
      });

      this.logger.log(`Bulk grading completed, {
        count: ${grades.length},
        graderId: ${graderId},
      }`);

      return grades;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Bulk grading failed', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ===== QUERY OPERATIONS =====
  async findGrades(query: GradeQueryDto): Promise<PaginatedResult<Grade>> {
    const queryBuilder = this.gradeRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.student', 'student')
      .leftJoinAndSelect('grade.assessment', 'assessment')
      .leftJoinAndSelect('grade.grader', 'grader');

    if (query.studentId) {
      queryBuilder.andWhere('grade.studentId = :studentId', { studentId: query.studentId });
    }

    if (query.assessmentId) {
      queryBuilder.andWhere('grade.assessmentId = :assessmentId', {
        assessmentId: query.assessmentId,
      });
    }

    if (query.courseId) {
      queryBuilder.andWhere('assessment.courseId = :courseId', { courseId: query.courseId });
    }

    if (query.graderId) {
      queryBuilder.andWhere('grade.graderId = :graderId', { graderId: query.graderId });
    }

    if (query.status) {
      queryBuilder.andWhere('grade.status = :status', { status: query.status });
    }

    if (query.isPublished !== undefined) {
      queryBuilder.andWhere('grade.isPublished = :isPublished', { isPublished: query.isPublished });
    }

    if (query.isAiGraded !== undefined) {
      queryBuilder.andWhere('grade.isAiGraded = :isAiGraded', { isAiGraded: query.isAiGraded });
    }

    if (query.fromDate) {
      queryBuilder.andWhere('grade.createdAt >= :fromDate', { fromDate: query.fromDate });
    }

    if (query.toDate) {
      queryBuilder.andWhere('grade.createdAt <= :toDate', { toDate: query.toDate });
    }

    if (query.search) {
      queryBuilder.andWhere('(grade.overallFeedback LIKE :search OR grade.comments LIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .skip((query.page! - 1) * query.limit!)
      .take(query.limit)
      .orderBy('grade.createdAt', 'DESC');

    const items = await queryBuilder.getMany();

    return {
      data: items,
      meta: {
        total,
        page: query.page!,
        limit: query.limit!,
        totalPages: Math.ceil(total / query.limit!),
        hasNext: query.page! < Math.ceil(total / query.limit!),
        hasPrev: query.page! > 1,
      },
    };
  }

  async findGradeById(id: string): Promise<Grade> {
    const grade = await this.gradeRepository.findOne({
      where: { id },
      relations: ['student', 'assessment', 'grader', 'attempt'],
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    return grade;
  }

  // ===== PUBLISHING =====
  async publishGrade(id: string, graderId: string): Promise<Grade> {
    const grade = await this.findGradeById(id);

    if (grade.isPublished) {
      throw new BadRequestException('Grade is already published');
    }

    grade.isPublished = true;
    grade.publishedAt = new Date();
    grade.updatedBy = graderId;

    const savedGrade = await this.gradeRepository.save(grade);

    await this.clearGradeCache(grade.studentId, grade.assessmentId);

    this.eventEmitter.emit('grade.published', {
      gradeId: savedGrade.id,
      studentId: grade.studentId,
      assessmentId: grade.assessmentId,
      score: grade.score,
      percentage: grade.percentage,
    });

    return savedGrade;
  }

  async unpublishGrade(id: string, graderId: string): Promise<Grade> {
    const grade = await this.findGradeById(id);

    if (!grade.isPublished) {
      throw new BadRequestException('Grade is not published');
    }

    grade.isPublished = false;
    grade.publishedAt = null;
    grade.updatedBy = graderId;

    const savedGrade = await this.gradeRepository.save(grade);

    await this.clearGradeCache(grade.studentId, grade.assessmentId);

    return savedGrade;
  }

  // ===== ANALYTICS =====
  async getGradeStatistics(assessmentId: string): Promise<any> {
    const cacheKey = `grade_stats:${assessmentId}`;

    let stats = await this.cacheService.get(cacheKey);
    if (stats) return stats;

    const grades = await this.gradeRepository.find({
      where: { assessmentId, isPublished: true },
    });

    if (grades.length === 0) {
      return {
        count: 0,
        average: 0,
        median: 0,
        highest: 0,
        lowest: 0,
        passingRate: 0,
        distribution: {},
      };
    }

    const scores = grades.map(g => g.percentage).sort((a, b) => a - b);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const median = scores[Math.floor(scores.length / 2)];
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passingCount = scores.filter(score => score >= 60).length;
    const passingRate = (passingCount / scores.length) * 100;

    const distribution = {
      'A (90-100)': scores.filter(s => s >= 90).length,
      'B (80-89)': scores.filter(s => s >= 80 && s < 90).length,
      'C (70-79)': scores.filter(s => s >= 70 && s < 80).length,
      'D (60-69)': scores.filter(s => s >= 60 && s < 70).length,
      'F (0-59)': scores.filter(s => s < 60).length,
    };

    stats = {
      count: grades.length,
      average: Number(average.toFixed(2)),
      median: Number(median.toFixed(2)),
      highest: Number(highest.toFixed(2)),
      lowest: Number(lowest.toFixed(2)),
      passingRate: Number(passingRate.toFixed(2)),
      distribution,
    };

    await this.cacheService.set(cacheKey, stats, 300);
    return stats;
  }

  // ===== UTILITY METHODS =====
  private async clearGradeCache(studentId: string, assessmentId: string): Promise<void> {
    const cacheKeys = [
      `grade:student:${studentId}`,
      `grade:assessment:${assessmentId}`,
      `grade_stats:${assessmentId}`,
      `gradebook:*`,
    ];

    for (const key of cacheKeys) {
      await this.cacheService.del(key);
    }
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';

import { Gradebook } from '../entities/gradebook.entity';
import { Grade } from '../entities/grade.entity';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';

import { CreateGradebookDto, UpdateGradebookDto } from '../dto/gradebook.dto';

interface GradebookEntry {
  studentId: string;
  studentName: string;
  studentEmail: string;
  assessments: Record<
    string,
    {
      score: number;
      maxScore: number;
      percentage: number;
      status: string;
      gradedAt?: Date;
    }
  >;
  overallGrade: {
    totalScore: number;
    totalMaxScore: number;
    percentage: number;
    letterGrade: string;
    isPassing: boolean;
  };
}

interface GradebookSummary {
  course: {
    id: string;
    title: string;
    code: string;
  };
  statistics: {
    totalStudents: number;
    totalAssessments: number;
    averageGrade: number;
    passingRate: number;
    completionRate: number;
  };
  gradeDistribution: Record<string, number>;
  recentActivity: any[];
}

@Injectable()
export class GradebookService {
  private readonly logger = new Logger(GradebookService.name);

  constructor(
    @InjectRepository(Gradebook)
    private readonly gradebookRepository: Repository<Gradebook>,
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly winstonService: WinstonService,
  ) {
    this.winstonService.setContext(GradebookService.name);
  }

  // ===== GRADEBOOK MANAGEMENT =====
  async createGradebook(
    createGradebookDto: CreateGradebookDto,
    teacherId: string,
  ): Promise<Gradebook> {
    this.logger.log(`Creating gradebook for course ${createGradebookDto.courseId}`);

    const course = await this.courseRepository.findOne({
      where: { id: createGradebookDto.courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new BadRequestException('Only the course instructor can create a gradebook');
    }

    const existingGradebook = await this.gradebookRepository.findOne({
      where: { courseId: createGradebookDto.courseId },
    });

    if (existingGradebook) {
      throw new BadRequestException('Gradebook already exists for this course');
    }

    const gradebook = this.gradebookRepository.create({
      ...createGradebookDto,
      teacherId,
      createdBy: teacherId,
      updatedBy: teacherId,
    });

    const savedGradebook = await this.gradebookRepository.save(gradebook);

    await this.initializeGradebookData(savedGradebook.id);

    await this.cacheService.del(`course:${createGradebookDto.courseId}:*`);

    this.eventEmitter.emit('gradebook.created', {
      gradebookId: savedGradebook.id,
      courseId: createGradebookDto.courseId,
      teacherId,
    });

    this.logger.log(`Gradebook created successfully, {
      gradebookId: ${savedGradebook.id},
      courseId: ${createGradebookDto.courseId},
    }`);

    return savedGradebook;
  }

  async updateGradebook(
    id: string,
    updateGradebookDto: UpdateGradebookDto,
    teacherId: string,
  ): Promise<Gradebook> {
    const gradebook = await this.gradebookRepository.findOne({ where: { id } });

    if (!gradebook) {
      throw new NotFoundException('Gradebook not found');
    }

    if (gradebook.teacherId !== teacherId) {
      throw new BadRequestException('Only the gradebook owner can update it');
    }

    Object.assign(gradebook, updateGradebookDto, {
      updatedBy: teacherId,
    });

    const savedGradebook = await this.gradebookRepository.save(gradebook);

    await this.clearGradebookCache(gradebook.courseId);

    return savedGradebook;
  }

  // ===== GRADEBOOK DATA RETRIEVAL =====
  async getGradebookData(gradebookId: string): Promise<GradebookEntry[]> {
    const cacheKey = `gradebook:data:${gradebookId}`;

    let gradebookData = await this.cacheService.get<GradebookEntry[]>(cacheKey);
    if (gradebookData) return gradebookData;

    const gradebook = await this.gradebookRepository.findOne({
      where: { id: gradebookId },
      relations: ['course'],
    });

    if (!gradebook) {
      throw new NotFoundException('Gradebook not found');
    }

    const students = await this.dataSource.query(
      `
      SELECT DISTINCT u.id, u.firstName, u.lastName, u.email
      FROM users u
      INNER JOIN enrollments e ON u.id = e.studentId
      WHERE e.courseId = ? AND u.userType = 'student' AND u.deletedAt IS NULL
      ORDER BY u.lastName, u.firstName
    `,
      [gradebook.courseId],
    );

    const assessments = await this.assessmentRepository.find({
      where: { courseId: gradebook.courseId },
      order: { createdAt: 'ASC' },
    });

    const grades = await this.gradeRepository.find({
      where: {
        assessmentId: In(assessments.map(a => a.id)),
        isPublished: true,
      },
      relations: ['assessment'],
    });

    gradebookData = await this.buildGradebookEntries(students, assessments, grades, gradebook);

    await this.cacheService.set(cacheKey, gradebookData, 300);

    return gradebookData;
  }

  async getGradebookSummary(gradebookId: string): Promise<GradebookSummary> {
    const cacheKey = `gradebook:summary:${gradebookId}`;

    let summary = await this.cacheService.get<GradebookSummary>(cacheKey);
    if (summary) return summary;

    const gradebook = await this.gradebookRepository.findOne({
      where: { id: gradebookId },
      relations: ['course'],
    });

    if (!gradebook) {
      throw new NotFoundException('Gradebook not found');
    }

    const gradebookData = await this.getGradebookData(gradebookId);

    const totalStudents = gradebookData.length;
    const assessments = await this.assessmentRepository.count({
      where: { courseId: gradebook.courseId },
    });

    const validGrades = gradebookData.filter(entry => entry.overallGrade.totalMaxScore > 0);
    const averageGrade =
      validGrades.length > 0
        ? validGrades.reduce((sum, entry) => sum + entry.overallGrade.percentage, 0) /
          validGrades.length
        : 0;

    const passingStudents = validGrades.filter(entry => entry.overallGrade.isPassing).length;
    const passingRate = validGrades.length > 0 ? (passingStudents / validGrades.length) * 100 : 0;

    const completedStudents = gradebookData.filter(
      entry => Object.keys(entry.assessments).length > 0,
    ).length;
    const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;

    const gradeDistribution = validGrades.reduce(
      (dist, entry) => {
        const letterGrade = entry.overallGrade.letterGrade;
        dist[letterGrade] = (dist[letterGrade] || 0) + 1;
        return dist;
      },
      {} as Record<string, number>,
    );

    const assessmentIds = (
      await this.assessmentRepository.find({
        where: { courseId: gradebook.courseId },
        select: ['id'],
      })
    ).map(a => a.id);

    const recentActivity = await this.gradeRepository.find({
      where: {
        assessmentId: In(assessmentIds),
      },
      relations: ['student', 'assessment', 'grader'],
      order: { gradedAt: 'DESC' },
      take: 10,
    });

    const course = await gradebook.course;

    const recentActivityEntries: {
      id: string;
      studentName: string;
      assessmentTitle: string;
      score: number;
      maxScore: number;
      percentage: number;
      gradedAt: Date;
      graderName: string;
    }[] = [];

    for (const grade of recentActivity) {
      const student = await grade.student;
      const assessment = await grade.assessment;
      const grader = await grade.grader;

      recentActivityEntries.push({
        id: grade.id,
        studentName: `${student?.firstName} ${student?.lastName}`,
        assessmentTitle: assessment?.title,
        score: grade.score,
        maxScore: grade.maxScore,
        percentage: grade.percentage,
        gradedAt: grade.gradedAt,
        graderName: `${grader?.firstName} ${grader?.lastName}`,
      });
    }

    summary = {
      course: {
        id: course.id,
        title: course.title,
        code: course.id || '',
      },
      statistics: {
        totalStudents,
        totalAssessments: assessments,
        averageGrade: Number(averageGrade.toFixed(2)),
        passingRate: Number(passingRate.toFixed(2)),
        completionRate: Number(completionRate.toFixed(2)),
      },
      gradeDistribution,
      recentActivity: recentActivityEntries,
    };

    await this.cacheService.set(cacheKey, summary, 600);

    return summary;
  }

  // ===== GRADEBOOK CALCULATIONS =====
  async calculateFinalGrades(gradebookId: string): Promise<void> {
    this.logger.log(`Calculating final grades for gradebook ${gradebookId}`);

    const gradebook = await this.gradebookRepository.findOne({
      where: { id: gradebookId },
    });

    if (!gradebook) {
      throw new NotFoundException('Gradebook not found');
    }

    const gradebookData = await this.getGradebookData(gradebookId);
    const _weightingScheme = gradebook.weightingScheme
      ? JSON.parse(gradebook.weightingScheme)
      : null;

    // Update gradebook statistics
    const validEntries = gradebookData.filter(entry => entry.overallGrade.totalMaxScore > 0);
    const classAverage =
      validEntries.length > 0
        ? validEntries.reduce((sum, entry) => sum + entry.overallGrade.percentage, 0) /
          validEntries.length
        : 0;

    gradebook.totalStudents = gradebookData.length;
    gradebook.classAverage = Number(classAverage.toFixed(2));
    gradebook.lastCalculatedAt = new Date();

    await this.gradebookRepository.save(gradebook);

    await this.clearGradebookCache(gradebook.courseId);

    this.eventEmitter.emit('gradebook.calculated', {
      gradebookId,
      courseId: gradebook.courseId,
      totalStudents: gradebook.totalStudents,
      classAverage: gradebook.classAverage,
    });
  }

  // ===== EXPORT FUNCTIONALITY =====
  async exportGradebook(gradebookId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Buffer> {
    const gradebookData = await this.getGradebookData(gradebookId);
    const gradebook = await this.gradebookRepository.findOne({
      where: { id: gradebookId },
      relations: ['course'],
    });

    if (format === 'csv') {
      return this.exportToCsv(gradebookData, gradebook!);
    } else {
      return this.exportToExcel(gradebookData, gradebook!);
    }
  }

  private async exportToCsv(data: GradebookEntry[], _gradebook: Gradebook): Promise<Buffer> {
    const csvRows: string[] = [];

    const headers = ['Student Name', 'Email'];
    const assessmentIds = Object.keys(data[0]?.assessments || {});
    assessmentIds.forEach(id => headers.push(`Assessment ${id}`));
    headers.push('Final Grade', 'Letter Grade', 'Status');

    csvRows.push(headers.join(','));

    data.forEach(entry => {
      const row = [`"${entry.studentName}"`, entry.studentEmail];

      assessmentIds.forEach(id => {
        const assessment = entry.assessments[id];
        row.push(assessment ? `${assessment.percentage.toFixed(1)}%` : 'N/A');
      });

      row.push(
        `${entry.overallGrade.percentage.toFixed(1)}%`,
        entry.overallGrade.letterGrade,
        entry.overallGrade.isPassing ? 'Passing' : 'Failing',
      );

      csvRows.push(row.join(','));
    });

    return Buffer.from(csvRows.join('\n'), 'utf-8');
  }

  private async exportToExcel(data: GradebookEntry[], gradebook: Gradebook): Promise<Buffer> {
    // This would require a library like 'exceljs' to create Excel files
    // For now, return CSV format as placeholder
    return this.exportToCsv(data, gradebook);
  }

  // ===== UTILITY METHODS =====
  private async buildGradebookEntries(
    students: any[],
    assessments: Assessment[],
    grades: Grade[],
    gradebook: Gradebook,
  ): Promise<GradebookEntry[]> {
    const weightingScheme = gradebook.weightingScheme
      ? JSON.parse(gradebook.weightingScheme)
      : null;

    return students.map(student => {
      const studentGrades = grades.filter(g => g.studentId === student.id);
      const assessmentData: Record<string, any> = {};

      let totalWeightedScore = 0;
      let totalWeight = 0;

      assessments.forEach(assessment => {
        const grade = studentGrades.find(g => g.assessmentId === assessment.id);

        if (grade) {
          assessmentData[assessment.id] = {
            score: grade.score,
            maxScore: grade.maxScore,
            percentage: grade.percentage,
            status: grade.status,
            gradedAt: grade.gradedAt,
          };

          const weight = this.getAssessmentWeight(assessment, weightingScheme);
          totalWeightedScore += grade.percentage * weight;
          totalWeight += weight;
        }
      });

      const overallPercentage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
      const letterGrade = this.calculateLetterGrade(overallPercentage, gradebook);
      const isPassing = overallPercentage >= (gradebook.passingThreshold || 60);

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.email,
        assessments: assessmentData,
        overallGrade: {
          totalScore: totalWeightedScore,
          totalMaxScore: totalWeight * 100,
          percentage: overallPercentage,
          letterGrade,
          isPassing,
        },
      };
    });
  }

  private getAssessmentWeight(assessment: Assessment, weightingScheme: any): number {
    if (!weightingScheme) return 1;

    const assessmentType = assessment.assessmentType?.toLowerCase() || 'other';
    return weightingScheme[assessmentType] || weightingScheme.default || 1;
  }

  private calculateLetterGrade(percentage: number, gradebook: Gradebook): string {
    const gradingScale = gradebook.gradingScale
      ? JSON.parse(gradebook.gradingScale)
      : this.getDefaultGradingScale();

    for (const [letter, range] of Object.entries(gradingScale)) {
      const { min } = range as { min: number };
      if (percentage >= min) {
        return letter;
      }
    }

    return 'F';
  }

  private getDefaultGradingScale(): Record<string, { min: number }> {
    return {
      A: { min: 90 },
      B: { min: 80 },
      C: { min: 70 },
      D: { min: 60 },
      F: { min: 0 },
    };
  }

  private async initializeGradebookData(gradebookId: string): Promise<void> {
    await this.calculateFinalGrades(gradebookId);
  }

  private async clearGradebookCache(courseId: string): Promise<void> {
    const patterns = [`gradebook:data:*`, `gradebook:summary:*`, `course:${courseId}:*`];

    for (const pattern of patterns) {
      await this.cacheService.del(pattern);
    }
  }
}

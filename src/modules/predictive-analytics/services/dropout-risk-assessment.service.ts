import { DropoutRiskAssessment } from '../entities/dropout-risk-assessment.entity';
import { InterventionType } from '../entities/performance-prediction.entity';
import {
  CreateDropoutRiskAssessmentDto,
  UpdateDropoutRiskAssessmentDto,
  DropoutRiskQueryDto,
} from '../dto/dropout-risk-assessment.dto';
import { RiskLevel } from '../entities/performance-prediction.entity';
import { Between, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LearningAnalytics } from '@/modules/analytics/entities/learning-analytics.entity';
import { LearningActivity } from '@/modules/analytics/entities/learning-activity.entity';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DropoutRiskAssessmentService {
  private readonly logger = new Logger(DropoutRiskAssessmentService.name);

  constructor(
    @InjectRepository(DropoutRiskAssessment)
    private readonly assessmentRepository: Repository<DropoutRiskAssessment>,
    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateDropoutRiskAssessmentDto): Promise<DropoutRiskAssessment> {
    try {
      const assessment = this.assessmentRepository.create({
        ...dto,
        assessmentDate: new Date(),
      });

      const savedAssessment = await this.assessmentRepository.save(assessment);

      this.logger.log(
        `Created dropout risk assessment ${savedAssessment.id} for student ${dto.studentId}`,
      );
      return savedAssessment;
    } catch (error) {
      this.logger.error(`Error creating dropout risk assessment: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(query: DropoutRiskQueryDto): Promise<DropoutRiskAssessment[]> {
    try {
      const queryBuilder = this.assessmentRepository
        .createQueryBuilder('assessment')
        .leftJoinAndSelect('assessment.student', 'student')
        .leftJoinAndSelect('assessment.course', 'course');

      if (query.studentId) {
        queryBuilder.andWhere('assessment.studentId = :studentId', { studentId: query.studentId });
      }

      if (query.courseId) {
        queryBuilder.andWhere('assessment.courseId = :courseId', { courseId: query.courseId });
      }

      if (query.riskLevel) {
        queryBuilder.andWhere('assessment.riskLevel = :riskLevel', { riskLevel: query.riskLevel });
      }

      if (query.interventionRequired !== undefined) {
        queryBuilder.andWhere('assessment.interventionRequired = :interventionRequired', {
          interventionRequired: query.interventionRequired,
        });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('assessment.assessmentDate BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      if (query.minRiskProbability) {
        queryBuilder.andWhere('assessment.riskProbability >= :minRiskProbability', {
          minRiskProbability: query.minRiskProbability,
        });
      }

      queryBuilder
        .orderBy('assessment.interventionPriority', 'DESC')
        .addOrderBy('assessment.assessmentDate', 'DESC');

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error finding assessments: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<DropoutRiskAssessment> {
    try {
      const assessment = await this.assessmentRepository.findOne({
        where: { id },
        relations: ['student', 'course'],
      });

      if (!assessment) {
        throw new NotFoundException(`Dropout risk assessment with ID ${id} not found`);
      }

      return assessment;
    } catch (error) {
      this.logger.error(`Error finding assessment ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, dto: UpdateDropoutRiskAssessmentDto): Promise<DropoutRiskAssessment> {
    try {
      const assessment = await this.findOne(id);
      Object.assign(assessment, dto);

      const updatedAssessment = await this.assessmentRepository.save(assessment);

      this.logger.log(`Updated dropout risk assessment ${id}`);
      return updatedAssessment;
    } catch (error) {
      this.logger.error(`Error updating assessment ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.findOne(id);
      await this.assessmentRepository.softDelete(id);

      this.logger.log(`Removed dropout risk assessment ${id}`);
    } catch (error) {
      this.logger.error(`Error removing assessment ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async assessDropoutRisk(studentId: string, courseId?: string): Promise<DropoutRiskAssessment> {
    try {
      this.logger.log(`Assessing dropout risk for student ${studentId}`);

      // Collect comprehensive student data
      const studentData = await this.collectStudentData(studentId, courseId);

      // Analyze risk factors
      const riskAnalysis = await this.analyzeRiskFactors(studentData);

      // Generate intervention recommendations
      const interventions = await this.generateInterventionRecommendations(riskAnalysis);

      // Create assessment record
      const assessmentDto: CreateDropoutRiskAssessmentDto = {
        studentId,
        courseId,
        riskLevel: riskAnalysis.riskLevel,
        riskProbability: riskAnalysis.riskProbability,
        riskFactors: riskAnalysis.riskFactors,
        protectiveFactors: riskAnalysis.protectiveFactors,
        interventionRequired: riskAnalysis.interventionRequired,
        recommendedInterventions: interventions.types,
        interventionPriority: interventions.priority,
        interventionRecommendations: interventions.description,
      };

      return await this.create(assessmentDto);
    } catch (error) {
      this.logger.error(`Error assessing dropout risk: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getHighRiskStudents(courseId?: string): Promise<DropoutRiskAssessment[]> {
    try {
      const query: DropoutRiskQueryDto = {
        riskLevel: RiskLevel.HIGH,
        interventionRequired: true,
      };

      if (courseId) {
        query.courseId = courseId;
      }

      return await this.findAll(query);
    } catch (error) {
      this.logger.error(`Error getting high risk students: ${error.message}`, error.stack);
      throw error;
    }
  }

  async scheduleRegularAssessments(): Promise<void> {
    try {
      this.logger.log('Starting regular dropout risk assessments');

      // Get all active students who need assessment
      const studentsToAssess = await this.getStudentsNeedingAssessment();

      for (const student of studentsToAssess) {
        try {
          await this.assessDropoutRisk(student.studentId, student.courseId);
        } catch (error) {
          this.logger.warn(`Failed to assess student ${student.studentId}: ${error.message}`);
        }
      }

      this.logger.log(`Completed assessment for ${studentsToAssess.length} students`);
    } catch (error) {
      this.logger.error(`Error in regular assessments: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async collectStudentData(studentId: string, courseId?: string): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    // Get recent analytics
    const analytics = await this.analyticsRepository.find({
      where: {
        studentId,
        ...(courseId && { courseId }),
        date: Between(startDate, endDate),
      },
      order: { date: 'DESC' },
    });

    // Get recent activities
    const activities = await this.activityRepository.find({
      where: {
        studentId,
        ...(courseId && { courseId }),
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      studentId,
      courseId,
      analytics,
      activities,
      timeframe: { startDate, endDate },
    };
  }

  private async analyzeRiskFactors(studentData: any): Promise<any> {
    const { analytics, activities } = studentData;

    // Calculate risk factor scores
    const academicPerformance = this.calculateAcademicPerformanceScore(analytics);
    const engagementLevel = this.calculateEngagementScore(analytics, activities);
    const attendancePattern = this.calculateAttendanceScore(activities);
    const timeManagement = this.calculateTimeManagementScore(analytics);

    const riskFactors = {
      academicPerformance,
      engagementLevel,
      attendancePattern,
      timeManagement,
    };

    // Calculate overall risk probability
    const weights = {
      academicPerformance: 0.3,
      engagementLevel: 0.25,
      attendancePattern: 0.25,
      timeManagement: 0.2,
    };

    const riskProbability = Object.entries(riskFactors).reduce((total, [key, factor]) => {
      return total + factor.score * weights[key];
    }, 0);

    // Determine risk level
    let riskLevel = RiskLevel.LOW;
    if (riskProbability >= 80) riskLevel = RiskLevel.VERY_HIGH;
    else if (riskProbability >= 65) riskLevel = RiskLevel.HIGH;
    else if (riskProbability >= 50) riskLevel = RiskLevel.MEDIUM;
    else if (riskProbability >= 30) riskLevel = RiskLevel.LOW;
    else riskLevel = RiskLevel.VERY_LOW;

    // Determine if intervention is required
    const interventionRequired = riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH;

    return {
      riskLevel,
      riskProbability: Math.round(riskProbability),
      riskFactors,
      interventionRequired,
      protectiveFactors: this.identifyProtectiveFactors(analytics, activities),
    };
  }

  private calculateAcademicPerformanceScore(analytics: any[]): any {
    if (analytics.length === 0) {
      return { score: 50, weight: 0.3, details: ['No performance data available'] };
    }

    const avgScore =
      analytics.reduce((sum, a) => sum + (a.averageScore || 0), 0) / analytics.length;
    const score = Math.max(0, 100 - avgScore); // Higher score = higher risk

    const details: string[] = [];
    if (avgScore < 60) details.push('Low average performance');
    if (avgScore < 40) details.push('Critical performance level');

    return { score, weight: 0.3, details };
  }

  private calculateEngagementScore(analytics: any[], activities: any[]): any {
    if (analytics.length === 0) {
      return { score: 70, weight: 0.25, details: ['No engagement data available'] };
    }

    const avgEngagement =
      analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length;
    const score = Math.max(0, 100 - avgEngagement); // Higher score = higher risk

    const details: string[] = [];
    if (avgEngagement < 50) details.push('Low engagement levels');
    if (activities.length < 5) details.push('Minimal learning activities');

    return { score, weight: 0.25, details };
  }

  private calculateAttendanceScore(activities: any[]): any {
    const expectedActivities = 20; // Expected activities in 30 days
    const actualActivities = activities.length;
    const attendanceRate = (actualActivities / expectedActivities) * 100;
    const score = Math.max(0, 100 - attendanceRate); // Higher score = higher risk

    const details: string[] = [];
    if (attendanceRate < 70) details.push('Poor attendance pattern');
    if (attendanceRate < 50) details.push('Very low activity levels');

    return { score, weight: 0.25, details };
  }

  private calculateTimeManagementScore(analytics: any[]): any {
    if (analytics.length === 0) {
      return { score: 60, weight: 0.2, details: ['No time management data available'] };
    }

    // Analyze study patterns and consistency
    const studyTimes = analytics.map(a => a.totalTimeSpent).filter(t => t > 0);
    if (studyTimes.length === 0) {
      return { score: 80, weight: 0.2, details: ['No study time recorded'] };
    }

    const avgStudyTime = studyTimes.reduce((sum, time) => sum + time, 0) / studyTimes.length;
    const consistency = this.calculateConsistency(studyTimes);

    let score = 0;
    const details: string[] = [];

    if (avgStudyTime < 1800) {
      // Less than 30 minutes
      score += 40;
      details.push('Very short study sessions');
    }

    if (consistency < 0.5) {
      score += 30;
      details.push('Inconsistent study patterns');
    }

    return { score: Math.min(100, score), weight: 0.2, details };
  }

  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 1;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return Math.max(0, 1 - standardDeviation / mean);
  }

  private identifyProtectiveFactors(analytics: any[], activities: any[]): any {
    const factors = {
      strongMotivation: false,
      goodSupport: false,
      priorSuccess: false,
      effectiveStudyHabits: false,
      technicalCompetence: false,
      timeAvailability: false,
    };

    if (analytics.length > 0) {
      const avgEngagement =
        analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length;
      const avgPerformance =
        analytics.reduce((sum, a) => sum + (a.averageScore || 0), 0) / analytics.length;

      factors.strongMotivation = avgEngagement > 70;
      factors.priorSuccess = avgPerformance > 75;
      factors.effectiveStudyHabits = analytics.some(a => a.totalTimeSpent > 3600); // 1+ hour sessions
    }

    factors.technicalCompetence = activities.length > 10; // Active user
    factors.timeAvailability = activities.length > 15; // Regular availability

    return factors;
  }

  private async generateInterventionRecommendations(riskAnalysis: any): Promise<any> {
    const { riskLevel, riskFactors } = riskAnalysis;
    const interventions: InterventionType[] = [];
    let priority = 1;

    if (riskLevel === RiskLevel.VERY_HIGH || riskLevel === RiskLevel.HIGH) {
      priority = riskLevel === RiskLevel.VERY_HIGH ? 10 : 8;

      if (riskFactors.academicPerformance.score > 60) {
        interventions.push(InterventionType.TUTOR_SUPPORT);
        interventions.push(InterventionType.CONTENT_REVIEW);
      }

      if (riskFactors.engagementLevel.score > 60) {
        interventions.push(InterventionType.MOTIVATION);
        interventions.push(InterventionType.PEER_SUPPORT);
      }

      if (riskFactors.timeManagement.score > 60) {
        interventions.push(InterventionType.STUDY_PLAN);
      }
    } else if (riskLevel === RiskLevel.MEDIUM) {
      priority = 5;
      interventions.push(InterventionType.STUDY_PLAN);
      interventions.push(InterventionType.MOTIVATION);
    }

    const description = this.generateInterventionDescription(interventions, riskFactors);

    return {
      types: interventions,
      priority,
      description,
    };
  }

  private generateInterventionDescription(
    interventions: InterventionType[],
    _riskFactors: any,
  ): string {
    const descriptions: string[] = [];

    if (interventions.includes(InterventionType.TUTOR_SUPPORT)) {
      descriptions.push('Assign dedicated tutor for personalized support');
    }

    if (interventions.includes(InterventionType.CONTENT_REVIEW)) {
      descriptions.push('Provide additional review materials for struggling areas');
    }

    if (interventions.includes(InterventionType.MOTIVATION)) {
      descriptions.push('Implement motivational strategies and goal setting');
    }

    if (interventions.includes(InterventionType.STUDY_PLAN)) {
      descriptions.push('Create structured study plan with regular check-ins');
    }

    if (interventions.includes(InterventionType.PEER_SUPPORT)) {
      descriptions.push('Connect with study groups and peer mentoring');
    }

    return descriptions.join('; ');
  }

  private async getStudentsNeedingAssessment(): Promise<any[]> {
    // Get students who haven't been assessed in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const _recentAssessments = await this.assessmentRepository
      .createQueryBuilder('assessment')
      .select('DISTINCT assessment.studentId', 'studentId')
      .addSelect('assessment.courseId', 'courseId')
      .where('assessment.assessmentDate > :weekAgo', { weekAgo })
      .getRawMany();

    // This would typically query active enrollments not in recent assessments
    // For now, return a sample set
    return [
      { studentId: 'sample-student-1', courseId: 'sample-course-1' },
      { studentId: 'sample-student-2', courseId: 'sample-course-2' },
    ];
  }
}

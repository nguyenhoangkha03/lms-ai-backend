import {
  InterventionRecommendation,
  InterventionStatus,
  InterventionOutcome,
} from '../entities/intervention-recommendation.entity';
import {
  CreateInterventionRecommendationDto,
  UpdateInterventionRecommendationDto,
  InterventionRecommendationQueryDto,
} from '../dto/intervention-recommendation.dto';
import {
  InterventionType,
  PerformancePrediction,
  RiskLevel,
} from '../entities/performance-prediction.entity';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InterventionRecommendationService {
  private readonly logger = new Logger(InterventionRecommendationService.name);

  constructor(
    @InjectRepository(InterventionRecommendation)
    private readonly interventionRepository: Repository<InterventionRecommendation>,
    @InjectRepository(PerformancePrediction)
    private readonly predictionRepository: Repository<PerformancePrediction>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateInterventionRecommendationDto): Promise<InterventionRecommendation> {
    try {
      const intervention = this.interventionRepository.create({
        ...dto,
        recommendedDate: dto.recommendedDate ? new Date(dto.recommendedDate) : new Date(),
      });

      const savedIntervention = await this.interventionRepository.save(intervention);

      this.logger.log(
        `Created intervention recommendation ${savedIntervention.id} for student ${dto.studentId}`,
      );
      return savedIntervention;
    } catch (error) {
      this.logger.error(
        `Error creating intervention recommendation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(query: InterventionRecommendationQueryDto): Promise<InterventionRecommendation[]> {
    try {
      const queryBuilder = this.interventionRepository
        .createQueryBuilder('intervention')
        .leftJoinAndSelect('intervention.student', 'student')
        .leftJoinAndSelect('intervention.course', 'course')
        .leftJoinAndSelect('intervention.assignedTo', 'assignedTo')
        .leftJoinAndSelect('intervention.prediction', 'prediction');

      if (query.studentId) {
        queryBuilder.andWhere('intervention.studentId = :studentId', {
          studentId: query.studentId,
        });
      }

      if (query.courseId) {
        queryBuilder.andWhere('intervention.courseId = :courseId', { courseId: query.courseId });
      }

      if (query.interventionType) {
        queryBuilder.andWhere('intervention.interventionType = :interventionType', {
          interventionType: query.interventionType,
        });
      }

      if (query.status) {
        queryBuilder.andWhere('intervention.status = :status', { status: query.status });
      }

      if (query.minPriority) {
        queryBuilder.andWhere('intervention.priority >= :minPriority', {
          minPriority: query.minPriority,
        });
      }

      if (query.assignedToId) {
        queryBuilder.andWhere('intervention.assignedToId = :assignedToId', {
          assignedToId: query.assignedToId,
        });
      }

      if (query.startDate && query.endDate) {
        queryBuilder.andWhere('intervention.createdAt BETWEEN :startDate AND :endDate', {
          startDate: query.startDate,
          endDate: query.endDate,
        });
      }

      if (query.followUpRequired !== undefined) {
        queryBuilder.andWhere('intervention.followUpRequired = :followUpRequired', {
          followUpRequired: query.followUpRequired,
        });
      }

      queryBuilder
        .orderBy('intervention.priority', 'DESC')
        .addOrderBy('intervention.createdAt', 'DESC');

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Error finding interventions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<InterventionRecommendation> {
    try {
      const intervention = await this.interventionRepository.findOne({
        where: { id },
        relations: ['student', 'course', 'assignedTo', 'prediction'],
      });

      if (!intervention) {
        throw new NotFoundException(`Intervention recommendation with ID ${id} not found`);
      }

      return intervention;
    } catch (error) {
      this.logger.error(`Error finding intervention ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateInterventionRecommendationDto,
  ): Promise<InterventionRecommendation> {
    try {
      const intervention = await this.findOne(id);

      // Handle status transitions
      if (dto.status && dto.status !== intervention.status) {
        this.handleStatusTransition(intervention, dto.status);
      }

      Object.assign(intervention, dto);

      // Update dates based on status
      if (dto.scheduledDate) {
        intervention.scheduledDate = new Date(dto.scheduledDate);
      }

      if (dto.followUpDate) {
        intervention.followUpDate = new Date(dto.followUpDate);
      }

      const updatedIntervention = await this.interventionRepository.save(intervention);

      this.logger.log(`Updated intervention recommendation ${id}`);
      return updatedIntervention;
    } catch (error) {
      this.logger.error(`Error updating intervention ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.findOne(id);
      await this.interventionRepository.softDelete(id);

      this.logger.log(`Removed intervention recommendation ${id}`);
    } catch (error) {
      this.logger.error(`Error removing intervention ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generateRecommendations(predictionId: string): Promise<InterventionRecommendation[]> {
    try {
      const prediction = await this.predictionRepository.findOne({
        where: { id: predictionId },
        relations: ['student'],
      });

      if (!prediction) {
        throw new NotFoundException(`Prediction with ID ${predictionId} not found`);
      }

      this.logger.log(`Generating intervention recommendations for prediction ${predictionId}`);

      const recommendations = await this.analyzeAndCreateRecommendations(prediction);

      return recommendations;
    } catch (error) {
      this.logger.error(`Error generating recommendations: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getPendingInterventions(assignedToId?: string): Promise<InterventionRecommendation[]> {
    try {
      const query: InterventionRecommendationQueryDto = {
        status: InterventionStatus.PENDING,
      };

      if (assignedToId) {
        query.assignedToId = assignedToId;
      }

      return await this.findAll(query);
    } catch (error) {
      this.logger.error(`Error getting pending interventions: ${error.message}`, error.stack);
      throw error;
    }
  }

  async scheduleIntervention(
    id: string,
    scheduledDate: Date,
    assignedToId?: string,
  ): Promise<InterventionRecommendation> {
    try {
      const updateDto: UpdateInterventionRecommendationDto = {
        status: InterventionStatus.SCHEDULED,
        scheduledDate: scheduledDate.toISOString(),
      };

      if (assignedToId) {
        updateDto.assignedToId = assignedToId;
      }

      return await this.update(id, updateDto);
    } catch (error) {
      this.logger.error(`Error scheduling intervention ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async completeIntervention(
    id: string,
    outcome: InterventionOutcome,
    effectivenessScore: number,
    instructorNotes?: string,
    studentFeedback?: string,
  ): Promise<InterventionRecommendation> {
    try {
      const intervention = await this.findOne(id);

      // Capture pre-intervention metrics if not already done
      if (!intervention.preInterventionMetrics) {
        intervention.preInterventionMetrics = await this.captureMetrics(
          intervention.studentId,
          intervention.courseId,
        );
      }

      const updateDto: UpdateInterventionRecommendationDto = {
        status: InterventionStatus.COMPLETED,
        outcome,
        effectivenessScore,
        instructorNotes,
        studentFeedback,
        postInterventionMetrics: await this.captureMetrics(
          intervention.studentId,
          intervention.courseId,
        ),
      };

      // Determine if follow-up is needed
      if (effectivenessScore < 70 || outcome === InterventionOutcome.PARTIALLY_SUCCESSFUL) {
        updateDto.followUpRequired = true;
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 7); // Follow up in a week
        updateDto.followUpDate = followUpDate.toISOString();
      }

      return await this.update(id, updateDto);
    } catch (error) {
      this.logger.error(`Error completing intervention ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private handleStatusTransition(
    intervention: InterventionRecommendation,
    newStatus: InterventionStatus,
  ): void {
    const now = new Date();

    switch (newStatus) {
      case InterventionStatus.SCHEDULED:
        if (!intervention.scheduledDate) {
          intervention.scheduledDate = now;
        }
        break;
      case InterventionStatus.IN_PROGRESS:
        intervention.startedAt = now;
        break;
      case InterventionStatus.COMPLETED:
        intervention.completedAt = now;
        break;
    }
  }

  private async analyzeAndCreateRecommendations(
    prediction: PerformancePrediction,
  ): Promise<InterventionRecommendation[]> {
    const recommendations: InterventionRecommendation[] = [];

    if (prediction.riskLevel === RiskLevel.HIGH || prediction.riskLevel === RiskLevel.VERY_HIGH) {
      // High-priority interventions
      if (prediction.contributingFactors!.performanceHistory! < 60) {
        recommendations.push(
          await this.createInterventionRecommendation({
            studentId: prediction.studentId,
            courseId: prediction.courseId,
            predictionId: prediction.id,
            interventionType: InterventionType.TUTOR_SUPPORT,
            title: 'Urgent: Academic Support Required',
            description:
              'Student shows poor performance history and needs immediate tutoring support',
            priority: 9,
            parameters: {
              targetMetrics: ['performance_improvement', 'engagement_increase'],
              followUpRequired: true,
              automatedIntervention: false,
            },
          }),
        );
      }

      if (prediction.contributingFactors!.engagementLevel! < 50) {
        recommendations.push(
          await this.createInterventionRecommendation({
            studentId: prediction.studentId,
            courseId: prediction.courseId,
            predictionId: prediction.id,
            interventionType: InterventionType.MOTIVATION,
            title: 'Motivation and Engagement Intervention',
            description: 'Student shows low engagement and needs motivational support',
            priority: 8,
            parameters: {
              targetMetrics: ['engagement_score', 'time_spent'],
              communicationMethod: 'personal_meeting',
              followUpRequired: true,
              automatedIntervention: false,
            },
          }),
        );
      }
    } else if (prediction.riskLevel === RiskLevel.MEDIUM) {
      // Medium-priority interventions
      recommendations.push(
        await this.createInterventionRecommendation({
          studentId: prediction.studentId,
          courseId: prediction.courseId,
          predictionId: prediction.id,
          interventionType: InterventionType.STUDY_PLAN,
          title: 'Study Plan Optimization',
          description: 'Create personalized study plan to improve learning outcomes',
          priority: 5,
          parameters: {
            targetMetrics: ['study_consistency', 'progress_rate'],
            automatedIntervention: true,
            followUpRequired: false,
          },
        }),
      );
    }

    return recommendations;
  }

  private async createInterventionRecommendation(
    dto: CreateInterventionRecommendationDto,
  ): Promise<InterventionRecommendation> {
    return await this.create(dto);
  }

  private async captureMetrics(
    _studentId: string,
    _courseId?: string,
  ): Promise<Record<string, number>> {
    // This would capture current performance metrics for the student
    // For now, return sample metrics
    return {
      engagementScore: 75,
      averageScore: 68,
      timeSpent: 3600,
      activitiesCompleted: 15,
      loginFrequency: 5,
    };
  }
}

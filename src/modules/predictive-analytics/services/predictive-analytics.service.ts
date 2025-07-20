import { Injectable, Logger } from '@nestjs/common';
import { PerformancePredictionService } from './performance-prediction.service';
import { DropoutRiskAssessmentService } from './dropout-risk-assessment.service';
import { LearningOutcomeForecastService } from './learning-outcome-forecast.service';
import { InterventionRecommendationService } from './intervention-recommendation.service';
import { ResourceOptimizationService } from './resource-optimization.service';
import {
  InterventionRecommendation,
  InterventionStatus,
} from '../entities/intervention-recommendation.entity';
import { ResourceType } from '../entities/resource-optimization.entity';
import { OutcomeType } from '../entities/learning-outcome-forecast.entity';
import { RiskLevel } from '../entities/performance-prediction.entity';
import { DropoutRiskAssessment } from '../entities/dropout-risk-assessment.entity';

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(
    private readonly performancePredictionService: PerformancePredictionService,
    private readonly dropoutRiskService: DropoutRiskAssessmentService,
    private readonly learningOutcomeService: LearningOutcomeForecastService,
    private readonly interventionService: InterventionRecommendationService,
    private readonly resourceOptimizationService: ResourceOptimizationService,
  ) {}

  async getStudentAnalyticsDashboard(studentId: string, courseId?: string): Promise<any> {
    try {
      this.logger.log(`Getting analytics dashboard for student ${studentId}`);

      const [
        performancePredictions,
        dropoutAssessments,
        learningForecasts,
        interventions,
        performanceTrends,
      ] = await Promise.all([
        this.performancePredictionService.findAll({ studentId, courseId }),
        this.dropoutRiskService.findAll({ studentId, courseId }),
        this.learningOutcomeService.findAll({ studentId, courseId }),
        this.interventionService.findAll({ studentId, courseId }),
        this.performancePredictionService.getPerformanceTrends(studentId, 30),
      ]);

      const dashboard = {
        studentId,
        courseId,
        summary: {
          totalPredictions: performancePredictions.length,
          currentRiskLevel: dropoutAssessments[0]?.riskLevel || 'unknown',
          activeInterventions: interventions.filter(
            i =>
              i.status === InterventionStatus.PENDING ||
              i.status === InterventionStatus.IN_PROGRESS,
          ).length,
          upcomingTargets: learningForecasts.filter(
            f =>
              f.targetDate > new Date() &&
              f.targetDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ).length,
        },
        performancePredictions: performancePredictions.slice(0, 5),
        riskAssessment: dropoutAssessments[0] || null,
        learningForecasts: learningForecasts.slice(0, 3),
        recommendedInterventions: interventions
          .filter(i => i.status === InterventionStatus.PENDING)
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 3),
        trends: performanceTrends,
        recommendations: await this.generateStudentRecommendations(studentId, courseId),
      };

      return dashboard;
    } catch (error) {
      this.logger.error(`Error getting student analytics dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getInstructorAnalyticsDashboard(instructorId: string, courseId?: string): Promise<any> {
    try {
      this.logger.log(`Getting instructor analytics dashboard for ${instructorId}`);

      const [highRiskStudents, pendingInterventions, resourceOptimizations] = await Promise.all([
        this.dropoutRiskService.getHighRiskStudents(courseId),
        this.interventionService.getPendingInterventions(instructorId),
        this.resourceOptimizationService.findAll({ resourceType: ResourceType.CONTENT }),
      ]);

      const dashboard = {
        instructorId,
        courseId,
        alerts: {
          highRiskStudents: highRiskStudents.length,
          urgentInterventions: pendingInterventions.filter(i => i.priority >= 8).length,
          overdueTasks: pendingInterventions.filter(
            i => i.scheduledDate && i.scheduledDate < new Date(),
          ).length,
        },
        studentsAtRisk: highRiskStudents.slice(0, 10),
        pendingInterventions: pendingInterventions
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 10),
        resourceInsights: resourceOptimizations.slice(0, 5),
        recommendations: await this.generateInstructorRecommendations(instructorId, courseId),
      };

      return dashboard;
    } catch (error) {
      this.logger.error(
        `Error getting instructor analytics dashboard: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async runComprehensiveAnalysis(studentId: string, courseId?: string): Promise<any> {
    try {
      this.logger.log(`Running comprehensive analysis for student ${studentId}`);

      // Generate new predictions and assessments
      const [performancePrediction, dropoutAssessment, learningForecast] = await Promise.all([
        this.performancePredictionService.generatePrediction(studentId, courseId),
        this.dropoutRiskService.assessDropoutRisk(studentId, courseId),
        courseId
          ? this.learningOutcomeService.generateForecast(
              studentId,
              courseId,
              OutcomeType.COURSE_COMPLETION,
              new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            )
          : null,
      ]);

      // Generate interventions if needed
      let interventions: InterventionRecommendation[] = [];
      if (dropoutAssessment.interventionRequired) {
        interventions = await this.interventionService.generateRecommendations(
          performancePrediction.id,
        );
      }

      return {
        studentId,
        courseId,
        analysisDate: new Date(),
        results: {
          performancePrediction,
          dropoutAssessment,
          learningForecast,
          interventions,
        },
        summary: {
          overallRisk: dropoutAssessment.riskLevel,
          predictedOutcome: learningForecast?.successProbability || null,
          interventionsRecommended: interventions.length,
          confidence: performancePrediction.confidenceScore,
        },
        nextSteps: this.generateNextSteps(dropoutAssessment, interventions),
      };
    } catch (error) {
      this.logger.error(`Error running comprehensive analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async generateStudentRecommendations(
    studentId: string,
    courseId?: string,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Get recent data to base recommendations on
    const [predictions, assessments] = await Promise.all([
      this.performancePredictionService.findAll({ studentId, courseId }),
      this.dropoutRiskService.findAll({ studentId, courseId }),
    ]);

    if (predictions.length > 0) {
      const latestPrediction = predictions[0];

      if (
        latestPrediction.riskLevel === RiskLevel.HIGH ||
        latestPrediction.riskLevel === RiskLevel.VERY_HIGH
      ) {
        recommendations.push('Consider scheduling additional study time');
        recommendations.push('Review challenging topics with instructor');
      }

      if (latestPrediction.contributingFactors!.engagementLevel! < 60) {
        recommendations.push('Increase participation in discussions and activities');
        recommendations.push('Set daily learning goals to maintain motivation');
      }
    }

    if (assessments.length > 0) {
      const latestAssessment = assessments[0];

      if (latestAssessment.interventionRequired) {
        recommendations.push('Follow up on recommended interventions');
        recommendations.push('Communicate with instructor about any challenges');
      }
    }

    return recommendations;
  }

  private async generateInstructorRecommendations(
    instructorId: string,
    courseId?: string,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    const [highRiskStudents, pendingInterventions] = await Promise.all([
      this.dropoutRiskService.getHighRiskStudents(courseId),
      this.interventionService.getPendingInterventions(instructorId),
    ]);

    if (highRiskStudents.length > 0) {
      recommendations.push(`${highRiskStudents.length} students need immediate attention`);
      recommendations.push('Schedule one-on-one meetings with at-risk students');
    }

    if (pendingInterventions.length > 5) {
      recommendations.push('Prioritize high-priority interventions');
      recommendations.push('Consider delegating some interventions to TAs');
    }

    const urgentInterventions = pendingInterventions.filter(i => i.priority >= 8);
    if (urgentInterventions.length > 0) {
      recommendations.push(
        `${urgentInterventions.length} urgent interventions require immediate action`,
      );
    }

    return recommendations;
  }

  private generateNextSteps(
    assessment: DropoutRiskAssessment,
    interventions: InterventionRecommendation[],
  ): string[] {
    const nextSteps: string[] = [];

    if (assessment.interventionRequired) {
      nextSteps.push('Review and approve recommended interventions');

      if (interventions.length > 0) {
        const highPriorityInterventions = interventions.filter(i => i.priority >= 8);
        if (highPriorityInterventions.length > 0) {
          nextSteps.push('Schedule high-priority interventions within 48 hours');
        }
      }
    }

    if (assessment.riskLevel === RiskLevel.VERY_HIGH) {
      nextSteps.push('Contact student immediately');
      nextSteps.push('Involve academic advisor or counselor');
    }

    nextSteps.push('Monitor progress and reassess in 1 week');

    return nextSteps;
  }
}

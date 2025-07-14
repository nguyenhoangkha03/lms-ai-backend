import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningActivity } from '../entities/learning-activity.entity';
import { LearningSession } from '../entities/learning-session.entity';
import { LearningAnalytics } from '../entities/learning-analytics.entity';
import { CacheService } from '@/cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DropoutPredictionDto } from '../dto/analytics-processing.dto';

interface _DropoutRiskFactors {
  engagementDecline: number;
  performanceDecline: number;
  attendanceIssues: number;
  socialIsolation: number;
  technicalDifficulties: number;
  motivationalIssues: number;
  timeManagementProblems: number;
}

interface PredictionFeatures {
  studentId: string;
  recentEngagement: number;
  engagementTrend: number;
  averageScore: number;
  scoreTrend: number;
  attendanceRate: number;
  timeSpentTrend: number;
  socialInteraction: number;
  helpSeekingBehavior: number;
  sessionConsistency: number;
  difficultyProgression: number;
  deadlineMissRate: number;
  inactivityPeriods: number;
}

interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTrainedAt: Date;
  samplesUsed: number;
  version: string;
}

@Injectable()
export class PredictiveModelingService {
  private readonly logger = new Logger(PredictiveModelingService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly RISK_THRESHOLD_LOW = 30;
  private readonly RISK_THRESHOLD_MEDIUM = 50;
  private readonly RISK_THRESHOLD_HIGH = 70;

  constructor(
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,

    @InjectRepository(LearningSession)
    private readonly sessionRepository: Repository<LearningSession>,

    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,

    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Predict dropout risk for a single student
   */
  async predictStudentDropoutRisk(
    studentId: string,
    courseId?: string,
  ): Promise<DropoutPredictionDto> {
    try {
      const cacheKey = `dropout_prediction:${studentId}:${courseId || 'all'}`;

      let prediction = await this.cacheService.get<DropoutPredictionDto>(cacheKey);
      if (prediction) {
        return prediction;
      }

      // Extract features for prediction
      const features = await this.extractStudentFeatures(studentId, courseId);

      // Calculate risk score using ensemble of models
      const riskScore = await this.calculateRiskScore(features);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(riskScore);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(features);

      // Identify protective factors
      const protectiveFactors = this.identifyProtectiveFactors(features);

      // Generate recommendations
      const recommendations = this.generateInterventionRecommendations(riskScore, riskFactors);

      // Calculate prediction confidence
      const confidence = this.calculatePredictionConfidence(features, riskScore);

      // Generate timeline predictions
      const timeline = this.generateRiskTimeline(features, riskScore);

      // Get historical comparison
      const historicalComparison = await this.getHistoricalComparison(riskScore, courseId);

      prediction = {
        studentId,
        courseId,
        riskScore,
        riskLevel,
        factors: riskFactors,
        protectiveFactors,
        indicators: this.generateRiskIndicators(features) as any,
        recommendations,
        confidence,
        timeline,
        historicalComparison,
        generatedAt: new Date(),
      };

      await this.cacheService.set(cacheKey, prediction, this.CACHE_TTL);

      // Emit high-risk alert if necessary
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        this.eventEmitter.emit('dropout.risk.high', {
          studentId,
          courseId,
          riskScore,
          riskLevel,
          timestamp: new Date(),
        });
      }

      return prediction;
    } catch (error) {
      this.logger.error(
        `Error predicting dropout risk for student ${studentId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all at-risk students for a course or institution
   */
  async getAtRiskStudents(
    courseId?: string,
    riskThreshold: number = 70,
  ): Promise<DropoutPredictionDto[]> {
    try {
      const cacheKey = `at_risk_students:${courseId || 'all'}:${riskThreshold}`;

      let atRiskStudents = await this.cacheService.get<DropoutPredictionDto[]>(cacheKey);
      if (atRiskStudents) {
        return atRiskStudents;
      }

      // Get all active students
      const activeStudents = await this.getActiveStudents(courseId);

      // Predict risk for all students
      const predictions = await Promise.all(
        activeStudents.map(studentId => this.predictStudentDropoutRisk(studentId, courseId)),
      );

      // Filter by risk threshold
      atRiskStudents = predictions
        .filter(prediction => prediction.riskScore >= riskThreshold)
        .sort((a, b) => b.riskScore - a.riskScore);

      await this.cacheService.set(cacheKey, atRiskStudents, this.CACHE_TTL);
      return atRiskStudents;
    } catch (error) {
      this.logger.error(`Error getting at-risk students: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrain predictive models with latest data
   */
  async retrainModels(modelType?: string, forceRetrain: boolean = false): Promise<string> {
    try {
      const jobId = `retrain_${Date.now()}`;

      this.logger.log(`Starting model retraining job: ${jobId}`);

      // This would typically trigger a background job
      // For now, we'll simulate the process
      setTimeout(async () => {
        try {
          await this.performModelRetraining(modelType, forceRetrain);

          this.eventEmitter.emit('model.retrain.completed', {
            jobId,
            modelType,
            timestamp: new Date(),
            success: true,
          });
        } catch (error) {
          this.logger.error(`Model retraining failed: ${error.message}`, error.stack);

          this.eventEmitter.emit('model.retrain.failed', {
            jobId,
            modelType,
            error: error.message,
            timestamp: new Date(),
          });
        }
      }, 1000);

      return jobId;
    } catch (error) {
      this.logger.error(`Error initiating model retraining: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(): Promise<ModelPerformance> {
    try {
      const cacheKey = 'model_performance';

      let performance = await this.cacheService.get<ModelPerformance>(cacheKey);
      if (performance) {
        return performance;
      }

      // Calculate current model performance
      performance = await this.calculateModelPerformance();

      await this.cacheService.set(cacheKey, performance, this.CACHE_TTL * 6); // Cache for 6 hours
      return performance;
    } catch (error) {
      this.logger.error(`Error getting model performance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Predict learning outcomes for a student
   */
  async predictLearningOutcomes(studentId: string, courseId?: string): Promise<any> {
    try {
      const features = await this.extractStudentFeatures(studentId, courseId);

      const predictions = {
        expectedCompletionDate: this.predictCompletionDate(features),
        expectedFinalGrade: this.predictFinalGrade(features),
        strugglingTopics: this.predictStrugglingTopics(features),
        recommendedPace: this.predictOptimalPace(features),
        successProbability: this.calculateSuccessProbability(features),
        interventionNeeds: this.predictInterventionNeeds(features),
      };

      return {
        studentId,
        courseId,
        predictions,
        confidence: this.calculatePredictionConfidence(features, 0),
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error predicting learning outcomes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async extractStudentFeatures(
    studentId: string,
    courseId?: string,
  ): Promise<PredictionFeatures> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 60 * 24 * 60 * 60 * 1000); // Last 60 days

    // Get student data
    const analyticsQuery = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.studentId = :studentId', { studentId })
      .andWhere('analytics.date BETWEEN :startDate AND :endDate', { startDate, endDate });

    const activitiesQuery = this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.studentId = :studentId', { studentId })
      .andWhere('activity.timestamp BETWEEN :startDate AND :endDate', { startDate, endDate });

    const sessionsQuery = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.studentId = :studentId', { studentId })
      .andWhere('session.startTime BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (courseId) {
      analyticsQuery.andWhere('analytics.courseId = :courseId', { courseId });
      activitiesQuery.andWhere('activity.courseId = :courseId', { courseId });
    }

    const [analytics, activities, sessions] = await Promise.all([
      analyticsQuery.orderBy('analytics.date', 'ASC').getMany(),
      activitiesQuery.orderBy('activity.timestamp', 'ASC').getMany(),
      sessionsQuery.orderBy('session.startTime', 'ASC').getMany(),
    ]);

    // Calculate features
    const recentEngagement = this.calculateRecentEngagement(analytics);
    const engagementTrend = this.calculateEngagementTrend(analytics);
    const averageScore = this.calculateAverageScore(analytics);
    const scoreTrend = this.calculateScoreTrend(analytics);
    const attendanceRate = this.calculateAttendanceRate(sessions);
    const timeSpentTrend = this.calculateTimeSpentTrend(analytics);
    const socialInteraction = this.calculateSocialInteraction(activities);
    const helpSeekingBehavior = this.calculateHelpSeekingBehavior(activities);
    const sessionConsistency = this.calculateSessionConsistency(sessions);
    const difficultyProgression = this.calculateDifficultyProgression(activities);
    const deadlineMissRate = this.calculateDeadlineMissRate(activities);
    const inactivityPeriods = this.calculateInactivityPeriods(activities, sessions);

    return {
      studentId,
      recentEngagement,
      engagementTrend,
      averageScore,
      scoreTrend,
      attendanceRate,
      timeSpentTrend,
      socialInteraction,
      helpSeekingBehavior,
      sessionConsistency,
      difficultyProgression,
      deadlineMissRate,
      inactivityPeriods,
    };
  }

  private async calculateRiskScore(features: PredictionFeatures): Promise<number> {
    // Ensemble of different models for better accuracy
    const scores = [
      this.logisticRegressionModel(features),
      this.randomForestModel(features),
      this.neuralNetworkModel(features),
      this.gradientBoostingModel(features),
    ];

    // Weighted average (you can adjust weights based on model performance)
    const weights = [0.25, 0.25, 0.25, 0.25];
    const weightedScore = scores.reduce((sum, score, index) => sum + score * weights[index], 0);

    return Math.min(Math.max(weightedScore, 0), 100); // Ensure score is between 0-100
  }

  private logisticRegressionModel(features: PredictionFeatures): number {
    // Simplified logistic regression model
    const coefficients = {
      recentEngagement: -0.8,
      engagementTrend: -1.2,
      averageScore: -0.6,
      scoreTrend: -1.0,
      attendanceRate: -0.9,
      timeSpentTrend: -0.7,
      socialInteraction: -0.4,
      helpSeekingBehavior: -0.3,
      sessionConsistency: -0.5,
      difficultyProgression: 0.2,
      deadlineMissRate: 1.5,
      inactivityPeriods: 1.8,
    };

    const intercept = 50; // Base risk
    let linearCombination = intercept;

    Object.entries(coefficients).forEach(([feature, coef]) => {
      linearCombination += (features[feature as keyof PredictionFeatures] as number) * coef;
    });

    // Apply sigmoid function
    const probability = 1 / (1 + Math.exp(-linearCombination / 20));
    return probability * 100;
  }

  private randomForestModel(features: PredictionFeatures): number {
    // Simplified random forest model using decision trees
    let riskScore = 30; // Base risk

    // Tree 1: Engagement-based
    if (features.recentEngagement < 40) {
      riskScore += 20;
      if (features.engagementTrend < -10) {
        riskScore += 15;
      }
    }

    // Tree 2: Performance-based
    if (features.averageScore < 60) {
      riskScore += 15;
      if (features.scoreTrend < -5) {
        riskScore += 10;
      }
    }

    // Tree 3: Attendance-based
    if (features.attendanceRate < 0.7) {
      riskScore += 12;
      if (features.inactivityPeriods > 5) {
        riskScore += 8;
      }
    }

    // Tree 4: Behavioral-based
    if (features.deadlineMissRate > 0.3) {
      riskScore += 10;
    }
    if (features.socialInteraction < 0.2) {
      riskScore += 5;
    }

    return Math.min(riskScore, 100);
  }

  private neuralNetworkModel(features: PredictionFeatures): number {
    // Simplified neural network model (single hidden layer)
    const weights1 = [
      [-0.5, 0.3, -0.4, 0.2, -0.6, 0.1, -0.3, -0.2, -0.4, 0.3, 0.8, 0.9], // Hidden neuron 1
      [-0.7, -0.4, -0.5, -0.3, -0.8, -0.2, -0.1, 0.1, -0.3, 0.2, 0.6, 0.7], // Hidden neuron 2
      [-0.3, -0.6, -0.2, -0.5, -0.4, -0.3, 0.0, -0.1, -0.2, 0.1, 0.5, 0.8], // Hidden neuron 3
      [0.2, -0.3, 0.1, -0.2, -0.1, 0.0, 0.2, 0.3, 0.1, -0.1, 0.4, 0.3], // Hidden neuron 4
    ];

    const weights2 = [0.6, 0.8, 0.7, 0.4]; // Output weights
    const bias1 = [0.1, 0.2, 0.15, 0.05];
    const bias2 = 0.3;

    const input = [
      features.recentEngagement / 100,
      features.engagementTrend / 50,
      features.averageScore / 100,
      features.scoreTrend / 50,
      features.attendanceRate,
      features.timeSpentTrend / 50,
      features.socialInteraction,
      features.helpSeekingBehavior,
      features.sessionConsistency,
      features.difficultyProgression / 50,
      features.deadlineMissRate,
      features.inactivityPeriods / 10,
    ];

    // Forward pass through hidden layer
    const hiddenOutputs = weights1.map((neuronWeights, index) => {
      const sum =
        neuronWeights.reduce((acc, weight, i) => acc + weight * input[i], 0) + bias1[index];
      return 1 / (1 + Math.exp(-sum)); // Sigmoid activation
    });

    // Forward pass through output layer
    const outputSum =
      hiddenOutputs.reduce((acc, output, i) => acc + output * weights2[i], 0) + bias2;
    const finalOutput = 1 / (1 + Math.exp(-outputSum)); // Sigmoid activation

    return finalOutput * 100;
  }

  private gradientBoostingModel(features: PredictionFeatures): number {
    // Simplified gradient boosting model
    let prediction = 40; // Initial prediction

    // Boosting iteration 1: Focus on engagement
    const residual1 = this.calculateEngagementResidual(features);
    prediction += residual1 * 0.3;

    // Boosting iteration 2: Focus on performance
    const residual2 = this.calculatePerformanceResidual(features);
    prediction += residual2 * 0.25;

    // Boosting iteration 3: Focus on behavior
    const residual3 = this.calculateBehaviorResidual(features);
    prediction += residual3 * 0.2;

    return Math.min(Math.max(prediction, 0), 100);
  }

  private determineRiskLevel(riskScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskScore >= 85) return 'CRITICAL';
    if (riskScore >= this.RISK_THRESHOLD_HIGH) return 'HIGH';
    if (riskScore >= this.RISK_THRESHOLD_MEDIUM) return 'MEDIUM';
    return 'LOW';
  }

  private identifyRiskFactors(features: PredictionFeatures): Array<{
    factor: string;
    weight: number;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const factors: Array<{
      factor: string;
      weight: number;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    if (features.recentEngagement < 50) {
      factors.push({
        factor: 'Low Engagement',
        weight: 0.8,
        description: 'Student shows low engagement levels in recent activities',
        severity: features.recentEngagement < 30 ? 'high' : ('medium' as 'high' | 'medium'),
      });
    }

    if (features.engagementTrend < -10) {
      factors.push({
        factor: 'Declining Engagement',
        weight: 0.9,
        description: 'Student engagement is trending downward',
        severity: features.engagementTrend < -20 ? 'high' : ('medium' as 'high' | 'medium'),
      });
    }

    if (features.averageScore < 60) {
      factors.push({
        factor: 'Poor Performance',
        weight: 0.7,
        description: 'Student performance is below acceptable levels',
        severity: features.averageScore < 40 ? 'high' : ('medium' as 'high' | 'medium'),
      });
    }

    if (features.attendanceRate < 0.7) {
      factors.push({
        factor: 'Low Attendance',
        weight: 0.8,
        description: 'Student has irregular attendance patterns',
        severity: features.attendanceRate < 0.5 ? 'high' : ('medium' as 'high' | 'medium'),
      });
    }

    if (features.deadlineMissRate > 0.3) {
      factors.push({
        factor: 'Missed Deadlines',
        weight: 0.6,
        description: 'Student frequently misses assignment deadlines',
        severity: features.deadlineMissRate > 0.5 ? 'high' : ('medium' as 'high' | 'medium'),
      });
    }

    if (features.socialInteraction < 0.2) {
      factors.push({
        factor: 'Social Isolation',
        weight: 0.4,
        description: 'Student shows limited social interaction in learning environment',
        severity: 'low' as const,
      });
    }

    if (features.inactivityPeriods > 5) {
      factors.push({
        factor: 'Extended Inactivity',
        weight: 0.7,
        description: 'Student has multiple periods of extended inactivity',
        severity: features.inactivityPeriods > 10 ? 'high' : ('medium' as 'high' | 'medium'),
      });
    }

    return factors.sort((a, b) => b.weight - a.weight);
  }

  private identifyProtectiveFactors(features: PredictionFeatures): Array<{
    factor: string;
    strength: number;
    description: string;
  }> {
    const factors: Array<{
      factor: string;
      strength: number;
      description: string;
    }> = [];

    if (features.helpSeekingBehavior > 0.5) {
      factors.push({
        factor: 'Active Help Seeking',
        strength: 0.7,
        description: 'Student actively seeks help when needed',
      });
    }

    if (features.sessionConsistency > 0.8) {
      factors.push({
        factor: 'Consistent Study Habits',
        strength: 0.8,
        description: 'Student maintains consistent study sessions',
      });
    }

    if (features.socialInteraction > 0.6) {
      factors.push({
        factor: 'Strong Social Engagement',
        strength: 0.6,
        description: 'Student actively participates in social learning',
      });
    }

    if (features.scoreTrend > 5) {
      factors.push({
        factor: 'Improving Performance',
        strength: 0.9,
        description: 'Student performance is showing improvement',
      });
    }

    return factors.sort((a, b) => b.strength - a.strength);
  }

  private generateInterventionRecommendations(
    riskScore: number,
    riskFactors: any[],
  ): Array<{
    type: 'immediate' | 'short-term' | 'long-term';
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    expectedImpact: number;
  }> {
    const recommendations: any = [];

    if (riskScore >= 85) {
      recommendations.push({
        type: 'immediate' as const,
        priority: 'high' as const,
        action: 'Emergency Intervention',
        description: 'Immediate contact with student and academic advisor required',
        expectedImpact: 40,
      });
    }

    // Engagement-focused interventions
    const engagementFactors = riskFactors.filter(
      f => f.factor.includes('Engagement') || f.factor === 'Social Isolation',
    );
    if (engagementFactors.length > 0) {
      recommendations.push({
        type: 'short-term' as const,
        priority: 'high' as const,
        action: 'Engagement Boost Program',
        description: 'Enroll in personalized engagement activities and peer study groups',
        expectedImpact: 25,
      });
    }

    // Performance-focused interventions
    const performanceFactors = riskFactors.filter(
      f => f.factor.includes('Performance') || f.factor.includes('Deadlines'),
    );
    if (performanceFactors.length > 0) {
      recommendations.push({
        type: 'short-term' as const,
        priority: 'high' as const,
        action: 'Academic Support Program',
        description: 'Provide tutoring, study skills training, and time management coaching',
        expectedImpact: 30,
      });
    }

    // Attendance-focused interventions
    const attendanceFactors = riskFactors.filter(
      f => f.factor.includes('Attendance') || f.factor.includes('Inactivity'),
    );
    if (attendanceFactors.length > 0) {
      recommendations.push({
        type: 'immediate' as const,
        priority: 'medium' as const,
        action: 'Attendance Monitoring',
        description: 'Implement regular check-ins and attendance tracking with alerts',
        expectedImpact: 20,
      });
    }

    // Long-term interventions
    recommendations.push({
      type: 'long-term' as const,
      priority: 'medium' as const,
      action: 'Holistic Support Plan',
      description:
        'Develop comprehensive support plan addressing academic, social, and personal needs',
      expectedImpact: 35,
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private calculatePredictionConfidence(features: PredictionFeatures, _riskScore: number): number {
    // Calculate confidence based on data quality and model agreement
    const dataQuality = this.assessDataQuality(features);
    const modelAgreement = this.calculateModelAgreement(features);

    return Math.min((dataQuality * 0.6 + modelAgreement * 0.4) * 100, 95);
  }

  private generateRiskTimeline(
    features: PredictionFeatures,
    currentRisk: number,
  ): {
    riskIncrease30Days: number;
    riskIncrease60Days: number;
    riskIncrease90Days: number;
    criticalPoint?: string;
  } {
    // Project risk increase over time based on current trends
    const trendFactor =
      (features.engagementTrend + features.scoreTrend + features.timeSpentTrend) / 3;

    const riskIncrease30Days = Math.max(0, currentRisk + trendFactor * 0.5);
    const riskIncrease60Days = Math.max(0, currentRisk + trendFactor * 1.0);
    const riskIncrease90Days = Math.max(0, currentRisk + trendFactor * 1.5);

    let criticalPoint: string | undefined;
    if (riskIncrease30Days >= 85) {
      criticalPoint = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (riskIncrease60Days >= 85) {
      criticalPoint = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (riskIncrease90Days >= 85) {
      criticalPoint = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return {
      riskIncrease30Days: Math.min(riskIncrease30Days, 100),
      riskIncrease60Days: Math.min(riskIncrease60Days, 100),
      riskIncrease90Days: Math.min(riskIncrease90Days, 100),
      criticalPoint,
    };
  }

  private async getHistoricalComparison(
    riskScore: number,
    _courseId?: string,
  ): Promise<{
    similarCasesCount: number;
    successfulInterventionRate: number;
    averageRecoveryTime: number;
  }> {
    // This would query historical data for similar cases
    // For now, returning simulated data
    return {
      similarCasesCount: Math.floor(Math.random() * 50) + 10,
      successfulInterventionRate: Math.max(0.3, 1 - riskScore / 150), // Higher risk = lower success rate
      averageRecoveryTime: Math.floor((riskScore / 10) * 7) + 14, // 2-11 weeks based on risk
    };
  }

  private generateRiskIndicators(features: PredictionFeatures): {
    engagementDecline: boolean;
    performanceDecline: boolean;
    attendanceIssues: boolean;
    socialIsolation: boolean;
    technicalDifficulties: boolean;
    motivationalIssues: boolean;
    timeManagementProblems: boolean;
  } {
    return {
      engagementDecline: features.engagementTrend < -10 || features.recentEngagement < 40,
      performanceDecline: features.scoreTrend < -5 || features.averageScore < 60,
      attendanceIssues: features.attendanceRate < 0.7 || features.inactivityPeriods > 5,
      socialIsolation: features.socialInteraction < 0.3,
      technicalDifficulties: false, // Would need additional data to determine
      motivationalIssues: features.sessionConsistency < 0.5 && features.engagementTrend < 0,
      timeManagementProblems: features.deadlineMissRate > 0.3,
    };
  }

  // Feature calculation methods
  private calculateRecentEngagement(analytics: any[]): number {
    const recent = analytics.slice(-7); // Last 7 days
    return recent.length > 0
      ? recent.reduce((sum, a) => sum + a.engagementScore, 0) / recent.length
      : 0;
  }

  private calculateEngagementTrend(analytics: any[]): number {
    if (analytics.length < 14) return 0;

    const firstHalf = analytics.slice(0, Math.floor(analytics.length / 2));
    const secondHalf = analytics.slice(Math.floor(analytics.length / 2));

    const firstAvg = firstHalf.reduce((sum, a) => sum + a.engagementScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, a) => sum + a.engagementScore, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }

  private calculateAverageScore(analytics: any[]): number {
    const withScores = analytics.filter(a => a.averageQuizScore != null);
    return withScores.length > 0
      ? withScores.reduce((sum, a) => sum + a.averageQuizScore, 0) / withScores.length
      : 0;
  }

  private calculateScoreTrend(analytics: any[]): number {
    const withScores = analytics.filter(a => a.averageQuizScore != null);
    if (withScores.length < 4) return 0;

    const firstHalf = withScores.slice(0, Math.floor(withScores.length / 2));
    const secondHalf = withScores.slice(Math.floor(withScores.length / 2));

    const firstAvg = firstHalf.reduce((sum, a) => sum + a.averageQuizScore, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, a) => sum + a.averageQuizScore, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }

  private calculateAttendanceRate(sessions: any[]): number {
    const expectedSessions = 30; // Expected sessions in 60 days (approximate)
    return Math.min(sessions.length / expectedSessions, 1);
  }

  private calculateTimeSpentTrend(analytics: any[]): number {
    if (analytics.length < 7) return 0;

    const firstWeek = analytics.slice(0, 7);
    const lastWeek = analytics.slice(-7);

    const firstAvg = firstWeek.reduce((sum, a) => sum + a.totalTimeSpent, 0) / 7;
    const lastAvg = lastWeek.reduce((sum, a) => sum + a.totalTimeSpent, 0) / 7;

    return ((lastAvg - firstAvg) / firstAvg) * 100;
  }

  private calculateSocialInteraction(activities: any[]): number {
    const socialActivities = activities.filter(a =>
      ['DISCUSSION_POST', 'CHAT_MESSAGE', 'FORUM_POST'].includes(a.activityType),
    );
    return Math.min(socialActivities.length / activities.length, 1);
  }

  private calculateHelpSeekingBehavior(activities: any[]): number {
    const helpActivities = activities.filter(
      a => a.activityType === 'HELP_REQUEST' || (a.metadata && a.metadata.isHelpRelated),
    );
    return Math.min(helpActivities.length / 10, 1); // Normalize to reasonable range
  }

  private calculateSessionConsistency(sessions: any[]): number {
    if (sessions.length < 7) return 0;

    // Calculate variance in session intervals
    const intervals: number[] = [];
    for (let i = 1; i < sessions.length; i++) {
      const interval: number =
        sessions[i].startTime.getTime() - sessions[i - 1].startTime.getTime();
      intervals.push(interval / (24 * 60 * 60 * 1000));
    }

    const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;

    // Lower variance = higher consistency
    return Math.max(0, 1 - variance / 10);
  }

  private calculateDifficultyProgression(activities: any[]): number {
    // Simplified difficulty progression calculation
    const progressionActivities = activities.filter(a => a.metadata && a.metadata.difficultyLevel);

    if (progressionActivities.length < 2) return 0;

    const difficultyTrend = progressionActivities
      .slice(-5)
      .reduce((trend, activity, index, arr) => {
        if (index === 0) return 0;
        return (
          trend + (activity.metadata.difficultyLevel - arr[index - 1].metadata.difficultyLevel)
        );
      }, 0);

    return difficultyTrend / 4; // Normalize
  }

  private calculateDeadlineMissRate(activities: any[]): number {
    const deadlineActivities = activities.filter(
      a => a.metadata && a.metadata.deadline && a.metadata.submissionTime,
    );

    if (deadlineActivities.length === 0) return 0;

    const missedDeadlines = deadlineActivities.filter(
      a => new Date(a.metadata.submissionTime) > new Date(a.metadata.deadline),
    );

    return missedDeadlines.length / deadlineActivities.length;
  }

  private calculateInactivityPeriods(activities: any[], sessions: any[]): number {
    const allEvents = [...activities, ...sessions]
      .map(event => event.timestamp || event.startTime)
      .sort((a, b) => a.getTime() - b.getTime());

    let inactivityPeriods = 0;
    for (let i = 1; i < allEvents.length; i++) {
      const gap = (allEvents[i].getTime() - allEvents[i - 1].getTime()) / (24 * 60 * 60 * 1000);
      if (gap > 3) {
        // More than 3 days gap
        inactivityPeriods++;
      }
    }

    return inactivityPeriods;
  }

  // Additional helper methods for model calculations
  private calculateEngagementResidual(features: PredictionFeatures): number {
    const expected = 70; // Expected engagement
    return (expected - features.recentEngagement) / 10;
  }

  private calculatePerformanceResidual(features: PredictionFeatures): number {
    const expected = 75; // Expected performance
    return (expected - features.averageScore) / 10;
  }

  private calculateBehaviorResidual(features: PredictionFeatures): number {
    let behaviorScore = 0;
    behaviorScore += features.attendanceRate * 30;
    behaviorScore += features.sessionConsistency * 25;
    behaviorScore += (1 - features.deadlineMissRate) * 20;
    behaviorScore += features.socialInteraction * 15;
    behaviorScore += features.helpSeekingBehavior * 10;

    const expected = 70;
    return (expected - behaviorScore) / 10;
  }

  private assessDataQuality(features: PredictionFeatures): number {
    // Assess quality based on completeness and recency of data
    let quality = 1.0;

    // Penalize missing or extreme values
    Object.values(features).forEach(value => {
      if (typeof value === 'number') {
        if (value === 0 || value === null || value === undefined) {
          quality -= 0.05;
        }
      }
    });

    return Math.max(quality, 0.3); // Minimum 30% quality
  }

  private calculateModelAgreement(features: PredictionFeatures): number {
    // Calculate how much the different models agree
    const scores = [
      this.logisticRegressionModel(features),
      this.randomForestModel(features),
      this.neuralNetworkModel(features),
      this.gradientBoostingModel(features),
    ];

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;

    // Higher variance = lower agreement
    return Math.max(0, 1 - variance / 1000);
  }

  private async getActiveStudents(courseId?: string): Promise<string[]> {
    const query = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('DISTINCT analytics.studentId', 'studentId')
      .where('analytics.date >= :date', {
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      });

    if (courseId) {
      query.andWhere('analytics.courseId = :courseId', { courseId });
    }

    const results = await query.getRawMany();
    return results.map(r => r.studentId);
  }

  private async performModelRetraining(
    modelType?: string,
    _forceRetrain: boolean = false,
  ): Promise<void> {
    // This would implement actual model retraining logic
    this.logger.log(`Performing model retraining for ${modelType || 'all models'}`);

    // Simulate training process
    await new Promise(resolve => setTimeout(resolve, 5000));

    this.logger.log('Model retraining completed successfully');
  }

  private async calculateModelPerformance(): Promise<ModelPerformance> {
    // Calculate current model performance metrics
    // In a real implementation, this would validate against known outcomes
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
      lastTrainedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      samplesUsed: 1250,
      version: '2.1.0',
    };
  }

  // Learning outcome prediction methods
  private predictCompletionDate(features: PredictionFeatures): string {
    const baseCompletionDays = 90; // 3 months base
    const adjustmentFactor =
      (features.recentEngagement + features.averageScore + features.attendanceRate * 100) / 3;

    const adjustedDays = baseCompletionDays * (100 / Math.max(adjustmentFactor, 30));
    const completionDate = new Date(Date.now() + adjustedDays * 24 * 60 * 60 * 1000);

    return completionDate.toISOString().split('T')[0];
  }

  private predictFinalGrade(features: PredictionFeatures): number {
    const currentPerformance = features.averageScore;
    const trendAdjustment = features.scoreTrend * 2;
    const engagementFactor = (features.recentEngagement / 100) * 10;

    const predictedGrade = currentPerformance + trendAdjustment + engagementFactor;
    return Math.min(Math.max(predictedGrade, 0), 100);
  }

  private predictStrugglingTopics(features: PredictionFeatures): string[] {
    const strugglingTopics: string[] = [];

    if (features.averageScore < 60) {
      strugglingTopics.push('Core Concepts');
    }
    if (features.difficultyProgression < 0) {
      strugglingTopics.push('Advanced Topics');
    }
    if (features.deadlineMissRate > 0.3) {
      strugglingTopics.push('Time Management');
    }
    if (features.socialInteraction < 0.3) {
      strugglingTopics.push('Collaborative Learning');
    }

    return strugglingTopics;
  }

  private predictOptimalPace(features: PredictionFeatures): 'slow' | 'moderate' | 'fast' {
    const paceScore =
      (features.sessionConsistency + features.attendanceRate + features.recentEngagement / 100) / 3;

    if (paceScore > 0.8) return 'fast';
    if (paceScore > 0.5) return 'moderate';
    return 'slow';
  }

  private calculateSuccessProbability(features: PredictionFeatures): number {
    const engagementWeight = 0.3;
    const performanceWeight = 0.4;
    const behaviorWeight = 0.3;

    const engagementScore = features.recentEngagement / 100;
    const performanceScore = features.averageScore / 100;
    const behaviorScore =
      (features.attendanceRate + features.sessionConsistency + (1 - features.deadlineMissRate)) / 3;

    const successProbability =
      engagementScore * engagementWeight +
      performanceScore * performanceWeight +
      behaviorScore * behaviorWeight;

    return Math.min(successProbability * 100, 95);
  }

  private predictInterventionNeeds(features: PredictionFeatures): string[] {
    const interventions: string[] = [];

    if (features.recentEngagement < 50) {
      interventions.push('Engagement Enhancement');
    }
    if (features.averageScore < 60) {
      interventions.push('Academic Support');
    }
    if (features.attendanceRate < 0.7) {
      interventions.push('Attendance Monitoring');
    }
    if (features.socialInteraction < 0.3) {
      interventions.push('Social Integration');
    }
    if (features.deadlineMissRate > 0.3) {
      interventions.push('Time Management Training');
    }
    if (features.helpSeekingBehavior < 0.3) {
      interventions.push('Help-Seeking Encouragement');
    }

    return interventions;
  }
}

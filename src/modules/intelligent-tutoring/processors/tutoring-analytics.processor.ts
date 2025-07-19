import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { TutoringSession } from '../entities/tutoring-session.entity';
import { TutoringInteraction } from '../entities/tutoring-interaction.entity';
import { LearningAnalytics } from '../../analytics/entities/learning-analytics.entity';

@Processor('tutoring-analytics')
export class TutoringAnalyticsProcessor {
  private readonly logger = new Logger(TutoringAnalyticsProcessor.name);

  constructor(
    @InjectRepository(TutoringSession)
    private readonly sessionRepository: Repository<TutoringSession>,
    @InjectRepository(TutoringInteraction)
    private readonly _interactionRepository: Repository<TutoringInteraction>,
    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`Processing tutoring analytics job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, _result: any) {
    this.logger.log(`Completed tutoring analytics job ${job.id}`);
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(`Failed tutoring analytics job ${job.id}: ${err.message}`);
  }

  @Process('analyze-session-performance')
  async analyzeSessionPerformance(job: Job<{ sessionId: string }>) {
    const { sessionId } = job.data;
    this.logger.log(`Analyzing performance for session: ${sessionId}`);

    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['interactions'],
      });

      if (!session) {
        throw new Error('Session not found');
      }

      const analytics = await this.calculateSessionAnalytics(session);
      await this.saveSessionAnalytics(session, analytics);

      return { success: true, analytics };
    } catch (error) {
      this.logger.error(`Session analysis failed: ${error.message}`);
      throw error;
    }
  }

  @Process('update-learning-metrics')
  async updateLearningMetrics(job: Job<{ studentId: string; sessionId: string }>) {
    const { studentId, sessionId } = job.data;
    this.logger.log(`Updating learning metrics for student: ${studentId}`);

    try {
      // Update comprehensive learning metrics
      const metrics = await this.calculateLearningMetrics(studentId, sessionId);
      await this.updateStudentAnalytics(studentId, metrics);

      return { success: true, metrics };
    } catch (error) {
      this.logger.error(`Learning metrics update failed: ${error.message}`);
      throw error;
    }
  }

  private async calculateSessionAnalytics(session: TutoringSession): Promise<any> {
    const interactions = session.interactions || [];

    return {
      totalInteractions: interactions.length,
      averageResponseTime: this.calculateAverageResponseTime(interactions),
      accuracyRate: this.calculateAccuracyRate(interactions),
      engagementScore: this.calculateEngagementScore(session, interactions),
      conceptMastery: this.calculateConceptMastery(interactions),
      difficultyProgression: this.analyzeDifficultyProgression(interactions),
    };
  }

  private calculateAverageResponseTime(interactions: TutoringInteraction[]): number {
    const validInteractions = interactions.filter(i => i.responseTime > 0);
    if (validInteractions.length === 0) return 0;

    return validInteractions.reduce((sum, i) => sum + i.responseTime, 0) / validInteractions.length;
  }

  private calculateAccuracyRate(interactions: TutoringInteraction[]): number {
    const answerInteractions = interactions.filter(
      i => i.interactionType === 'assessment_answer' || i.interactionType === 'question',
    );

    if (answerInteractions.length === 0) return 0;

    const correctAnswers = answerInteractions.filter(i => i.isCorrectAnswer).length;
    return (correctAnswers / answerInteractions.length) * 100;
  }

  private calculateEngagementScore(
    session: TutoringSession,
    interactions: TutoringInteraction[],
  ): number {
    let engagementScore = 50; // Base score

    // Factor in session duration vs expected duration
    const expectedDuration = 30 * 60; // 30 minutes in seconds
    const actualDuration = session.totalDuration;

    if (actualDuration > expectedDuration * 0.8) {
      engagementScore += 20; // Good engagement
    }

    // Factor in interaction frequency
    const interactionRate = interactions.length / (actualDuration / 60); // interactions per minute
    if (interactionRate > 1) {
      engagementScore += 15;
    }

    // Factor in help-seeking behavior (balanced)
    const hintUsage = interactions.filter(i => i.hintLevel > 0).length;
    const hintRatio = hintUsage / interactions.length;

    if (hintRatio > 0.1 && hintRatio < 0.5) {
      engagementScore += 15; // Appropriate help-seeking
    }

    return Math.min(100, Math.max(0, engagementScore));
  }

  private calculateConceptMastery(interactions: TutoringInteraction[]): Record<string, number> {
    const conceptMastery: Record<string, { correct: number; total: number }> = {};

    interactions.forEach(interaction => {
      if (interaction.topicCovered) {
        const topic = interaction.topicCovered;

        if (!conceptMastery[topic]) {
          conceptMastery[topic] = { correct: 0, total: 0 };
        }

        conceptMastery[topic].total++;
        if (interaction.isCorrectAnswer) {
          conceptMastery[topic].correct++;
        }
      }
    });

    // Convert to mastery percentages
    const masteryPercentages: Record<string, number> = {};
    Object.keys(conceptMastery).forEach(topic => {
      const data = conceptMastery[topic];
      masteryPercentages[topic] = (data.correct / data.total) * 100;
    });

    return masteryPercentages;
  }

  private analyzeDifficultyProgression(interactions: TutoringInteraction[]): any {
    const difficultyLevels = interactions
      .map(i => parseInt(i.difficultyLevel || '5'))
      .filter(d => !isNaN(d));

    if (difficultyLevels.length === 0) {
      return { start: 5, current: 5, trend: 'stable' };
    }

    const start = difficultyLevels[0];
    const current = difficultyLevels[difficultyLevels.length - 1];
    const trend = current > start ? 'increasing' : current < start ? 'decreasing' : 'stable';

    return { start, current, trend };
  }

  private async calculateLearningMetrics(studentId: string, _sessionId: string): Promise<any> {
    // Get all sessions for the student to calculate comprehensive metrics
    const sessions = await this.sessionRepository.find({
      where: { studentId },
      relations: ['interactions'],
      order: { startedAt: 'ASC' },
    });

    const allInteractions = sessions.flatMap(s => s.interactions || []);

    return {
      totalStudyTime: sessions.reduce((sum, s) => sum + s.totalDuration, 0),
      totalSessions: sessions.length,
      averageSessionDuration:
        sessions.length > 0
          ? sessions.reduce((sum, s) => sum + s.totalDuration, 0) / sessions.length
          : 0,
      overallAccuracy: this.calculateAccuracyRate(allInteractions),
      conceptMastery: this.calculateConceptMastery(allInteractions),
      learningVelocity: this.calculateLearningVelocity(sessions),
      strugglingAreas: this.identifyStrugglingAreas(allInteractions),
      strongAreas: this.identifyStrongAreas(allInteractions),
    };
  }

  private calculateLearningVelocity(sessions: TutoringSession[]): number {
    if (sessions.length < 2) return 0;

    // Calculate improvement rate over time
    const recentSessions = sessions.slice(-5); // Last 5 sessions
    const oldSessions = sessions.slice(0, 5); // First 5 sessions

    const recentAccuracy = this.calculateAverageAccuracy(recentSessions);
    const oldAccuracy = this.calculateAverageAccuracy(oldSessions);

    return recentAccuracy - oldAccuracy;
  }

  private calculateAverageAccuracy(sessions: TutoringSession[]): number {
    const allInteractions = sessions.flatMap(s => s.interactions || []);
    return this.calculateAccuracyRate(allInteractions);
  }

  private identifyStrugglingAreas(interactions: TutoringInteraction[]): string[] {
    const conceptPerformance = this.calculateConceptMastery(interactions);

    return Object.entries(conceptPerformance)
      .filter(([_, mastery]) => mastery < 60)
      .map(([concept, _]) => concept)
      .slice(0, 5); // Top 5 struggling areas
  }

  private identifyStrongAreas(interactions: TutoringInteraction[]): string[] {
    const conceptPerformance = this.calculateConceptMastery(interactions);

    return Object.entries(conceptPerformance)
      .filter(([_, mastery]) => mastery > 80)
      .map(([concept, _]) => concept)
      .slice(0, 5); // Top 5 strong areas
  }

  private async saveSessionAnalytics(session: TutoringSession, analytics: any): Promise<void> {
    try {
      // Update session performance metrics
      session.performanceMetrics = {
        ...session.performanceMetrics,
        ...analytics,
      };

      await this.sessionRepository.save(session);
    } catch (error) {
      this.logger.error(`Failed to save session analytics: ${error.message}`);
    }
  }

  private async updateStudentAnalytics(studentId: string, metrics: any): Promise<void> {
    try {
      // Create or update learning analytics record
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let analyticsRecord = await this.analyticsRepository.findOne({
        where: {
          studentId,
          date: today,
        },
      });

      if (!analyticsRecord) {
        analyticsRecord = this.analyticsRepository.create({
          studentId,
          date: today,
          totalTimeSpent: 0,
          lessonsCompleted: 0,
          assessmentsTaken: 0,
          averageScore: 0,
          skillProgress: {},
        } as DeepPartial<LearningAnalytics>);
      }

      // Update with new metrics
      analyticsRecord.totalTimeSpent = metrics.totalTimeSpent;
      analyticsRecord.averageScore = metrics.overallAccuracy;
      analyticsRecord.skillProgress = metrics.conceptMastery;

      await this.analyticsRepository.save(analyticsRecord);
    } catch (error) {
      this.logger.error(`Failed to update student analytics: ${error.message}`);
    }
  }
}

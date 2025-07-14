import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningAnalytics } from '../entities/learning-analytics.entity';
import { LearningActivity } from '../entities/learning-activity.entity';
import { LearningSession } from '../entities/learning-session.entity';
import { ActivityType } from '@/common/enums/analytics.enums';

@Injectable()
@Processor('analytics')
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,
    @InjectRepository(LearningSession)
    private readonly sessionRepository: Repository<LearningSession>,
  ) {}

  @Process('aggregateDaily')
  async aggregateDailyAnalytics(job: Job<{ studentId: string; date: string }>) {
    const { studentId, date } = job.data;

    try {
      this.logger.debug(`Processing daily analytics for student ${studentId} on ${date}`);

      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      // Get activities for the day
      const activities = await this.activityRepository
        .createQueryBuilder('activity')
        .where('activity.studentId = :studentId', { studentId })
        .andWhere('activity.timestamp >= :startDate', { startDate: targetDate })
        .andWhere('activity.timestamp < :endDate', { endDate: nextDate })
        .getMany();

      // Get sessions for the day
      const sessions = await this.sessionRepository
        .createQueryBuilder('session')
        .where('session.studentId = :studentId', { studentId })
        .andWhere('session.startTime >= :startDate', { startDate: targetDate })
        .andWhere('session.startTime < :endDate', { endDate: nextDate })
        .getMany();

      // Calculate metrics
      const totalTimeSpent = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const lessonsCompleted = activities.filter(
        a => a.activityType === ActivityType.LESSON_COMPLETE,
      ).length;
      const quizzesAttempted = activities.filter(
        a => a.activityType === ActivityType.QUIZ_ATTEMPT,
      ).length;
      const quizzesPassed = activities.filter(
        a =>
          a.activityType === ActivityType.QUIZ_COMPLETE &&
          a.metadata?.score !== undefined &&
          a.metadata.score >= 70,
      ).length;

      const videoWatchTime = activities
        .filter(a => a.activityType === ActivityType.VIDEO_PLAY)
        .reduce((sum, a) => sum + (a.duration || 0), 0);

      const readingTime = activities
        .filter(a => a.activityType === ActivityType.CONTENT_READ)
        .reduce((sum, a) => sum + (a.duration || 0), 0);

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(activities, sessions);

      // Find or create analytics record
      let analytics = await this.analyticsRepository.findOne({
        where: { studentId, date: targetDate },
      });

      if (!analytics) {
        analytics = this.analyticsRepository.create({
          studentId,
          date: targetDate,
        });
      }

      // Update metrics
      analytics.totalTimeSpent = totalTimeSpent;
      analytics.lessonsCompleted = lessonsCompleted;
      analytics.quizzesAttempted = quizzesAttempted;
      analytics.quizzesPassed = quizzesPassed;
      analytics.videoWatchTime = videoWatchTime;
      analytics.readingTime = readingTime;
      analytics.loginCount = sessions.length;
      analytics.engagementScore = engagementScore;

      await this.analyticsRepository.save(analytics);

      this.logger.debug(`Daily analytics aggregated for student ${studentId} on ${date}`);
    } catch (error) {
      this.logger.error(`Error aggregating daily analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('generateWeeklyReport')
  async generateWeeklyReport(job: Job<{ studentId: string; weekStart: string }>) {
    const { studentId, weekStart } = job.data;

    try {
      this.logger.debug(`Generating weekly report for student ${studentId} starting ${weekStart}`);

      // Implementation for weekly report generation
      // This would aggregate weekly stats, identify trends, etc.
    } catch (error) {
      this.logger.error(`Error generating weekly report: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Process('detectAnomalies')
  async detectAnomalies(job: Job<{ studentId: string }>) {
    const { studentId } = job.data;

    try {
      this.logger.debug(`Detecting anomalies for student ${studentId}`);

      // Implementation for anomaly detection
      // This would look for unusual patterns in learning behavior
    } catch (error) {
      this.logger.error(`Error detecting anomalies: ${error.message}`, error.stack);
      throw error;
    }
  }

  private calculateEngagementScore(
    activities: LearningActivity[],
    sessions: LearningSession[],
  ): number {
    if (activities.length === 0 && sessions.length === 0) return 0;

    let score = 0;
    const weights = {
      sessionDuration: 0.3,
      activityVariety: 0.2,
      interactionFrequency: 0.2,
      completionRate: 0.3,
    };

    // Session duration component
    const avgSessionDuration =
      sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
        : 0;
    const sessionScore = Math.min(avgSessionDuration / 3600, 1) * 100; // Max 1 hour = 100%
    score += sessionScore * weights.sessionDuration;

    // Activity variety component
    const uniqueActivityTypes = new Set(activities.map(a => a.activityType)).size;
    const varietyScore = Math.min(uniqueActivityTypes / 5, 1) * 100; // Max 5 types = 100%
    score += varietyScore * weights.activityVariety;

    // Interaction frequency component
    const interactionsPerHour =
      avgSessionDuration > 0 ? activities.length / (avgSessionDuration / 3600) : 0;
    const interactionScore = Math.min(interactionsPerHour / 10, 1) * 100; // Max 10 per hour = 100%
    score += interactionScore * weights.interactionFrequency;

    // Completion rate component
    const completionActivities = activities.filter(
      a => a.activityType.includes('COMPLETE') || a.activityType.includes('SUBMIT'),
    );
    const completionRate =
      activities.length > 0 ? completionActivities.length / activities.length : 0;
    const completionScore = completionRate * 100;
    score += completionScore * weights.completionRate;

    return Math.min(Math.round(score), 100);
  }
}

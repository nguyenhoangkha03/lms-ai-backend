import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningActivity } from '../entities/learning-activity.entity';
import { LearningSession } from '../entities/learning-session.entity';
import { LearningAnalytics } from '../entities/learning-analytics.entity';
import { CacheService } from '@/cache/cache.service';
import { AnalyticsGateway } from '../gateways/analytics.gateway';

@Injectable()
export class AnalyticsEventsListener {
  private readonly logger = new Logger(AnalyticsEventsListener.name);

  constructor(
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,

    @InjectRepository(LearningSession)
    private readonly sessionRepository: Repository<LearningSession>,

    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,

    private readonly cacheService: CacheService,
    private readonly analyticsGateway: AnalyticsGateway,
  ) {}

  @OnEvent('activity.tracked')
  async handleActivityTracked(payload: any) {
    try {
      const { activity, timestamp } = payload;

      // Update real-time activity cache
      await this.updateActivityCache(activity);

      // Broadcast to real-time subscribers
      this.analyticsGateway.broadcastToEventSubscribers('activity.tracked', {
        studentId: activity.studentId,
        activityType: activity.activityType,
        courseId: activity.courseId,
        lessonId: activity.lessonId,
        timestamp,
      });

      // Update user-specific metrics
      await this.updateUserMetrics(activity.studentId);

      this.logger.debug(
        `Activity event processed: ${activity.activityType} for ${activity.studentId}`,
      );
    } catch (error) {
      this.logger.error(`Error processing activity event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('activities.batch.tracked')
  async handleActivitiesBatchTracked(payload: any) {
    try {
      const { activities, count, timestamp } = payload;

      // Group activities by student
      const activitiesByStudent = activities.reduce((acc, activity) => {
        if (!acc[activity.studentId]) acc[activity.studentId] = [];
        acc[activity.studentId].push(activity);
        return acc;
      }, {});

      // Update metrics for each student
      for (const [studentId, studentActivities] of Object.entries(activitiesByStudent)) {
        await this.updateUserMetrics(studentId);

        // Broadcast batch update
        this.analyticsGateway.broadcastToUser(studentId, 'batch_activities_processed', {
          count: (studentActivities as any[]).length,
          timestamp,
        });
      }

      this.logger.debug(`Batch activity event processed: ${count} activities`);
    } catch (error) {
      this.logger.error(`Error processing batch activity event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('engagement.updated')
  async handleEngagementUpdated(payload: any) {
    try {
      const { studentId, sessionId, metrics, timestamp } = payload;

      // Cache engagement metrics
      await this.cacheService.set(
        `engagement:${sessionId}`,
        metrics,
        300, // 5 minutes
      );

      // Broadcast real-time engagement data
      this.analyticsGateway.broadcastToUser(studentId, 'engagement_update', {
        sessionId,
        metrics,
        timestamp,
      });

      // Broadcast to teachers/admins
      this.analyticsGateway.broadcastToPrivilegedUsers('student_engagement_update', {
        studentId,
        sessionId,
        metrics,
        timestamp,
      });

      this.logger.debug(`Engagement event processed for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error processing engagement event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('engagement.low')
  async handleLowEngagement(payload: any) {
    try {
      const { studentId, sessionId, metrics, timestamp } = payload;

      // Send alert to student
      this.analyticsGateway.broadcastToUser(studentId, 'engagement_alert', {
        type: 'low_engagement',
        severity: 'warning',
        message:
          'Your engagement level is below optimal. Consider taking a short break or changing your study environment.',
        metrics,
        timestamp,
      });

      // Send alert to teachers/admins
      this.analyticsGateway.broadcastToPrivilegedUsers('student_engagement_alert', {
        studentId,
        sessionId,
        type: 'low_engagement',
        severity: 'warning',
        metrics,
        timestamp,
      });

      // Log the alert
      this.logger.warn(`Low engagement alert for student ${studentId} in session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error processing low engagement event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('performance.tracked')
  async handlePerformanceTracked(payload: any) {
    try {
      const { studentId, courseId, metrics, timestamp } = payload;

      // Cache performance metrics
      await this.cacheService.set(
        `performance:${studentId}:${courseId}`,
        metrics,
        600, // 10 minutes
      );

      // Broadcast performance update
      this.analyticsGateway.broadcastToUser(studentId, 'performance_update', {
        courseId,
        metrics,
        timestamp,
      });

      // Update course-level analytics
      await this.updateCourseAnalytics(courseId, metrics);

      this.logger.debug(
        `Performance event processed for student ${studentId} in course ${courseId}`,
      );
    } catch (error) {
      this.logger.error(`Error processing performance event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('performance.concern')
  async handlePerformanceConcern(payload: any) {
    try {
      const { studentId, courseId, metrics, timestamp } = payload;

      // Send concern alert to student
      this.analyticsGateway.broadcastToUser(studentId, 'performance_alert', {
        type: 'performance_concern',
        severity: 'warning',
        message:
          'Your performance metrics indicate you may need additional support. Consider reviewing recent materials or seeking help.',
        courseId,
        metrics,
        timestamp,
      });

      // Send alert to teachers/admins
      this.analyticsGateway.broadcastToPrivilegedUsers('student_performance_alert', {
        studentId,
        courseId,
        type: 'performance_concern',
        severity: 'warning',
        metrics,
        timestamp,
      });

      this.logger.warn(`Performance concern alert for student ${studentId} in course ${courseId}`);
    } catch (error) {
      this.logger.error(
        `Error processing performance concern event: ${error.message}`,
        error.stack,
      );
    }
  }

  @OnEvent('session.started')
  async handleSessionStarted(payload: any) {
    try {
      const { session, timestamp } = payload;

      // Cache active session
      await this.cacheService.set(
        `active_session:${session.studentId}`,
        session,
        3600, // 1 hour
      );

      // Broadcast session start
      this.analyticsGateway.broadcastToUser(session.studentId, 'session_started', {
        sessionId: session.sessionId,
        timestamp,
      });

      // Update daily session count
      await this.updateDailySessionCount(session.studentId);

      this.logger.debug(`Session started event processed for student ${session.studentId}`);
    } catch (error) {
      this.logger.error(`Error processing session started event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('session.ended')
  async handleSessionEnded(payload: any) {
    try {
      const { session, duration, timestamp } = payload;

      // Remove from active sessions cache
      await this.cacheService.del(`active_session:${session.studentId}`);

      // Broadcast session end
      this.analyticsGateway.broadcastToUser(session.studentId, 'session_ended', {
        sessionId: session.sessionId,
        duration,
        timestamp,
      });

      // Update session analytics
      await this.updateSessionAnalytics(session);

      this.logger.debug(
        `Session ended event processed for student ${session.studentId}, duration: ${duration}s`,
      );
    } catch (error) {
      this.logger.error(`Error processing session ended event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('analytics.client.connected')
  async handleClientConnected(payload: any) {
    try {
      const { userId, _sessionId, _timestamp } = payload;

      // Update connection analytics
      await this.updateConnectionAnalytics(userId, 'connected');

      this.logger.debug(`Analytics client connected: ${userId}`);
    } catch (error) {
      this.logger.error(`Error processing client connected event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('analytics.client.disconnected')
  async handleClientDisconnected(payload: any) {
    try {
      const { userId, _sessionId, _timestamp } = payload;

      // Update connection analytics
      await this.updateConnectionAnalytics(userId, 'disconnected');

      this.logger.debug(`Analytics client disconnected: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error processing client disconnected event: ${error.message}`,
        error.stack,
      );
    }
  }

  // Assessment events
  @OnEvent('assessment.started')
  async handleAssessmentStarted(payload: any) {
    try {
      const { studentId, assessmentId, attemptId, timestamp } = payload;

      // Track assessment start activity
      await this.activityRepository.save({
        studentId,
        assessmentId,
        activityType: 'ASSESSMENT_START' as any,
        sessionId: `assessment_${attemptId}`,
        timestamp,
        metadata: {
          attemptId,
          assessmentType: 'quiz',
        },
      });

      this.logger.debug(`Assessment started event processed for student ${studentId}`);
    } catch (error) {
      this.logger.error(`Error processing assessment started event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('assessment.completed')
  async handleAssessmentCompleted(payload: any) {
    try {
      const { studentId, assessmentId, attemptId, score, duration, timestamp } = payload;

      // Track assessment completion activity
      await this.activityRepository.save({
        studentId,
        assessmentId,
        activityType: 'ASSESSMENT_COMPLETE' as any,
        sessionId: `assessment_${attemptId}`,
        timestamp,
        duration,
        metadata: {
          attemptId,
          score,
          assessmentType: 'quiz',
        },
      });

      // Broadcast completion
      this.analyticsGateway.broadcastToUser(studentId, 'assessment_completed', {
        assessmentId,
        score,
        duration,
        timestamp,
      });

      this.logger.debug(`Assessment completed event processed for student ${studentId}`);
    } catch (error) {
      this.logger.error(
        `Error processing assessment completed event: ${error.message}`,
        error.stack,
      );
    }
  }

  // Private helper methods
  private async updateActivityCache(activity: LearningActivity) {
    const cacheKey = `recent_activities:${activity.studentId}`;
    const existing = ((await this.cacheService.get(cacheKey)) as any[]) || [];

    existing.unshift({
      id: activity.id,
      activityType: activity.activityType,
      courseId: activity.courseId,
      lessonId: activity.lessonId,
      timestamp: activity.timestamp,
      duration: activity.duration,
    });

    // Keep only last 50 activities
    if (existing.length > 50) {
      existing.splice(50);
    }

    await this.cacheService.set(cacheKey, existing, 300);
  }

  private async updateUserMetrics(studentId: string) {
    const cacheKey = `user_metrics:${studentId}`;

    // Get today's activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayActivities = await this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.studentId = :studentId', { studentId })
      .andWhere('activity.timestamp >= :today', { today })
      .getCount();

    const metrics = {
      todayActivities,
      lastUpdated: new Date(),
    };

    await this.cacheService.set(cacheKey, metrics, 300);
  }

  private async updateCourseAnalytics(courseId: string, metrics: any) {
    const cacheKey = `course_analytics:${courseId}`;

    // Update course-level performance metrics
    const courseMetrics = {
      averagePerformance: metrics.averageScore,
      completionRate: metrics.completionRate,
      lastUpdated: new Date(),
    };

    await this.cacheService.set(cacheKey, courseMetrics, 600);
  }

  private async updateDailySessionCount(studentId: string) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily_sessions:${studentId}:${today}`;

    const currentCount = (await this.cacheService.get(cacheKey)) || 0;
    await this.cacheService.set(cacheKey, +currentCount + 1, 86400); // 24 hours
  }

  private async updateSessionAnalytics(session: any) {
    // Update session-related analytics in the database
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let analytics = await this.analyticsRepository.findOne({
        where: {
          studentId: session.studentId,
          date: today,
        },
      });

      if (!analytics) {
        analytics = this.analyticsRepository.create({
          studentId: session.studentId,
          date: today,
          totalTimeSpent: 0,
          loginCount: 0,
        });
      }

      // Update session metrics
      analytics.totalTimeSpent += session.duration || 0;
      analytics.loginCount += 1;

      await this.analyticsRepository.save(analytics);
    } catch (error) {
      this.logger.error(`Error updating session analytics: ${error.message}`, error.stack);
    }
  }

  private async updateConnectionAnalytics(userId: string, type: 'connected' | 'disconnected') {
    const cacheKey = `connection_analytics:${userId}`;

    const analytics = (await this.cacheService.get<any>(cacheKey)) || {
      totalConnections: 0,
      totalDisconnections: 0,
      lastConnected: null,
      lastDisconnected: null,
    };

    if (type === 'connected') {
      analytics.totalConnections += 1;
      analytics.lastConnected = new Date();
    } else {
      analytics.totalDisconnections += 1;
      analytics.lastDisconnected = new Date();
    }

    await this.cacheService.set(cacheKey, analytics, 3600);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LearningActivity } from '../entities/learning-activity.entity';
import { LearningSession } from '../entities/learning-session.entity';
import { LearningAnalytics } from '../entities/learning-analytics.entity';
import { CacheService } from '@/cache/cache.service';
import { DeviceType, SessionStatus } from '@/common/enums/analytics.enums';
import {
  CreateActivityDto,
  CreateSessionDto,
  UpdateSessionDto,
  ActivityBatchDto,
  EngagementMetricsDto,
  PerformanceMetricsDto,
} from '../dto/data-collection.dto';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class DataCollectionService {
  private readonly BATCH_SIZE = 100;
  private readonly CACHE_TTL = 300;

  constructor(
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,

    @InjectRepository(LearningSession)
    private readonly sessionRepository: Repository<LearningSession>,

    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,

    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(DataCollectionService.name);
  }

  async trackActivity(createActivityDto: CreateActivityDto): Promise<LearningActivity> {
    try {
      const activity = this.activityRepository.create({
        ...createActivityDto,
        timestamp: new Date(),
      });

      const savedActivity = await this.activityRepository.save(activity);

      await this.updateSessionActivityCount(createActivityDto.sessionId);

      // Emit event for real-time processing
      this.eventEmitter.emit('activity.tracked', {
        activity: savedActivity,
        timestamp: new Date(),
      });

      // Cache recent activities for quick access
      await this.cacheRecentActivity(savedActivity);

      this.logger.debug(
        `Activity tracked: ${savedActivity.activityType} for student ${savedActivity.studentId}`,
      );

      return savedActivity;
    } catch (error) {
      this.logger.error(`Error tracking activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Batch track multiple activities for performance
   */
  async trackActivitiesBatch(batchDto: ActivityBatchDto): Promise<LearningActivity[]> {
    try {
      const activities = batchDto.activities.map(activity =>
        this.activityRepository.create({
          ...activity,
          timestamp: new Date(),
        }),
      );

      const savedActivities = await this.activityRepository.save(activities, {
        chunk: this.BATCH_SIZE,
      });

      // Emit batch event
      this.eventEmitter.emit('activities.batch.tracked', {
        activities: savedActivities,
        count: savedActivities.length,
        timestamp: new Date(),
      });

      this.logger.debug(`Batch tracked ${savedActivities.length} activities`);

      return savedActivities;
    } catch (error) {
      this.logger.error(`Error batch tracking activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Start new learning session
   */
  async startSession(createSessionDto: CreateSessionDto): Promise<LearningSession> {
    try {
      const session = this.activityRepository.create({
        ...createSessionDto,
        status: SessionStatus.ACTIVE,
        startTime: new Date(),
      } as LearningSession);

      const savedSession = await this.sessionRepository.save(session);

      // Cache active session
      await this.cacheService.set(
        `active_session:${savedSession.studentId}`,
        savedSession,
        this.CACHE_TTL,
      );

      // Emit session start event
      this.eventEmitter.emit('session.started', {
        session: savedSession,
        timestamp: new Date(),
      });

      this.logger.debug(`Session started for student ${savedSession.studentId}`);

      return savedSession;
    } catch (error) {
      this.logger.error(`Error starting session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * End learning session
   */
  async endSession(sessionId: string, updateDto: UpdateSessionDto): Promise<LearningSession> {
    try {
      const session = await this.sessionRepository.findOne({
        where: { sessionId },
      });

      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

      session.endTime = endTime;
      session.duration = duration;
      session.status = SessionStatus.COMPLETED;
      session.engagementMetrics = updateDto.engagementMetrics;
      session.learningOutcomes = updateDto.learningOutcomes;
      session.qualityIndicators = updateDto.qualityIndicators;

      const savedSession = await this.sessionRepository.save(session);

      // Remove from active sessions cache
      await this.cacheService.del(`active_session:${session.studentId}`);

      // Emit session end event
      this.eventEmitter.emit('session.ended', {
        session: savedSession,
        duration,
        timestamp: new Date(),
      });

      this.logger.debug(`Session ended for student ${session.studentId}, duration: ${duration}s`);

      return savedSession;
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Track engagement metrics in real-time
   */
  async trackEngagement(
    studentId: string,
    sessionId: string,
    metrics: EngagementMetricsDto,
  ): Promise<void> {
    try {
      // Update cached engagement metrics
      const cacheKey = `engagement:${sessionId}`;
      await this.cacheService.set(cacheKey, metrics, this.CACHE_TTL);

      // Emit real-time engagement event
      this.eventEmitter.emit('engagement.updated', {
        studentId,
        sessionId,
        metrics,
        timestamp: new Date(),
      });

      // Check for low engagement alerts
      if (metrics.focusScore < 30 || metrics.interactionRate < 0.1) {
        this.eventEmitter.emit('engagement.low', {
          studentId,
          sessionId,
          metrics,
          timestamp: new Date(),
        });
      }

      this.logger.debug(`Engagement tracked for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error tracking engagement: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(
    studentId: string,
    courseId: string,
    metrics: PerformanceMetricsDto,
  ): Promise<void> {
    try {
      // Cache performance metrics
      const cacheKey = `performance:${studentId}:${courseId}`;
      await this.cacheService.set(cacheKey, metrics, this.CACHE_TTL);

      // Emit performance tracking event
      this.eventEmitter.emit('performance.tracked', {
        studentId,
        courseId,
        metrics,
        timestamp: new Date(),
      });

      // Check for performance alerts
      if (metrics.averageScore < 60 || metrics.completionRate < 0.5) {
        this.eventEmitter.emit('performance.concern', {
          studentId,
          courseId,
          metrics,
          timestamp: new Date(),
        });
      }

      this.logger.debug(`Performance tracked for student ${studentId} in course ${courseId}`);
    } catch (error) {
      this.logger.error(`Error tracking performance: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user behavior patterns
   */
  async getUserBehaviorPatterns(studentId: string, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get activity patterns
      const activities = await this.activityRepository
        .createQueryBuilder('activity')
        .where('activity.studentId = :studentId', { studentId })
        .andWhere('activity.timestamp >= :startDate', { startDate })
        .andWhere('activity.timestamp <= :endDate', { endDate })
        .orderBy('activity.timestamp', 'ASC')
        .getMany();

      // Get session patterns
      const sessions = await this.sessionRepository
        .createQueryBuilder('session')
        .where('session.studentId = :studentId', { studentId })
        .andWhere('session.startTime >= :startDate', { startDate })
        .andWhere('session.startTime <= :endDate', { endDate })
        .orderBy('session.startTime', 'ASC')
        .getMany();

      // Analyze patterns
      const patterns = this.analyzeBehaviorPatterns(activities, sessions);

      // Cache the analysis
      await this.cacheService.set(
        `behavior_patterns:${studentId}`,
        patterns,
        this.CACHE_TTL * 4, // Cache longer for complex analysis
      );

      return patterns;
    } catch (error) {
      this.logger.error(`Error getting behavior patterns: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get real-time learning metrics
   */
  async getRealTimeMetrics(studentId: string): Promise<any> {
    try {
      const cacheKey = `realtime_metrics:${studentId}`;

      // Try to get from cache first
      let metrics = await this.cacheService.get(cacheKey);

      if (!metrics) {
        // Calculate real-time metrics
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayActivities, activeSession, recentAnalytics] = await Promise.all([
          this.activityRepository
            .createQueryBuilder('activity')
            .where('activity.studentId = :studentId', { studentId })
            .andWhere('activity.timestamp >= :today', { today })
            .getMany(),

          this.sessionRepository.findOne({
            where: {
              studentId,
              status: SessionStatus.ACTIVE,
            },
          }),

          this.analyticsRepository.findOne({
            where: { studentId },
            order: { date: 'DESC' },
          }),
        ]);

        metrics = {
          todayActivities: todayActivities.length,
          totalTimeToday: todayActivities.reduce(
            (sum, activity) => sum + (activity.duration || 0),
            0,
          ),
          activeSession: activeSession
            ? {
                sessionId: activeSession.sessionId,
                startTime: activeSession.startTime,
                duration: activeSession.duration,
              }
            : null,
          lastPerformance: recentAnalytics
            ? {
                engagementScore: recentAnalytics.engagementScore,
                progressPercentage: recentAnalytics.progressPercentage,
                performanceLevel: recentAnalytics.performanceLevel,
              }
            : null,
          timestamp: new Date(),
        };

        // Cache for short time
        await this.cacheService.set(cacheKey, metrics, 60); // 1 minute cache
      }

      return metrics;
    } catch (error) {
      this.logger.error(`Error getting real-time metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async updateSessionActivityCount(sessionId: string): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update()
      .set({ activitiesCount: () => 'activitiesCount + 1' })
      .where('sessionId = :sessionId', { sessionId })
      .execute();
  }

  private async cacheRecentActivity(activity: LearningActivity): Promise<void> {
    const cacheKey = `recent_activities:${activity.studentId}`;
    const existing = (await this.cacheService.get<LearningActivity[]>(cacheKey)) || [];

    existing.unshift(activity);
    if (existing.length > 50) {
      // Keep only last 50 activities
      existing.splice(50);
    }

    await this.cacheService.set(cacheKey, existing, this.CACHE_TTL);
  }

  private analyzeBehaviorPatterns(
    activities: LearningActivity[],
    sessions: LearningSession[],
  ): any {
    const totalActivities = activities.length;
    const totalSessions = sessions.length;

    // Activity type distribution
    const activityTypes = activities.reduce((acc, activity) => {
      acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
      return acc;
    }, {});

    // Time patterns
    const hourlyDistribution = activities.reduce((acc, activity) => {
      const hour = activity.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    // Session patterns
    const avgSessionDuration =
      sessions.length > 0
        ? sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / sessions.length
        : 0;

    // Device usage patterns
    const deviceUsage = activities.reduce((acc, activity) => {
      if (activity.deviceType) {
        acc[activity.deviceType] = (acc[activity.deviceType] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalActivities,
      totalSessions,
      activityTypeDistribution: activityTypes,
      hourlyActivityDistribution: hourlyDistribution,
      averageSessionDuration: avgSessionDuration,
      deviceUsagePattern: deviceUsage,
      mostActiveHour: Object.keys(hourlyDistribution).reduce(
        (a, b) => (hourlyDistribution[a] > hourlyDistribution[b] ? a : b),
        '0',
      ),
      preferredDevice: Object.keys(deviceUsage).reduce(
        (a, b) => (deviceUsage[a] > deviceUsage[b] ? a : b),
        DeviceType.DESKTOP,
      ),
      analysisDate: new Date(),
    };
  }
}

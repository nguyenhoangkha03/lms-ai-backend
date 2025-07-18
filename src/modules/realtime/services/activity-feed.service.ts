import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityFeed, ActivityType, ActivityVisibility } from '../entities/activity-feed.entity';
import { RealtimeEventService } from './realtime-event.service';
import { EventType, EventScope } from '../entities/realtime-event.entity';
import { CreateActivityDto, ActivityFilters } from '../dto/realtime.dto';

@Injectable()
export class ActivityFeedService {
  private readonly logger = new Logger(ActivityFeedService.name);

  constructor(
    @InjectRepository(ActivityFeed)
    private activityRepository: Repository<ActivityFeed>,

    private realtimeEventService: RealtimeEventService,
  ) {}

  async createActivity(createActivityDto: CreateActivityDto): Promise<ActivityFeed> {
    const activity = this.activityRepository.create({
      ...createActivityDto,
      occurredAt: createActivityDto.occurredAt || new Date(),
      importance: this.calculateImportance(createActivityDto.activityType),
    });

    const savedActivity = await this.activityRepository.save(activity);

    // Create real-time event for significant activities
    if (this.shouldBroadcastActivity(savedActivity)) {
      await this.createRealtimeEvent(savedActivity);
    }

    this.logger.log(
      `Activity created: ${savedActivity.activityType} by user ${savedActivity.userId}`,
    );
    return savedActivity;
  }

  async getUserFeed(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      filters?: ActivityFilters;
      includeOwnActivities?: boolean;
    } = {},
  ): Promise<{ activities: ActivityFeed[]; total: number }> {
    const { limit = 20, offset = 0, filters, includeOwnActivities = true } = options;

    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.isVisible = :isVisible', { isVisible: true })
      .orderBy('activity.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    // Visibility rules
    const visibilityConditions = ['activity.visibility = :public'];

    if (includeOwnActivities) {
      visibilityConditions.push('activity.userId = :userId');
    }

    // Add course-based visibility
    visibilityConditions.push(`(
      activity.visibility = :courseMembers AND 
      activity.courseId IN (
        SELECT e.courseId FROM enrollments e WHERE e.userId = :userId
      )
    )`);

    queryBuilder.andWhere(`(${visibilityConditions.join(' OR ')})`, {
      public: ActivityVisibility.PUBLIC,
      courseMembers: ActivityVisibility.COURSE_MEMBERS,
      userId,
    });

    // Apply filters
    if (filters) {
      if (filters.activityTypes?.length) {
        queryBuilder.andWhere('activity.activityType IN (:...activityTypes)', {
          activityTypes: filters.activityTypes,
        });
      }

      if (filters.courseId) {
        queryBuilder.andWhere('activity.courseId = :courseId', {
          courseId: filters.courseId,
        });
      }

      if (filters.dateRange) {
        queryBuilder.andWhere('activity.createdAt BETWEEN :startDate AND :endDate', {
          startDate: filters.dateRange.startDate,
          endDate: filters.dateRange.endDate,
        });
      }

      if (filters.minImportance) {
        queryBuilder.andWhere('activity.importance >= :minImportance', {
          minImportance: filters.minImportance,
        });
      }
    }

    const [activities, total] = await queryBuilder.getManyAndCount();

    return { activities, total };
  }

  async getCourseFeed(
    courseId: string,
    options: {
      limit?: number;
      offset?: number;
      filters?: ActivityFilters;
    } = {},
  ): Promise<{ activities: ActivityFeed[]; total: number }> {
    const { limit = 20, offset = 0, filters } = options;

    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.courseId = :courseId', { courseId })
      .andWhere('activity.isVisible = :isVisible', { isVisible: true })
      .andWhere('activity.visibility IN (:...visibilities)', {
        visibilities: [ActivityVisibility.PUBLIC, ActivityVisibility.COURSE_MEMBERS],
      })
      .orderBy('activity.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (filters?.activityTypes?.length) {
      queryBuilder.andWhere('activity.activityType IN (:...activityTypes)', {
        activityTypes: filters.activityTypes,
      });
    }

    const [activities, total] = await queryBuilder.getManyAndCount();
    return { activities, total };
  }

  async likeActivity(activityId: string, userId: string): Promise<ActivityFeed | null> {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });

    if (!activity) {
      throw new Error('Activity not found');
    }

    const likedBy = activity.likedBy || [];

    if (!likedBy.includes(userId)) {
      likedBy.push(userId);

      await this.activityRepository.update(activityId, {
        likedBy,
        likesCount: likedBy.length,
      });

      // Create real-time event for like
      await this.realtimeEventService.createEvent({
        eventType: EventType.REACTION_ADDED,
        scope: EventScope.USER,
        targetId: activity.userId,
        title: 'Someone liked your activity',
        message: `Your activity "${activity.title}" received a like`,
        triggeredBy: userId,
        payload: {
          activityId,
          reactionType: 'like',
        },
      });
    }

    return await this.activityRepository.findOne({ where: { id: activityId } })!;
  }

  async unlikeActivity(activityId: string, userId: string): Promise<ActivityFeed | null> {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });

    if (!activity) {
      throw new Error('Activity not found');
    }

    const likedBy = (activity.likedBy || []).filter(id => id !== userId);

    await this.activityRepository.update(activityId, {
      likedBy,
      likesCount: likedBy.length,
    });

    return await this.activityRepository.findOne({ where: { id: activityId } })!;
  }

  async deleteActivity(activityId: string, userId: string): Promise<void> {
    const activity = await this.activityRepository.findOne({ where: { id: activityId } });

    if (!activity) {
      throw new Error('Activity not found');
    }

    if (activity.userId !== userId) {
      throw new Error('Unauthorized to delete this activity');
    }

    await this.activityRepository.update(activityId, { isVisible: false });
    this.logger.log(`Activity deleted: ${activityId} by user ${userId}`);
  }

  async getActivityAnalytics(
    dateRange: { startDate: Date; endDate: Date },
    filters?: {
      userId?: string;
      courseId?: string;
      activityTypes?: ActivityType[];
    },
  ): Promise<{
    totalActivities: number;
    activitiesByType: Record<ActivityType, number>;
    activitiesByDay: Array<{ date: string; count: number }>;
    topActiveUsers: Array<{ userId: string; activityCount: number }>;
    engagementStats: {
      totalLikes: number;
      totalComments: number;
      avgLikesPerActivity: number;
    };
  }> {
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .andWhere('activity.isVisible = :isVisible', { isVisible: true });

    if (filters) {
      if (filters.userId) {
        queryBuilder.andWhere('activity.userId = :userId', { userId: filters.userId });
      }

      if (filters.courseId) {
        queryBuilder.andWhere('activity.courseId = :courseId', { courseId: filters.courseId });
      }

      if (filters.activityTypes?.length) {
        queryBuilder.andWhere('activity.activityType IN (:...activityTypes)', {
          activityTypes: filters.activityTypes,
        });
      }
    }

    const activities = await queryBuilder.getMany();

    // Calculate analytics
    const totalActivities = activities.length;

    const activitiesByType = activities.reduce(
      (acc, activity) => {
        acc[activity.activityType] = (acc[activity.activityType] || 0) + 1;
        return acc;
      },
      {} as Record<ActivityType, number>,
    );

    const activitiesByDay = this.groupActivitiesByDay(activities);

    const userActivityCount = activities.reduce(
      (acc, activity) => {
        acc[activity.userId] = (acc[activity.userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topActiveUsers = Object.entries(userActivityCount)
      .map(([userId, activityCount]) => ({ userId, activityCount }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 10);

    const totalLikes = activities.reduce((sum, activity) => sum + activity.likesCount, 0);
    const totalComments = activities.reduce((sum, activity) => sum + activity.commentsCount, 0);
    const avgLikesPerActivity = totalActivities > 0 ? totalLikes / totalActivities : 0;

    return {
      totalActivities,
      activitiesByType,
      activitiesByDay,
      topActiveUsers,
      engagementStats: {
        totalLikes,
        totalComments,
        avgLikesPerActivity,
      },
    };
  }

  async getTrendingActivities(
    options: {
      timeframe?: 'day' | 'week' | 'month';
      limit?: number;
      courseId?: string;
    } = {},
  ): Promise<ActivityFeed[]> {
    const { timeframe = 'week', limit = 10, courseId } = options;

    const timeframeHours = {
      day: 24,
      week: 168,
      month: 720,
    };

    const since = new Date(Date.now() - timeframeHours[timeframe] * 60 * 60 * 1000);

    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .where('activity.createdAt >= :since', { since })
      .andWhere('activity.isVisible = :isVisible', { isVisible: true })
      .orderBy('(activity.likesCount + activity.commentsCount + activity.sharesCount)', 'DESC')
      .limit(limit);

    if (courseId) {
      queryBuilder.andWhere('activity.courseId = :courseId', { courseId });
    }

    return await queryBuilder.getMany();
  }

  private calculateImportance(activityType: ActivityType): number {
    const importanceMap: Record<ActivityType, number> = {
      [ActivityType.CERTIFICATE_EARNED]: 5,
      [ActivityType.COURSE_ENROLLED]: 4,
      [ActivityType.LESSON_COMPLETED]: 3,
      [ActivityType.ASSIGNMENT_SUBMITTED]: 3,
      [ActivityType.QUIZ_COMPLETED]: 3,
      [ActivityType.BADGE_EARNED]: 4,
      [ActivityType.MILESTONE_REACHED]: 4,
      [ActivityType.GOAL_COMPLETED]: 4,
      [ActivityType.STREAK_ACHIEVED]: 3,
      [ActivityType.PROJECT_SHARED]: 3,
      [ActivityType.DISCUSSION_STARTED]: 2,
      [ActivityType.COMMENT_POSTED]: 1,
      [ActivityType.ANSWER_PROVIDED]: 2,
      [ActivityType.QUESTION_ASKED]: 2,
      [ActivityType.GROUP_JOINED]: 2,
      [ActivityType.NOTE_SHARED]: 2,
      [ActivityType.PEER_REVIEW_COMPLETED]: 3,
      [ActivityType.PROFILE_UPDATED]: 1,
      [ActivityType.SETTINGS_CHANGED]: 1,
    };

    return importanceMap[activityType] || 1;
  }

  private shouldBroadcastActivity(activity: ActivityFeed): boolean {
    // Only broadcast high-importance activities
    return activity.importance >= 3 && activity.visibility === ActivityVisibility.PUBLIC;
  }

  private async createRealtimeEvent(activity: ActivityFeed): Promise<void> {
    const eventType = this.mapActivityTypeToEventType(activity.activityType);

    if (eventType) {
      await this.realtimeEventService.createEvent({
        eventType,
        scope: activity.courseId ? EventScope.COURSE : EventScope.GLOBAL,
        targetId: activity.courseId || undefined,
        title: activity.title,
        message: activity.description,
        triggeredBy: activity.userId,
        payload: {
          activityId: activity.id,
          courseId: activity.courseId,
          lessonId: activity.lessonId,
        },
      });
    }
  }

  private mapActivityTypeToEventType(activityType: ActivityType): EventType | null {
    const mapping: Partial<Record<ActivityType, EventType>> = {
      [ActivityType.COURSE_ENROLLED]: EventType.COURSE_ENROLLED,
      [ActivityType.LESSON_COMPLETED]: EventType.LESSON_COMPLETED,
      [ActivityType.ASSIGNMENT_SUBMITTED]: EventType.ASSIGNMENT_SUBMITTED,
      [ActivityType.QUIZ_COMPLETED]: EventType.QUIZ_SUBMITTED,
      [ActivityType.CERTIFICATE_EARNED]: EventType.GRADE_RECEIVED,
      // Map other activity types as needed
    };

    return mapping[activityType] || null;
  }

  private groupActivitiesByDay(activities: ActivityFeed[]): Array<{ date: string; count: number }> {
    const grouped = activities.reduce(
      (acc, activity) => {
        const date = activity.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

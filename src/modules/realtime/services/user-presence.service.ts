import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserPresence, PresenceStatus, ActivityStatus } from '../entities/user-presence.entity';
import { User } from '../../user/entities/user.entity';
import { PresenceFilters } from '../dto/realtime.dto';

@Injectable()
export class UserPresenceService {
  private readonly logger = new Logger(UserPresenceService.name);

  constructor(
    @InjectRepository(UserPresence)
    private presenceRepository: Repository<UserPresence>,

    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async updatePresence(userId: string, updateData: Partial<UserPresence>): Promise<UserPresence> {
    let presence = await this.presenceRepository.findOne({ where: { userId } });

    if (!presence) {
      // Create new presence record
      presence = this.presenceRepository.create({
        userId,
        ...updateData,
        lastSeenAt: new Date(),
      });
    } else {
      // Update existing record
      Object.assign(presence, updateData);
      presence.lastSeenAt = new Date();

      // Update session duration if user is coming online
      if (updateData.isOnline && !presence.isOnline) {
        presence.onlineAt = new Date();
        presence.sessionDuration = 0;
        presence.pageViews = 0;
        presence.interactionCount = 0;
      }
    }

    const savedPresence = await this.presenceRepository.save(presence);

    this.logger.log(`Presence updated for user ${userId}: ${savedPresence.status}`);
    return savedPresence;
  }

  async updateActivity(
    userId: string,
    activityData: {
      activityType: string;
      courseId?: string;
      lessonId?: string;
      progress?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const presence = await this.presenceRepository.findOne({ where: { userId } });

    if (presence) {
      // Update activity details
      presence.activityDetails = {
        ...presence.activityDetails,
        startedAt: presence.activityDetails?.startedAt || new Date(),
        progress: activityData.progress,
        interactionCount: (presence.activityDetails?.interactionCount || 0) + 1,
        metadata: activityData.metadata,
      };

      // Update current context
      if (activityData.courseId) {
        presence.currentCourseId = activityData.courseId;
      }
      if (activityData.lessonId) {
        presence.currentLessonId = activityData.lessonId;
      }

      // Update activity status based on activity type
      presence.activityStatus = this.mapActivityTypeToStatus(activityData.activityType);
      presence.lastActivityAt = new Date();
      presence.interactionCount += 1;

      await this.presenceRepository.save(presence);
    }
  }

  async getOnlineUsers(filters: PresenceFilters = {}): Promise<UserPresence[]> {
    const queryBuilder = this.presenceRepository
      .createQueryBuilder('presence')
      .leftJoinAndSelect('presence.user', 'user')
      .where('presence.isOnline = :isOnline', { isOnline: true })
      .orderBy('presence.lastSeenAt', 'DESC');

    if (filters.courseId) {
      queryBuilder.andWhere('presence.currentCourseId = :courseId', {
        courseId: filters.courseId,
      });
    }

    if (filters.groupId) {
      // This would need additional logic to check group membership
      // For now, just a placeholder
    }

    if (filters.excludeUserId) {
      queryBuilder.andWhere('presence.userId != :excludeUserId', {
        excludeUserId: filters.excludeUserId,
      });
    }

    if (filters.activityStatus) {
      queryBuilder.andWhere('presence.activityStatus = :activityStatus', {
        activityStatus: filters.activityStatus,
      });
    }

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    return await queryBuilder.getMany();
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    return await this.presenceRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async getBulkUserPresence(userIds: string[]): Promise<UserPresence[]> {
    return await this.presenceRepository.find({
      where: { userId: In(userIds) },
      relations: ['user'],
    });
  }

  async getPresenceStatistics(): Promise<{
    totalOnline: number;
    onlineByStatus: Record<PresenceStatus, number>;
    onlineByActivity: Record<ActivityStatus, number>;
    averageSessionDuration: number;
    peakOnlineTime: { hour: number; count: number };
  }> {
    const onlineUsers = await this.presenceRepository.find({
      where: { isOnline: true },
    });

    const totalOnline = onlineUsers.length;

    const onlineByStatus = onlineUsers.reduce(
      (acc, user) => {
        acc[user.status] = (acc[user.status] || 0) + 1;
        return acc;
      },
      {} as Record<PresenceStatus, number>,
    );

    const onlineByActivity = onlineUsers.reduce(
      (acc, user) => {
        acc[user.activityStatus] = (acc[user.activityStatus] || 0) + 1;
        return acc;
      },
      {} as Record<ActivityStatus, number>,
    );

    const averageSessionDuration =
      onlineUsers.length > 0
        ? onlineUsers.reduce((sum, user) => sum + user.sessionDuration, 0) / onlineUsers.length
        : 0;

    // Calculate peak online time (simplified - would use more sophisticated analytics in production)
    const currentHour = new Date().getHours();
    const peakOnlineTime = { hour: currentHour, count: totalOnline };

    return {
      totalOnline,
      onlineByStatus,
      onlineByActivity,
      averageSessionDuration,
      peakOnlineTime,
    };
  }

  async setUserAway(userId: string): Promise<void> {
    await this.updatePresence(userId, {
      status: PresenceStatus.AWAY,
      activityStatus: ActivityStatus.IDLE,
    });
  }

  async setUserBusy(userId: string, statusMessage?: string): Promise<void> {
    await this.updatePresence(userId, {
      status: PresenceStatus.BUSY,
      statusMessage,
    });
  }

  async setUserInvisible(userId: string): Promise<void> {
    await this.updatePresence(userId, {
      status: PresenceStatus.INVISIBLE,
    });
  }

  async updateConnectionInfo(
    userId: string,
    connectionData: {
      socketId: string;
      namespace: string;
      rooms: string[];
    },
  ): Promise<void> {
    const presence = await this.presenceRepository.findOne({ where: { userId } });

    if (presence) {
      const connections = presence.connections || [];
      const existingIndex = connections.findIndex(c => c.socketId === connectionData.socketId);

      if (existingIndex >= 0) {
        connections[existingIndex] = {
          ...connectionData,
          connectedAt: connections[existingIndex].connectedAt,
        };
      } else {
        connections.push({
          ...connectionData,
          connectedAt: new Date(),
        });
      }

      presence.connections = connections;
      await this.presenceRepository.save(presence);
    }
  }

  async removeConnection(userId: string, socketId: string): Promise<void> {
    const presence = await this.presenceRepository.findOne({ where: { userId } });

    if (presence && presence.connections) {
      presence.connections = presence.connections.filter(c => c.socketId !== socketId);
      await this.presenceRepository.save(presence);
    }
  }

  async isUserInCourse(_userId: string, _courseId: string): Promise<boolean> {
    // This would check if user is enrolled in the course
    // Implementation would depend on your enrollment structure
    return true; // Simplified for now
  }

  async isUserInGroup(_userId: string, _groupId: string): Promise<boolean> {
    // This would check if user is member of the group
    // Implementation would depend on your group structure
    return true; // Simplified for now
  }

  async hasUserRole(userId: string, role: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user?.userType === role;
  }

  async getUserContext(_userId: string): Promise<{
    courseIds: string[];
    groupIds: string[];
    roles: string[];
  }> {
    // This would fetch user's courses, groups, and roles
    // Implementation would depend on your data structure
    return {
      courseIds: [], // Would fetch from enrollments
      groupIds: [], // Would fetch from group memberships
      roles: [], // Would fetch from user roles
    };
  }

  // Scheduled cleanup of inactive presence records
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupInactivePresence(): Promise<void> {
    const inactiveThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

    const result = await this.presenceRepository.update(
      {
        isOnline: true,
        lastSeenAt: MoreThan(inactiveThreshold),
      },
      {
        status: PresenceStatus.OFFLINE,
        isOnline: false,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} users as offline due to inactivity`);
    }
  }

  // Update session durations for online users
  @Cron(CronExpression.EVERY_MINUTE)
  async updateSessionDurations(): Promise<void> {
    const onlineUsers = await this.presenceRepository.find({
      where: { isOnline: true },
    });

    for (const presence of onlineUsers) {
      if (presence.onlineAt) {
        const sessionDuration = Math.floor((Date.now() - presence.onlineAt.getTime()) / 1000);

        presence.sessionDuration = sessionDuration;
        await this.presenceRepository.save(presence);
      }
    }
  }

  async getRecentActivity(
    userId: string,
    _limit: number = 10,
  ): Promise<{
    currentActivity?: string;
    recentCourses: string[];
    recentLessons: string[];
    sessionInfo: {
      duration: number;
      pageViews: number;
      interactions: number;
    };
  }> {
    const presence = await this.presenceRepository.findOne({ where: { userId } });

    if (!presence) {
      return {
        recentCourses: [],
        recentLessons: [],
        sessionInfo: { duration: 0, pageViews: 0, interactions: 0 },
      };
    }

    return {
      currentActivity: presence.activityStatus,
      recentCourses: [presence.currentCourseId].filter(Boolean) as string[],
      recentLessons: [presence.currentLessonId].filter(Boolean) as string[],
      sessionInfo: {
        duration: presence.sessionDuration,
        pageViews: presence.pageViews,
        interactions: presence.interactionCount,
      },
    };
  }

  private mapActivityTypeToStatus(activityType: string): ActivityStatus {
    const mapping: Record<string, ActivityStatus> = {
      lesson_viewing: ActivityStatus.STUDYING,
      lesson_started: ActivityStatus.IN_LESSON,
      quiz_taking: ActivityStatus.TAKING_QUIZ,
      chat_messaging: ActivityStatus.IN_CHAT,
      video_call: ActivityStatus.IN_VIDEO_CALL,
      browsing: ActivityStatus.BROWSING,
    };

    return mapping[activityType] || ActivityStatus.IDLE;
  }
}

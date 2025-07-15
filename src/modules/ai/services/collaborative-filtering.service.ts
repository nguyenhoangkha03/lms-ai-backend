// src/modules/ai/services/collaborative-filtering.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { LearningActivity } from '../../analytics/entities/learning-activity.entity';
import { LearningAnalytics } from '../../analytics/entities/learning-analytics.entity';
import { Enrollment } from '../../course/entities/enrollment.entity';
import { CacheService } from '@/cache/cache.service';

export interface UserSimilarity {
  userId: string;
  similarity: number;
  commonInterests: string[];
  sharedActivities: number;
  score: number;
}

export interface CollaborativeRecommendation {
  contentId: string;
  contentType: string;
  score: number;
  supportingUsers: string[];
  reason: string;
}

export interface UserProfile {
  userId: string;
  preferences: {
    subjects: Record<string, number>;
    difficultyLevels: Record<string, number>;
    contentTypes: Record<string, number>;
    studyTimes: Record<string, number>;
  };
  behavior: {
    avgSessionDuration: number;
    completionRate: number;
    engagementScore: number;
    activeDays: number;
  };
  interactions: {
    courses: string[];
    lessons: string[];
    assessments: string[];
    ratings: Record<string, number>;
  };
}

@Injectable()
export class CollaborativeFilteringService {
  private readonly logger = new Logger(CollaborativeFilteringService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,
    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly cacheService: CacheService,
  ) {}

  async findSimilarUsers(userId: string, limit: number = 10): Promise<UserSimilarity[]> {
    this.logger.log(`Finding similar users for: ${userId}`);

    const cacheKey = `similar_users:${userId}`;
    let similarUsers = await this.cacheService.get<UserSimilarity[]>(cacheKey);

    if (!similarUsers) {
      const userProfile = await this.buildUserProfile(userId);
      if (!userProfile) {
        this.logger.warn(`Could not build profile for user: ${userId}`);
        return [];
      }

      const allUsers = await this.userRepository.find({
        where: { isActive: true },
        select: ['id'],
      });

      const candidateUserIds = allUsers.map(u => u.id).filter(id => id !== userId);

      const rawSimilarities = await Promise.all(
        candidateUserIds.map(async candidateId => {
          const candidateProfile = await this.buildUserProfile(candidateId);
          if (!candidateProfile) return null;

          const similarity = this.calculateUserSimilarity(userProfile, candidateProfile);
          return {
            userId: candidateId,
            similarity: similarity.score,
            commonInterests: similarity.commonInterests,
            sharedActivities: similarity.sharedActivities,
          };
        }),
      );

      const similarities: UserSimilarity[] = rawSimilarities.filter(
        (s): s is UserSimilarity => s !== null,
      );

      similarUsers = similarities
        .filter(Boolean)
        .filter(s => s.similarity > 0.1)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      await this.cacheService.set(cacheKey, similarUsers, 6 * 3600);
    }

    return similarUsers;
  }

  async generateCollaborativeRecommendations(
    userId: string,
    _contentType?: string,
    limit: number = 10,
  ): Promise<CollaborativeRecommendation[]> {
    this.logger.log(`Generating collaborative recommendations for: ${userId}`);

    const similarUsers = await this.findSimilarUsers(userId, 20);

    if (similarUsers.length === 0) {
      this.logger.warn(`No similar users found for: ${userId}`);
      return [];
    }

    // const recommendations = await this.getContentFromSimilarUsers(
    //   userId,
    //   similarUsers,
    //   contentType,
    // );
    const recommendations: CollaborativeRecommendation[] = similarUsers.map(user => ({
      contentId: `content-${user.userId}`, // Placeholder for actual content ID from database
      contentType: 'content-type', // Placeholder for actual content type from database
      score: user.similarity,
      supportingUsers: [user.userId],
      reason: `User ${user.userId} has similar interests and has interacted with this content`,
    }));

    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async buildUserProfile(userId: string): Promise<UserProfile | null> {
    const cacheKey = `user_profile:${userId}`;
    let profile = await this.cacheService.get<UserProfile>(cacheKey);

    if (!profile) {
      try {
        // Get user's learning activities from last 90 days
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

        const [activities, analytics, enrollments] = await Promise.all([
          this.activityRepository.find({
            where: {
              studentId: userId,
              timestamp: { $gte: threeMonthsAgo } as any,
            },
            order: { timestamp: 'DESC' },
          }),
          this.analyticsRepository.find({
            where: {
              studentId: userId,
              date: { $gte: threeMonthsAgo } as any,
            },
          }),
          this.enrollmentRepository.find({
            where: { studentId: userId },
            relations: ['course', 'course.category'],
          }),
        ]);

        profile = {
          userId,
          preferences: this.analyzePreferences(activities, enrollments),
          behavior: this.analyzeBehavior(activities, analytics),
          interactions: this.analyzeInteractions(activities, enrollments),
        };

        // Cache for 2 hours
        await this.cacheService.set(cacheKey, profile, 2 * 3600);
      } catch (error) {
        this.logger.error(`Error building user profile for ${userId}:`, error);
        return null;
      }
    }

    return profile;
  }

  private analyzePreferences(
    activities: LearningActivity[],
    enrollments: Enrollment[],
  ): UserProfile['preferences'] {
    const subjects: Record<string, number> = {};
    const difficultyLevels: Record<string, number> = {};
    const contentTypes: Record<string, number> = {};
    const studyTimes: Record<string, number> = {};

    // Analyze subject preferences from enrollments
    enrollments.forEach(enrollment => {
      const subject = enrollment.course?.category?.name || 'Other';
      subjects[subject] = (subjects[subject] || 0) + 1;

      const difficulty = enrollment.course?.level || 'intermediate';
      difficultyLevels[difficulty] = (difficultyLevels[difficulty] || 0) + 1;
    });

    // Analyze content type preferences from activities
    activities.forEach(activity => {
      const hour = activity.timestamp.getHours();
      let timeSlot: string;

      if (hour >= 6 && hour < 12) timeSlot = 'morning';
      else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
      else if (hour >= 18 && hour < 22) timeSlot = 'evening';
      else timeSlot = 'night';

      studyTimes[timeSlot] = (studyTimes[timeSlot] || 0) + 1;
      contentTypes[activity.activityType] = (contentTypes[activity.activityType] || 0) + 1;
    });
    return {
      subjects,
      difficultyLevels,
      contentTypes,
      studyTimes,
    };
  }
  private analyzeBehavior(
    activities: LearningActivity[],
    analytics: LearningAnalytics[],
  ): UserProfile['behavior'] {
    let totalDuration = 0;
    let totalSessions = 0;
    let totalCompletions = 0;
    let totalEngagementScore = 0;
    const activeDays = new Set<string>();

    activities.forEach(activity => {
      totalDuration += activity.duration || 0;

      if (activity.sessionId) totalSessions += 1;

      if (activity.sessionId) totalCompletions += 1;

      const date = new Date(activity.timestamp).toDateString();
      activeDays.add(date);
    });

    analytics.forEach(analytic => {
      totalEngagementScore += analytic.engagementScore || 0;
    });

    const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const completionRate = activities.length > 0 ? totalCompletions / activities.length : 0;
    const engagementScore = analytics.length > 0 ? totalEngagementScore / analytics.length : 0;

    return {
      avgSessionDuration,
      completionRate,
      engagementScore,
      activeDays: activeDays.size,
    };
  }

  private calculateUserSimilarity(
    _userProfile: UserProfile,
    _candidateProfile: UserProfile,
  ): UserSimilarity {
    // const similarity = this.userSimilarityService.calculateSimilarity(
    //   userProfile,
    //   candidateProfile,
    // );
    return { userId: '1', similarity: 0.8, commonInterests: [], sharedActivities: 5, score: 0.9 }; // Placeholder for actual similarity calculation
  }

  //   private getContentFromSimilarUsers(
  //     userId: string,
  //     similarUsers: UserSimilarity[],
  //     contentType?: string,
  //   ): Promise<CollaborativeRecommendation[]> {
  //     this.logger.log(`Fetching content from similar users for: ${userId}`);

  //     const contentRepository = this.contentRepositoryService.getContentRepository(contentType);
  //     const recommendations: CollaborativeRecommendation[] = [];

  //     return Promise.all(
  //       similarUsers.map(async user => {
  //         const userContent = await contentRepository.find({
  //           where: { userId: user.userId, isActive: true },
  //           order: { createdAt: 'DESC' },
  //         });

  //         userContent.forEach(content => {
  //           const existingRecommendation = recommendations.find(
  //             r => r.contentId === content.id && r.contentType === content.type,
  //           );

  //           if (existingRecommendation) {
  //             existingRecommendation.score += user.similarity;
  //             existingRecommendation.supportingUsers.push(user.userId);
  //           } else {
  //             recommendations.push({
  //               contentId: content.id,
  //               contentType: content.type,
  //               score: user.similarity,
  //               supportingUsers: [user.userId],
  //               reason: `Recommended based on similarity with user ${user.userId}`,
  //             });
  //           }
  //         });
  //       }),
  //     ).then(() => recommendations);
  //   }

  private analyzeInteractions(
    activities: LearningActivity[],
    _enrollments: Enrollment[],
  ): UserProfile['interactions'] {
    const courses = new Set<string>();
    const lessons = new Set<string>();
    const assessments = new Set<string>();
    const ratings: Record<string, number> = {};

    activities.forEach(activity => {
      if (activity.courseId) courses.add(activity.courseId);
      if (activity.lessonId) lessons.add(activity.lessonId);
      if (activity.assessmentId) assessments.add(activity.assessmentId);

      if (activity.id) {
        ratings[activity.id] = (ratings[activity.id] || 0) + 1;
      }
    });

    return {
      courses: Array.from(courses),
      lessons: Array.from(lessons),
      assessments: Array.from(assessments),
      ratings,
    };
  }
}

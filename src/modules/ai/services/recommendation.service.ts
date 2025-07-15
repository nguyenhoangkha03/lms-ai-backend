// src/modules/ai/services/recommendation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AIRecommendation } from '../entities/ai-recommendation.entity';
import { LearningActivity } from '../../analytics/entities/learning-activity.entity';
import { LearningAnalytics } from '../../analytics/entities/learning-analytics.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';
import { User } from '../../user/entities/user.entity';
import { Enrollment } from '../../course/entities/enrollment.entity';
import { RecommendationType, RecommendationStatus, Priority } from '@/common/enums/ai.enums';
import { GetRecommendationsDto } from '../dto/recommendation.dto';
import { CacheService } from '@/cache/cache.service';
import { ActivityType } from '@/common/enums/analytics.enums';

export interface LearningProfile {
  userId: string;
  preferredTimeSlots: string[];
  avgSessionDuration: number;
  difficultyPreference: 'easy' | 'medium' | 'hard' | 'adaptive';
  learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
  pace: 'slow' | 'normal' | 'fast';
  strongSubjects: string[];
  weakSubjects: string[];
  engagementScore: number;
  completionRate: number;
  retentionRate: number;
}

export interface ContentSimilarity {
  contentId: string;
  similarity: number;
  type: 'course' | 'lesson' | 'assessment';
  tags: string[];
  difficulty: number;
  duration: number;
}

export interface CollaborativeFiltering {
  userId: string;
  similarUsers: string[];
  recommendations: {
    contentId: string;
    score: number;
    reason: string;
  }[];
}

export type CollaborativeContent = {
  contentId: string;
  type: string;
  userCount: number;
  score: number;
};

export type StudySession = {
  start: Date;
  end: Date;
  duration: number;
};

export type StudySession1 = {
  startTime: number;
  endTime: number;
  duration: number;
  activities: LearningActivity[];
};

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(AIRecommendation)
    private readonly recommendationRepository: Repository<AIRecommendation>,
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,
    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,
    @InjectRepository(Course)
    private readonly _courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Assessment)
    private readonly _assessmentRepository: Repository<Assessment>,
    @InjectRepository(User)
    private readonly _userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly cacheService: CacheService,
  ) {}

  // ================== LEARNING PATH PERSONALIZATION ==================
  async generatePersonalizedLearningPath(userId: string): Promise<AIRecommendation[]> {
    try {
      this.logger.log(`Generating personalized learning path for user: ${userId}`);

      const learningProfile = await this.generateLearningProfile(userId);
      const _userEnrollments = await this.getUserEnrollments(userId);
      const userProgress = await this.getUserProgress(userId);

      const recommendations: AIRecommendation[] = [];

      const nextLessonRecs = await this.generateNextLessonRecommendations(
        userId,
        learningProfile,
        userProgress,
      );
      recommendations.push(...nextLessonRecs);

      const reviewRecs = await this.generateReviewRecommendations(userId, learningProfile);
      recommendations.push(...reviewRecs);

      const courseRecs = await this.generateCourseRecommendations(userId, learningProfile);
      recommendations.push(...courseRecs);

      const skillRecs = await this.generateSkillImprovementRecommendations(userId, learningProfile);
      recommendations.push(...skillRecs);

      // Save recommendations to database
      await this.saveRecommendations(recommendations);

      return recommendations;
    } catch (error) {
      this.logger.error(`Error generating learning path for user ${userId}:`, error);
      throw error;
    }
  }

  private async generateLearningProfile(userId: string): Promise<LearningProfile> {
    const cacheKey = `learning_profile:${userId}`;
    let profile = await this.cacheService.get<LearningProfile>(cacheKey);

    if (!profile) {
      // Get user's learning activities from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activities = await this.activityRepository.find({
        where: {
          studentId: userId,
          timestamp: MoreThan(thirtyDaysAgo),
        },
        order: { timestamp: 'DESC' },
      });

      const analytics = await this.analyticsRepository.find({
        where: {
          studentId: userId,
          date: MoreThan(thirtyDaysAgo),
        },
      });

      profile = await this.analyzeLearningProfile(userId, activities, analytics);
      await this.cacheService.set(cacheKey, profile, 3600); // Cache for 1 hour
    }

    return profile;
  }

  private async analyzeLearningProfile(
    userId: string,
    activities: LearningActivity[],
    analytics: LearningAnalytics[],
  ): Promise<LearningProfile> {
    // Analyze preferred time slots
    const timeSlots = this.analyzePreferredTimeSlots(activities);

    // Calculate average session duration
    const avgSessionDuration = this.calculateAverageSessionDuration(activities);

    // Determine learning style based on content interaction
    const learningStyle = this.determineLearningStyle(activities);

    // Calculate engagement metrics
    const engagementScore = this.calculateEngagementScore(activities, analytics);

    // Analyze pace preference
    const pace = this.analyzeLearningPace(activities);

    // Identify strong and weak subjects
    const { strongSubjects, weakSubjects } = await this.analyzeSubjectPerformance(userId);

    // Calculate completion and retention rates
    const completionRate = this.calculateCompletionRate(analytics);
    const retentionRate = this.calculateRetentionRate(activities);

    return {
      userId,
      preferredTimeSlots: timeSlots,
      avgSessionDuration,
      difficultyPreference: 'adaptive',
      learningStyle,
      pace,
      strongSubjects,
      weakSubjects,
      engagementScore,
      completionRate,
      retentionRate,
    };
  }

  private analyzePreferredTimeSlots(activities: LearningActivity[]): string[] {
    const timeSlotCounts: Record<string, number> = {};

    activities.forEach(activity => {
      const hour = activity.timestamp.getHours();
      let timeSlot: string;

      if (hour >= 6 && hour < 12) timeSlot = 'morning';
      else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
      else if (hour >= 18 && hour < 22) timeSlot = 'evening';
      else timeSlot = 'night';

      timeSlotCounts[timeSlot] = (timeSlotCounts[timeSlot] || 0) + 1;
    });

    return Object.entries(timeSlotCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([slot]) => slot);
  }

  private calculateAverageSessionDuration(activities: LearningActivity[]): number {
    const sessionDurations: number[] = activities
      .map(a => a.duration)
      .filter((d): d is number => typeof d === 'number' && d > 0);

    if (sessionDurations.length === 0) return 30;

    return sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length;
  }

  private determineLearningStyle(activities: LearningActivity[]): LearningProfile['learningStyle'] {
    const styleCounts = {
      visual: 0,
      auditory: 0,
      reading: 0,
      kinesthetic: 0,
    };

    activities.forEach(activity => {
      switch (activity.activityType) {
        case ActivityType.VIDEO_PLAY:
        case ActivityType.VIDEO_COMPLETE:
          styleCounts.visual++;
          break;
        case ActivityType.LESSON_START:
        case ActivityType.LESSON_COMPLETE:
          styleCounts.reading++;
          break;
        case ActivityType.QUIZ_START:
        case ActivityType.QUIZ_COMPLETE:
          styleCounts.kinesthetic++;
          break;
        case ActivityType.DISCUSSION_POST:
        case ActivityType.CHAT_MESSAGE:
          styleCounts.auditory++;
          break;
      }
    });

    const dominantStyle = Object.entries(styleCounts).sort(
      ([, a], [, b]) => b - a,
    )[0][0] as LearningProfile['learningStyle'];

    const total = Object.values(styleCounts).reduce((sum, count) => sum + count, 0);
    const dominantCount = styleCounts[dominantStyle];

    return dominantCount / total < 0.4 ? 'mixed' : dominantStyle;
  }

  private calculateEngagementScore(
    activities: LearningActivity[],
    analytics: LearningAnalytics[],
  ): number {
    let score = 0;
    const weights = {
      sessionFrequency: 0.3,
      completionRate: 0.3,
      interactionDiversity: 0.2,
      timeSpent: 0.2,
    };

    // Session frequency (how often user studies)
    const daysWithActivity = new Set(activities.map(a => a.timestamp.toDateString())).size;
    const sessionFrequencyScore = Math.min(daysWithActivity / 30, 1);

    // Completion rate from analytics
    const completionRate =
      analytics.length > 0
        ? analytics.reduce((sum, a) => sum + (a.lessonsCompleted || 0), 0) / analytics.length
        : 0;

    // Interaction diversity
    const uniqueActivityTypes = new Set(activities.map(a => a.activityType)).size;
    const interactionDiversityScore = Math.min(uniqueActivityTypes / 10, 1);

    // Time spent
    const totalTimeSpent = analytics.reduce((sum, a) => sum + (a.totalTimeSpent || 0), 0);
    const timeSpentScore = Math.min(totalTimeSpent / (30 * 3600), 1); // Normalize to 1 hour/day

    score =
      sessionFrequencyScore * weights.sessionFrequency +
      completionRate * weights.completionRate +
      interactionDiversityScore * weights.interactionDiversity +
      timeSpentScore * weights.timeSpent;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  private analyzeLearningPace(activities: LearningActivity[]): LearningProfile['pace'] {
    const lessonActivities = activities.filter(
      a => a.activityType === ActivityType.LESSON_COMPLETE && a.duration,
    );

    if (lessonActivities.length === 0) return 'normal';

    const avgLessonTime =
      lessonActivities.reduce((sum, a) => sum + a.duration!, 0) / lessonActivities.length;

    if (avgLessonTime < 15 * 60) return 'fast'; // Less than 15 minutes
    if (avgLessonTime > 45 * 60) return 'slow'; // More than 45 minutes
    return 'normal';
  }

  private async analyzeSubjectPerformance(userId: string): Promise<{
    strongSubjects: string[];
    weakSubjects: string[];
  }> {
    // Get user's assessment performance by subject/category
    const query = `
      SELECT 
        c.title as subject,
        AVG(aa.score) as avg_score,
        COUNT(aa.id) as attempt_count
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessmentId = a.id
      JOIN lessons l ON a.lessonId = l.id
      JOIN courses c ON l.courseId = c.id
      WHERE aa.studentId = ?
      GROUP BY c.id, c.title
      HAVING attempt_count >= 3
      ORDER BY avg_score DESC
    `;

    const results = await this.recommendationRepository.query(query, [userId]);

    const strongSubjects = results
      .filter((r: any) => r.avg_score >= 80)
      .slice(0, 3)
      .map((r: any) => r.subject);

    const weakSubjects = results
      .filter((r: any) => r.avg_score < 60)
      .slice(-3)
      .map((r: any) => r.subject);

    return { strongSubjects, weakSubjects };
  }

  private calculateCompletionRate(analytics: LearningAnalytics[]): number {
    if (analytics.length === 0) return 0;

    const totalProgress = analytics.reduce((sum, a) => sum + (a.progressPercentage || 0), 0);
    return totalProgress / (analytics.length * 100);
  }

  private calculateRetentionRate(activities: LearningActivity[]): number {
    // Simple retention calculation: return visits after first visit
    const uniqueDays = new Set(activities.map(a => a.timestamp.toDateString()));
    const totalDays = uniqueDays.size;
    const expectedDays = Math.min(
      Math.floor(
        (Date.now() - Math.min(...activities.map(a => a.timestamp.getTime()))) /
          (24 * 60 * 60 * 1000),
      ),
      30,
    );

    return expectedDays > 0 ? totalDays / expectedDays : 0;
  }

  // ================== CONTENT RECOMMENDATION ALGORITHM ==================
  async generateContentRecommendations(
    userId: string,
    options?: { type?: 'course' | 'lesson' | 'assessment'; limit?: number },
  ): Promise<AIRecommendation[]> {
    const { type, limit = 10 } = options || {};

    const learningProfile = await this.generateLearningProfile(userId);

    // Hybrid approach: Content-based + Collaborative filtering
    const contentBasedRecs = await this.generateContentBasedRecommendations(
      userId,
      learningProfile,
      type,
    );
    const collaborativeRecs = await this.generateCollaborativeRecommendations(userId, type);

    // Combine and rank recommendations
    const combinedRecs = this.combineRecommendations(
      contentBasedRecs,
      collaborativeRecs,
      learningProfile,
    );

    return combinedRecs.slice(0, limit);
  }

  private async generateContentBasedRecommendations(
    userId: string,
    _profile: LearningProfile,
    type?: string,
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Get user's interaction history
    const userHistory = await this.getUserContentHistory(userId);

    // Find similar content based on tags, category, difficulty
    const similarContent = await this.findSimilarContent(userHistory, type);

    for (const content of similarContent.slice(0, 5)) {
      const recommendation = this.createRecommendation({
        studentId: userId,
        recommendationType: this.getRecommendationTypeForContent(content.type),
        contentId: content.contentId,
        contentType: content.type,
        title: `Recommended ${content.type}: ${await this.getContentTitle(content.contentId, content.type)}`,
        description: `Based on your learning patterns and interests`,
        reason: `Similar to content you've engaged with. Similarity score: ${(content.similarity * 100).toFixed(1)}%`,
        confidenceScore: content.similarity,
        priority: content.similarity > 0.8 ? Priority.HIGH : Priority.MEDIUM,
        metadata: {
          algorithmUsed: 'content_based',
          tags: content.tags,
          difficultyLevel: this.mapDifficultyLevel(content.difficulty),
          estimatedDuration: content.duration,
        },
      });

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async generateCollaborativeRecommendations(
    userId: string,
    type?: string,
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    const similarUsers = await this.findSimilarUsers(userId);

    const collaborativeContent = await this.getCollaborativeContent(userId, similarUsers, type);

    for (const content of collaborativeContent.slice(0, 5)) {
      const recommendation = this.createRecommendation({
        studentId: userId,
        recommendationType: this.getRecommendationTypeForContent(content.type),
        contentId: content.contentId,
        contentType: content.type,
        title: `Popular ${content.type}: ${await this.getContentTitle(content.contentId, content.type)}`,
        description: `Recommended based on learners with similar interests`,
        reason: `${content.userCount} similar learners found this helpful`,
        confidenceScore: Math.min(content.score, 1),
        priority: content.score > 0.7 ? Priority.HIGH : Priority.MEDIUM,
        metadata: {
          algorithmUsed: 'collaborative_filtering',
          similarUsersCount: similarUsers.length,
          engagementScore: content.score,
        },
      });

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  // ================== ADAPTIVE LEARNING DIFFICULTY ADJUSTMENT ==================
  async generateDifficultyAdjustments(userId: string): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    const _profile = await this.generateLearningProfile(userId);

    // Analyze recent performance
    const recentPerformance = await this.analyzeRecentPerformance(userId);

    for (const subject of recentPerformance) {
      if (subject.needsAdjustment) {
        const recommendation = this.createRecommendation({
          studentId: userId,
          recommendationType: RecommendationType.DIFFICULTY_ADJUSTMENT,
          contentId: subject.courseId,
          contentType: 'course',
          title: `Difficulty Adjustment for ${subject.courseName}`,
          description:
            subject.adjustmentType === 'increase'
              ? 'Ready for more challenging content'
              : 'Suggested review of fundamentals',
          reason: subject.reason,
          confidenceScore: subject.confidence,
          priority: subject.adjustmentType === 'decrease' ? Priority.HIGH : Priority.MEDIUM,
          metadata: {
            currentDifficulty: subject.currentDifficulty,
            suggestedDifficulty: subject.suggestedDifficulty,
            adjustmentType: subject.adjustmentType,
            performanceScore: subject.performanceScore,
          },
        });

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private async analyzeRecentPerformance(userId: string): Promise<
    Array<{
      courseId: string;
      courseName: string;
      currentDifficulty: string;
      suggestedDifficulty: string;
      adjustmentType: 'increase' | 'decrease' | 'maintain';
      performanceScore: number;
      confidence: number;
      reason: string;
      needsAdjustment: boolean;
    }>
  > {
    const query = `
      SELECT 
        c.id as courseId,
        c.title as courseName,
        c.difficultyLevel as currentDifficulty,
        AVG(aa.score) as avgScore,
        COUNT(aa.id) as attemptCount,
        AVG(aa.timeSpent) as avgTimeSpent
      FROM enrollments e
      JOIN courses c ON e.courseId = c.id
      LEFT JOIN lessons l ON c.id = l.courseId
      LEFT JOIN assessments a ON l.id = a.lessonId
      LEFT JOIN assessment_attempts aa ON a.id = aa.assessmentId AND aa.studentId = e.studentId
      WHERE e.studentId = ? AND e.status = 'active'
      GROUP BY c.id, c.title, c.difficultyLevel
      HAVING attemptCount >= 3
    `;

    const results = await this.recommendationRepository.query(query, [userId]);

    return results.map((result: any) => {
      const performanceScore = result.avgScore || 0;
      let adjustmentType: 'increase' | 'decrease' | 'maintain' = 'maintain';
      let suggestedDifficulty = result.currentDifficulty;
      let reason = '';
      let confidence = 0;

      // Performance-based adjustment logic
      if (performanceScore >= 85 && result.avgTimeSpent < 30 * 60) {
        adjustmentType = 'increase';
        suggestedDifficulty = this.getNextDifficultyLevel(result.currentDifficulty);
        reason = `Consistently high performance (${performanceScore.toFixed(1)}%) with quick completion times suggests readiness for more challenging content.`;
        confidence = 0.8;
      } else if (performanceScore < 60) {
        adjustmentType = 'decrease';
        suggestedDifficulty = this.getPreviousDifficultyLevel(result.currentDifficulty);
        reason = `Low performance score (${performanceScore.toFixed(1)}%) indicates difficulty with current level. Review of fundamentals recommended.`;
        confidence = 0.9;
      } else if (performanceScore >= 70 && performanceScore < 85) {
        reason = `Good performance (${performanceScore.toFixed(1)}%). Current difficulty level is appropriate.`;
        confidence = 0.7;
      }

      return {
        courseId: result.courseId,
        courseName: result.courseName,
        currentDifficulty: result.currentDifficulty,
        suggestedDifficulty,
        adjustmentType,
        performanceScore,
        confidence,
        reason,
        needsAdjustment: adjustmentType !== 'maintain',
      };
    });
  }

  // ================== STUDY SCHEDULE OPTIMIZATION ==================
  async generateStudyScheduleOptimization(userId: string): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    const profile = await this.generateLearningProfile(userId);

    // Analyze current study patterns
    const studyPatterns = await this.analyzeStudyPatterns(userId);

    // Generate schedule recommendations
    const scheduleRec = this.createRecommendation({
      studentId: userId,
      recommendationType: RecommendationType.STUDY_SCHEDULE,
      title: 'Optimized Study Schedule',
      description: 'Personalized study schedule based on your learning patterns',
      reason: this.generateScheduleReason(profile, studyPatterns),
      confidenceScore: 0.8,
      priority: Priority.MEDIUM,
      metadata: {
        preferredTimes: profile.preferredTimeSlots,
        optimalSessionDuration: this.calculateOptimalSessionDuration(profile),
        recommendedFrequency: this.calculateRecommendedFrequency(profile),
        breakSuggestions: this.generateBreakSuggestions(profile),
        studyTips: this.generateStudyTips(profile),
      },
    });

    recommendations.push(scheduleRec);

    // Generate break suggestions if needed
    if (studyPatterns.needsBreaks) {
      const breakRec = this.createRecommendation({
        studentId: userId,
        recommendationType: RecommendationType.BREAK_SUGGESTION,
        title: 'Study Break Recommendation',
        description: 'Take a break to optimize learning retention',
        reason: studyPatterns.breakReason,
        confidenceScore: 0.7,
        priority: Priority.MEDIUM,
        metadata: {
          breakDuration: studyPatterns.suggestedBreakDuration,
          breakType: studyPatterns.suggestedBreakType,
        },
      });

      recommendations.push(breakRec);
    }

    return recommendations;
  }

  // ================== PERFORMANCE IMPROVEMENT SUGGESTIONS ==================
  async generatePerformanceImprovements(userId: string): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    const _profile = await this.generateLearningProfile(userId);

    // Analyze weak areas
    const weakAreas = await this.identifyWeakAreas(userId);

    for (const area of weakAreas) {
      const improvementRec = this.createRecommendation({
        studentId: userId,
        recommendationType: RecommendationType.SKILL_IMPROVEMENT,
        contentId: area.contentId,
        contentType: area.contentType,
        title: `Improve ${area.skillName}`,
        description: area.improvementStrategy,
        reason: area.analysisReason,
        confidenceScore: area.confidence,
        priority: area.urgency,
        metadata: {
          currentLevel: area.currentLevel,
          targetLevel: area.targetLevel,
          estimatedTimeToImprove: area.estimatedTime,
          recommendedActions: area.actions,
          resources: area.resources,
        },
      });

      recommendations.push(improvementRec);
    }

    return recommendations;
  }

  // ================== HELPER METHODS ==================
  private async getUserEnrollments(userId: string) {
    return this.enrollmentRepository.find({
      where: { studentId: userId, status: 'active' },
      relations: ['course'],
    } as any);
  }

  private async getUserProgress(_userId: string) {
    // This would typically fetch from lesson_progress table
    // For now, simplified implementation
    return [];
  }

  private createRecommendation(data: Partial<AIRecommendation>): AIRecommendation {
    const recommendation = new AIRecommendation();
    Object.assign(recommendation, {
      ...data,
      status: RecommendationStatus.PENDING,
      createdAt: new Date(),
    });
    return recommendation;
  }

  private async saveRecommendations(recommendations: AIRecommendation[]): Promise<void> {
    await this.recommendationRepository.save(recommendations);
    this.logger.log(`Saved ${recommendations.length} recommendations`);
  }

  // Additional helper methods for content similarity, user similarity, etc.
  private async getUserContentHistory(_userId: string) {
    // Implementation for getting user's content interaction history
    return [];
  }

  private async findSimilarContent(
    _userHistory: any[],
    _type?: string,
  ): Promise<ContentSimilarity[]> {
    // Implementation for content-based similarity
    return [];
  }

  private async findSimilarUsers(_userId: string): Promise<string[]> {
    // Implementation for finding similar users
    return [];
  }

  private async getCollaborativeContent(
    _userId: string,
    _similarUsers: string[],
    _type?: string,
  ): Promise<CollaborativeContent[]> {
    // Implementation for collaborative filtering
    return [];
  }

  private combineRecommendations(
    contentBased: AIRecommendation[],
    collaborative: AIRecommendation[],
    _profile: LearningProfile,
  ): AIRecommendation[] {
    // Implementation for combining and ranking recommendations
    return [...contentBased, ...collaborative];
  }

  // More helper methods...
  private getRecommendationTypeForContent(type: string): RecommendationType {
    switch (type) {
      case 'course':
        return RecommendationType.COURSE_RECOMMENDATION;
      case 'lesson':
        return RecommendationType.NEXT_LESSON;
      case 'assessment':
        return RecommendationType.PRACTICE_QUIZ;
      default:
        return RecommendationType.SUPPLEMENTARY_MATERIAL;
    }
  }

  private async getContentTitle(_contentId: string, _type: string): Promise<string> {
    // Implementation to get content title
    return 'Content Title';
  }

  private mapDifficultyLevel(difficulty: number): string {
    if (difficulty < 0.3) return 'easy';
    if (difficulty < 0.7) return 'medium';
    return 'hard';
  }

  private getNextDifficultyLevel(current: string): string {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const index = levels.indexOf(current);
    return index < levels.length - 1 ? levels[index + 1] : current;
  }

  private getPreviousDifficultyLevel(current: string): string {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const index = levels.indexOf(current);
    return index > 0 ? levels[index - 1] : current;
  }

  private async analyzeStudyPatterns(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivities = await this.activityRepository.find({
      where: {
        studentId: userId,
        timestamp: MoreThan(sevenDaysAgo),
      },
      order: { timestamp: 'ASC' },
    });

    // Analyze study sessions
    const sessions = this.groupActivitiesIntoSessions(recentActivities);
    const avgSessionLength = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length;
    const longestSession = Math.max(...sessions.map(s => s.duration));

    const needsBreaks = avgSessionLength > 120 * 60 || longestSession > 180 * 60; // 2-3 hours

    return {
      needsBreaks,
      breakReason: needsBreaks
        ? `Your average study session is ${Math.round(avgSessionLength / 60)} minutes. Studies show that taking breaks every 90-120 minutes improves retention.`
        : '',
      suggestedBreakDuration: 15, // minutes
      suggestedBreakType: 'active', // or 'passive'
    };
  }

  private groupActivitiesIntoSessions(activities: LearningActivity[]): StudySession1[] {
    const sessions: StudySession1[] = [];
    let currentSession: StudySession1 | null = null;
    const SESSION_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    for (const activity of activities) {
      if (
        !currentSession ||
        activity.timestamp.getTime() - currentSession.endTime > SESSION_GAP_THRESHOLD
      ) {
        currentSession = {
          startTime: activity.timestamp.getTime(),
          endTime: activity.timestamp.getTime(),
          duration: 0,
          activities: [activity],
        };
        sessions.push(currentSession);
      } else {
        // Continue current session
        currentSession.endTime = activity.timestamp.getTime();
        currentSession.activities.push(activity);
      }
    }

    // Calculate durations
    sessions.forEach(session => {
      session.duration = (session.endTime - session.startTime) / 1000; // in seconds
    });

    return sessions;
  }

  private generateScheduleReason(profile: LearningProfile, _patterns: any): string {
    const timeSlotText = profile.preferredTimeSlots.join(' and ');
    const paceText =
      profile.pace === 'fast'
        ? 'shorter, focused'
        : profile.pace === 'slow'
          ? 'longer, detailed'
          : 'moderate';

    return `Based on your learning patterns, you're most productive during ${timeSlotText} sessions. Your learning pace suggests ${paceText} study sessions work best for you.`;
  }

  private calculateOptimalSessionDuration(profile: LearningProfile): number {
    // Base duration on user's pace and average session duration
    let optimal = profile.avgSessionDuration;

    if (profile.pace === 'fast') optimal = Math.min(optimal, 45 * 60); // Max 45 min
    if (profile.pace === 'slow') optimal = Math.max(optimal, 60 * 60); // Min 60 min

    return Math.round(optimal / 60); // Return in minutes
  }

  private calculateRecommendedFrequency(profile: LearningProfile): string {
    if (profile.engagementScore > 0.8) return 'daily';
    if (profile.engagementScore > 0.6) return '5-6 times per week';
    if (profile.engagementScore > 0.4) return '3-4 times per week';
    return '2-3 times per week';
  }

  private generateBreakSuggestions(profile: LearningProfile): string[] {
    const suggestions = [
      'Take a 5-10 minute walk',
      'Do some light stretching',
      'Practice deep breathing exercises',
    ];

    if (profile.learningStyle === 'visual') {
      suggestions.push('Look away from screen and focus on distant objects');
    }

    if (profile.engagementScore < 0.5) {
      suggestions.push('Try the Pomodoro Technique (25 min study, 5 min break)');
    }

    return suggestions;
  }

  private generateStudyTips(profile: LearningProfile): string[] {
    const tips: string[] = [];

    switch (profile.learningStyle) {
      case 'visual':
        tips.push('Use diagrams, charts, and visual aids', 'Create mind maps for complex topics');
        break;
      case 'auditory':
        tips.push('Read content aloud', 'Use text-to-speech features', 'Discuss topics with peers');
        break;
      case 'reading':
        tips.push('Take detailed notes', 'Summarize content in your own words');
        break;
      case 'kinesthetic':
        tips.push(
          'Use interactive quizzes frequently',
          'Apply concepts through practice exercises',
        );
        break;
      case 'mixed':
        tips.push('Combine multiple learning methods', 'Vary your study techniques');
        break;
    }

    if (profile.pace === 'fast') {
      tips.push('Review material multiple times for better retention');
    }

    if (profile.completionRate < 0.7) {
      tips.push('Set small, achievable daily goals', 'Use progress tracking tools');
    }

    return tips;
  }

  private async identifyWeakAreas(userId: string) {
    const query = `
      SELECT 
        c.id as contentId,
        'course' as contentType,
        c.title as skillName,
        AVG(aa.score) as avgScore,
        COUNT(aa.id) as attemptCount,
        COUNT(CASE WHEN aa.score < 60 THEN 1 END) as failedAttempts,
        MAX(aa.createdAt) as lastAttempt
      FROM enrollments e
      JOIN courses c ON e.courseId = c.id
      JOIN lessons l ON c.id = l.courseId
      JOIN assessments a ON l.id = a.lessonId
      JOIN assessment_attempts aa ON a.id = aa.assessmentId
      WHERE e.studentId = ? AND aa.studentId = ?
      GROUP BY c.id, c.title
      HAVING attemptCount >= 2 AND avgScore < 70
      ORDER BY avgScore ASC, failedAttempts DESC
      LIMIT 5
    `;

    const results = await this.recommendationRepository.query(query, [userId, userId]);

    return results.map((result: any) => {
      const currentLevel = this.scoreToLevel(result.avgScore);
      const targetLevel = this.getNextLevel(currentLevel);

      return {
        contentId: result.contentId,
        contentType: result.contentType,
        skillName: result.skillName,
        currentLevel,
        targetLevel,
        confidence: 0.85,
        urgency: result.avgScore < 50 ? Priority.HIGH : Priority.MEDIUM,
        analysisReason: `Your average score in ${result.skillName} is ${result.avgScore.toFixed(1)}% with ${result.failedAttempts} failed attempts out of ${result.attemptCount} total attempts.`,
        improvementStrategy: this.generateImprovementStrategy(
          result.avgScore,
          result.failedAttempts,
        ),
        estimatedTime: this.estimateImprovementTime(result.avgScore, targetLevel),
        actions: this.generateImprovementActions(result.avgScore),
        resources: this.suggestResources(result.skillName, currentLevel),
      };
    });
  }

  private scoreToLevel(score: number): string {
    if (score >= 90) return 'expert';
    if (score >= 80) return 'advanced';
    if (score >= 70) return 'intermediate';
    if (score >= 60) return 'beginner';
    return 'novice';
  }

  private getNextLevel(currentLevel: string): string {
    const levels = ['novice', 'beginner', 'intermediate', 'advanced', 'expert'];
    const index = levels.indexOf(currentLevel);
    return index < levels.length - 1 ? levels[index + 1] : currentLevel;
  }

  private generateImprovementStrategy(avgScore: number, failedAttempts: number): string {
    if (avgScore < 50) {
      return 'Focus on fundamental concepts and complete review materials before attempting advanced topics.';
    } else if (failedAttempts > 2) {
      return 'Practice more examples and seek additional explanations for challenging concepts.';
    } else {
      return 'Review specific areas where you lost points and practice similar problems.';
    }
  }

  private estimateImprovementTime(currentScore: number, targetLevel: string): number {
    const scoreDiff = this.levelToMinScore(targetLevel) - currentScore;
    return Math.max(Math.ceil(scoreDiff / 10) * 7, 7); // At least 1 week
  }

  private levelToMinScore(level: string): number {
    const scores = { novice: 0, beginner: 60, intermediate: 70, advanced: 80, expert: 90 };
    return scores[level] || 0;
  }

  private generateImprovementActions(score: number): string[] {
    const actions: string[] = [];

    if (score < 60) {
      actions.push(
        'Review fundamental concepts',
        'Complete prerequisite materials',
        'Seek help from instructor or tutor',
      );
    } else {
      actions.push('Practice more exercises', 'Review incorrect answers', 'Study similar problems');
    }

    actions.push('Take practice quizzes regularly');
    return actions;
  }

  private suggestResources(skillName: string, level: string): string[] {
    return [
      `${level}-level practice exercises for ${skillName}`,
      `Video tutorials on ${skillName} fundamentals`,
      `Interactive simulations for ${skillName}`,
      `Study group discussions on ${skillName}`,
    ];
  }

  // ================== NEXT LESSON RECOMMENDATIONS ==================
  private async generateNextLessonRecommendations(
    userId: string,
    profile: LearningProfile,
    _progress: any[],
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Get user's current enrollments and progress
    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: userId, status: 'active' },
      relations: ['course', 'course.sections', 'course.sections.lessons'],
    } as any);

    for (const enrollment of enrollments) {
      const nextLesson = await this.findNextLessonForCourse(userId, enrollment.course.id);

      if (nextLesson) {
        const recommendation = this.createRecommendation({
          studentId: userId,
          recommendationType: RecommendationType.NEXT_LESSON,
          contentId: nextLesson.id,
          contentType: 'lesson',
          title: `Continue with: ${nextLesson.title}`,
          description: `Next lesson in ${enrollment.course.title}`,
          reason: `You're making good progress in this course. This lesson builds on what you've already learned.`,
          confidenceScore: 0.9,
          priority: Priority.HIGH,
          metadata: {
            courseTitle: enrollment.course.title,
            sectionTitle: nextLesson.section?.title,
            estimatedDuration: nextLesson.estimatedDuration || profile.avgSessionDuration / 60,
            prerequisites: nextLesson.prerequisites || [],
          },
        });

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private async findNextLessonForCourse(_userId: string, courseId: string) {
    // This would typically check lesson_progress table to find the next uncompleted lesson
    // Simplified implementation
    const lessons = await this.lessonRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
      relations: ['section'],
    });

    // Return first lesson for now (in real implementation, would check progress)
    return lessons[0] || null;
  }

  // ================== REVIEW CONTENT RECOMMENDATIONS ==================
  private async generateReviewRecommendations(
    userId: string,
    _profile: LearningProfile,
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Find content that user struggled with
    const strugglingContent = await this.findStrugglingContent(userId);

    for (const content of strugglingContent.slice(0, 3)) {
      const recommendation = this.createRecommendation({
        studentId: userId,
        recommendationType: RecommendationType.REVIEW_CONTENT,
        contentId: content.contentId,
        contentType: content.contentType,
        title: `Review: ${content.title}`,
        description: `Strengthen understanding of ${content.subject}`,
        reason: content.reason,
        confidenceScore: 0.8,
        priority: Priority.MEDIUM,
        metadata: {
          originalScore: content.score,
          difficultyLevel: content.difficulty,
          reviewType: 'reinforcement',
        },
      });

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async findStrugglingContent(userId: string) {
    const query = `
      SELECT 
        l.id as contentId,
        'lesson' as contentType,
        l.title,
        c.title as subject,
        aa.score,
        l.difficultyLevel as difficulty,
        'Low performance on recent assessment' as reason
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessmentId = a.id
      JOIN lessons l ON a.lessonId = l.id
      JOIN courses c ON l.courseId = c.id
      WHERE aa.studentId = ? 
        AND aa.score < 70 
        AND aa.createdAt > DATE_SUB(NOW(), INTERVAL 14 DAY)
      ORDER BY aa.score ASC, aa.createdAt DESC
      LIMIT 5
    `;

    return this.recommendationRepository.query(query, [userId]);
  }

  // ================== COURSE RECOMMENDATIONS ==================
  private async generateCourseRecommendations(
    userId: string,
    profile: LearningProfile,
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Find courses similar to user's interests but not yet enrolled
    const suggestedCourses = await this.findSuggestedCourses(userId, profile);

    for (const course of suggestedCourses.slice(0, 2)) {
      const recommendation = this.createRecommendation({
        studentId: userId,
        recommendationType: RecommendationType.COURSE_RECOMMENDATION,
        contentId: course.id,
        contentType: 'course',
        title: `New Course: ${course.title}`,
        description: course.description,
        reason: course.reason,
        confidenceScore: course.similarity,
        priority: Priority.MEDIUM,
        metadata: {
          category: course.category,
          difficultyLevel: course.difficultyLevel,
          estimatedDuration: course.duration,
          rating: course.rating,
        },
      });

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async findSuggestedCourses(userId: string, _profile: LearningProfile) {
    // Find courses in categories the user has shown interest in
    const query = `
      SELECT DISTINCT
        c2.id,
        c2.title,
        c2.description,
        c2.category,
        c2.difficultyLevel,
        c2.duration,
        c2.rating,
        'Based on your interest in similar topics' as reason,
        0.7 as similarity
      FROM enrollments e
      JOIN courses c1 ON e.courseId = c1.id
      JOIN courses c2 ON c1.category = c2.category
      WHERE e.studentId = ? 
        AND c2.id NOT IN (
          SELECT courseId FROM enrollments WHERE studentId = ?
        )
        AND c2.isActive = 1
        AND c2.status = 'published'
      ORDER BY c2.rating DESC, c2.createdAt DESC
      LIMIT 5
    `;

    return this.recommendationRepository.query(query, [userId, userId]);
  }

  // ================== SKILL IMPROVEMENT RECOMMENDATIONS ==================
  private async generateSkillImprovementRecommendations(
    userId: string,
    _profile: LearningProfile,
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];

    // Identify skills that need improvement
    const skillGaps = await this.identifySkillGaps(userId);

    for (const gap of skillGaps.slice(0, 2)) {
      const recommendation = this.createRecommendation({
        studentId: userId,
        recommendationType: RecommendationType.SKILL_IMPROVEMENT,
        contentId: gap.resourceId,
        contentType: gap.resourceType,
        title: `Improve ${gap.skillName}`,
        description: `Targeted practice for ${gap.skillName}`,
        reason: gap.reason,
        confidenceScore: 0.75,
        priority: Priority.MEDIUM,
        metadata: {
          currentLevel: gap.currentLevel,
          targetLevel: gap.targetLevel,
          improvementPath: gap.improvementPath,
        },
      });

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async identifySkillGaps(userId: string) {
    // Simplified skill gap analysis
    // In real implementation, this would analyze assessment results across different skills
    const query = `
      SELECT 
        'communication' as skillName,
        'beginner' as currentLevel,
        'intermediate' as targetLevel,
        'course-123' as resourceId,
        'course' as resourceType,
        'Practice exercises available' as improvementPath,
        'Low scores in discussion participation' as reason
      WHERE EXISTS (
        SELECT 1 FROM enrollments WHERE studentId = ? LIMIT 1
      )
    `;

    return this.recommendationRepository.query(query, [userId]);
  }

  // ================== PUBLIC API METHODS ==================
  async getRecommendations(
    userId: string,
    options: GetRecommendationsDto,
  ): Promise<AIRecommendation[]> {
    const { type, status, priority, limit = 20, offset = 0 } = options;

    const queryBuilder = this.recommendationRepository
      .createQueryBuilder('rec')
      .where('rec.studentId = :userId', { userId });

    if (type) {
      queryBuilder.andWhere('rec.recommendationType = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('rec.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('rec.priority = :priority', { priority });
    }

    // Only show non-expired recommendations
    queryBuilder.andWhere('(rec.expiresAt IS NULL OR rec.expiresAt > :now)', { now: new Date() });

    return queryBuilder
      .orderBy('rec.priority', 'DESC')
      .addOrderBy('rec.confidenceScore', 'DESC')
      .addOrderBy('rec.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  async interactWithRecommendation(
    recommendationId: string,
    interactionType: string,
    userId: string,
  ): Promise<AIRecommendation> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId, studentId: userId },
    });

    if (!recommendation) {
      throw new Error('Recommendation not found');
    }

    recommendation.interactedAt = new Date();
    recommendation.interactionType = interactionType;

    switch (interactionType) {
      case 'accepted':
        recommendation.status = RecommendationStatus.ACCEPTED;
        break;
      case 'dismissed':
        recommendation.status = RecommendationStatus.DISMISSED;
        break;
      case 'viewed':
        if (recommendation.status === RecommendationStatus.PENDING) {
          recommendation.status = RecommendationStatus.ACTIVE;
        }
        break;
    }

    return this.recommendationRepository.save(recommendation);
  }

  async generateAllRecommendations(userId: string): Promise<{
    learningPath: AIRecommendation[];
    content: AIRecommendation[];
    difficulty: AIRecommendation[];
    schedule: AIRecommendation[];
    performance: AIRecommendation[];
  }> {
    this.logger.log(`Generating all recommendations for user: ${userId}`);

    const [learningPath, content, difficulty, schedule, performance] = await Promise.all([
      this.generatePersonalizedLearningPath(userId),
      this.generateContentRecommendations(userId),
      this.generateDifficultyAdjustments(userId),
      this.generateStudyScheduleOptimization(userId),
      this.generatePerformanceImprovements(userId),
    ]);

    return {
      learningPath,
      content,
      difficulty,
      schedule,
      performance,
    };
  }
}

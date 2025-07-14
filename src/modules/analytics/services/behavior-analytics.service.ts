import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { LearningActivity } from '../entities/learning-activity.entity';
import { LearningSession } from '../entities/learning-session.entity';
import { LearningAnalytics } from '../entities/learning-analytics.entity';
import { CacheService } from '@/cache/cache.service';
import { ActivityType, DeviceType, LearningPatternType } from '@/common/enums/analytics.enums';
import { WinstonService } from '@/logger/winston.service';

interface BehaviorPattern {
  patternId: string;
  patternType: LearningPatternType;
  description: string;
  confidence: number;
  evidenceCount: number;
  recommendations: string[];
}

interface LearningInsight {
  insightId: string;
  category: 'engagement' | 'performance' | 'behavior' | 'learning_style';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionItems: string[];
  affectedMetrics: string[];
}

interface StudentProfile {
  studentId: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
  preferredPace: 'slow' | 'moderate' | 'fast';
  optimalStudyTime: string; // Hour of day
  devicePreference: DeviceType;
  engagementTrend: 'improving' | 'stable' | 'declining';
  strengthAreas: string[];
  weakAreas: string[];
  riskFactors: string[];
}

@Injectable()
export class BehaviorAnalyticsService {
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,

    @InjectRepository(LearningSession)
    private readonly sessionRepository: Repository<LearningSession>,

    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,

    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(BehaviorAnalyticsService.name);
    this.logger.log('Behavior Analytics Service initialized');
  }

  /**
   * Analyze comprehensive behavior patterns for a student
   */
  async analyzeStudentBehavior(
    studentId: string,
    days: number = 30,
  ): Promise<{
    patterns: BehaviorPattern[];
    insights: LearningInsight[];
    profile: StudentProfile;
    trends: any;
  }> {
    try {
      const cacheKey = `behavior_analysis:${studentId}:${days}`;

      // Try cache first
      let analysis = await this.cacheService.get<{
        patterns: BehaviorPattern[];
        insights: LearningInsight[];
        profile: StudentProfile;
        trends: any;
      }>(cacheKey);
      if (analysis) {
        return analysis;
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get comprehensive data
      const [activities, sessions, analytics] = await Promise.all([
        this.getStudentActivities(studentId, startDate, endDate),
        this.getStudentSessions(studentId, startDate, endDate),
        this.getStudentAnalytics(studentId, startDate, endDate),
      ]);

      // Analyze patterns
      const patterns = await this.identifyBehaviorPatterns(activities, sessions);

      // Generate insights
      const insights = await this.generateLearningInsights(activities, sessions, analytics);

      // Build student profile
      const profile = await this.buildStudentProfile(studentId, activities, sessions, analytics);

      // Analyze trends
      const trends = await this.analyzeTrends(analytics);

      analysis = { patterns, insights, profile, trends };

      // Cache the results
      await this.cacheService.set(cacheKey, analysis, this.CACHE_TTL);

      return analysis;
    } catch (error) {
      this.logger.error(`Error analyzing student behavior: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Identify specific behavior patterns
   */
  async identifyBehaviorPatterns(
    activities: LearningActivity[],
    sessions: LearningSession[],
  ): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];

    // Pattern 1: Cramming behavior
    const crammingPattern = this.detectCrammingPattern(activities, sessions);
    if (crammingPattern) patterns.push(crammingPattern);

    // Pattern 2: Procrastination
    const procrastinationPattern = this.detectProcrastinationPattern(activities);
    if (procrastinationPattern) patterns.push(procrastinationPattern);

    // Pattern 3: Consistent learning
    const consistencyPattern = this.detectConsistencyPattern(sessions);
    if (consistencyPattern) patterns.push(consistencyPattern);

    // Pattern 4: Video rewinding behavior
    const rewindingPattern = this.detectRewindingPattern(activities);
    if (rewindingPattern) patterns.push(rewindingPattern);

    // Pattern 5: Quiz struggling pattern
    const quizStrugglingPattern = this.detectQuizStrugglingPattern(activities);
    if (quizStrugglingPattern) patterns.push(quizStrugglingPattern);

    // Pattern 6: Social learning preference
    const socialLearningPattern = this.detectSocialLearningPattern(activities);
    if (socialLearningPattern) patterns.push(socialLearningPattern);

    return patterns;
  }

  /**
   * Generate actionable learning insights
   */
  async generateLearningInsights(
    activities: LearningActivity[],
    sessions: LearningSession[],
    analytics: LearningAnalytics[],
  ): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];

    // Engagement insights
    const engagementInsight = this.analyzeEngagementInsights(sessions);
    if (engagementInsight) insights.push(engagementInsight);

    // Performance insights
    const performanceInsight = this.analyzePerformanceInsights(analytics);
    if (performanceInsight) insights.push(performanceInsight);

    // Study time insights
    const studyTimeInsight = this.analyzeStudyTimeInsights(sessions);
    if (studyTimeInsight) insights.push(studyTimeInsight);

    // Content interaction insights
    const contentInsight = this.analyzeContentInteractionInsights(activities);
    if (contentInsight) insights.push(contentInsight);

    // Device usage insights
    const deviceInsight = this.analyzeDeviceUsageInsights(activities, sessions);
    if (deviceInsight) insights.push(deviceInsight);

    return insights;
  }

  /**
   * Build comprehensive student profile
   */
  async buildStudentProfile(
    studentId: string,
    activities: LearningActivity[],
    sessions: LearningSession[],
    analytics: LearningAnalytics[],
  ): Promise<StudentProfile> {
    return {
      studentId,
      learningStyle: this.determineLearningStyle(activities),
      preferredPace: this.determinePreferredPace(activities, sessions),
      optimalStudyTime: this.determineOptimalStudyTime(sessions),
      devicePreference: this.determineDevicePreference(activities, sessions),
      engagementTrend: this.determineEngagementTrend(analytics),
      strengthAreas: this.identifyStrengthAreas(activities, analytics),
      weakAreas: this.identifyWeakAreas(activities, analytics),
      riskFactors: this.identifyRiskFactors(activities, sessions, analytics),
    };
  }

  /**
   * Pattern detection methods
   */
  private detectCrammingPattern(
    activities: LearningActivity[],
    sessions: LearningSession[],
  ): BehaviorPattern | null {
    // Detect sessions with unusually long duration before deadlines
    const longSessions = sessions.filter(session => session.duration! > 7200); // > 2 hours

    if (longSessions.length > 0) {
      const _avgSessionDuration =
        sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
      const crammingRatio = longSessions.length / sessions.length;

      if (crammingRatio > 0.3) {
        // 30% of sessions are cramming sessions
        return {
          patternId: 'cramming',
          patternType: LearningPatternType.CRAMMING,
          description:
            'Student tends to study in long, intensive sessions rather than consistent, shorter sessions.',
          confidence: Math.min(crammingRatio * 100, 95),
          evidenceCount: longSessions.length,
          recommendations: [
            'Break study sessions into smaller, more manageable chunks',
            'Create a consistent daily study schedule',
            'Use the Pomodoro technique for better time management',
            'Set up regular review sessions instead of last-minute cramming',
          ],
        };
      }
    }

    return null;
  }

  private detectProcrastinationPattern(activities: LearningActivity[]): BehaviorPattern | null {
    // Look for patterns of delayed starts and rushed completion
    const assignmentActivities = activities.filter(
      a =>
        a.activityType === ActivityType.ASSIGNMENT_SUBMIT ||
        a.activityType === ActivityType.ASSESSMENT_START,
    );

    if (assignmentActivities.length < 3) return null;

    // Analyze timing patterns
    const lastMinuteSubmissions = assignmentActivities.filter(activity => {
      // This would require deadline information - simplified for demo
      return activity.metadata?.timeToDeadline && activity.metadata.timeToDeadline < 3600; // < 1 hour
    });

    const procrastinationRatio = lastMinuteSubmissions.length / assignmentActivities.length;

    if (procrastinationRatio > 0.4) {
      // 40% last-minute submissions
      return {
        patternId: 'procrastination',
        patternType: LearningPatternType.PROCRASTINATION,
        description: 'Student frequently submits assignments close to deadlines.',
        confidence: Math.min(procrastinationRatio * 100, 90),
        evidenceCount: lastMinuteSubmissions.length,
        recommendations: [
          'Set personal deadlines 1-2 days before actual deadlines',
          'Break large tasks into smaller, manageable subtasks',
          'Use time-blocking techniques to allocate specific times for coursework',
          'Set up accountability systems or study partners',
        ],
      };
    }

    return null;
  }

  private detectConsistencyPattern(sessions: LearningSession[]): BehaviorPattern | null {
    if (sessions.length < 7) return null;

    // Analyze session regularity
    const sessionsByDay = this.groupSessionsByDay(sessions);
    const activeDays = Object.keys(sessionsByDay).length;
    const totalDays = Math.ceil(
      (sessions[sessions.length - 1].startTime.getTime() - sessions[0].startTime.getTime()) /
        (24 * 60 * 60 * 1000),
    );

    const consistencyRatio = activeDays / totalDays;

    if (consistencyRatio > 0.7) {
      // Active on 70% of days
      return {
        patternId: 'consistent_learner',
        patternType: LearningPatternType.CONSISTENT,
        description: 'Student maintains regular and consistent study habits.',
        confidence: Math.min(consistencyRatio * 100, 95),
        evidenceCount: activeDays,
        recommendations: [
          'Continue maintaining your excellent study consistency',
          'Consider gradually increasing study intensity during peak learning times',
          'Explore advanced topics to maintain engagement',
          'Share your study techniques with peers who might benefit',
        ],
      };
    }

    return null;
  }

  private detectRewindingPattern(activities: LearningActivity[]): BehaviorPattern | null {
    const videoActivities = activities.filter(
      a => a.activityType === ActivityType.VIDEO_PLAY && a.metadata?.videoPosition !== undefined,
    );

    if (videoActivities.length < 10) return null;

    // Detect frequent rewinding
    const rewindingCount = videoActivities.filter(
      a => a.metadata?.playbackEvents?.includes('rewind') || a.metadata?.seekBackCount > 2,
    ).length;

    const rewindingRatio = rewindingCount / videoActivities.length;

    if (rewindingRatio > 0.3) {
      // 30% of video activities involve significant rewinding
      return {
        patternId: 'frequent_rewinding',
        patternType: LearningPatternType.DETAIL_ORIENTED,
        description:
          'Student frequently rewinds videos, indicating thorough review or difficulty understanding.',
        confidence: Math.min(rewindingRatio * 100, 85),
        evidenceCount: rewindingCount,
        recommendations: [
          'Consider taking notes while watching videos to improve retention',
          'Pause videos to reflect on key concepts before continuing',
          'Review prerequisite materials if struggling with concepts',
          'Use video transcripts alongside video content when available',
        ],
      };
    }

    return null;
  }

  private detectQuizStrugglingPattern(activities: LearningActivity[]): BehaviorPattern | null {
    const quizActivities = activities.filter(
      a => a.activityType === ActivityType.QUIZ_COMPLETE && a.metadata?.score !== undefined,
    );

    if (quizActivities.length < 5) return null;

    const lowScoreQuizzes = quizActivities.filter(a => a.metadata!.score! < 70);
    const strugglingRatio = lowScoreQuizzes.length / quizActivities.length;

    if (strugglingRatio > 0.4) {
      // 40% of quizzes scored below 70%
      return {
        patternId: 'quiz_struggling',
        patternType: LearningPatternType.STRUGGLING,
        description: 'Student consistently scores below average on quizzes and assessments.',
        confidence: Math.min(strugglingRatio * 100, 90),
        evidenceCount: lowScoreQuizzes.length,
        recommendations: [
          'Review fundamental concepts before attempting quizzes',
          'Seek additional help from instructors or tutors',
          'Join study groups to discuss difficult concepts',
          'Use practice quizzes to identify knowledge gaps',
        ],
      };
    }

    return null;
  }

  private detectSocialLearningPattern(activities: LearningActivity[]): BehaviorPattern | null {
    const socialActivities = activities.filter(
      a =>
        a.activityType === ActivityType.DISCUSSION_POST ||
        a.activityType === ActivityType.CHAT_MESSAGE ||
        a.activityType === ActivityType.FORUM_POST,
    );

    const totalActivities = activities.length;
    const socialRatio = socialActivities.length / totalActivities;

    if (socialRatio > 0.2) {
      // 20% of activities are social
      return {
        patternId: 'social_learner',
        patternType: LearningPatternType.SOCIAL,
        description:
          'Student actively engages in social learning through discussions and collaboration.',
        confidence: Math.min(socialRatio * 100, 85),
        evidenceCount: socialActivities.length,
        recommendations: [
          'Continue engaging in discussions as it enhances learning',
          'Consider forming study groups with like-minded peers',
          'Participate in peer review activities',
          'Share knowledge through teaching or mentoring others',
        ],
      };
    }

    return null;
  }

  /**
   * Insight analysis methods
   */
  private analyzeEngagementInsights(sessions: LearningSession[]): LearningInsight | null {
    if (sessions.length === 0) return null;

    const avgEngagement =
      sessions
        .filter(s => s.qualityIndicators?.engagementScore)
        .reduce((sum, s) => sum + s.qualityIndicators!.engagementScore!, 0) / sessions.length;

    if (avgEngagement < 50) {
      return {
        insightId: 'low_engagement',
        category: 'engagement',
        severity: 'warning',
        title: 'Low Engagement Detected',
        description:
          'Your average engagement score is below optimal levels, which may impact learning outcomes.',
        actionItems: [
          'Try studying in a distraction-free environment',
          'Take regular breaks to maintain focus',
          'Experiment with different content types that match your learning style',
          'Set specific learning goals for each study session',
        ],
        affectedMetrics: ['engagement_score', 'focus_time', 'learning_efficiency'],
      };
    }

    return null;
  }

  private analyzePerformanceInsights(analytics: LearningAnalytics[]): LearningInsight | null {
    if (analytics.length < 5) return null;

    const recentAnalytics = analytics.slice(-5); // Last 5 days
    const performanceDecline = this.detectPerformanceDecline(recentAnalytics);

    if (performanceDecline) {
      return {
        insightId: 'performance_decline',
        category: 'performance',
        severity: 'critical',
        title: 'Performance Decline Detected',
        description: 'Your academic performance has been declining over the past few days.',
        actionItems: [
          'Review recent learning materials to identify knowledge gaps',
          'Seek help from instructors or teaching assistants',
          'Adjust study methods or schedule',
          'Consider consulting with academic advisors',
        ],
        affectedMetrics: ['quiz_scores', 'completion_rate', 'progress_percentage'],
      };
    }

    return null;
  }

  private analyzeStudyTimeInsights(sessions: LearningSession[]): LearningInsight | null {
    if (sessions.length < 7) return null;

    const hourlyDistribution = this.getHourlyStudyDistribution(sessions);
    const peakHours = this.identifyPeakStudyHours(hourlyDistribution);

    if (peakHours.length > 0) {
      return {
        insightId: 'optimal_study_time',
        category: 'behavior',
        severity: 'info',
        title: 'Optimal Study Time Identified',
        description: `You tend to be most productive during ${peakHours.join(', ')}. Consider scheduling important study sessions during these hours.`,
        actionItems: [
          `Schedule challenging topics during your peak hours (${peakHours.join(', ')})`,
          'Block these time slots for focused study sessions',
          'Use less optimal hours for review and practice',
          'Maintain consistent sleep schedule to preserve peak performance times',
        ],
        affectedMetrics: ['study_efficiency', 'focus_score', 'completion_rate'],
      };
    }

    return null;
  }

  /**
   * Helper methods for profile building
   */
  private determineLearningStyle(
    activities: LearningActivity[],
  ): 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed' {
    const videoTime = activities
      .filter(a => a.activityType === ActivityType.VIDEO_PLAY)
      .reduce((sum, a) => sum + (a.duration || 0), 0);

    const readingTime = activities
      .filter(a => a.activityType === ActivityType.CONTENT_READ)
      .reduce((sum, a) => sum + (a.duration || 0), 0);

    const interactiveTime = activities
      .filter(a =>
        [ActivityType.QUIZ_ATTEMPT, ActivityType.DISCUSSION_POST].includes(a.activityType),
      )
      .reduce((sum, a) => sum + (a.duration || 0), 0);

    const totalTime = videoTime + readingTime + interactiveTime;

    if (totalTime === 0) return 'mixed';

    const videoRatio = videoTime / totalTime;
    const readingRatio = readingTime / totalTime;
    const interactiveRatio = interactiveTime / totalTime;

    if (videoRatio > 0.5) return 'visual';
    if (readingRatio > 0.5) return 'reading_writing';
    if (interactiveRatio > 0.3) return 'kinesthetic';

    return 'mixed';
  }

  private determinePreferredPace(
    activities: LearningActivity[],
    sessions: LearningSession[],
  ): 'slow' | 'moderate' | 'fast' {
    if (sessions.length === 0) return 'moderate';

    const avgSessionDuration =
      sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    const activitiesPerSession = activities.length / sessions.length;

    if (avgSessionDuration > 3600 && activitiesPerSession < 10) return 'slow'; // Long sessions, few activities
    if (avgSessionDuration < 1800 && activitiesPerSession > 15) return 'fast'; // Short sessions, many activities

    return 'moderate';
  }

  private determineOptimalStudyTime(sessions: LearningSession[]): string {
    const hourlyDistribution = this.getHourlyStudyDistribution(sessions);
    const maxHour = Object.keys(hourlyDistribution).reduce((a, b) =>
      hourlyDistribution[a] > hourlyDistribution[b] ? a : b,
    );

    return `${maxHour}:00`;
  }

  private determineDevicePreference(
    activities: LearningActivity[],
    sessions: LearningSession[],
  ): DeviceType {
    const deviceCounts = sessions.reduce(
      (acc, session) => {
        if (session.deviceType) {
          acc[session.deviceType] = (acc[session.deviceType] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const preferredDevice = Object.keys(deviceCounts).reduce((a, b) =>
      deviceCounts[a] > deviceCounts[b] ? a : b,
    );

    return (preferredDevice as DeviceType) || DeviceType.DESKTOP;
  }

  private determineEngagementTrend(
    analytics: LearningAnalytics[],
  ): 'improving' | 'stable' | 'declining' {
    if (analytics.length < 5) return 'stable';

    const recent = analytics.slice(-5);
    const older = analytics.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvgEngagement =
      recent.reduce((sum, a) => sum + a.engagementScore, 0) / recent.length;
    const olderAvgEngagement = older.reduce((sum, a) => sum + a.engagementScore, 0) / older.length;

    const improvementRatio = (recentAvgEngagement - olderAvgEngagement) / olderAvgEngagement;

    if (improvementRatio > 0.1) return 'improving';
    if (improvementRatio < -0.1) return 'declining';

    return 'stable';
  }

  /**
   * Data retrieval helper methods
   */
  private async getStudentActivities(
    studentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LearningActivity[]> {
    return this.activityRepository.find({
      where: {
        studentId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });
  }

  private async getStudentSessions(
    studentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LearningSession[]> {
    return this.sessionRepository.find({
      where: {
        studentId,
        startTime: Between(startDate, endDate),
      },
      order: { startTime: 'ASC' },
    });
  }

  private async getStudentAnalytics(
    studentId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LearningAnalytics[]> {
    return this.analyticsRepository.find({
      where: {
        studentId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });
  }

  /**
   * Additional helper methods
   */
  private groupSessionsByDay(sessions: LearningSession[]): Record<string, LearningSession[]> {
    return sessions.reduce(
      (acc, session) => {
        const day = session.startTime.toISOString().split('T')[0];
        if (!acc[day]) acc[day] = [];
        acc[day].push(session);
        return acc;
      },
      {} as Record<string, LearningSession[]>,
    );
  }

  private getHourlyStudyDistribution(sessions: LearningSession[]): Record<string, number> {
    return sessions.reduce(
      (acc, session) => {
        const hour = session.startTime.getHours().toString();
        acc[hour] = (acc[hour] || 0) + (session.duration || 0);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private identifyPeakStudyHours(hourlyDistribution: Record<string, number>): string[] {
    const maxDuration = Math.max(...Object.values(hourlyDistribution));
    const threshold = maxDuration * 0.8; // Hours with 80% of max duration

    return Object.keys(hourlyDistribution)
      .filter(hour => hourlyDistribution[hour] >= threshold)
      .sort((a, b) => hourlyDistribution[b] - hourlyDistribution[a])
      .slice(0, 3); // Top 3 peak hours
  }

  private detectPerformanceDecline(analytics: LearningAnalytics[]): boolean {
    if (analytics.length < 3) return false;

    const scores = analytics.map(a => a.engagementScore);
    let decliningDays = 0;

    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < scores[i - 1]) {
        decliningDays++;
      }
    }

    return decliningDays >= Math.ceil(scores.length * 0.6); // 60% of days show decline
  }

  private identifyStrengthAreas(
    activities: LearningActivity[],
    analytics: LearningAnalytics[],
  ): string[] {
    // Simplified implementation - would analyze course/topic performance
    const strengths: string[] = [];

    const highPerformanceAnalytics = analytics.filter(a => a.engagementScore > 80);
    if (highPerformanceAnalytics.length > analytics.length * 0.5) {
      strengths.push('High Engagement');
    }

    const consistentActivities = activities.filter(a => a.activityType === ActivityType.VIDEO_PLAY);
    if (consistentActivities.length > activities.length * 0.4) {
      strengths.push('Video Learning');
    }

    const quizActivities = activities.filter(
      a =>
        a.activityType === ActivityType.QUIZ_COMPLETE &&
        a.metadata?.score !== undefined &&
        a.metadata.score > 80,
    );
    if (quizActivities.length > 0) {
      strengths.push('Assessment Performance');
    }

    return strengths;
  }

  private identifyWeakAreas(
    activities: LearningActivity[],
    analytics: LearningAnalytics[],
  ): string[] {
    const weakAreas: string[] = [];

    const lowEngagementDays = analytics.filter(a => a.engagementScore < 50);
    if (lowEngagementDays.length > analytics.length * 0.3) {
      weakAreas.push('Low Engagement');
    }

    const strugglingQuizzes = activities.filter(
      a =>
        a.activityType === ActivityType.QUIZ_COMPLETE &&
        a.metadata?.score !== undefined &&
        a.metadata.score < 60,
    );
    if (strugglingQuizzes.length > 0) {
      weakAreas.push('Assessment Struggles');
    }

    const shortSessions = analytics.filter(a => a.totalTimeSpent < 1800); // < 30 minutes
    if (shortSessions.length > analytics.length * 0.4) {
      weakAreas.push('Short Study Sessions');
    }

    return weakAreas;
  }

  private identifyRiskFactors(
    activities: LearningActivity[],
    sessions: LearningSession[],
    analytics: LearningAnalytics[],
  ): string[] {
    const riskFactors: string[] = [];

    // Low engagement trend
    const recentEngagement = analytics.slice(-7).reduce((sum, a) => sum + a.engagementScore, 0) / 7;
    if (recentEngagement < 40) {
      riskFactors.push('Declining Engagement');
    }

    // Irregular study pattern
    const activeDays = new Set(sessions.map(s => s.startTime.toDateString())).size;
    const totalDays = 7; // Last week
    if (activeDays < totalDays * 0.5) {
      riskFactors.push('Irregular Study Pattern');
    }

    // Poor assessment performance
    const recentQuizzes = activities
      .filter(a => a.activityType === ActivityType.QUIZ_COMPLETE)
      .slice(-5);
    const averageScore =
      recentQuizzes.reduce((sum, a) => sum + (a.metadata?.score || 0), 0) / recentQuizzes.length;
    if (averageScore < 60) {
      riskFactors.push('Poor Assessment Performance');
    }

    // Long periods of inactivity
    const lastActivity = activities[activities.length - 1]?.timestamp;
    if (lastActivity && Date.now() - lastActivity.getTime() > 72 * 60 * 60 * 1000) {
      // 3 days
      riskFactors.push('Extended Inactivity');
    }

    return riskFactors;
  }

  private analyzeTrends(analytics: LearningAnalytics[]): any {
    if (analytics.length < 7) return null;

    const timeSpentTrend = this.calculateTrend(analytics.map(a => a.totalTimeSpent));
    const engagementTrend = this.calculateTrend(analytics.map(a => a.engagementScore));
    const progressTrend = this.calculateTrend(analytics.map(a => a.progressPercentage));

    return {
      timeSpent: {
        trend: timeSpentTrend > 0 ? 'increasing' : timeSpentTrend < 0 ? 'decreasing' : 'stable',
        changeRate: Math.abs(timeSpentTrend),
      },
      engagement: {
        trend: engagementTrend > 0 ? 'improving' : engagementTrend < 0 ? 'declining' : 'stable',
        changeRate: Math.abs(engagementTrend),
      },
      progress: {
        trend: progressTrend > 0 ? 'accelerating' : progressTrend < 0 ? 'slowing' : 'steady',
        changeRate: Math.abs(progressTrend),
      },
    };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + index * val, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Get engagement metrics for real-time monitoring
   */
  async getEngagementMetrics(studentId: string, sessionId: string): Promise<any> {
    const cacheKey = `engagement:${sessionId}`;
    return await this.cacheService.get(cacheKey);
  }

  /**
   * Get performance metrics for real-time monitoring
   */
  async getPerformanceMetrics(studentId: string, courseId: string): Promise<any> {
    const cacheKey = `performance:${studentId}:${courseId}`;
    return await this.cacheService.get(cacheKey);
  }

  /**
   * Generate behavior summary for dashboard
   */
  async generateBehaviorSummary(studentId: string): Promise<any> {
    try {
      const cacheKey = `behavior_summary:${studentId}`;

      let summary = await this.cacheService.get(cacheKey);
      if (summary) return summary;

      const [recentActivities, activeSessions, todayAnalytics] = await Promise.all([
        this.activityRepository.find({
          where: { studentId },
          order: { timestamp: 'DESC' },
          take: 20,
        }),
        this.sessionRepository.find({
          where: {
            studentId,
            status: 'ACTIVE' as any,
          },
        }),
        this.analyticsRepository.findOne({
          where: {
            studentId,
            date: new Date(new Date().toDateString()),
          },
        }),
      ]);

      summary = {
        todayStats: {
          timeSpent: todayAnalytics?.totalTimeSpent || 0,
          activitiesCount: recentActivities.filter(
            a => a.timestamp.toDateString() === new Date().toDateString(),
          ).length,
          engagementScore: todayAnalytics?.engagementScore || 0,
          lessonsCompleted: todayAnalytics?.lessonsCompleted || 0,
        },
        recentActivity: recentActivities.slice(0, 5).map(activity => ({
          type: activity.activityType,
          timestamp: activity.timestamp,
          courseId: activity.courseId,
          duration: activity.duration,
        })),
        activeSession: activeSessions[0]
          ? {
              sessionId: activeSessions[0].sessionId,
              startTime: activeSessions[0].startTime,
              activitiesCount: activeSessions[0].activitiesCount,
            }
          : null,
        weeklyTrend: {
          // Simplified weekly trend
          direction: 'stable',
          changePercent: 0,
        },
      };

      await this.cacheService.set(cacheKey, summary, 300); // 5 minutes cache
      return summary;
    } catch (error) {
      this.logger.error(`Error generating behavior summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  private analyzeContentInteractionInsights(a: any): any {
    return a;
  }

  private analyzeDeviceUsageInsights(a: any, _b: any): any {
    return a;
  }
}

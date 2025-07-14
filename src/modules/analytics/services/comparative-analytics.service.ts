import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { LearningActivity } from '../entities/learning-activity.entity';
import { LearningSession } from '../entities/learning-session.entity';
import { LearningAnalytics } from '../entities/learning-analytics.entity';
import { CacheService } from '@/cache/cache.service';
import { ComparativeAnalyticsDto } from '../dto/analytics-processing.dto';

interface ComparisonEntity {
  id: string;
  type: 'student' | 'course' | 'cohort';
  name?: string;
  metrics: Record<string, number>;
}

interface _BenchmarkData {
  metric: string;
  value: number;
  industryStandard?: number;
  bestPractice?: number;
  acceptable?: number;
}

@Injectable()
export class ComparativeAnalyticsService {
  private readonly logger = new Logger(ComparativeAnalyticsService.name);
  private readonly CACHE_TTL = 1800; // 30 minutes

  constructor(
    @InjectRepository(LearningActivity)
    private readonly activityRepository: Repository<LearningActivity>,

    @InjectRepository(LearningSession)
    private readonly sessionRepository: Repository<LearningSession>,

    @InjectRepository(LearningAnalytics)
    private readonly analyticsRepository: Repository<LearningAnalytics>,

    private readonly cacheService: CacheService,
  ) {}

  /**
   * Perform comprehensive comparative analysis
   */
  async performComparativeAnalysis(request: {
    primaryEntity: { id: string; type: 'student' | 'course' | 'cohort' };
    baseline: { type: 'average' | 'top-quartile' | 'specific-entity'; id?: string };
    metrics: string[];
    timeFrame?: number;
  }): Promise<ComparativeAnalyticsDto> {
    try {
      const cacheKey = `comparative_analytics:${JSON.stringify(request)}`;

      let analysis = await this.cacheService.get<ComparativeAnalyticsDto>(cacheKey);
      if (analysis) {
        return analysis;
      }

      const timeFrame = request.timeFrame || 30;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeFrame * 24 * 60 * 60 * 1000);

      // Get primary entity data
      const primaryData = await this.getEntityMetrics(
        request.primaryEntity,
        request.metrics,
        startDate,
        endDate,
      );

      // Get baseline data
      const baselineData = await this.getBaselineMetrics(
        request.baseline,
        request.primaryEntity.type,
        request.metrics,
        startDate,
        endDate,
      );

      // Perform comparison
      const metricsComparison = this.compareMetrics(
        primaryData.metrics,
        baselineData,
        request.metrics,
      );

      // Calculate ranking
      const ranking = await this.calculateRanking(
        request.primaryEntity,
        request.metrics,
        startDate,
        endDate,
      );

      // Generate analysis insights
      const analysisInsights = this.generateAnalysisInsights(metricsComparison, ranking);

      // Get benchmark data
      const benchmarks = this.getBenchmarkData(request.metrics, primaryData.metrics);

      analysis = {
        comparisonType: this.determineComparisonType(request),
        primaryEntity: {
          ...request.primaryEntity,
          name: primaryData.name,
        },
        baseline: request.baseline,
        metricsComparison,
        ranking,
        analysis: analysisInsights,
        benchmarks,
        insights: this.generateInsights(metricsComparison, ranking, analysisInsights),
        generatedAt: new Date(),
      };

      await this.cacheService.set(cacheKey, analysis, this.CACHE_TTL);
      return analysis;
    } catch (error) {
      this.logger.error(`Error performing comparative analysis: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Compare student cohorts
   */
  async compareCohorts(
    cohort1: string[],
    cohort2: string[],
    metrics: string[],
    timeFrame: number = 30,
  ): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeFrame * 24 * 60 * 60 * 1000);

      // Get metrics for both cohorts
      const [cohort1Metrics, cohort2Metrics] = await Promise.all([
        this.getCohortMetrics(cohort1, metrics, startDate, endDate),
        this.getCohortMetrics(cohort2, metrics, startDate, endDate),
      ]);

      // Perform statistical comparison
      const comparison = this.performStatisticalComparison(cohort1Metrics, cohort2Metrics, metrics);

      return {
        cohort1: {
          size: cohort1.length,
          metrics: cohort1Metrics,
        },
        cohort2: {
          size: cohort2.length,
          metrics: cohort2Metrics,
        },
        comparison,
        statisticalSignificance: this.calculateStatisticalSignificance(
          cohort1Metrics,
          cohort2Metrics,
        ),
        recommendations: this.generateCohortRecommendations(comparison),
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error comparing cohorts: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Compare course performance across time periods
   */
  async compareTimeperiods(
    courseId: string,
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date },
    metrics: string[],
  ): Promise<any> {
    try {
      // Get metrics for both periods
      const [period1Metrics, period2Metrics] = await Promise.all([
        this.getCourseMetricsForPeriod(courseId, period1.start, period1.end, metrics),
        this.getCourseMetricsForPeriod(courseId, period2.start, period2.end, metrics),
      ]);

      // Calculate changes
      const changes = this.calculateTimePerodChanges(period1Metrics, period2Metrics, metrics);

      // Detect trends
      const trends = this.detectTimePeriodTrends(changes);

      return {
        courseId,
        period1: {
          ...period1,
          metrics: period1Metrics,
        },
        period2: {
          ...period2,
          metrics: period2Metrics,
        },
        changes,
        trends,
        insights: this.generateTimePeriodInsights(changes, trends),
        generatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error comparing time periods: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Benchmark against industry standards
   */
  async benchmarkAgainstIndustry(
    entityType: 'student' | 'course' | 'institution',
    entityId: string,
    metrics: string[],
  ): Promise<any> {
    try {
      const cacheKey = `industry_benchmark:${entityType}:${entityId}:${metrics.join(',')}`;

      let benchmark = await this.cacheService.get(cacheKey);
      if (benchmark) {
        return benchmark;
      }

      // Get current entity metrics
      const entityMetrics = await this.getEntityCurrentMetrics(entityType, entityId, metrics);

      // Get industry benchmarks
      const industryBenchmarks = this.getIndustryBenchmarks(entityType, metrics);

      // Perform benchmarking
      const benchmarkResults = this.performBenchmarking(entityMetrics, industryBenchmarks);

      // Generate recommendations
      const recommendations = this.generateBenchmarkRecommendations(benchmarkResults);

      benchmark = {
        entityType,
        entityId,
        entityMetrics,
        industryBenchmarks,
        benchmarkResults,
        recommendations,
        overallScore: this.calculateOverallBenchmarkScore(benchmarkResults),
        generatedAt: new Date(),
      };

      await this.cacheService.set(cacheKey, benchmark, this.CACHE_TTL * 2); // Cache longer for industry data
      return benchmark;
    } catch (error) {
      this.logger.error(`Error benchmarking against industry: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getEntityMetrics(
    entity: { id: string; type: 'student' | 'course' | 'cohort' },
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<ComparisonEntity> {
    switch (entity.type) {
      case 'student':
        return this.getStudentMetrics(entity.id, metrics, startDate, endDate);
      case 'course':
        return this.getCourseMetrics(entity.id, metrics, startDate, endDate);
      case 'cohort':
        // For cohort, entity.id would be a comma-separated list of student IDs
        const studentIds = entity.id.split(',');
        return this.getCohortMetrics(studentIds, metrics, startDate, endDate);
      default:
        throw new Error(`Unsupported entity type: ${entity.type}`);
    }
  }

  private async getStudentMetrics(
    studentId: string,
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<ComparisonEntity> {
    const analytics = await this.analyticsRepository.find({
      where: {
        studentId,
        date: Between(startDate, endDate),
      },
    });

    const activities = await this.activityRepository.find({
      where: {
        studentId,
        timestamp: Between(startDate, endDate),
      },
    });

    const sessions = await this.sessionRepository.find({
      where: {
        studentId,
        startTime: Between(startDate, endDate),
      },
    });

    return {
      id: studentId,
      type: 'student',
      name: `Student ${studentId}`,
      metrics: this.calculateStudentMetrics(analytics, activities, sessions, metrics),
    };
  }

  private async getCourseMetrics(
    courseId: string,
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<ComparisonEntity> {
    const analytics = await this.analyticsRepository.find({
      where: {
        courseId,
        date: Between(startDate, endDate),
      },
    });

    const activities = await this.activityRepository.find({
      where: {
        courseId,
        timestamp: Between(startDate, endDate),
      },
    });

    return {
      id: courseId,
      type: 'course',
      name: `Course ${courseId}`,
      metrics: this.calculateCourseMetrics(analytics, activities, metrics),
    };
  }

  private async getCohortMetrics(
    studentIds: string[],
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<ComparisonEntity> {
    const analytics = await this.analyticsRepository.find({
      where: {
        studentId: In(studentIds),
        date: Between(startDate, endDate),
      },
    });

    const activities = await this.activityRepository.find({
      where: {
        studentId: In(studentIds),
        timestamp: Between(startDate, endDate),
      },
    });

    const sessions = await this.sessionRepository.find({
      where: {
        studentId: In(studentIds),
        startTime: Between(startDate, endDate),
      },
    });

    return {
      id: studentIds.join(','),
      type: 'cohort',
      name: `Cohort (${studentIds.length} students)`,
      metrics: this.calculateCohortAggregateMetrics(analytics, activities, sessions, metrics),
    };
  }

  private async getBaselineMetrics(
    baseline: { type: 'average' | 'top-quartile' | 'specific-entity'; id?: string },
    entityType: 'student' | 'course' | 'cohort',
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    switch (baseline.type) {
      case 'average':
        return this.getAverageMetrics(entityType, metrics, startDate, endDate);
      case 'top-quartile':
        return this.getTopQuartileMetrics(entityType, metrics, startDate, endDate);
      case 'specific-entity':
        if (!baseline.id) {
          throw new Error('Specific entity baseline requires an ID');
        }
        const entity = await this.getEntityMetrics(
          { id: baseline.id, type: entityType },
          metrics,
          startDate,
          endDate,
        );
        return entity.metrics;
      default:
        throw new Error(`Unsupported baseline type: ${baseline.type}`);
    }
  }

  private compareMetrics(
    primaryMetrics: Record<string, number>,
    baselineMetrics: Record<string, number>,
    metrics: string[],
  ): Array<{
    metric: string;
    primaryValue: number;
    baselineValue: number;
    difference: number;
    percentageDifference: number;
    significance: 'significant' | 'moderate' | 'minimal';
    trend: 'improving' | 'stable' | 'declining';
  }> {
    return metrics.map(metric => {
      const primaryValue = primaryMetrics[metric] || 0;
      const baselineValue = baselineMetrics[metric] || 0;
      const difference = primaryValue - baselineValue;
      const percentageDifference = baselineValue !== 0 ? (difference / baselineValue) * 100 : 0;

      const significance = this.determineSignificance(Math.abs(percentageDifference));
      const trend = this.determineTrend(difference, metric);

      return {
        metric,
        primaryValue,
        baselineValue,
        difference,
        percentageDifference,
        significance,
        trend,
      };
    });
  }

  private async calculateRanking(
    entity: { id: string; type: 'student' | 'course' | 'cohort' },
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<{
    overall: number;
    byMetric: Record<string, number>;
    percentile: number;
    tier: 'top' | 'high' | 'medium' | 'low' | 'bottom';
  }> {
    // Get all entities of the same type for ranking
    const allEntities = await this.getAllEntitiesForRanking(entity.type, startDate, endDate);

    // Calculate rankings for each metric
    const byMetric: Record<string, number> = {};
    let overallScore = 0;

    for (const metric of metrics) {
      const ranking = this.calculateMetricRanking(entity.id, metric, allEntities);
      byMetric[metric] = ranking;
      overallScore += ranking;
    }

    const overall = Math.round(overallScore / metrics.length);
    const percentile = ((allEntities.length - overall + 1) / allEntities.length) * 100;
    const tier = this.determineTier(percentile);

    return {
      overall,
      byMetric,
      percentile,
      tier,
    };
  }

  private generateAnalysisInsights(
    metricsComparison: any[],
    _ranking: any,
  ): {
    strengths: string[];
    improvements: string[];
    opportunities: string[];
    risks: string[];
  } {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const opportunities: string[] = [];
    const risks: string[] = [];

    metricsComparison.forEach(comparison => {
      if (comparison.trend === 'improving' && comparison.significance !== 'minimal') {
        strengths.push(
          `Strong performance in ${comparison.metric} (${comparison.percentageDifference.toFixed(1)}% above baseline)`,
        );
      } else if (comparison.trend === 'declining' && comparison.significance !== 'minimal') {
        improvements.push(
          `${comparison.metric} needs attention (${Math.abs(comparison.percentageDifference).toFixed(1)}% below baseline)`,
        );
      }

      if (comparison.primaryValue > comparison.baselineValue * 1.2) {
        opportunities.push(`Excellent ${comparison.metric} could be leveraged for peer mentoring`);
      } else if (comparison.primaryValue < comparison.baselineValue * 0.8) {
        risks.push(`Low ${comparison.metric} may impact overall performance`);
      }
    });

    return { strengths, improvements, opportunities, risks };
  }

  private getBenchmarkData(
    metrics: string[],
    entityMetrics: Record<string, number>,
  ): Array<{
    category: string;
    value: number;
    benchmark: number;
    status: 'exceeds' | 'meets' | 'below' | 'far-below';
    industryAverage?: number;
  }> {
    // Industry benchmark standards
    const benchmarks: Record<string, { benchmark: number; industryAverage?: number }> = {
      engagementScore: { benchmark: 75, industryAverage: 68 },
      completionRate: { benchmark: 80, industryAverage: 72 },
      averageScore: { benchmark: 75, industryAverage: 71 },
      timeSpent: { benchmark: 7200, industryAverage: 6400 }, // 2 hours in seconds
      retentionRate: { benchmark: 85, industryAverage: 78 },
    };

    return metrics.map(metric => {
      const value = entityMetrics[metric] || 0;
      const benchmarkData = benchmarks[metric] || { benchmark: 70 };
      const status = this.determineBenchmarkStatus(value, benchmarkData.benchmark);

      return {
        category: metric,
        value,
        benchmark: benchmarkData.benchmark,
        status,
        industryAverage: benchmarkData.industryAverage,
      };
    });
  }

  private generateInsights(metricsComparison: any[], ranking: any, _analysis: any): string[] {
    const insights: string[] = [];

    // Performance tier insights
    if (ranking.tier === 'top') {
      insights.push(
        'Exceptional performance - consistently outperforming peers across multiple metrics',
      );
    } else if (ranking.tier === 'bottom') {
      insights.push('Performance below expected levels - immediate intervention recommended');
    }

    // Metric-specific insights
    const strongMetrics = metricsComparison.filter(
      m => m.trend === 'improving' && m.significance === 'significant',
    );
    const weakMetrics = metricsComparison.filter(
      m => m.trend === 'declining' && m.significance === 'significant',
    );

    if (strongMetrics.length > 0) {
      insights.push(`Strengths identified in: ${strongMetrics.map(m => m.metric).join(', ')}`);
    }

    if (weakMetrics.length > 0) {
      insights.push(`Areas for improvement: ${weakMetrics.map(m => m.metric).join(', ')}`);
    }

    // Trend insights
    const improvingTrends = metricsComparison.filter(m => m.trend === 'improving').length;
    const decliningTrends = metricsComparison.filter(m => m.trend === 'declining').length;

    if (improvingTrends > decliningTrends) {
      insights.push('Overall positive trajectory with improving performance trends');
    } else if (decliningTrends > improvingTrends) {
      insights.push('Concerning decline in multiple performance areas requires attention');
    }

    return insights;
  }

  // Additional helper methods
  private calculateStudentMetrics(
    analytics: any[],
    activities: any[],
    sessions: any[],
    metrics: string[],
  ): Record<string, number> {
    const result: Record<string, number> = {};

    if (metrics.includes('engagementScore')) {
      result.engagementScore =
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length
          : 0;
    }

    if (metrics.includes('totalTimeSpent')) {
      result.totalTimeSpent = analytics.reduce((sum, a) => sum + a.totalTimeSpent, 0);
    }

    if (metrics.includes('completionRate')) {
      const completedLessons = analytics.reduce((sum, a) => sum + a.lessonsCompleted, 0);
      const totalLessons = activities.filter(a => a.activityType === 'LESSON_START').length;
      result.completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    }

    if (metrics.includes('averageScore')) {
      const scores = analytics.filter(a => a.averageQuizScore != null);
      result.averageScore =
        scores.length > 0
          ? scores.reduce((sum, a) => sum + a.averageQuizScore, 0) / scores.length
          : 0;
    }

    if (metrics.includes('activitiesCount')) {
      result.activitiesCount = activities.length;
    }

    if (metrics.includes('sessionDuration')) {
      result.sessionDuration =
        sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
          : 0;
    }

    return result;
  }

  private calculateCourseMetrics(
    analytics: any[],
    activities: any[],
    metrics: string[],
  ): Record<string, number> {
    const result: Record<string, number> = {};
    const uniqueStudents = new Set(analytics.map(a => a.studentId));

    if (metrics.includes('enrollmentCount')) {
      result.enrollmentCount = uniqueStudents.size;
    }

    if (metrics.includes('averageEngagement')) {
      result.averageEngagement =
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length
          : 0;
    }

    if (metrics.includes('completionRate')) {
      const completedStudents = analytics.filter(a => a.progressPercentage >= 100).length;
      result.completionRate =
        uniqueStudents.size > 0 ? (completedStudents / uniqueStudents.size) * 100 : 0;
    }

    if (metrics.includes('averageProgress')) {
      result.averageProgress =
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.progressPercentage, 0) / analytics.length
          : 0;
    }

    if (metrics.includes('totalActivities')) {
      result.totalActivities = activities.length;
    }

    return result;
  }

  private calculateCohortAggregateMetrics(
    analytics: any[],
    activities: any[],
    sessions: any[],
    metrics: string[],
  ): Record<string, number> {
    const result: Record<string, number> = {};
    const uniqueStudents = new Set(analytics.map(a => a.studentId));

    if (metrics.includes('cohortSize')) {
      result.cohortSize = uniqueStudents.size;
    }

    if (metrics.includes('averageEngagement')) {
      result.averageEngagement =
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length
          : 0;
    }

    if (metrics.includes('totalTimeSpent')) {
      result.totalTimeSpent = analytics.reduce((sum, a) => sum + a.totalTimeSpent, 0);
    }

    if (metrics.includes('averageTimeSpent')) {
      result.averageTimeSpent =
        uniqueStudents.size > 0 ? result.totalTimeSpent / uniqueStudents.size : 0;
    }

    if (metrics.includes('completionRate')) {
      const studentsWithProgress = analytics.filter(a => a.progressPercentage > 0);
      const averageProgress =
        studentsWithProgress.length > 0
          ? studentsWithProgress.reduce((sum, a) => sum + a.progressPercentage, 0) /
            studentsWithProgress.length
          : 0;
      result.completionRate = averageProgress;
    }

    if (metrics.includes('retentionRate')) {
      // Calculate retention as students with recent activity
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7); // Last 7 days
      const activeStudents = new Set(
        activities.filter(a => a.timestamp >= recentDate).map(a => a.studentId),
      );
      result.retentionRate =
        uniqueStudents.size > 0 ? (activeStudents.size / uniqueStudents.size) * 100 : 0;
    }

    return result;
  }

  private async getAverageMetrics(
    entityType: 'student' | 'course' | 'cohort',
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    // Get all entities of the specified type and calculate averages
    const analytics = await this.analyticsRepository.find({
      where: { date: Between(startDate, endDate) },
    });

    const result: Record<string, number> = {};

    if (metrics.includes('engagementScore')) {
      result.engagementScore =
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.engagementScore, 0) / analytics.length
          : 0;
    }

    if (metrics.includes('totalTimeSpent')) {
      result.totalTimeSpent =
        analytics.length > 0
          ? analytics.reduce((sum, a) => sum + a.totalTimeSpent, 0) / analytics.length
          : 0;
    }

    if (metrics.includes('averageScore')) {
      const withScores = analytics.filter(a => a.averageQuizScore != null);
      result.averageScore =
        withScores.length > 0
          ? withScores.reduce((sum, a) => sum + a.averageQuizScore!, 0) / withScores.length
          : 0;
    }

    return result;
  }

  private async getTopQuartileMetrics(
    entityType: 'student' | 'course' | 'cohort',
    metrics: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>> {
    // Get top quartile performance for each metric
    const analytics = await this.analyticsRepository.find({
      where: { date: Between(startDate, endDate) },
      order: { engagementScore: 'DESC' },
    });

    const topQuartileSize = Math.ceil(analytics.length * 0.25);
    const topQuartile = analytics.slice(0, topQuartileSize);

    const result: Record<string, number> = {};

    if (metrics.includes('engagementScore')) {
      result.engagementScore =
        topQuartile.length > 0
          ? topQuartile.reduce((sum, a) => sum + a.engagementScore, 0) / topQuartile.length
          : 0;
    }

    if (metrics.includes('totalTimeSpent')) {
      result.totalTimeSpent =
        topQuartile.length > 0
          ? topQuartile.reduce((sum, a) => sum + a.totalTimeSpent, 0) / topQuartile.length
          : 0;
    }

    return result;
  }

  private determineComparisonType(
    request: any,
  ): 'student-to-peers' | 'course-to-course' | 'time-period' | 'cohort-analysis' {
    if (request.primaryEntity.type === 'student' && request.baseline.type === 'average') {
      return 'student-to-peers';
    } else if (request.primaryEntity.type === 'course') {
      return 'course-to-course';
    } else if (request.primaryEntity.type === 'cohort') {
      return 'cohort-analysis';
    }
    return 'student-to-peers';
  }

  private determineSignificance(
    percentageDifference: number,
  ): 'significant' | 'moderate' | 'minimal' {
    if (percentageDifference > 20) return 'significant';
    if (percentageDifference > 10) return 'moderate';
    return 'minimal';
  }

  private determineTrend(difference: number, metric: string): 'improving' | 'stable' | 'declining' {
    // For metrics where higher is better
    const higherIsBetter = ['engagementScore', 'completionRate', 'averageScore', 'retentionRate'];

    if (Math.abs(difference) < 0.1) return 'stable';

    if (higherIsBetter.includes(metric)) {
      return difference > 0 ? 'improving' : 'declining';
    } else {
      // For metrics where lower might be better (e.g., time to completion)
      return difference < 0 ? 'improving' : 'declining';
    }
  }

  private async getAllEntitiesForRanking(
    entityType: 'student' | 'course' | 'cohort',
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    // Get all entities for ranking calculations
    const analytics = await this.analyticsRepository.find({
      where: { date: Between(startDate, endDate) },
    });

    if (entityType === 'student') {
      // Group by student and calculate aggregate scores
      const studentGroups = analytics.reduce(
        (groups, a) => {
          if (!groups[a.studentId]) groups[a.studentId] = [];
          groups[a.studentId].push(a);
          return groups;
        },
        {} as Record<string, any[]>,
      );

      return Object.entries(studentGroups).map(([studentId, studentAnalytics]) => ({
        id: studentId,
        engagementScore:
          studentAnalytics.reduce((sum, a) => sum + a.engagementScore, 0) / studentAnalytics.length,
        totalTimeSpent: studentAnalytics.reduce((sum, a) => sum + a.totalTimeSpent, 0),
        averageScore: studentAnalytics
          .filter(a => a.averageQuizScore != null)
          .reduce((sum, a, _, arr) => sum + a.averageQuizScore / arr.length, 0),
      }));
    }

    return [];
  }

  private calculateMetricRanking(entityId: string, metric: string, allEntities: any[]): number {
    const entityValue = allEntities.find(e => e.id === entityId)?.[metric] || 0;
    const sortedValues = allEntities.map(e => e[metric] || 0).sort((a, b) => b - a); // Descending order

    return sortedValues.indexOf(entityValue) + 1;
  }

  private determineTier(percentile: number): 'top' | 'high' | 'medium' | 'low' | 'bottom' {
    if (percentile >= 90) return 'top';
    if (percentile >= 75) return 'high';
    if (percentile >= 50) return 'medium';
    if (percentile >= 25) return 'low';
    return 'bottom';
  }

  private determineBenchmarkStatus(
    value: number,
    benchmark: number,
  ): 'exceeds' | 'meets' | 'below' | 'far-below' {
    const ratio = value / benchmark;
    if (ratio >= 1.1) return 'exceeds';
    if (ratio >= 0.9) return 'meets';
    if (ratio >= 0.7) return 'below';
    return 'far-below';
  }

  // Additional methods for cohort comparison, time period analysis, etc.
  private performStatisticalComparison(
    cohort1Metrics: any,
    cohort2Metrics: any,
    metrics: string[],
  ): any {
    const comparison: Record<string, any> = {};

    metrics.forEach(metric => {
      const value1 = cohort1Metrics[metric] || 0;
      const value2 = cohort2Metrics[metric] || 0;
      const difference = value1 - value2;
      const percentageDifference = value2 !== 0 ? (difference / value2) * 100 : 0;

      comparison[metric] = {
        cohort1Value: value1,
        cohort2Value: value2,
        difference,
        percentageDifference,
        significance: this.determineSignificance(Math.abs(percentageDifference)),
        winner: Math.abs(difference) < 0.1 ? 'tie' : difference > 0 ? 'cohort1' : 'cohort2',
      };
    });

    return comparison;
  }

  private calculateStatisticalSignificance(_cohort1Metrics: any, _cohort2Metrics: any): any {
    // Simplified statistical significance calculation
    // In a real implementation, you would perform proper statistical tests
    return {
      pValue: 0.05, // Placeholder
      isSignificant: true,
      confidenceLevel: 95,
      testType: 't-test',
    };
  }

  private generateCohortRecommendations(comparison: any): string[] {
    const recommendations: string[] = [];

    Object.entries(comparison).forEach(([metric, data]: [string, any]) => {
      if (data.significance === 'significant') {
        if (data.winner === 'cohort1') {
          recommendations.push(
            `Cohort 1 significantly outperforms in ${metric}. Consider applying their strategies to Cohort 2.`,
          );
        } else if (data.winner === 'cohort2') {
          recommendations.push(
            `Cohort 2 significantly outperforms in ${metric}. Analyze their approach for broader application.`,
          );
        }
      }
    });

    return recommendations;
  }

  private async getCourseMetricsForPeriod(
    courseId: string,
    startDate: Date,
    endDate: Date,
    metrics: string[],
  ): Promise<Record<string, number>> {
    const analytics = await this.analyticsRepository.find({
      where: {
        courseId,
        date: Between(startDate, endDate),
      },
    });

    const activities = await this.activityRepository.find({
      where: {
        courseId,
        timestamp: Between(startDate, endDate),
      },
    });

    return this.calculateCourseMetrics(analytics, activities, metrics);
  }

  private calculateTimePerodChanges(
    period1Metrics: Record<string, number>,
    period2Metrics: Record<string, number>,
    metrics: string[],
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    metrics.forEach(metric => {
      const value1 = period1Metrics[metric] || 0;
      const value2 = period2Metrics[metric] || 0;
      const change = value2 - value1;
      const percentageChange = value1 !== 0 ? (change / value1) * 100 : 0;

      changes[metric] = {
        period1Value: value1,
        period2Value: value2,
        absoluteChange: change,
        percentageChange,
        trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
        significance: this.determineSignificance(Math.abs(percentageChange)),
      };
    });

    return changes;
  }

  private detectTimePeriodTrends(changes: Record<string, any>): any {
    const trends = {
      overallTrend: 'stable',
      improvingMetrics: [] as string[],
      decliningMetrics: [] as string[],
      stableMetrics: [] as string[],
    };

    let improvingCount = 0;
    let decliningCount = 0;

    Object.entries(changes).forEach(([metric, data]) => {
      if (data.trend === 'increasing' && data.significance !== 'minimal') {
        trends.improvingMetrics.push(metric);
        improvingCount++;
      } else if (data.trend === 'decreasing' && data.significance !== 'minimal') {
        trends.decliningMetrics.push(metric);
        decliningCount++;
      } else {
        trends.stableMetrics.push(metric);
      }
    });

    if (improvingCount > decliningCount) {
      trends.overallTrend = 'improving';
    } else if (decliningCount > improvingCount) {
      trends.overallTrend = 'declining';
    }

    return trends;
  }

  private generateTimePeriodInsights(changes: any, trends: any): string[] {
    const insights: string[] = [];

    if (trends.overallTrend === 'improving') {
      insights.push('Overall positive trend with improvements across multiple metrics');
    } else if (trends.overallTrend === 'declining') {
      insights.push('Concerning decline in performance requires investigation');
    }

    if (trends.improvingMetrics.length > 0) {
      insights.push(`Significant improvements in: ${trends.improvingMetrics.join(', ')}`);
    }

    if (trends.decliningMetrics.length > 0) {
      insights.push(`Areas needing attention: ${trends.decliningMetrics.join(', ')}`);
    }

    return insights;
  }

  private async getEntityCurrentMetrics(
    entityType: 'student' | 'course' | 'institution',
    entityId: string,
    metrics: string[],
  ): Promise<Record<string, number>> {
    // Get current metrics for benchmarking
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    switch (entityType) {
      case 'student':
        return (await this.getStudentMetrics(entityId, metrics, startDate, endDate)).metrics;
      case 'course':
        return (await this.getCourseMetrics(entityId, metrics, startDate, endDate)).metrics;
      default:
        return {};
    }
  }

  private getIndustryBenchmarks(
    entityType: 'student' | 'course' | 'institution',
    metrics: string[],
  ): Record<string, number> {
    // Industry benchmark data
    const benchmarks: Record<string, Record<string, number>> = {
      student: {
        engagementScore: 75,
        completionRate: 80,
        averageScore: 75,
        timeSpent: 7200, // 2 hours
        retentionRate: 85,
      },
      course: {
        enrollmentCount: 100,
        averageEngagement: 70,
        completionRate: 75,
        averageProgress: 65,
        retentionRate: 80,
      },
      institution: {
        overallEngagement: 72,
        studentRetention: 85,
        courseCompletion: 78,
        satisfaction: 4.2,
      },
    };

    const result: Record<string, number> = {};
    metrics.forEach(metric => {
      result[metric] = benchmarks[entityType]?.[metric] || 70; // Default benchmark
    });

    return result;
  }

  private performBenchmarking(
    entityMetrics: Record<string, number>,
    industryBenchmarks: Record<string, number>,
  ): any {
    const results: Record<string, any> = {};

    Object.keys(entityMetrics).forEach(metric => {
      const entityValue = entityMetrics[metric];
      const benchmarkValue = industryBenchmarks[metric];
      const performance = entityValue / benchmarkValue;
      const status = this.determineBenchmarkStatus(entityValue, benchmarkValue);

      results[metric] = {
        entityValue,
        benchmarkValue,
        performance,
        status,
        gap: entityValue - benchmarkValue,
        percentageOfBenchmark: performance * 100,
      };
    });

    return results;
  }

  private generateBenchmarkRecommendations(benchmarkResults: any): string[] {
    const recommendations: string[] = [];

    Object.entries(benchmarkResults).forEach(([metric, result]: [string, any]) => {
      if (result.status === 'far-below') {
        recommendations.push(
          `${metric} is significantly below industry standards. Consider immediate improvement initiatives.`,
        );
      } else if (result.status === 'below') {
        recommendations.push(`${metric} could be improved to meet industry benchmarks.`);
      } else if (result.status === 'exceeds') {
        recommendations.push(
          `${metric} exceeds industry standards. Consider sharing best practices.`,
        );
      }
    });

    return recommendations;
  }

  private calculateOverallBenchmarkScore(benchmarkResults: any): number {
    const scores = Object.values(benchmarkResults).map((result: any) => result.performance);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LearningAnalytics } from '../../analytics/entities/learning-analytics.entity';
import { LearningActivity } from '../../analytics/entities/learning-activity.entity';
import { Assessment } from '../../assessment/entities/assessment.entity';

export interface DifficultyAdjustment {
  userId: string;
  contentId: string;
  contentType: string;
  currentDifficulty: string;
  recommendedDifficulty: string;
  confidence: number;
  reason: string;
  supportingData: {
    averageScore: number;
    attemptCount: number;
    timeSpent: number;
    strugglingIndicators: string[];
  };
}

@Injectable()
export class DifficultyAdjustmentService {
  private readonly logger = new Logger(DifficultyAdjustmentService.name);

  constructor(
    @InjectRepository(LearningAnalytics)
    private readonly _analyticsRepository: Repository<LearningAnalytics>,
    @InjectRepository(LearningActivity)
    private readonly _activityRepository: Repository<LearningActivity>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
  ) {}

  async analyzeDifficultyAdjustmentNeeds(userId: string): Promise<DifficultyAdjustment[]> {
    this.logger.log(`Analyzing difficulty adjustment needs for user: ${userId}`);

    const adjustments: DifficultyAdjustment[] = [];

    // Get user's recent performance data
    const recentPerformance = await this.getRecentPerformanceData(userId);

    for (const performance of recentPerformance) {
      const adjustment = await this.calculateDifficultyAdjustment(performance);
      if (adjustment) {
        adjustments.push(adjustment);
      }
    }

    return adjustments.sort((a, b) => b.confidence - a.confidence);
  }

  private async getRecentPerformanceData(userId: string) {
    // Get performance data from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = `
      SELECT 
        aa.assessmentId as contentId,
        'assessment' as contentType,
        a.difficultyLevel as currentDifficulty,
        AVG(aa.score) as averageScore,
        COUNT(aa.id) as attemptCount,
        AVG(aa.timeSpent) as averageTimeSpent,
        COUNT(CASE WHEN aa.score < 60 THEN 1 END) as failedAttempts,
        MIN(aa.score) as minScore,
        MAX(aa.score) as maxScore,
        STDDEV(aa.score) as scoreVariance
      FROM assessment_attempts aa
      JOIN assessments a ON aa.assessmentId = a.id
      WHERE aa.studentId = ? 
        AND aa.createdAt > ?
      GROUP BY aa.assessmentId, a.difficultyLevel
      HAVING attemptCount >= 2
      ORDER BY attemptCount DESC, averageScore ASC
    `;

    return this.assessmentRepository.query(query, [userId, thirtyDaysAgo]);
  }

  private async calculateDifficultyAdjustment(
    performance: any,
  ): Promise<DifficultyAdjustment | null> {
    const {
      contentId,
      contentType,
      currentDifficulty,
      averageScore,
      attemptCount,
      averageTimeSpent,
      failedAttempts,
      minScore,
      _maxScore,
      scoreVariance,
    } = performance;

    let recommendedDifficulty = currentDifficulty;
    let confidence = 0;
    let reason = '';
    const strugglingIndicators: string[] = [];

    // Analyze performance patterns
    const failureRate = failedAttempts / attemptCount;
    const isConsistentlyStruggling = averageScore < 60 && failureRate > 0.5;
    const isConsistentlyExcelling = averageScore > 85 && minScore > 75;
    const hasHighVariance = scoreVariance > 20;
    const isTimeEfficient = averageTimeSpent < 30 * 60; // Less than 30 minutes

    // Decision logic for difficulty adjustment
    if (isConsistentlyStruggling) {
      recommendedDifficulty = this.decreaseDifficulty(currentDifficulty);
      confidence = 0.9;
      reason = `Consistent low performance (${averageScore.toFixed(1)}% average) suggests content is too difficult`;
      strugglingIndicators.push('Low average score', 'High failure rate');
    } else if (isConsistentlyExcelling && isTimeEfficient) {
      recommendedDifficulty = this.increaseDifficulty(currentDifficulty);
      confidence = 0.8;
      reason = `High performance (${averageScore.toFixed(1)}% average) with quick completion suggests readiness for higher difficulty`;
    } else if (hasHighVariance) {
      // High variance might indicate inconsistent understanding
      if (averageScore < 70) {
        recommendedDifficulty = this.decreaseDifficulty(currentDifficulty);
        confidence = 0.6;
        reason = `High score variance (${scoreVariance.toFixed(1)}) with low average suggests need for more foundational work`;
        strugglingIndicators.push('Inconsistent performance');
      }
    }

    // Additional indicators
    if (averageTimeSpent > 60 * 60) {
      // More than 1 hour
      strugglingIndicators.push('Excessive time spent');
    }

    if (failureRate > 0.3) {
      strugglingIndicators.push('High failure rate');
    }

    // Only return adjustment if change is recommended
    if (recommendedDifficulty === currentDifficulty) {
      return null;
    }

    return {
      userId: performance.userId || '',
      contentId,
      contentType,
      currentDifficulty,
      recommendedDifficulty,
      confidence,
      reason,
      supportingData: {
        averageScore,
        attemptCount,
        timeSpent: averageTimeSpent,
        strugglingIndicators,
      },
    };
  }

  private decreaseDifficulty(currentDifficulty: string): string {
    const levels = ['expert', 'advanced', 'intermediate', 'beginner'];
    const currentIndex = levels.indexOf(currentDifficulty);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentDifficulty;
  }

  private increaseDifficulty(currentDifficulty: string): string {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levels.indexOf(currentDifficulty);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentDifficulty;
  }
}

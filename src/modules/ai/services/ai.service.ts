import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIRecommendation } from '../entities/ai-recommendation.entity';
import { RecommendationService } from './recommendation.service';
import { LearningPathService } from './learning-path.service';
import { DifficultyAdjustmentService } from './difficulty-adjustment.service';
import { PythonAiServiceService } from './python-ai-service.service';
import { CacheService } from '@/cache/cache.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(AIRecommendation)
    private readonly _recommendationRepository: Repository<AIRecommendation>,
    private readonly recommendationService: RecommendationService,
    private readonly learningPathService: LearningPathService,
    private readonly _difficultyAdjustmentService: DifficultyAdjustmentService,
    private readonly pythonAiService: PythonAiServiceService,
    private readonly cacheService: CacheService,
  ) {}

  async generateComprehensiveRecommendations(
    userId: string,
    options?: {
      includePersonalizedPath?: boolean;
      includeDifficultyAdjustments?: boolean;
      includeContentRecommendations?: boolean;
      includeScheduleOptimization?: boolean;
    },
  ): Promise<{
    personalizedPath?: any;
    difficultyAdjustments?: AIRecommendation[];
    contentRecommendations?: AIRecommendation[];
    scheduleOptimization?: AIRecommendation[];
    overallStrategy?: string;
  }> {
    try {
      this.logger.log(`Generating comprehensive AI recommendations for user: ${userId}`);

      const cacheKey = `ai_recommendations:${userId}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const results: any = {};

      // Generate personalized learning path
      if (options?.includePersonalizedPath !== false) {
        try {
          results.personalizedPath = await this.learningPathService.generatePersonalizedPath(
            userId,
            {
              timeConstraints: { dailyHours: 1, targetDays: 30 },
              learningGoals: ['improve_skills', 'complete_courses'],
            },
          );
        } catch (error) {
          this.logger.warn(`Failed to generate personalized path: ${error.message}`);
        }
      }

      // Generate difficulty adjustments
      if (options?.includeDifficultyAdjustments !== false) {
        try {
          results.difficultyAdjustments =
            await this.recommendationService.generateDifficultyAdjustments(userId);
        } catch (error) {
          this.logger.warn(`Failed to generate difficulty adjustments: ${error.message}`);
        }
      }

      // Generate content recommendations
      if (options?.includeContentRecommendations !== false) {
        try {
          results.contentRecommendations =
            await this.recommendationService.generatePersonalizedLearningPath(userId);
        } catch (error) {
          this.logger.warn(`Failed to generate content recommendations: ${error.message}`);
        }
      }

      // Generate schedule optimization
      if (options?.includeScheduleOptimization !== false) {
        try {
          results.scheduleOptimization =
            await this.recommendationService.generateStudyScheduleOptimization(userId);
        } catch (error) {
          this.logger.warn(`Failed to generate schedule optimization: ${error.message}`);
        }
      }

      // Generate overall strategy
      results.overallStrategy = await this.generateOverallLearningStrategy(userId, results);

      // Cache results for 30 minutes
      await this.cacheService.set(cacheKey, results, 1800);

      this.logger.log(`Successfully generated comprehensive recommendations for user: ${userId}`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to generate comprehensive recommendations: ${error.message}`);
      throw error;
    }
  }

  async analyzeStudentPerformance(
    userId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month',
  ): Promise<{
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    trends: {
      performance: 'improving' | 'declining' | 'stable';
      engagement: 'increasing' | 'decreasing' | 'stable';
      difficulty: 'advancing' | 'struggling' | 'maintaining';
    };
    insights: string[];
  }> {
    try {
      this.logger.log(`Analyzing student performance for user: ${userId}`);

      // Use Python AI service for comprehensive analysis
      const analysisData = await this.gatherAnalysisData(userId, timeframe);

      const analysis = await this.pythonAiService.analyzeStudentPerformance({
        userId,
        timeframe,
        data: analysisData,
      });

      return {
        overallScore: analysis.overallPerformance.score || 75,
        strengths: analysis.overallPerformance.strengths || [
          'Problem solving',
          'Consistent engagement',
        ],
        weaknesses: analysis.overallPerformance.weaknesses || [
          'Time management',
          'Complex concepts',
        ],
        recommendations: analysis.recommendations || [
          'Focus on time management techniques',
          'Break down complex topics into smaller parts',
          'Practice more challenging exercises',
        ],
        trends: {
          performance: analysis.overallPerformance.trends.performance || 'stable',
          engagement: analysis.overallPerformance.trends.engagement || 'stable',
          difficulty: analysis.overallPerformance.trends.difficulty || 'maintaining',
        },
        insights: analysis.overallPerformance.insights || [
          'Student shows consistent learning patterns',
          'Performance improves with visual content',
          'Best learning times are morning sessions',
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to analyze student performance: ${error.message}`);

      // Return fallback analysis
      return {
        overallScore: 75,
        strengths: ['Consistent effort', 'Good engagement'],
        weaknesses: ['Time management'],
        recommendations: ['Continue current learning approach'],
        trends: {
          performance: 'stable',
          engagement: 'stable',
          difficulty: 'maintaining',
        },
        insights: ['Analysis in progress - check back later'],
      };
    }
  }

  async predictLearningOutcomes(
    userId: string,
    courseId?: string,
  ): Promise<{
    completionProbability: number;
    expectedCompletionDate: Date;
    riskFactors: string[];
    successFactors: string[];
    interventionRecommendations: string[];
    confidenceLevel: number;
  }> {
    try {
      this.logger.log(`Predicting learning outcomes for user: ${userId}`);

      const predictionData = await this.gatherPredictionData(userId, courseId);

      const prediction = await this.pythonAiService.predictLearningOutcome({
        userId,
        courseId,
        data: predictionData,
      });

      return {
        completionProbability: prediction.completion_probability || 0.75,
        expectedCompletionDate: new Date(
          prediction.expected_completion_date || Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
        riskFactors: prediction.risk_factors || ['Inconsistent study schedule'],
        successFactors: prediction.success_factors || [
          'Strong motivation',
          'Good foundational knowledge',
        ],
        interventionRecommendations: prediction.interventions || ['Set regular study reminders'],
        confidenceLevel: prediction.confidence || 0.8,
      };
    } catch (error) {
      this.logger.error(`Failed to predict learning outcomes: ${error.message}`);

      // Return fallback prediction
      return {
        completionProbability: 0.75,
        expectedCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        riskFactors: ['Analysis in progress'],
        successFactors: ['Consistent engagement'],
        interventionRecommendations: ['Continue current approach'],
        confidenceLevel: 0.6,
      };
    }
  }

  async optimizeLearningExperience(
    userId: string,
    currentContext: {
      courseId?: string;
      lessonId?: string;
      currentPerformance?: number;
      timeSpent?: number;
      strugglingConcepts?: string[];
    },
  ): Promise<{
    recommendedActions: string[];
    contentAdjustments: string[];
    difficultyRecommendation: 'increase' | 'decrease' | 'maintain';
    nextSteps: string[];
    motivationalMessage: string;
  }> {
    try {
      this.logger.log(`Optimizing learning experience for user: ${userId}`);

      const optimization = await this.pythonAiService.optimizeLearningExperience({
        userId,
        context: currentContext,
      });

      return {
        recommendedActions: optimization.actions || [
          'Take a 10-minute break',
          'Review previous concepts',
          'Practice with additional exercises',
        ],
        contentAdjustments: optimization.content_adjustments || [
          'Add visual explanations',
          'Provide step-by-step guidance',
        ],
        difficultyRecommendation: optimization.difficulty || 'maintain',
        nextSteps: optimization.next_steps || [
          'Complete current lesson',
          'Take practice quiz',
          'Move to next topic',
        ],
        motivationalMessage:
          optimization.motivation || "You're making great progress! Keep up the excellent work.",
      };
    } catch (error) {
      this.logger.error(`Failed to optimize learning experience: ${error.message}`);

      return {
        recommendedActions: ['Continue learning at your own pace'],
        contentAdjustments: ['Current content is well-suited'],
        difficultyRecommendation: 'maintain',
        nextSteps: ['Complete current lesson', 'Take practice quiz'],
        motivationalMessage: "You're doing great! Keep learning and growing.",
      };
    }
  }

  private async generateOverallLearningStrategy(
    _userId: string,
    recommendations: any,
  ): Promise<string> {
    try {
      // Analyze all recommendations to generate overall strategy
      const hasHighPerformance = recommendations.difficultyAdjustments?.some(
        (rec: any) => rec.metadata?.adjustmentType === 'increase',
      );

      const hasStrugglingAreas = recommendations.difficultyAdjustments?.some(
        (rec: any) => rec.metadata?.adjustmentType === 'decrease',
      );

      if (hasHighPerformance && !hasStrugglingAreas) {
        return 'Accelerated Learning Strategy: Focus on advanced topics and challenging content to maintain growth momentum.';
      } else if (hasStrugglingAreas && !hasHighPerformance) {
        return 'Foundation Strengthening Strategy: Prioritize reviewing fundamentals and building confidence before advancing.';
      } else if (hasHighPerformance && hasStrugglingAreas) {
        return 'Balanced Development Strategy: Continue advancing in strong areas while providing additional support in challenging topics.';
      } else {
        return 'Steady Progress Strategy: Maintain current learning pace with regular assessments and gradual difficulty increases.';
      }
    } catch (error) {
      this.logger.warn(`Failed to generate overall strategy: ${error.message}`);
      return 'Personalized Learning Strategy: Continue with adaptive learning approach based on your individual progress and preferences.';
    }
  }

  private async gatherAnalysisData(_userId: string, timeframe: string): Promise<any> {
    // This would gather comprehensive data for analysis
    return {
      timeframe,
      engagement_metrics: {},
      performance_metrics: {},
      learning_activities: {},
      assessment_results: {},
    };
  }

  private async gatherPredictionData(_userId: string, _courseId?: string): Promise<any> {
    // This would gather data needed for predictions
    return {
      historical_performance: {},
      engagement_patterns: {},
      course_progress: {},
      time_allocation: {},
    };
  }
}

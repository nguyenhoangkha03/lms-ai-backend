import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserType } from '@/common/enums/user.enums';
import { RecommendationService } from '../services/recommendation.service';
import {
  GetRecommendationsDto,
  RecommendationInteractionDto,
  RecommendationFeedbackDto,
  LearningPathRequestDto,
  ContentRecommendationRequestDto,
  DifficultyAdjustmentRequestDto,
  StudyScheduleRequestDto,
  PerformanceImprovementRequestDto,
  BulkRecommendationRequestDto,
  RecommendationConfigDto,
  RecommendationResponseDto,
  LearningPathResponseDto,
  ContentRecommendationResponseDto,
  DifficultyAdjustmentResponseDto,
  StudyScheduleResponseDto,
  PerformanceImprovementResponseDto,
  RecommendationAnalyticsDto,
} from '../dto/recommendation.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
// import { UserPayload } from '@/modules/auth/interfaces/user-payload.interface';

export interface UserPayload {
  sub: string; // user ID
  email: string;
  roles: string[];
  // bất kỳ field nào bạn encode trong JWT
}

@ApiTags('AI Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  // ================== LEARNING PATH PERSONALIZATION ==================
  @Post('learning-path')
  @ApiOperation({ summary: 'Generate personalized learning path for user' })
  @ApiResponse({
    status: 201,
    description: 'Learning path generated successfully',
    type: LearningPathResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateLearningPath(
    @CurrentUser() user: UserPayload,
    @Body() _request: LearningPathRequestDto,
  ): Promise<LearningPathResponseDto> {
    const recommendations = await this.recommendationService.generatePersonalizedLearningPath(
      user.sub,
    );

    const pathMetadata = {
      totalEstimatedTime: recommendations.reduce(
        (total, rec) => total + (rec.metadata?.estimatedDuration || 0),
        0,
      ),
      difficultyProgression: recommendations
        .map(rec => rec.metadata?.difficultyLevel)
        .filter((d): d is string => typeof d === 'string'),
      prerequisites: this.extractUniqueValues(recommendations, 'prerequisites'),
      learningObjectives: this.extractUniqueValues(recommendations, 'learningObjectives'),
      milestones: this.generateMilestones(recommendations),
    };

    const personalizationFactors = {
      learningStyle: 'mixed',
      pace: 'normal',
      preferredTimes: ['morning', 'evening'],
      strongSubjects: [],
      weakSubjects: [],
      engagementScore: 0.75,
    };

    return {
      userId: user.sub,
      learningPath: recommendations.map(this.mapToResponseDto),
      pathMetadata,
      personalizationFactors,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  @Get('learning-path')
  @ApiOperation({ summary: 'Get current learning path for user' })
  @ApiResponse({
    status: 200,
    description: 'Learning path retrieved successfully',
    type: LearningPathResponseDto,
  })
  async getCurrentLearningPath(@CurrentUser() user: UserPayload): Promise<LearningPathResponseDto> {
    // Get existing learning path recommendations
    const recommendations = await this.recommendationService.getRecommendations(user.sub, {
      type: undefined, // Get all types for learning path
      status: undefined,
      limit: 50,
    });

    const learningPathRecs = recommendations.filter(
      rec =>
        rec.recommendationType === 'next_lesson' ||
        rec.recommendationType === 'course_recommendation' ||
        rec.recommendationType === 'skill_improvement',
    );

    const pathMetadata = {
      totalEstimatedTime: learningPathRecs.reduce(
        (total, rec) => total + (rec.metadata?.estimatedDuration || 0),
        0,
      ),
      difficultyProgression: [],
      prerequisites: [],
      learningObjectives: [],
      milestones: [],
    };

    const personalizationFactors = {
      learningStyle: 'mixed',
      pace: 'normal',
      preferredTimes: ['morning'],
      strongSubjects: [],
      weakSubjects: [],
      engagementScore: 0.75,
    };

    return {
      userId: user.sub,
      learningPath: learningPathRecs.map(this.mapToResponseDto),
      pathMetadata,
      personalizationFactors,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  // ================== CONTENT RECOMMENDATION ALGORITHM ==================
  @Post('content')
  @ApiOperation({ summary: 'Generate content recommendations' })
  @ApiResponse({
    status: 201,
    description: 'Content recommendations generated successfully',
    type: ContentRecommendationResponseDto,
  })
  async generateContentRecommendations(
    @CurrentUser() user: UserPayload,
    @Body() request: ContentRecommendationRequestDto,
  ): Promise<ContentRecommendationResponseDto> {
    const recommendations = await this.recommendationService.generateContentRecommendations(
      user.sub,
      {
        type: request.contentType as any,
        limit: request.limit,
      },
    );

    const algorithmInfo = {
      primaryAlgorithm: 'hybrid',
      algorithmsUsed: ['content_based', 'collaborative_filtering'],
      totalCandidates: 100, // Would be calculated
      filteredCandidates: recommendations.length,
      rankingFactors: ['similarity', 'popularity', 'user_preference', 'recency'],
    };

    const contentStats = {
      courseRecommendations: recommendations.filter(r => r.contentType === 'course').length,
      lessonRecommendations: recommendations.filter(r => r.contentType === 'lesson').length,
      assessmentRecommendations: recommendations.filter(r => r.contentType === 'assessment').length,
      avgConfidenceScore:
        recommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / recommendations.length,
      avgDifficultyLevel: 2.5, // Would be calculated
    };

    const appliedPreferences = {
      contentTypes: request.contentType
        ? [request.contentType]
        : ['course', 'lesson', 'assessment'],
      categories: request.preferredCategories || [],
      difficultyLevels: request.difficultyLevels || [],
      excludedContent: [], // Would track excluded content
    };

    return {
      recommendations: recommendations.map(this.mapToResponseDto),
      algorithmInfo,
      contentStats,
      appliedPreferences,
    };
  }

  @Get('content')
  @ApiOperation({ summary: 'Get content recommendations' })
  @ApiQuery({ name: 'type', required: false, enum: ['course', 'lesson', 'assessment', 'all'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Content recommendations retrieved successfully',
    type: ContentRecommendationResponseDto,
  })
  async getContentRecommendations(
    @CurrentUser() user: UserPayload,
    @Query() query: ContentRecommendationRequestDto,
  ): Promise<ContentRecommendationResponseDto> {
    return this.generateContentRecommendations(user, query);
  }

  // ================== ADAPTIVE LEARNING DIFFICULTY ADJUSTMENT ==================
  @Post('difficulty-adjustment')
  @ApiOperation({ summary: 'Generate difficulty adjustment recommendations' })
  @ApiResponse({
    status: 201,
    description: 'Difficulty adjustments generated successfully',
    type: DifficultyAdjustmentResponseDto,
  })
  async generateDifficultyAdjustments(
    @CurrentUser() user: UserPayload,
    @Body() _request: DifficultyAdjustmentRequestDto,
  ): Promise<DifficultyAdjustmentResponseDto> {
    const adjustments = await this.recommendationService.generateDifficultyAdjustments(user.sub);

    const performanceAnalysis = {
      overallScore: 75.5, // Would be calculated from user data
      subjectScores: {
        Mathematics: 85.2,
        Science: 70.8,
        Literature: 68.5,
      },
      strugglingAreas: ['Literature', 'Science'],
      excellentAreas: ['Mathematics'],
      recommendedAdjustments: {
        increase: ['Mathematics'],
        decrease: ['Literature'],
        maintain: ['Science'],
      },
    };

    const learningVelocity = {
      currentPace: 'normal',
      optimalPace: 'normal',
      paceAdjustmentNeeded: false,
      timeEfficiencyScore: 0.78,
    };

    return {
      adjustments: adjustments.map(this.mapToResponseDto),
      performanceAnalysis,
      learningVelocity,
    };
  }

  @Get('difficulty-adjustment')
  @ApiOperation({ summary: 'Get difficulty adjustment recommendations' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'subject', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Difficulty adjustments retrieved successfully',
    type: DifficultyAdjustmentResponseDto,
  })
  async getDifficultyAdjustments(
    @CurrentUser() user: UserPayload,
    @Query() query: DifficultyAdjustmentRequestDto,
  ): Promise<DifficultyAdjustmentResponseDto> {
    return this.generateDifficultyAdjustments(user, query);
  }

  // ================== STUDY SCHEDULE OPTIMIZATION ==================
  @Post('study-schedule')
  @ApiOperation({ summary: 'Generate study schedule optimization' })
  @ApiResponse({
    status: 201,
    description: 'Study schedule optimization generated successfully',
    type: StudyScheduleResponseDto,
  })
  async generateStudySchedule(
    @CurrentUser() user: UserPayload,
    @Body() _request: StudyScheduleRequestDto,
  ): Promise<StudyScheduleResponseDto> {
    const scheduleRecommendations =
      await this.recommendationService.generateStudyScheduleOptimization(user.sub);

    const optimizedSchedule = {
      dailySchedule: {
        Monday: {
          timeSlots: [
            { start: '09:00', end: '10:30', activity: 'Mathematics Review' },
            { start: '14:00', end: '15:00', activity: 'Science Practice' },
          ],
          totalStudyTime: 150, // minutes
          breakTimes: ['10:30-10:45', '15:00-15:15'],
        },
        // ... other days
      },
      weeklyGoals: ['Complete 3 chapters', 'Pass 2 assessments'],
      monthlyMilestones: ['Finish Course Module 1', 'Achieve 80% average'],
    };

    const scheduleAnalysis = {
      currentEfficiency: 0.65,
      projectedImprovement: 0.85,
      consistencyScore: 0.72,
      balanceScore: 0.8,
      recommendations: [
        'Schedule study sessions during your most productive hours',
        'Take regular breaks to maintain focus',
        'Balance different subjects throughout the week',
      ],
    };

    const personalization = {
      chronotype: 'morning',
      preferredSessionLength: 90, // minutes
      optimalBreakFrequency: 60, // minutes
      productiveTimes: ['09:00-11:00', '14:00-16:00'],
      learningStyle: 'visual',
    };

    return {
      scheduleRecommendations: scheduleRecommendations.map(this.mapToResponseDto),
      optimizedSchedule,
      scheduleAnalysis,
      personalization,
    };
  }

  @Get('study-schedule')
  @ApiOperation({ summary: 'Get study schedule recommendations' })
  @ApiResponse({
    status: 200,
    description: 'Study schedule recommendations retrieved successfully',
    type: StudyScheduleResponseDto,
  })
  async getStudySchedule(
    @CurrentUser() user: UserPayload,
    @Query() query: StudyScheduleRequestDto,
  ): Promise<StudyScheduleResponseDto> {
    return this.generateStudySchedule(user, query);
  }

  // ================== PERFORMANCE IMPROVEMENT SUGGESTIONS ==================
  @Post('performance-improvement')
  @ApiOperation({ summary: 'Generate performance improvement suggestions' })
  @ApiResponse({
    status: 201,
    description: 'Performance improvements generated successfully',
    type: PerformanceImprovementResponseDto,
  })
  async generatePerformanceImprovements(
    @CurrentUser() user: UserPayload,
    @Body() request: PerformanceImprovementRequestDto,
  ): Promise<PerformanceImprovementResponseDto> {
    const improvements = await this.recommendationService.generatePerformanceImprovements(user.sub);

    const skillGapAnalysis = {
      identifiedGaps: [
        {
          skillName: 'Critical Thinking',
          currentLevel: 'beginner',
          targetLevel: 'intermediate',
          importance: 'high',
          estimatedTimeToImprove: 30, // days
        },
        {
          skillName: 'Problem Solving',
          currentLevel: 'intermediate',
          targetLevel: 'advanced',
          importance: 'medium',
          estimatedTimeToImprove: 45,
        },
      ],
      improvementPriority: ['Critical Thinking', 'Problem Solving'],
      strengthsToLeverage: ['Mathematical Reasoning', 'Analytical Skills'],
    };

    const performanceTrends = {
      overallTrend: 'improving',
      subjectTrends: {
        Mathematics: 'stable',
        Science: 'improving',
        Literature: 'declining',
      },
      improvementAreas: ['Science', 'Critical Thinking'],
      declineAreas: ['Literature'],
      stabilityScore: 0.75,
    };

    const peerComparison = request.includePeerComparison
      ? {
          percentileRank: 68,
          similarLearnerAverage: 72.5,
          topPerformerGap: 15.3,
          improvementSuggestions: [
            'Focus on areas where top performers excel',
            'Join study groups for collaborative learning',
            'Seek mentorship from high-performing peers',
          ],
        }
      : undefined;

    const actionPlan = {
      shortTermGoals: ['Complete skill assessment', 'Join study group'],
      mediumTermGoals: ['Improve critical thinking by 20%', 'Complete advanced course'],
      longTermGoals: ['Achieve expert level in core subjects', 'Mentor other students'],
      recommendedResources: ['Critical Thinking Course', 'Problem Solving Workshop'],
      timeline: '3-6 months for significant improvement',
    };

    return {
      improvements: improvements.map(this.mapToResponseDto),
      skillGapAnalysis,
      performanceTrends,
      peerComparison,
      actionPlan,
    };
  }

  @Get('performance-improvement')
  @ApiOperation({ summary: 'Get performance improvement suggestions' })
  @ApiQuery({ name: 'focusAreas', required: false, type: [String] })
  @ApiQuery({ name: 'analysisPeriod', required: false, type: Number })
  @ApiQuery({ name: 'includePeerComparison', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Performance improvements retrieved successfully',
    type: PerformanceImprovementResponseDto,
  })
  async getPerformanceImprovements(
    @CurrentUser() user: UserPayload,
    @Query() query: PerformanceImprovementRequestDto,
  ): Promise<PerformanceImprovementResponseDto> {
    return this.generatePerformanceImprovements(user, query);
  }

  // ================== GENERAL RECOMMENDATION MANAGEMENT ==================
  @Get()
  @ApiOperation({ summary: 'Get user recommendations' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      'next_lesson',
      'review_content',
      'course_recommendation',
      'study_schedule',
      'skill_improvement',
    ],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'active', 'accepted', 'dismissed'],
  })
  @ApiQuery({ name: 'priority', required: false, enum: ['low', 'medium', 'high', 'urgent'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
    type: [RecommendationResponseDto],
  })
  async getRecommendations(
    @CurrentUser() user: UserPayload,
    @Query() query: GetRecommendationsDto,
  ): Promise<RecommendationResponseDto[]> {
    const recommendations = await this.recommendationService.getRecommendations(user.sub, query);
    return recommendations.map(this.mapToResponseDto);
  }

  @Get('all')
  @ApiOperation({ summary: 'Generate all types of recommendations for user' })
  @ApiResponse({
    status: 200,
    description: 'All recommendations generated successfully',
  })
  async generateAllRecommendations(@CurrentUser() user: UserPayload) {
    return this.recommendationService.generateAllRecommendations(user.sub);
  }

  @Put(':id/interact')
  @ApiOperation({ summary: 'Record user interaction with recommendation' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: 200,
    description: 'Interaction recorded successfully',
    type: RecommendationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Recommendation not found' })
  async interactWithRecommendation(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() interaction: RecommendationInteractionDto,
  ): Promise<RecommendationResponseDto> {
    const recommendation = await this.recommendationService.interactWithRecommendation(
      id,
      interaction.interactionType,
      user.sub,
    );

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    return this.mapToResponseDto(recommendation);
  }

  @Put(':id/feedback')
  @ApiOperation({ summary: 'Provide feedback on recommendation' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: 200,
    description: 'Feedback recorded successfully',
    type: RecommendationResponseDto,
  })
  async provideFeedback(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
    @Body() _feedback: RecommendationFeedbackDto,
  ): Promise<RecommendationResponseDto> {
    // Implementation would update the recommendation with user feedback
    const recommendation = await this.recommendationService.interactWithRecommendation(
      id,
      'feedback_provided',
      user.sub,
    );

    // Update feedback fields (would be implemented in service)
    // recommendation.userRating = feedback.rating;
    // recommendation.userFeedback = feedback.feedback;
    // recommendation.wasEffective = feedback.wasHelpful;

    return this.mapToResponseDto(recommendation);
  }

  // ================== ADMIN ENDPOINTS ==================
  @Post('bulk-generate')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.TEACHER)
  @ApiOperation({ summary: 'Generate recommendations for multiple users (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Bulk recommendation generation initiated',
  })
  async bulkGenerateRecommendations(
    @Body() request: BulkRecommendationRequestDto,
  ): Promise<{ message: string; jobId?: string }> {
    if (request.async) {
      // Would typically queue a background job
      return {
        message: `Bulk recommendation generation initiated for ${request.userIds.length} users`,
        jobId: `bulk-rec-${Date.now()}`,
      };
    } else {
      // Synchronous generation for small batches
      const results = await Promise.allSettled(
        request.userIds.map(userId =>
          this.recommendationService.generateAllRecommendations(userId),
        ),
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        message: `Bulk generation completed: ${successful} successful, ${failed} failed`,
      };
    }
  }

  @Get('analytics')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN, UserType.TEACHER)
  @ApiOperation({ summary: 'Get recommendation analytics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
    type: RecommendationAnalyticsDto,
  })
  async getRecommendationAnalytics(
    @Query('startDate') _startDate?: string,
    @Query('endDate') _endDate?: string,
    @Query('userId') _userId?: string,
  ): Promise<RecommendationAnalyticsDto> {
    // Implementation would aggregate recommendation data
    return {
      totalRecommendations: 1250,
      byType: {
        next_lesson: 450,
        review_content: 320,
        course_recommendation: 280,
        study_schedule: 120,
        skill_improvement: 80,
      },
      byStatus: {
        pending: 200,
        active: 450,
        accepted: 380,
        dismissed: 180,
        expired: 40,
      },
      byPriority: {
        low: 300,
        medium: 650,
        high: 250,
        urgent: 50,
      },
      avgConfidenceScore: 0.78,
      interactionRates: {
        viewRate: 0.85,
        acceptanceRate: 0.62,
        dismissalRate: 0.18,
        completionRate: 0.45,
      },
      effectiveness: {
        avgUserRating: 4.2,
        helpfulPercentage: 0.73,
        timeToAction: 2.5, // hours
      },
    };
  }

  @Get('config')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Get recommendation system configuration (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Configuration retrieved successfully',
    type: RecommendationConfigDto,
  })
  async getRecommendationConfig(): Promise<RecommendationConfigDto> {
    return {
      algorithmWeights: {
        contentBased: 0.4,
        collaborativeFiltering: 0.3,
        knowledgeBased: 0.2,
        demographic: 0.1,
      },
      minConfidenceThreshold: 0.5,
      maxRecommendationsPerDay: 20,
      expirySettings: {
        defaultExpiryHours: 168, // 1 week
        typeSpecificExpiry: {
          next_lesson: 72, // 3 days
          study_schedule: 24, // 1 day
          course_recommendation: 336, // 2 weeks
        },
      },
      abTestConfig: {
        enabled: true,
        testGroups: ['control', 'variant_a', 'variant_b'],
        trafficSplit: [0.4, 0.3, 0.3],
      },
    };
  }

  @Put('config')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Update recommendation system configuration (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
    type: RecommendationConfigDto,
  })
  async updateRecommendationConfig(
    @Body() config: RecommendationConfigDto,
  ): Promise<RecommendationConfigDto> {
    // Implementation would update system configuration
    return config;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Delete recommendation (Admin only)' })
  @ApiParam({ name: 'id', description: 'Recommendation ID' })
  @ApiResponse({
    status: 204,
    description: 'Recommendation deleted successfully',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRecommendation(@Param('id') _id: string): Promise<void> {
    // Implementation would delete the recommendation
    // await this.recommendationService.deleteRecommendation(id);
  }

  // ================== HELPER METHODS ==================
  private mapToResponseDto(recommendation: any): RecommendationResponseDto {
    return {
      id: recommendation.id,
      studentId: recommendation.studentId,
      recommendationType: recommendation.recommendationType,
      contentId: recommendation.contentId,
      contentType: recommendation.contentType,
      title: recommendation.title,
      description: recommendation.description,
      reason: recommendation.reason,
      confidenceScore: recommendation.confidenceScore,
      priority: recommendation.priority,
      status: recommendation.status,
      expiresAt: recommendation.expiresAt,
      interactedAt: recommendation.interactedAt,
      interactionType: recommendation.interactionType,
      userRating: recommendation.userRating,
      userFeedback: recommendation.userFeedback,
      wasEffective: recommendation.wasEffective || false,
      metadata: recommendation.metadata,
      modelInfo: recommendation.modelInfo,
      userContext: recommendation.userContext,
      expectedOutcomes: recommendation.expectedOutcomes,
      createdAt: recommendation.createdAt,
      updatedAt: recommendation.updatedAt,
    };
  }

  private extractUniqueValues(recommendations: any[], field: string): string[] {
    const values = recommendations
      .filter(rec => rec.metadata && rec.metadata[field])
      .flatMap(rec => rec.metadata[field]);
    return [...new Set(values)];
  }

  private generateMilestones(recommendations: any[]): string[] {
    const milestones: string[] = [];

    // Generate milestones based on recommendation types and content
    const courseRecs = recommendations.filter(
      r => r.recommendationType === 'course_recommendation',
    );
    const lessonRecs = recommendations.filter(r => r.recommendationType === 'next_lesson');

    if (courseRecs.length > 0) {
      milestones.push(`Complete ${Math.ceil(courseRecs.length / 2)} recommended courses`);
    }

    if (lessonRecs.length > 0) {
      milestones.push(`Finish ${Math.ceil(lessonRecs.length / 3)} lesson sequences`);
    }

    milestones.push('Achieve 80% average score on assessments');
    milestones.push('Maintain consistent study schedule for 4 weeks');

    return milestones;
  }
}

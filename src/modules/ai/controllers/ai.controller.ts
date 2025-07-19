import { Controller, Get, Post, Body, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { AiService } from '../services/ai.service';

@ApiTags('AI Services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('recommendations/comprehensive')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Get comprehensive AI-powered recommendations' })
  @ApiQuery({
    name: 'includePath',
    required: false,
    type: Boolean,
    description: 'Include personalized learning path',
  })
  @ApiQuery({
    name: 'includeDifficulty',
    required: false,
    type: Boolean,
    description: 'Include difficulty adjustments',
  })
  @ApiQuery({
    name: 'includeContent',
    required: false,
    type: Boolean,
    description: 'Include content recommendations',
  })
  @ApiQuery({
    name: 'includeSchedule',
    required: false,
    type: Boolean,
    description: 'Include schedule optimization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprehensive recommendations generated successfully',
  })
  async getComprehensiveRecommendations(
    @CurrentUser() user: UserPayload,
    @Query('includePath') includePath: boolean = true,
    @Query('includeDifficulty') includeDifficulty: boolean = true,
    @Query('includeContent') includeContent: boolean = true,
    @Query('includeSchedule') includeSchedule: boolean = true,
  ) {
    const recommendations = await this.aiService.generateComprehensiveRecommendations(user.sub, {
      includePersonalizedPath: includePath,
      includeDifficultyAdjustments: includeDifficulty,
      includeContentRecommendations: includeContent,
      includeScheduleOptimization: includeSchedule,
    });

    return {
      success: true,
      message: 'Comprehensive recommendations generated successfully',
      data: recommendations,
      timestamp: new Date(),
    };
  }

  @Get('analysis/performance')
  @Roles('student', 'instructor', 'admin')
  @ApiOperation({ summary: 'Get AI-powered performance analysis' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['week', 'month', 'quarter'],
    description: 'Analysis timeframe',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance analysis completed successfully',
  })
  async getPerformanceAnalysis(
    @CurrentUser() user: UserPayload,
    @Query('timeframe') timeframe: 'week' | 'month' | 'quarter' = 'month',
  ) {
    const analysis = await this.aiService.analyzeStudentPerformance(user.sub, timeframe);

    return {
      success: true,
      message: 'Performance analysis completed successfully',
      data: analysis,
      metadata: {
        timeframe,
        analyzedAt: new Date(),
        userId: user.sub,
      },
    };
  }

  @Get('predictions/outcomes')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Get learning outcome predictions' })
  @ApiQuery({
    name: 'courseId',
    required: false,
    type: String,
    description: 'Specific course to predict',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning outcome predictions generated successfully',
  })
  async getLearningOutcomePredictions(
    @CurrentUser() user: UserPayload,
    @Query('courseId') courseId?: string,
  ) {
    const predictions = await this.aiService.predictLearningOutcomes(user.sub, courseId);

    return {
      success: true,
      message: 'Learning outcome predictions generated successfully',
      data: predictions,
      metadata: {
        predictedAt: new Date(),
        courseId: courseId || 'all_courses',
      },
    };
  }

  @Post('optimize/experience')
  @Roles('student')
  @ApiOperation({ summary: 'Get AI-powered learning experience optimization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning experience optimized successfully',
  })
  async optimizeLearningExperience(
    @CurrentUser() user: UserPayload,
    @Body()
    context: {
      courseId?: string;
      lessonId?: string;
      currentPerformance?: number;
      timeSpent?: number;
      strugglingConcepts?: string[];
    },
  ) {
    const optimization = await this.aiService.optimizeLearningExperience(user.sub, context);

    return {
      success: true,
      message: 'Learning experience optimized successfully',
      data: optimization,
      appliedContext: context,
    };
  }

  @Get('insights/dashboard')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Get AI insights dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'AI insights dashboard data retrieved successfully',
  })
  async getAIDashboardInsights(@CurrentUser() user: UserPayload) {
    // Combine multiple AI services for dashboard
    const [recommendations, analysis, predictions] = await Promise.allSettled([
      this.aiService.generateComprehensiveRecommendations(user.sub, {
        includePersonalizedPath: false,
        includeDifficultyAdjustments: true,
        includeContentRecommendations: true,
        includeScheduleOptimization: false,
      }),
      this.aiService.analyzeStudentPerformance(user.sub, 'month'),
      this.aiService.predictLearningOutcomes(user.sub),
    ]);

    return {
      success: true,
      message: 'AI insights dashboard data retrieved successfully',
      data: {
        recommendations: recommendations.status === 'fulfilled' ? recommendations.value : null,
        analysis: analysis.status === 'fulfilled' ? analysis.value : null,
        predictions: predictions.status === 'fulfilled' ? predictions.value : null,
        summary: {
          totalRecommendations:
            recommendations.status === 'fulfilled'
              ? (recommendations.value.contentRecommendations?.length || 0) +
                (recommendations.value.difficultyAdjustments?.length || 0)
              : 0,
          overallScore: analysis.status === 'fulfilled' ? analysis.value.overallScore : 75,
          completionProbability:
            predictions.status === 'fulfilled' ? predictions.value.completionProbability : 0.75,
        },
      },
      generatedAt: new Date(),
    };
  }
}

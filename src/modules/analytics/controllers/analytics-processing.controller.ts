// src/modules/analytics/controllers/analytics-processing.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { AnalyticsProcessingService } from '../services/analytics-processing.service';
import { ComparativeAnalyticsService } from '../services/comparative-analytics.service';
import { PredictiveModelingService } from '../services/predictive-modeling.service';
import {
  AnalyticsQueryDto,
  AnalyticsAggregationDto,
  PerformanceTrendDto,
  PeerComparisonDto,
  LearningPatternDto,
  DropoutPredictionDto,
  ComparativeAnalyticsDto,
  DataAggregationConfigDto,
} from '../dto/analytics-processing.dto';

@ApiTags('Analytics Processing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics/processing')
export class AnalyticsProcessingController {
  private readonly logger = new Logger(AnalyticsProcessingController.name);

  constructor(
    private readonly analyticsProcessingService: AnalyticsProcessingService,
    private readonly comparativeAnalyticsService: ComparativeAnalyticsService,
    private readonly predictiveModelingService: PredictiveModelingService,
  ) {}

  @Post('aggregate')
  @ApiOperation({ summary: 'Aggregate analytics data for specified period' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics aggregated successfully',
    type: AnalyticsAggregationDto,
  })
  @Roles('admin', 'teacher')
  async aggregateAnalytics(@Body() query: AnalyticsQueryDto, @CurrentUser() _user: any) {
    try {
      const aggregation = await this.analyticsProcessingService.aggregateAnalytics(query);

      return {
        success: true,
        message: 'Analytics aggregated successfully',
        data: aggregation,
      };
    } catch (error) {
      this.logger.error(`Error aggregating analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('trends/performance')
  @ApiOperation({ summary: 'Analyze performance trends over time' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance trends analyzed successfully',
    type: PerformanceTrendDto,
  })
  @Roles('admin', 'teacher')
  async analyzePerformanceTrends(@Body() query: AnalyticsQueryDto, @CurrentUser() _user: any) {
    try {
      const trends = await this.analyticsProcessingService.analyzePerformanceTrends(query);

      return {
        success: true,
        message: 'Performance trends analyzed successfully',
        data: trends,
      };
    } catch (error) {
      this.logger.error(`Error analyzing performance trends: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('comparison/peer/:studentId')
  @ApiOperation({ summary: 'Compare student performance with peers' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Peer comparison completed successfully',
    type: PeerComparisonDto,
  })
  @Roles('admin', 'teacher', 'student')
  async getPeerComparison(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query('courseId') courseId?: string,
    @Query('timeFrame') timeFrame?: string,
  ) {
    try {
      // Verify access permissions
      if (user.role === 'student' && user.id !== studentId) {
        throw new BadRequestException('Students can only access their own comparison data');
      }

      const timeFrameDays = timeFrame ? parseInt(timeFrame) : 30;
      const comparison = await this.analyticsProcessingService.performPeerComparison(
        studentId,
        courseId,
        timeFrameDays,
      );

      return {
        success: true,
        message: 'Peer comparison completed successfully',
        data: comparison,
      };
    } catch (error) {
      this.logger.error(`Error performing peer comparison: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('patterns/learning/:studentId')
  @ApiOperation({ summary: 'Recognize learning patterns for a student' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning patterns recognized successfully',
    type: LearningPatternDto,
  })
  @Roles('admin', 'teacher', 'student')
  async recognizeLearningPatterns(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
    @Query('timeFrame') timeFrame?: string,
  ) {
    try {
      // Verify access permissions
      if (user.role === 'student' && user.id !== studentId) {
        throw new BadRequestException('Students can only access their own learning patterns');
      }

      const timeFrameDays = timeFrame ? parseInt(timeFrame) : 60;
      const patterns = await this.analyticsProcessingService.recognizeLearningPatterns(
        studentId,
        timeFrameDays,
      );

      return {
        success: true,
        message: 'Learning patterns recognized successfully',
        data: patterns,
      };
    } catch (error) {
      this.logger.error(`Error recognizing learning patterns: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('prediction/dropout/:studentId')
  @ApiOperation({ summary: 'Predict dropout risk for a student' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dropout risk predicted successfully',
    type: DropoutPredictionDto,
  })
  @Roles('admin', 'teacher')
  async predictDropoutRisk(
    @Param('studentId') studentId: string,
    @CurrentUser() _user: any,
    @Query('courseId') courseId?: string,
  ) {
    try {
      const prediction = await this.analyticsProcessingService.predictDropoutRisk(
        studentId,
        courseId,
      );

      return {
        success: true,
        message: 'Dropout risk predicted successfully',
        data: prediction,
      };
    } catch (error) {
      this.logger.error(`Error predicting dropout risk: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('prediction/dropout/batch')
  @ApiOperation({ summary: 'Predict dropout risk for multiple students' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch dropout prediction completed successfully',
  })
  @Roles('admin', 'teacher')
  async predictBatchDropoutRisk(
    @Body() body: { courseId?: string; studentIds?: string[] },
    @CurrentUser() _user: any,
  ) {
    try {
      const predictions = (await this.analyticsProcessingService.predictDropoutRisk(
        undefined,
        body.courseId,
      )) as DropoutPredictionDto[];

      // Filter by studentIds if provided
      const filteredPredictions = body.studentIds
        ? predictions.filter(p => body.studentIds!.includes(p.studentId))
        : predictions;

      return {
        success: true,
        message: 'Batch dropout prediction completed successfully',
        data: {
          totalPredictions: filteredPredictions.length,
          highRiskCount: filteredPredictions.filter(
            p => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL',
          ).length,
          predictions: filteredPredictions,
        },
      };
    } catch (error) {
      this.logger.error(`Error predicting batch dropout risk: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('comparison/comparative')
  @ApiOperation({ summary: 'Perform comprehensive comparative analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comparative analytics completed successfully',
    type: ComparativeAnalyticsDto,
  })
  @Roles('admin', 'teacher')
  async performComparativeAnalytics(
    @Body()
    body: {
      primaryEntity: { id: string; type: 'student' | 'course' | 'cohort' };
      baseline: { type: 'average' | 'top-quartile' | 'specific-entity'; id?: string };
      metrics: string[];
      timeFrame?: number;
    },
    @CurrentUser() _user: any,
  ) {
    try {
      const comparison = await this.comparativeAnalyticsService.performComparativeAnalysis(body);

      return {
        success: true,
        message: 'Comparative analytics completed successfully',
        data: comparison,
      };
    } catch (error) {
      this.logger.error(`Error performing comparative analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('course/:courseId/analytics')
  @ApiOperation({ summary: 'Get comprehensive course analytics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Course analytics retrieved successfully' })
  @Roles('admin', 'teacher')
  async getCourseAnalytics(
    @Param('courseId') courseId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() _user: any,
  ) {
    try {
      // Set courseId in query
      query.courseId = courseId;

      const [aggregation, trends, patterns, dropoutRisks] = await Promise.all([
        this.analyticsProcessingService.aggregateAnalytics(query),
        this.analyticsProcessingService.analyzePerformanceTrends(query),
        this.getAllCoursePatterns(courseId, query),
        this.analyticsProcessingService.predictDropoutRisk(undefined, courseId) as Promise<
          DropoutPredictionDto[]
        >,
      ]);

      return {
        success: true,
        message: 'Course analytics retrieved successfully',
        data: {
          overview: aggregation,
          trends,
          patterns,
          dropoutRisks: {
            total: dropoutRisks.length,
            highRisk: dropoutRisks.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL')
              .length,
            details: dropoutRisks.slice(0, 10), // Top 10 highest risk
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error getting course analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('student/:studentId/comprehensive')
  @ApiOperation({ summary: 'Get comprehensive student analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprehensive student analytics retrieved successfully',
  })
  @Roles('admin', 'teacher', 'student')
  //   async getComprehensiveStudentAnalytics(
  //     @Param('studentId') studentId: string,
  //     @CurrentUser() user: any,
  //     @Query('timeFrame') timeFrame?: string,
  //   ) {
  //     try {
  //       // Verify access permissions
  //       if (user.role === 'student' && user.id !== studentId) {
  //         throw new BadRequestException('Students can only access their own analytics');
  //       }

  //       const timeFrameDays = timeFrame ? parseInt(timeFrame) : 60;

  //       const [peerComparison, learningPatterns, dropoutPrediction] = await Promise.all([
  //         this.analyticsProcessingService.performPeerComparison(studentId, undefined, timeFrameDays),
  //         this.analyticsProcessingService.recognizeLearningPatterns(studentId, timeFrameDays),
  //         user.role !== 'student'
  //           ? this.analyticsProcessingService.predictDropoutRisk(studentId)
  //           : null, // Students cannot see their own dropout prediction
  //       ]);

  //       return {
  //         success: true,
  //         message: 'Comprehensive student analytics retrieved successfully',
  //         data: {
  //           peerComparison,
  //           learningPatterns,
  //           dropoutPrediction,
  //           summary: {
  //             overallPerformance: peerComparison.comparison.overallPercentile,
  //             dominantPattern: learningPatterns.dominantPattern,
  //             riskLevel: dropoutPrediction?.riskLevel || 'UNKNOWN',
  //             strengths: peerComparison.comparison.strengths,
  //             improvements: peerComparison.comparison.improvements,
  //           },
  //         },
  //       };
  //     } catch (error) {
  //       this.logger.error(
  //         `Error getting comprehensive student analytics: ${error.message}`,
  //         error.stack,
  //       );
  //       throw error;
  //     }
  //   }
  @Post('config/aggregation')
  @ApiOperation({ summary: 'Configure data aggregation settings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Aggregation configuration updated successfully',
  })
  @Roles('admin')
  async configureDataAggregation(
    @Body() config: DataAggregationConfigDto,
    @CurrentUser() _user: any,
  ) {
    try {
      await this.analyticsProcessingService.updateAggregationConfig(config);

      return {
        success: true,
        message: 'Aggregation configuration updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error configuring data aggregation: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('status/processing')
  @ApiOperation({ summary: 'Get processing status for analytics jobs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Processing status retrieved successfully' })
  @Roles('admin', 'teacher')
  async getProcessingStatus(@CurrentUser() _user: any) {
    try {
      const status = await this.analyticsProcessingService.getProcessingStatus();

      return {
        success: true,
        message: 'Processing status retrieved successfully',
        data: status,
      };
    } catch (error) {
      this.logger.error(`Error getting processing status: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('jobs/trigger-aggregation')
  @ApiOperation({ summary: 'Manually trigger analytics aggregation' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Aggregation job triggered successfully' })
  @Roles('admin')
  async triggerManualAggregation(
    @Body() body: { date?: string; studentIds?: string[]; courseIds?: string[] },
    @CurrentUser() _user: any,
  ) {
    try {
      const jobId = await this.analyticsProcessingService.triggerManualAggregation(body);

      return {
        success: true,
        message: 'Aggregation job triggered successfully',
        data: { jobId },
      };
    } catch (error) {
      this.logger.error(`Error triggering manual aggregation: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('insights/dashboard/:entityType/:entityId')
  @ApiOperation({ summary: 'Get dashboard insights for entity' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard insights retrieved successfully' })
  @Roles('admin', 'teacher', 'student')
  async getDashboardInsights(
    @Param('entityType') entityType: 'student' | 'course' | 'teacher',
    @CurrentUser() user: any,
    @Param('entityId') entityId: string,
    @Query('timeFrame') timeFrame?: string,
  ) {
    try {
      // Verify access permissions
      if (entityType === 'student' && user.role === 'student' && user.id !== entityId) {
        throw new BadRequestException('Students can only access their own insights');
      }

      const timeFrameDays = timeFrame ? parseInt(timeFrame) : 30;
      const insights = await this.analyticsProcessingService.generateDashboardInsights(
        entityType,
        entityId,
        timeFrameDays,
      );

      return {
        success: true,
        message: 'Dashboard insights retrieved successfully',
        data: insights,
      };
    } catch (error) {
      this.logger.error(`Error getting dashboard insights: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('reports/performance-summary')
  @ApiOperation({ summary: 'Generate performance summary report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance summary report generated successfully',
  })
  @Roles('admin', 'teacher')
  async generatePerformanceSummary(@Query() query: AnalyticsQueryDto, @CurrentUser() _user: any) {
    try {
      const report = await this.analyticsProcessingService.generatePerformanceSummaryReport(query);

      return {
        success: true,
        message: 'Performance summary report generated successfully',
        data: report,
      };
    } catch (error) {
      this.logger.error(`Error generating performance summary: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('alerts/at-risk-students')
  @ApiOperation({ summary: 'Get list of at-risk students' })
  @ApiResponse({ status: HttpStatus.OK, description: 'At-risk students retrieved successfully' })
  @Roles('admin', 'teacher')
  async getAtRiskStudents(
    @CurrentUser() _user: any,
    @Query('courseId') courseId?: string,
    @Query('riskThreshold') riskThreshold?: string,
  ) {
    try {
      const threshold = riskThreshold ? parseInt(riskThreshold) : 70;
      const atRiskStudents = await this.predictiveModelingService.getAtRiskStudents(
        courseId,
        threshold,
      );

      return {
        success: true,
        message: 'At-risk students retrieved successfully',
        data: {
          totalAtRisk: atRiskStudents.length,
          threshold,
          students: atRiskStudents,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting at-risk students: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('models/retrain')
  @ApiOperation({ summary: 'Retrain predictive models' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Model retraining initiated successfully' })
  @Roles('admin')
  async retrainPredictiveModels(
    @Body() body: { modelType?: string; forceRetrain?: boolean },
    @CurrentUser() _user: any,
  ) {
    try {
      const jobId = await this.predictiveModelingService.retrainModels(
        body.modelType,
        body.forceRetrain,
      );

      return {
        success: true,
        message: 'Model retraining initiated successfully',
        data: { jobId },
      };
    } catch (error) {
      this.logger.error(`Error retraining predictive models: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('export/:format')
  @ApiOperation({ summary: 'Export analytics data in specified format' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analytics data exported successfully' })
  @Roles('admin', 'teacher')
  async exportAnalyticsData(
    @Param('format') format: 'csv' | 'excel' | 'json',
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() _user: any,
  ) {
    try {
      const exportData = await this.analyticsProcessingService.exportAnalyticsData(format, query);

      return {
        success: true,
        message: 'Analytics data exported successfully',
        data: exportData,
      };
    } catch (error) {
      this.logger.error(`Error exporting analytics data: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Private helper methods
  private async getAllCoursePatterns(courseId: string, _query: AnalyticsQueryDto): Promise<any> {
    // Get unique student IDs for the course
    const studentIds = await this.analyticsProcessingService.getCourseStudentIds(courseId);

    // Get patterns for all students in the course
    const patterns = await Promise.all(
      studentIds.slice(0, 10).map(
        (
          studentId, // Limit to first 10 for performance
        ) => this.analyticsProcessingService.recognizeLearningPatterns(studentId),
      ),
    );

    // Aggregate pattern insights
    return this.aggregatePatternInsights(patterns);
  }

  private aggregatePatternInsights(patterns: LearningPatternDto[]): any {
    const patternCounts = patterns.reduce(
      (counts, pattern) => {
        counts[pattern.dominantPattern] = (counts[pattern.dominantPattern] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    const dominantPatterns = Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([pattern, count]) => ({ pattern, count, percentage: (count / patterns.length) * 100 }));

    return {
      totalStudentsAnalyzed: patterns.length,
      dominantPatterns,
      averageConfidence: patterns.reduce((sum, p) => sum + p.confidenceScore, 0) / patterns.length,
      commonInsights: this.extractCommonInsights(patterns),
    };
  }

  private extractCommonInsights(patterns: LearningPatternDto[]): string[] {
    // Extract most common insights across all patterns
    const allInsights = patterns.flatMap(p => p.insights);
    const insightCounts = allInsights.reduce(
      (counts, insight) => {
        counts[insight] = (counts[insight] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    );

    return Object.entries(insightCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([insight, _]) => insight);
  }
}

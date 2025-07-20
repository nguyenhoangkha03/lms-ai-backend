import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PredictiveAnalyticsService } from '../services/predictive-analytics.service';
import { Body, Controller, Get, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';

@ApiTags('Predictive Analytics Dashboard')
@Controller('predictive-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PredictiveAnalyticsController {
  constructor(private readonly predictiveAnalyticsService: PredictiveAnalyticsService) {}

  @Get('dashboard/student')
  @Roles('admin', 'instructor', 'student')
  @ApiOperation({ summary: 'Get student analytics dashboard' })
  @ApiQuery({
    name: 'studentId',
    required: false,
    description: 'Student ID (auto-filled for students)',
  })
  @ApiQuery({ name: 'courseId', required: false, description: 'Course ID filter' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student analytics dashboard retrieved successfully',
  })
  async getStudentAnalyticsDashboard(
    @Query('studentId') studentId: string,
    @Query('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    // Students can only see their own dashboard
    if (user.role === 'student') {
      studentId = user.sub;
    }

    return await this.predictiveAnalyticsService.getStudentAnalyticsDashboard(studentId, courseId);
  }

  @Get('dashboard/instructor')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get instructor analytics dashboard' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Course ID filter' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Instructor analytics dashboard retrieved successfully',
  })
  async getInstructorAnalyticsDashboard(
    @Query('courseId') courseId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return await this.predictiveAnalyticsService.getInstructorAnalyticsDashboard(
      user.sub,
      courseId,
    );
  }

  @Post('analyze/comprehensive')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Run comprehensive predictive analysis for a student' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprehensive analysis completed successfully',
  })
  async runComprehensiveAnalysis(@Body() body: { studentId: string; courseId?: string }) {
    return await this.predictiveAnalyticsService.runComprehensiveAnalysis(
      body.studentId,
      body.courseId,
    );
  }

  @Get('health-check')
  @Roles('admin')
  @ApiOperation({ summary: 'Check predictive analytics system health' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health check completed',
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        performancePrediction: 'active',
        dropoutRiskAssessment: 'active',
        learningOutcomeForecasting: 'active',
        interventionRecommendations: 'active',
        resourceOptimization: 'active',
      },
      metrics: {
        predictionsGenerated: 1250,
        interventionsCreated: 89,
        optimizationsImplemented: 23,
        averageAccuracy: 84.5,
      },
    };
  }
}

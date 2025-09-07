import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { 
  ApiBearerAuth, 
  ApiOperation, 
  ApiResponse, 
  ApiTags, 
  ApiQuery, 
  ApiBody 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserType } from '@/common/enums/user.enums';
import { TeacherAnalyticsService, CourseAnalytics, StudentProgressAnalytics, GradingAnalytics, EngagementMetrics, ContentEffectiveness, AssessmentAnalytics, RealTimeDashboard } from '../services/teacher-analytics.service';
import { WinstonService } from '@/logger/winston.service';
import { 
  PerformanceAnalytics 
} from '../dto/teacher-dashboard.dto';

interface AnalyticsQuery {
  period?: 'week' | 'month' | 'semester' | 'year';
  courseIds?: string;
  studentIds?: string;
  startDate?: string;
  endDate?: string;
}

// CourseAnalytics interface moved to service file

// StudentProgressAnalytics interface moved to service file

// GradingAnalytics interface moved to service file

// EngagementMetrics interface moved to service file

interface ReportRequest {
  type: 'performance' | 'engagement' | 'progress' | 'comprehensive';
  format: 'pdf' | 'excel' | 'csv';
  period: 'week' | 'month' | 'semester' | 'year';
  courseIds?: string[];
  studentIds?: string[];
  includeCharts?: boolean;
  includeRecommendations?: boolean;
}

// ContentEffectiveness interface moved to service file

// AssessmentAnalytics interface moved to service file

@ApiTags('Teacher Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher/analytics')
export class TeacherAnalyticsController {
  constructor(
    private readonly teacherAnalyticsService: TeacherAnalyticsService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherAnalyticsController.name);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get comprehensive performance analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'semester', 'year'] })
  @ApiQuery({ name: 'courseIds', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Performance analytics retrieved successfully' })
  async getPerformanceAnalytics(
    @CurrentUser('id') teacherId: string,
    @Query() query: AnalyticsQuery,
  ): Promise<{
    success: boolean;
    message: string;
    data: PerformanceAnalytics;
  }> {
    this.logger.log(`Getting performance analytics for teacher: ${teacherId}`);

    const courseIds = query.courseIds ? query.courseIds.split(',') : undefined;
    const analytics = await this.teacherAnalyticsService.getPerformanceAnalytics(
      teacherId,
      query.period || 'month',
      courseIds,
    );

    return {
      success: true,
      message: 'Performance analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get course-specific analytics' })
  @ApiQuery({ name: 'courseIds', required: false, type: String })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Course analytics retrieved successfully' })
  async getCourseAnalytics(
    @CurrentUser('id') teacherId: string,
    @Query('courseIds') courseIds?: string,
    @Query('period') period?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: CourseAnalytics[];
  }> {
    this.logger.log(`Getting course analytics for teacher: ${teacherId}`);

    try {
      const courseAnalytics = await this.teacherAnalyticsService.getCourseAnalytics(
        teacherId,
        courseIds,
        period
      );

      return {
        success: true,
        message: 'Course analytics retrieved successfully',
        data: courseAnalytics,
      };
    } catch (error) {
      this.logger.error(`Error getting course analytics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve course analytics');
    }
  }

  @Get('students')
  @ApiOperation({ summary: 'Get student progress analytics' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'studentIds', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Student analytics retrieved successfully' })
  async getStudentProgressAnalytics(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('studentIds') studentIds?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: StudentProgressAnalytics[];
  }> {
    this.logger.log(`Getting student progress analytics for teacher: ${teacherId}`);

    try {
      const studentAnalytics = await this.teacherAnalyticsService.getStudentProgressAnalytics(
        teacherId,
        courseId,
        studentIds
      );

      return {
        success: true,
        message: 'Student analytics retrieved successfully',
        data: studentAnalytics,
      };
    } catch (error) {
      this.logger.error(`Error getting student progress analytics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve student analytics');
    }
  }

  @Get('grading')
  @ApiOperation({ summary: 'Get grading analytics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'courseIds', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Grading analytics retrieved successfully' })
  async getGradingAnalytics(
    @CurrentUser('id') teacherId: string,
    @Query('period') period?: string,
    @Query('courseIds') courseIds?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: GradingAnalytics;
  }> {
    this.logger.log(`Getting grading analytics for teacher: ${teacherId}`);

    try {
      const gradingAnalytics = await this.teacherAnalyticsService.getGradingAnalytics(
        teacherId,
        period,
        courseIds
      );

      return {
        success: true,
        message: 'Grading analytics retrieved successfully',
        data: gradingAnalytics,
      };
    } catch (error) {
      this.logger.error(`Error getting grading analytics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve grading analytics');
    }
  }

  @Get('engagement')
  @ApiOperation({ summary: 'Get engagement metrics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Engagement metrics retrieved successfully' })
  async getEngagementMetrics(
    @CurrentUser('id') teacherId: string,
    @Query() query: AnalyticsQuery,
  ): Promise<{
    success: boolean;
    message: string;
    data: EngagementMetrics;
  }> {
    this.logger.log(`Getting engagement metrics for teacher: ${teacherId}`);

    try {
      const engagementMetrics = await this.teacherAnalyticsService.getEngagementMetrics(
        teacherId,
        query.period
      );

      return {
        success: true,
        message: 'Engagement metrics retrieved successfully',
        data: engagementMetrics,
      };
    } catch (error) {
      this.logger.error(`Error getting engagement metrics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve engagement metrics');
    }
  }

  @Get('content-effectiveness')
  @ApiOperation({ summary: 'Get content effectiveness analytics' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'contentType', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Content effectiveness retrieved successfully' })
  async getContentEffectiveness(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('contentType') contentType?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: ContentEffectiveness;
  }> {
    this.logger.log(`Getting content effectiveness for teacher: ${teacherId}`);

    try {
      const contentEffectiveness = await this.teacherAnalyticsService.getContentEffectiveness(
        teacherId,
        courseId,
        contentType
      );

      return {
        success: true,
        message: 'Content effectiveness retrieved successfully',
        data: contentEffectiveness,
      };
    } catch (error) {
      this.logger.error(`Error getting content effectiveness: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve content effectiveness');
    }
  }

  @Get('assessments')
  @ApiOperation({ summary: 'Get assessment analytics' })
  @ApiQuery({ name: 'assessmentId', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Assessment analytics retrieved successfully' })
  async getAssessmentAnalytics(
    @CurrentUser('id') teacherId: string,
    @Query('assessmentId') assessmentId?: string,
    @Query('courseId') courseId?: string,
    @Query('period') period?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: AssessmentAnalytics;
  }> {
    this.logger.log(`Getting assessment analytics for teacher: ${teacherId}`);

    try {
      const assessmentAnalytics = await this.teacherAnalyticsService.getAssessmentAnalytics(
        teacherId,
        assessmentId,
        courseId,
        period
      );

      return {
        success: true,
        message: 'Assessment analytics retrieved successfully',
        data: assessmentAnalytics,
      };
    } catch (error) {
      this.logger.error(`Error getting assessment analytics: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve assessment analytics');
    }
  }

  @Get('realtime-dashboard')
  @ApiOperation({ summary: 'Get real-time dashboard data' })
  @ApiResponse({ status: 200, description: 'Real-time dashboard data retrieved successfully' })
  async getRealTimeDashboard(
    @CurrentUser('id') teacherId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: RealTimeDashboard;
  }> {
    this.logger.log(`Getting real-time dashboard for teacher: ${teacherId}`);

    try {
      const realTimeData = await this.teacherAnalyticsService.getRealTimeDashboard(teacherId);

      return {
        success: true,
        message: 'Real-time dashboard data retrieved successfully',
        data: realTimeData,
      };
    } catch (error) {
      this.logger.error(`Error getting real-time dashboard: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to retrieve real-time dashboard data');
    }
  }

  @Post('reports/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate comprehensive analytics report' })
  @ApiBody({ type: Object })
  @ApiResponse({ 
    status: 200, 
    description: 'Report generated successfully',
    content: {
      'application/pdf': {},
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
      'text/csv': {},
    },
  })
  async generateAnalyticsReport(
    @CurrentUser('id') teacherId: string,
    @Body() reportRequest: ReportRequest,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`Generating ${reportRequest.type} report for teacher: ${teacherId}`);

    try {
      // Validate request
      if (!reportRequest.type || !reportRequest.format || !reportRequest.period) {
        throw new BadRequestException('Missing required fields: type, format, period');
      }

      // Mock report generation - replace with real implementation
      const reportTitle = `${reportRequest.type.charAt(0).toUpperCase() + reportRequest.type.slice(1)} Analytics Report`;
      const currentDate = new Date().toLocaleDateString();
      
      let content: string;
      let mimeType: string;
      let filename: string;

      switch (reportRequest.format) {
        case 'pdf':
          content = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(${reportTitle} - ${currentDate}) Tj\nET\nendstream\nendobj\n\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n298\n%%EOF`;
          mimeType = 'application/pdf';
          filename = `${reportRequest.type}-report-${Date.now()}.pdf`;
          break;

        case 'excel':
          // Mock Excel content (simplified)
          content = `${reportTitle}\n${currentDate}\n\nSummary:\nTotal Students: 124\nAverage Score: 87.5%\nCompletion Rate: 78.2%`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          filename = `${reportRequest.type}-report-${Date.now()}.xlsx`;
          break;

        case 'csv':
          content = `Report Type,${reportRequest.type}\nGenerated Date,${currentDate}\nPeriod,${reportRequest.period}\nTotal Students,124\nAverage Score,87.5\nCompletion Rate,78.2\nEngagement Rate,85.4`;
          mimeType = 'text/csv';
          filename = `${reportRequest.type}-report-${Date.now()}.csv`;
          break;

        default:
          throw new BadRequestException('Unsupported format');
      }

      const buffer = Buffer.from(content, 'utf8');

      res.set({
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0',
      });

      res.send(buffer);
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('learning-outcomes')
  @ApiOperation({ summary: 'Get learning outcomes analytics' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Learning outcomes analytics retrieved successfully' })
  async getLearningOutcomes(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('period') period?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      totalOutcomes: number;
      achievedOutcomes: number;
      inProgressOutcomes: number;
      notStartedOutcomes: number;
      outcomeDetails: Array<{
        outcomeId: string;
        outcomeName: string;
        achievementRate: number;
        averageScore: number;
        studentsAchieved: number;
        totalStudents: number;
      }>;
    };
  }> {
    this.logger.log(`Getting learning outcomes for teacher: ${teacherId}`);

    // Mock data for now - replace with real implementation
    const mockOutcomesData = {
      totalOutcomes: 15,
      achievedOutcomes: 12,
      inProgressOutcomes: 2,
      notStartedOutcomes: 1,
      outcomeDetails: [
        {
          outcomeId: 'outcome-1',
          outcomeName: 'Understand linear regression concepts',
          achievementRate: 88,
          averageScore: 85,
          studentsAchieved: 39,
          totalStudents: 45,
        },
        {
          outcomeId: 'outcome-2',
          outcomeName: 'Implement neural networks in Python',
          achievementRate: 72,
          averageScore: 78,
          studentsAchieved: 32,
          totalStudents: 45,
        },
      ],
    };

    return {
      success: true,
      message: 'Learning outcomes retrieved successfully',
      data: mockOutcomesData,
    };
  }
}
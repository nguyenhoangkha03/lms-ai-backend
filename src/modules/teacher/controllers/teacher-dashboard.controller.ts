import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserType } from '@/common/enums/user.enums';
import { TeacherDashboardService } from '../services/teacher-dashboard.service';
import { TeacherAnalyticsService } from '../services/teacher-analytics.service';
import { WinstonService } from '@/logger/winston.service';
import {
  TeacherDashboardStats,
  ClassOverview,
  TeacherActivityFeedItem,
  TeacherQuickAction,
  TeachingInsight,
  AtRiskStudent,
  GradingQueue,
  StudentOverview,
  PerformanceAnalytics,
} from '../dto/teacher-dashboard.dto';

@ApiTags('Teacher Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher/dashboard')
export class TeacherDashboardController {
  constructor(
    private readonly teacherDashboardService: TeacherDashboardService,
    private readonly teacherAnalyticsService: TeacherAnalyticsService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherDashboardController.name);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get teacher dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats(@CurrentUser('id') teacherId: string): Promise<{
    success: boolean;
    message: string;
    data: TeacherDashboardStats;
  }> {
    this.logger.log(`Getting dashboard stats for teacher: ${teacherId}`);

    const stats = await this.teacherDashboardService.getDashboardStats(teacherId);

    return {
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('classes')
  @ApiOperation({ summary: 'Get teacher class overview' })
  @ApiResponse({ status: 200, description: 'Class overview retrieved successfully' })
  async getClassOverview(@CurrentUser('id') teacherId: string): Promise<{
    success: boolean;
    message: string;
    data: ClassOverview[];
  }> {
    this.logger.log(`Getting class overview for teacher: ${teacherId}`);

    const classes = await this.teacherDashboardService.getClassOverview(teacherId);

    return {
      success: true,
      message: 'Class overview retrieved successfully',
      data: classes,
    };
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get teacher activity feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Activity feed retrieved successfully' })
  async getActivityFeed(
    @CurrentUser('id') teacherId: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
    @Query('priority') priority?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: TeacherActivityFeedItem[];
  }> {
    this.logger.log(`Getting activity feed for teacher: ${teacherId}`);

    const activities = await this.teacherDashboardService.getActivityFeed(
      teacherId,
      Number(limit),
      Number(offset),
      priority,
    );

    return {
      success: true,
      message: 'Activity feed retrieved successfully',
      data: activities,
    };
  }

  @Get('quick-actions')
  @ApiOperation({ summary: 'Get teacher quick actions' })
  @ApiResponse({ status: 200, description: 'Quick actions retrieved successfully' })
  async getQuickActions(@CurrentUser('id') teacherId: string): Promise<{
    success: boolean;
    message: string;
    data: TeacherQuickAction[];
  }> {
    this.logger.log(`Getting quick actions for teacher: ${teacherId}`);

    const actions = await this.teacherDashboardService.getQuickActions(teacherId);

    return {
      success: true,
      message: 'Quick actions retrieved successfully',
      data: actions,
    };
  }

  @Get('ai-insights')
  @ApiOperation({ summary: 'Get AI teaching insights' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'AI insights retrieved successfully' })
  async getAIInsights(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('type') type?: string,
    @Query('limit') limit = 5,
  ): Promise<{
    success: boolean;
    message: string;
    data: TeachingInsight[];
  }> {
    this.logger.log(`Getting AI insights for teacher: ${teacherId}`);

    const insights = await this.teacherDashboardService.getAIInsights(
      teacherId,
      courseId,
      type,
      Number(limit),
    );

    return {
      success: true,
      message: 'AI insights retrieved successfully',
      data: insights,
    };
  }

  @Get('at-risk-students')
  @ApiOperation({ summary: 'Get at-risk students' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'riskLevel', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'At-risk students retrieved successfully' })
  async getAtRiskStudents(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('limit') limit = 8,
  ): Promise<{
    success: boolean;
    message: string;
    data: AtRiskStudent[];
  }> {
    this.logger.log(`Getting at-risk students for teacher: ${teacherId}`);

    const students = await this.teacherDashboardService.getAtRiskStudents(
      teacherId,
      courseId,
      riskLevel,
      Number(limit),
    );

    return {
      success: true,
      message: 'At-risk students retrieved successfully',
      data: students,
    };
  }

  @Get('grading-queue')
  @ApiOperation({ summary: 'Get grading queue' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Grading queue retrieved successfully' })
  async getGradingQueue(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit = 10,
  ): Promise<{
    success: boolean;
    message: string;
    data: GradingQueue[];
  }> {
    this.logger.log(`Getting grading queue for teacher: ${teacherId}`);

    const queue = await this.teacherDashboardService.getGradingQueue(
      teacherId,
      courseId,
      type,
      priority,
      Number(limit),
    );

    return {
      success: true,
      message: 'Grading queue retrieved successfully',
      data: queue,
    };
  }

  @Get('students')
  @ApiOperation({ summary: 'Get student overview' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Student overview retrieved successfully' })
  async getStudentOverview(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<{
    success: boolean;
    message: string;
    data: StudentOverview[];
  }> {
    this.logger.log(`Getting student overview for teacher: ${teacherId}`);

    const students = await this.teacherDashboardService.getStudentOverview(
      teacherId,
      courseId,
      status,
      Number(limit),
      Number(offset),
    );

    return {
      success: true,
      message: 'Student overview retrieved successfully',
      data: students,
    };
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Get detailed student information' })
  @ApiResponse({ status: 200, description: 'Student details retrieved successfully' })
  async getDetailedStudentInfo(
    @CurrentUser('id') teacherId: string,
    @Param('studentId') studentId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: StudentOverview;
  }> {
    this.logger.log(`Getting detailed student info for teacher: ${teacherId}, student: ${studentId}`);

    const student = await this.teacherDashboardService.getDetailedStudentInfo(teacherId, studentId);

    return {
      success: true,
      message: 'Student details retrieved successfully',
      data: student,
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get teacher performance analytics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'courseIds', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Performance analytics retrieved successfully' })
  async getPerformanceAnalytics(
    @CurrentUser('id') teacherId: string,
    @Query('period') period = 'month',
    @Query('courseIds') courseIds?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: PerformanceAnalytics;
  }> {
    this.logger.log(`Getting performance analytics for teacher: ${teacherId}`);

    const courseIdsArray = courseIds ? courseIds.split(',') : undefined;
    const analytics = await this.teacherAnalyticsService.getPerformanceAnalytics(
      teacherId,
      period,
      courseIdsArray,
    );

    return {
      success: true,
      message: 'Performance analytics retrieved successfully',
      data: analytics,
    };
  }

  @Post('contact-student')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Contact student' })
  @ApiResponse({ status: 200, description: 'Student contacted successfully' })
  async contactStudent(
    @CurrentUser('id') teacherId: string,
    @Body()
    contactDto: {
      studentId: string;
      message: string;
      subject: string;
      courseId?: string;
    },
  ) {
    this.logger.log(`Teacher ${teacherId} contacting student: ${contactDto.studentId}`);

    await this.teacherDashboardService.contactStudent(teacherId, contactDto);

    return {
      success: true,
      message: 'Student contacted successfully',
    };
  }

  @Post('generate-insights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate teaching insights' })
  @ApiResponse({ status: 200, description: 'Insights generated successfully' })
  async generateInsights(
    @CurrentUser('id') teacherId: string,
    @Body()
    generateDto: {
      courseId?: string;
      analysisType?: string[];
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: TeachingInsight[];
  }> {
    this.logger.log(`Generating insights for teacher: ${teacherId}`);

    const insights = await this.teacherDashboardService.generateInsights(teacherId, generateDto);

    return {
      success: true,
      message: 'Insights generated successfully',
      data: insights,
    };
  }
}

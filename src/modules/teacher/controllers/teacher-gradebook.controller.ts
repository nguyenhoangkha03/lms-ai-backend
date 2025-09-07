import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
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
import { TeacherGradebookService } from '../services/teacher-gradebook.service';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Teacher Gradebook')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher/gradebook')
export class TeacherGradebookController {
  constructor(
    private readonly teacherGradebookService: TeacherGradebookService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherGradebookController.name);
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get gradebook overview' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Overview retrieved successfully' })
  async getGradebookOverview(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting gradebook overview for teacher: ${teacherId}`);

    const overview = await this.teacherGradebookService.getGradebookOverview(teacherId, courseId);

    return {
      success: true,
      message: 'Gradebook overview retrieved successfully',
      data: overview,
    };
  }

  @Get('courses/:courseId/students')
  @ApiOperation({ summary: 'Get all student grades for a course' })
  @ApiResponse({ status: 200, description: 'Student grades retrieved successfully' })
  async getCourseStudentGrades(
    @CurrentUser('id') teacherId: string,
    @Param('courseId') courseId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting student grades for course: ${courseId}, teacher: ${teacherId}`);

    const studentGrades = await this.teacherGradebookService.getStudentGrades(teacherId, courseId);

    return {
      success: true,
      message: 'Student grades retrieved successfully',
      data: studentGrades,
    };
  }

  @Get('courses/:courseId/students/:studentId')
  @ApiOperation({ summary: 'Get detailed grades for a specific student' })
  @ApiResponse({ status: 200, description: 'Student grades retrieved successfully' })
  async getStudentDetailedGrades(
    @CurrentUser('id') teacherId: string,
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting detailed grades for student: ${studentId}, course: ${courseId}, teacher: ${teacherId}`);

    const studentGrades = await this.teacherGradebookService.getStudentGrades(teacherId, courseId, studentId);

    return {
      success: true,
      message: 'Student detailed grades retrieved successfully',
      data: studentGrades,
    };
  }

  @Put('courses/:courseId/students/:studentId/grade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update student grade for specific item' })
  @ApiResponse({ status: 200, description: 'Grade updated successfully' })
  async updateStudentGrade(
    @CurrentUser('id') teacherId: string,
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @Body() gradeUpdateDto: {
      itemId: string;
      itemType: 'assignment' | 'quiz' | 'exam' | 'project';
      newScore: number;
      oldScore?: number;
      feedback?: string;
      reason?: string;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Updating grade for student: ${studentId}, teacher: ${teacherId}`);

    const result = await this.teacherGradebookService.updateStudentGrade(
      teacherId,
      courseId,
      studentId,
      gradeUpdateDto
    );

    return {
      success: true,
      message: 'Grade updated successfully',
      data: result,
    };
  }

  @Post('courses/:courseId/bulk-grade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update grades for multiple students' })
  @ApiResponse({ status: 200, description: 'Grades updated successfully' })
  async bulkUpdateGrades(
    @CurrentUser('id') teacherId: string,
    @Param('courseId') courseId: string,
    @Body() bulkGradeDto: {
      updates: Array<{
        studentId: string;
        itemId: string;
        itemType: string;
        newScore: number;
        feedback?: string;
      }>;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Bulk updating ${bulkGradeDto.updates.length} grades for teacher: ${teacherId}`);

    const result = await this.teacherGradebookService.bulkUpdateGrades(
      teacherId,
      courseId,
      bulkGradeDto.updates
    );

    return {
      success: true,
      message: 'Grades updated successfully',
      data: result,
    };
  }

  @Get('grading-queue')
  @ApiOperation({ summary: 'Get grading queue with pending items' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'priority', required: false, enum: ['urgent', 'high', 'medium', 'low'] })
  @ApiResponse({ status: 200, description: 'Grading queue retrieved successfully' })
  async getGradingQueue(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('priority') priority?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting grading queue for teacher: ${teacherId}`);

    const queue = await this.teacherGradebookService.getGradingQueue(teacherId, courseId, priority);

    return {
      success: true,
      message: 'Grading queue retrieved successfully',
      data: queue,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get comprehensive grade statistics' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['week', 'month', 'semester', 'year'] })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getGradeStatistics(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('timeRange') timeRange?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting grade statistics for teacher: ${teacherId}`);

    const statistics = await this.teacherGradebookService.getGradeStatistics(teacherId, courseId, timeRange);

    return {
      success: true,
      message: 'Grade statistics retrieved successfully',
      data: statistics,
    };
  }

  @Post('courses/:courseId/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export gradebook data' })
  @ApiResponse({ status: 200, description: 'Export initiated successfully' })
  async exportGradebook(
    @CurrentUser('id') teacherId: string,
    @Param('courseId') courseId: string,
    @Body() exportDto: {
      format: 'csv' | 'xlsx' | 'pdf';
      includeComments?: boolean;
      includeStatistics?: boolean;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Exporting gradebook for course: ${courseId}, teacher: ${teacherId}, format: ${exportDto.format}`);

    const exportResult = await this.teacherGradebookService.exportGradebook(
      teacherId,
      courseId,
      exportDto.format
    );

    return {
      success: true,
      message: 'Gradebook export initiated successfully',
      data: exportResult,
    };
  }

  @Get('grade-scales')
  @ApiOperation({ summary: 'Get available grade scales' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Grade scales retrieved successfully' })
  async getGradeScales(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting grade scales for teacher: ${teacherId}`);

    const scales = await this.teacherGradebookService.getGradeScales(teacherId, courseId);

    return {
      success: true,
      message: 'Grade scales retrieved successfully',
      data: scales,
    };
  }

  @Post('grade-scales')
  @ApiOperation({ summary: 'Create new grade scale' })
  @ApiResponse({ status: 201, description: 'Grade scale created successfully' })
  async createGradeScale(
    @CurrentUser('id') teacherId: string,
    @Body() gradeScaleDto: {
      courseId: string;
      name: string;
      isDefault?: boolean;
      scale: Array<{
        grade: string;
        minScore: number;
        maxScore: number;
      }>;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Creating grade scale for teacher: ${teacherId}`);

    const gradeScale = await this.teacherGradebookService.createGradeScale(
      teacherId,
      gradeScaleDto.courseId,
      gradeScaleDto
    );

    return {
      success: true,
      message: 'Grade scale created successfully',
      data: gradeScale,
    };
  }
}
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { TeacherAssignmentsService } from '../services/teacher-assignments.service';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Teacher Assignments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher/assignments')
export class TeacherAssignmentsController {
  constructor(
    private readonly teacherAssignmentsService: TeacherAssignmentsService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherAssignmentsController.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assignments for teacher' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Assignments retrieved successfully' })
  async getAssignments(
    @CurrentUser('id') teacherId: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
    pagination: { total: number; limit: number; offset: number };
  }> {
    this.logger.log(`Getting assignments for teacher: ${teacherId}`);

    const result = await this.teacherAssignmentsService.getAssignments(
      teacherId,
      { courseId, status, limit: Number(limit), offset: Number(offset) }
    );

    return {
      success: true,
      message: 'Assignments retrieved successfully',
      data: result.assignments,
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({ status: 200, description: 'Assignment retrieved successfully' })
  async getAssignmentById(
    @CurrentUser('id') teacherId: string,
    @Param('id') assignmentId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting assignment ${assignmentId} for teacher: ${teacherId}`);

    const assignment = await this.teacherAssignmentsService.getAssignmentById(teacherId, assignmentId);

    return {
      success: true,
      message: 'Assignment retrieved successfully',
      data: assignment,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new assignment' })
  @ApiResponse({ status: 201, description: 'Assignment created successfully' })
  async createAssignment(
    @CurrentUser('id') teacherId: string,
    @Body() createAssignmentDto: {
      courseId: string;
      title: string;
      description: string;
      instructions: string;
      dueDate: string;
      maxScore: number;
      submissionType: 'file' | 'text' | 'both';
      allowLateSubmissions: boolean;
      lateSubmissionPenalty?: number;
      resources?: string[];
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Creating assignment for teacher: ${teacherId}`);

    const assignment = await this.teacherAssignmentsService.createAssignment(teacherId, createAssignmentDto);

    return {
      success: true,
      message: 'Assignment created successfully',
      data: assignment,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated successfully' })
  async updateAssignment(
    @CurrentUser('id') teacherId: string,
    @Param('id') assignmentId: string,
    @Body() updateAssignmentDto: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Updating assignment ${assignmentId} for teacher: ${teacherId}`);

    const assignment = await this.teacherAssignmentsService.updateAssignment(
      teacherId,
      assignmentId,
      updateAssignmentDto
    );

    return {
      success: true,
      message: 'Assignment updated successfully',
      data: assignment,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete assignment' })
  @ApiResponse({ status: 200, description: 'Assignment deleted successfully' })
  async deleteAssignment(
    @CurrentUser('id') teacherId: string,
    @Param('id') assignmentId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Deleting assignment ${assignmentId} for teacher: ${teacherId}`);

    await this.teacherAssignmentsService.deleteAssignment(teacherId, assignmentId);

    return {
      success: true,
      message: 'Assignment deleted successfully',
    };
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'Get assignment submissions' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Submissions retrieved successfully' })
  async getAssignmentSubmissions(
    @CurrentUser('id') teacherId: string,
    @Param('id') assignmentId: string,
    @Query('status') status?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting submissions for assignment ${assignmentId}, teacher: ${teacherId}`);

    const submissions = await this.teacherAssignmentsService.getAssignmentSubmissions(
      teacherId,
      assignmentId,
      status
    );

    return {
      success: true,
      message: 'Submissions retrieved successfully',
      data: submissions,
    };
  }

  @Post(':id/submissions/:submissionId/grade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grade assignment submission' })
  @ApiResponse({ status: 200, description: 'Submission graded successfully' })
  async gradeSubmission(
    @CurrentUser('id') teacherId: string,
    @Param('id') assignmentId: string,
    @Param('submissionId') submissionId: string,
    @Body() gradeDto: {
      score: number;
      feedback: string;
      rubricScores?: { criterionId: string; score: number }[];
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Grading submission ${submissionId} for assignment ${assignmentId}, teacher: ${teacherId}`);

    const gradedSubmission = await this.teacherAssignmentsService.gradeSubmission(
      teacherId,
      assignmentId,
      submissionId,
      gradeDto
    );

    return {
      success: true,
      message: 'Submission graded successfully',
      data: gradedSubmission,
    };
  }

  @Post(':id/bulk-grade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grade multiple submissions' })
  @ApiResponse({ status: 200, description: 'Submissions graded successfully' })
  async bulkGradeSubmissions(
    @CurrentUser('id') teacherId: string,
    @Param('id') assignmentId: string,
    @Body() bulkGradeDto: {
      submissions: {
        submissionId: string;
        score: number;
        feedback: string;
      }[];
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: { gradedCount: number };
  }> {
    this.logger.log(`Bulk grading submissions for assignment ${assignmentId}, teacher: ${teacherId}`);

    const result = await this.teacherAssignmentsService.bulkGradeSubmissions(
      teacherId,
      assignmentId,
      bulkGradeDto.submissions
    );

    return {
      success: true,
      message: 'Submissions graded successfully',
      data: result,
    };
  }

  @Get('statistics/overview')
  @ApiOperation({ summary: 'Get assignment statistics overview' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getAssignmentStatistics(
    @CurrentUser('id') teacherId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting assignment statistics for teacher: ${teacherId}`);

    const statistics = await this.teacherAssignmentsService.getAssignmentStatistics(teacherId);

    return {
      success: true,
      message: 'Statistics retrieved successfully',
      data: statistics,
    };
  }
}
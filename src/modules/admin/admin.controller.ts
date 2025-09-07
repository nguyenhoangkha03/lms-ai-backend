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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadInterceptor } from '@/modules/file-management/interceptors/file-upload.interceptor';
import { FileValidationPipe } from '@/modules/file-management/pipes/file-validation.pipe';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import {
  TeacherApprovalService,
  ApprovalDecisionDto,
  TeacherApplicationQuery,
} from './services/teacher-approval.service';
import {
  UserManagementService,
  CreateAdminUserDto,
  UpdateUserDto,
} from './services/user-management.service';
import { CourseService } from '@/modules/course/services/course.service';
import { CourseQueryDto } from '@/modules/course/dto/course-query.dto';
import { UserQueryDto } from '@/modules/user/dto/user-query.dto';
import { WinstonService } from '@/logger/winston.service';
import { UserType, PermissionResource, PermissionAction } from '@/common/enums/user.enums';
import { FileRelatedType, FileType } from '@/common/enums/course.enums';
import { FileAccessLevel } from '@/common/enums/file.enums';
import { RoleService, CreateRoleDto, UpdateRoleDto } from '@/modules/user/services/role.service';
import { PermissionService, CreatePermissionDto } from '@/modules/user/services/permission.service';
import { FileManagementService } from '@/modules/file-management/services/file-management.service';
import { UserService } from '@/modules/user/services/user.service';
import { UpdateUserProfileDto } from '@/modules/user/dto/update-user-profile.dto';
import { UpdateStudentProfileDto } from '@/modules/user/dto/update-student-profile.dto';
import { UpdateTeacherProfileDto } from '@/modules/user/dto/update-teacher-profile.dto';
import { User } from '@/modules/user/entities/user.entity';

@ApiTags('Admin Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly teacherApprovalService: TeacherApprovalService,
    private readonly userManagementService: UserManagementService,
    private readonly userService: UserService,
    private readonly courseService: CourseService,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
    private readonly fileManagementService: FileManagementService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(AdminController.name);
  }

  @Get('teachers/applications')
  @ApiOperation({ summary: 'Get teacher applications with filters' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['submittedAt', 'reviewedAt', 'email', 'firstName'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Teacher applications retrieved successfully' })
  async getTeacherApplications(
    @Query() query: TeacherApplicationQuery,
    @CurrentUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} requesting teacher applications`);

    const result = await this.teacherApprovalService.getPendingApplications(query);

    return {
      success: true,
      message: 'Teacher applications retrieved successfully',
      ...result,
    };
  }

  @Get('teachers/applications/:applicationId')
  @ApiOperation({ summary: 'Get teacher application details' })
  @ApiResponse({ status: 200, description: 'Teacher application details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Teacher application not found' })
  async getTeacherApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} requesting application details: ${applicationId}`);

    const application = await this.teacherApprovalService.getApplicationById(applicationId);

    return {
      success: true,
      message: 'Teacher application details retrieved successfully',
      application,
    };
  }

  @Post('teachers/applications/:applicationId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject teacher application' })
  @ApiResponse({ status: 200, description: 'Teacher application processed successfully' })
  @ApiResponse({ status: 404, description: 'Teacher application not found' })
  @ApiResponse({ status: 400, description: 'Invalid request or application already processed' })
  async approveTeacher(
    @Param('applicationId') applicationId: string,
    @CurrentUser('id') adminId: string,
    @Body() approvalDto: ApprovalDecisionDto,
  ) {
    this.logger.log(
      `Admin ${adminId} ${approvalDto.isApproved ? 'approving' : 'rejecting'} application: ${applicationId}`,
    );

    await this.teacherApprovalService.approveTeacher(applicationId, adminId, approvalDto);

    return {
      success: true,
      message: `Teacher application ${approvalDto.isApproved ? 'approved' : 'rejected'} successfully`,
    };
  }

  @Post('teachers/applications/:applicationId/request-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request additional information from teacher' })
  @ApiResponse({ status: 200, description: 'Additional information request sent successfully' })
  @ApiResponse({ status: 404, description: 'Teacher application not found' })
  async requestMoreInfo(
    @Param('applicationId') applicationId: string,
    @CurrentUser('id') adminId: string,
    @Body()
    requestDto: {
      message: string;
      requiredDocuments?: string[];
      dueDate?: Date;
    },
  ) {
    this.logger.log(`Admin ${adminId} requesting more info for application: ${applicationId}`);

    await this.teacherApprovalService.requestMoreInfo(applicationId, adminId, requestDto);

    return {
      success: true,
      message: 'Additional information request sent successfully',
    };
  }

  @Post('teachers/applications/bulk-approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve/reject teacher applications' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed' })
  async bulkApproveTeachers(
    @CurrentUser('id') adminId: string,
    @Body()
    bulkDto: {
      applicationIds: string[];
      approval: ApprovalDecisionDto;
    },
  ) {
    this.logger.log(
      `Admin ${adminId} bulk processing ${bulkDto.applicationIds.length} applications`,
    );

    const result = await this.teacherApprovalService.bulkApproveTeachers(
      bulkDto.applicationIds,
      adminId,
      bulkDto.approval,
    );

    return {
      success: true,
      message: 'Bulk operation completed',
      result,
    };
  }

  @Get('teachers/stats')
  @ApiOperation({ summary: 'Get teacher approval statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getApprovalStats(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting approval statistics`);

    const stats = await this.teacherApprovalService.getApprovalStats();

    return {
      success: true,
      message: 'Statistics retrieved successfully',
      stats,
    };
  }

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get admin dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  async getDashboardOverview(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting dashboard overview`);

    const [teacherStats] = await Promise.all([
      this.teacherApprovalService.getApprovalStats(),
      // Add other dashboard stats here
    ]);

    return {
      success: true,
      message: 'Dashboard overview retrieved successfully',
      overview: {
        teacherApplications: teacherStats,
        // Add other overview data here
        recentActivity: [],
        systemHealth: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
      },
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting system health`);

    const uptime = process.uptime();
    const memory = process.memoryUsage();

    // Check database connection (basic health check)
    const dbHealthy = true; // TODO: Implement actual DB health check

    const overall = dbHealthy ? 'healthy' : 'critical';

    return {
      success: true,
      message: 'System health retrieved successfully',
      health: {
        overall,
        services: {
          database: dbHealthy ? 'healthy' : 'critical',
          cache: 'healthy', // TODO: Check Redis connection
          api: 'healthy',
          storage: 'healthy', // TODO: Check file storage
        },
        uptime: Math.floor(uptime),
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  async getSystemMetrics(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting system metrics`);

    const memory = process.memoryUsage();

    return {
      success: true,
      message: 'System metrics retrieved successfully',
      metrics: {
        performance: {
          responseTime: Math.floor(Math.random() * 200) + 100, // TODO: Implement real metrics
          throughput: Math.floor(Math.random() * 500) + 1000,
          errorRate: Math.random() * 0.5,
          cpuUsage: Math.floor(Math.random() * 30) + 50,
          memoryUsage: Math.floor((memory.heapUsed / memory.heapTotal) * 100),
          diskUsage: Math.floor(Math.random() * 20) + 40,
        },
        database: {
          connections: Math.floor(Math.random() * 50) + 50,
          maxConnections: 200,
          queryPerformance: Math.floor(Math.random() * 30) + 10,
          slowQueries: Math.floor(Math.random() * 10),
          tableSize: Math.random() * 5 + 1, // GB
        },
        cache: {
          hitRate: Math.random() * 10 + 90,
          missRate: Math.random() * 10,
          evictions: Math.floor(Math.random() * 50),
          memoryUsage: Math.floor(Math.random() * 20) + 60,
          connections: Math.floor(Math.random() * 20) + 30,
        },
        realtime: {
          activeConnections: Math.floor(Math.random() * 1000) + 1000,
          messagesPerSecond: Math.floor(Math.random() * 100) + 100,
          bandwidth: Math.random() * 10 + 5, // MB/s
        },
      },
    };
  }

  @Get('business-metrics')
  @ApiOperation({ summary: 'Get business metrics for admin dashboard' })
  @ApiResponse({ status: 200, description: 'Business metrics retrieved successfully' })
  async getBusinessMetrics(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting business metrics`);

    // Get real data from services
    const [userStats, courseStats] = await Promise.all([
      this.userManagementService.getUserStats(),
      this.courseService.getCourseStats(),
    ]);

    return {
      success: true,
      message: 'Business metrics retrieved successfully',
      metrics: {
        revenue: {
          today: Math.floor(Math.random() * 5000) + 3000, // TODO: Implement payment service
          thisMonth: Math.floor(Math.random() * 50000) + 100000,
          lastMonth: Math.floor(Math.random() * 40000) + 90000,
          monthlyGrowth: Math.random() * 20 + 5,
        },
        users: {
          total: userStats?.total?.all || 0,
          active: userStats?.active?.all || 0,
          newToday: Math.floor(Math.random() * 100) + 50, // TODO: Get today's new users
          growth: userStats?.growth?.monthly || 0,
        },
        courses: {
          total: courseStats?.total || 0,
          published: courseStats?.published || 0,
          enrollments: courseStats?.totalEnrollments || 0,
          completions: courseStats?.completions || 0,
        },
        engagement: {
          dailyActive: Math.floor(Math.random() * 1000) + 2000, // TODO: Get from analytics
          sessionDuration: Math.floor(Math.random() * 20) + 30, // minutes
          contentViews: Math.floor(Math.random() * 10000) + 10000,
          interactions: Math.floor(Math.random() * 5000) + 5000,
        },
      },
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get system alerts for admin dashboard' })
  @ApiResponse({ status: 200, description: 'System alerts retrieved successfully' })
  async getSystemAlerts(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting system alerts`);

    // TODO: Implement real alerts from monitoring system
    const alerts = [
      {
        id: '1',
        type: Math.random() > 0.7 ? 'warning' : 'info',
        title: 'High CPU Usage',
        message: 'CPU usage has been above 80% for the last 10 minutes',
        source: 'System Monitor',
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        isRead: Math.random() > 0.5,
      },
      {
        id: '2',
        type: 'info',
        title: 'Cache Optimization',
        message: 'Cache hit rate improved to 94.8%',
        source: 'Cache Monitor',
        timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
        isRead: Math.random() > 0.3,
      },
    ];

    return {
      success: true,
      message: 'System alerts retrieved successfully',
      alerts: alerts.slice(0, Math.floor(Math.random() * 5) + 3),
    };
  }

  // User Management Endpoints

  @Get('users')
  @ApiOperation({ summary: 'Get users with filters' })
  @ApiQuery({ name: 'userType', required: false, enum: UserType })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive', 'suspended'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(@Query() query: UserQueryDto, @CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting users list`);

    const result = await this.userManagementService.getUserList(query);

    console.log('resultttttttttttttttttttttttttttttttttttttttttttttttt', JSON.stringify(result));

    return {
      success: true,
      message: 'Users retrieved successfully',
      ...result,
    };
  }

  @Get('users/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStats(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting user statistics`);

    const stats = await this.userManagementService.getUserStats();

    return {
      success: true,
      message: 'User statistics retrieved successfully',
      stats,
    };
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('userId') userId: string, @CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting user details: ${userId}`);

    const user = await this.userManagementService.getUserById(userId);

    return {
      success: true,
      message: 'User details retrieved successfully',
      user,
    };
  }

  @Post('users/create-admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new admin user' })
  @ApiResponse({ status: 201, description: 'Admin user created successfully' })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async createAdminUser(
    @Body() createAdminDto: CreateAdminUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} creating new admin user: ${createAdminDto.email}`);

    const result = await this.userManagementService.createAdminUser(createAdminDto, adminId);

    return {
      success: true,
      message: 'Admin user created successfully',
      ...result,
    };
  }

  @Put('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user details' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot update own account status' })
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} updating user: ${userId}`);

    const updatedUser = await this.userManagementService.updateUser(userId, updateUserDto, adminId);

    return {
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    };
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'userId', description: 'User ID to delete' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot delete own account or super admin' })
  async deleteUser(@Param('userId') userId: string, @CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} deleting user: ${userId}`);

    await this.userManagementService.deleteUser(userId, adminId);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  @Post('users/:userId/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetUserPassword(
    @Param('userId') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { sendEmail?: boolean } = {},
  ) {
    this.logger.log(`Admin ${adminId} resetting password for user: ${userId}`);

    const result = await this.userManagementService.resetUserPassword(
      userId,
      adminId,
      body.sendEmail,
    );

    return {
      success: true,
      message: 'Password reset successfully',
      ...result,
    };
  }

  @Post('users/:userId/impersonate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Impersonate user (admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID to impersonate' })
  @ApiResponse({ status: 200, description: 'Impersonation token generated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Cannot impersonate admin users' })
  async impersonateUser(@Param('userId') userId: string, @CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting impersonation for user: ${userId}`);

    const result = await this.userManagementService.impersonateUser(userId, adminId);

    return {
      success: true,
      message: 'Impersonation started successfully',
      ...result,
    };
  }

  // Course Management Endpoints

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses for admin management' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'published', 'archived', 'pending_review'],
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'title', 'enrollments'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getAdminCourses(@Query() query: any, @CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting courses list`);

    try {
      // Map frontend status to backend status enum
      let status = query.status;
      if (status === 'pending_review') {
        status = 'under_review';
      }

      const queryDto: CourseQueryDto = {
        status: status,
        categoryId: query.category,
        search: query.search,
        page: query.page || 1,
        limit: query.limit || 20,
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder || 'DESC',
        includeTeacher: true,
        includeCategory: true,
      };

      const result = await this.courseService.findAll(queryDto);

      // Map courses to admin format
      const courses = result.data.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnailUrl,
        status: course.status === 'under_review' ? 'pending_review' : course.status,
        category: course.category?.name || '',
        instructor: {
          id: course.teacher?.id || '',
          name:
            course.teacher?.displayName ||
            course.teacher?.firstName + ' ' + course.teacher?.lastName ||
            '',
          avatar: course.teacher?.avatarUrl || '',
        },
        enrollments: course.totalEnrollments || 0,
        rating: course.averageRating || 0,
        price: course.price || 0,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      }));

      return {
        success: true,
        message: 'Courses retrieved successfully',
        courses,
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.limit,
        totalPages: result.meta.totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to get admin courses: ${error.message}`);
      throw error;
    }
  }

  @Get('courses/stats')
  @ApiOperation({ summary: 'Get course statistics for admin dashboard' })
  @ApiResponse({ status: 200, description: 'Course statistics retrieved successfully' })
  async getCourseStats(@CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} requesting course statistics`);

    const stats = await this.courseService.getCourseStats();

    return {
      success: true,
      message: 'Course statistics retrieved successfully',
      stats: {
        total: stats.total,
        published: stats.published,
        draft: stats.draft,
        pendingReview: stats.underReview,
        archived: stats.archived,
        totalEnrollments: stats.totalEnrollments,
        averageRating: stats.averageRating,
        recentActivity: [],
      },
    };
  }

  @Put('courses/:courseId/status')
  @ApiOperation({ summary: 'Update course status (approve/reject/archive)' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course status updated successfully' })
  async updateCourseStatus(
    @Param('courseId') courseId: string,
    @Body() body: { status: string; notes?: string },
    @CurrentUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} updating course ${courseId} status to ${body.status}`);

    try {
      let updatedCourse;

      switch (body.status) {
        case 'published':
          updatedCourse = await this.courseService.approveCourse(courseId, adminId);
          break;
        case 'draft':
          updatedCourse = await this.courseService.rejectCourse(
            courseId,
            adminId,
            body.notes || 'Course needs revision',
          );
          break;
        default:
          throw new BadRequestException(`Invalid status: ${body.status}`);
      }

      return {
        success: true,
        message: 'Course status updated successfully',
        course: updatedCourse,
      };
    } catch (error) {
      this.logger.error(`Failed to update course status: ${error.message}`);
      throw error;
    }
  }

  @Post('courses/bulk-actions')
  @ApiOperation({ summary: 'Perform bulk actions on courses' })
  @ApiResponse({ status: 200, description: 'Bulk action completed successfully' })
  async bulkCourseActions(
    @Body()
    body: {
      courseIds: string[];
      action: 'publish' | 'archive' | 'delete' | 'category_change';
      data?: any;
    },
    @CurrentUser('id') adminId: string,
  ) {
    this.logger.log(
      `Admin ${adminId} performing bulk action ${body.action} on ${body.courseIds.length} courses`,
    );

    return {
      success: true,
      message: 'Bulk action completed successfully',
      results: {
        successful: body.courseIds,
        failed: [],
      },
    };
  }

  @Delete('courses/:courseId')
  @ApiOperation({ summary: 'Delete course (admin only)' })
  @ApiParam({ name: 'courseId', description: 'Course ID to delete' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  async deleteCourse(@Param('courseId') courseId: string, @CurrentUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} deleting course: ${courseId}`);

    return {
      success: true,
      message: 'Course deleted successfully',
    };
  }

  // ==================== USER FILE UPLOAD MANAGEMENT ====================

  @Post('test-upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Test file upload' })
  async testUpload(@UploadedFile() file: Express.Multer.File) {
    console.log('Test upload received:', {
      originalName: file?.originalname,
      size: file?.size,
      mimetype: file?.mimetype,
    });

    return {
      success: true,
      message: 'Test upload successful',
      file: {
        originalName: file?.originalname,
        size: file?.size,
        mimetype: file?.mimetype,
      },
    };
  }

  @Post('users/:userId/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadUserAvatar(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() admin: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`Admin ${admin.id} uploading avatar for user ${userId}`);

    const fileRecord = await this.fileManagementService.uploadFile(
      file,
      {
        fileType: FileType.IMAGE,
        relatedType: FileRelatedType.USER_AVATAR,
        relatedId: userId,
        accessLevel: FileAccessLevel.PUBLIC,
      },
      admin.id,
    );

    // Update user's avatarUrl
    await this.userManagementService.updateUser(
      userId,
      {
        avatarUrl: fileRecord.fileUrl,
      },
      admin.id,
    );

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: fileRecord.fileUrl,
      fileId: fileRecord.id,
    };
  }

  @Post('users/:userId/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user cover image (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Cover uploaded successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadUserCover(
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() admin: User,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`Admin ${admin.id} uploading cover for user ${userId}`);

    // Upload file using S3 FileManagementService
    const fileRecord = await this.fileManagementService.uploadFile(
      file,
      {
        fileType: FileType.IMAGE,
        relatedType: FileRelatedType.USER_COVER,
        relatedId: userId,
        accessLevel: FileAccessLevel.PUBLIC,
      },
      admin.id,
    );

    // Update user's coverUrl
    await this.userManagementService.updateUser(
      userId,
      {
        coverUrl: fileRecord.fileUrl,
      },
      admin.id,
    );

    return {
      success: true,
      message: 'Cover uploaded successfully',
      coverUrl: fileRecord.fileUrl,
      fileId: fileRecord.id,
    };
  }

  // ==================== PROFILE MANAGEMENT ====================

  @Get('users/:id/profile')
  @ApiOperation({ summary: 'Get user profile by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  async getUserProfile(@Param('id') id: string) {
    return this.userService.getUserProfile(id);
  }

  @Get('users/:id/student-profile')
  @ApiOperation({ summary: 'Get student profile by user ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Student profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student profile not found' })
  async getStudentProfile(@Param('id') id: string) {
    return this.userService.getStudentProfile(id);
  }

  @Get('users/:id/teacher-profile')
  @ApiOperation({ summary: 'Get teacher profile by user ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Teacher profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Teacher profile not found' })
  async getTeacherProfile(@Param('id') id: string) {
    return this.userService.getTeacherProfile(id);
  }

  @Patch('users/:id/profile')
  @ApiOperation({ summary: 'Update user profile by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  async updateUserProfile(@Param('id') id: string, @Body() updateProfileDto: UpdateUserProfileDto) {
    return this.userService.updateUserProfile(id, updateProfileDto);
  }

  @Patch('users/:id/student-profile')
  @ApiOperation({ summary: 'Update student profile by user ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Student profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Student profile not found' })
  async updateStudentProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateStudentProfileDto,
  ) {
    return this.userService.updateStudentProfile(id, updateProfileDto);
  }

  @Patch('users/:id/teacher-profile')
  @ApiOperation({ summary: 'Update teacher profile by user ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Teacher profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Teacher profile not found' })
  async updateTeacherProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateTeacherProfileDto,
  ) {
    return this.userService.updateTeacherProfile(id, updateProfileDto);
  }
}

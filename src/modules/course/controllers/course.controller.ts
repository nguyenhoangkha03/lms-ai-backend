import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CourseService } from '../services/course.service';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SecurityEventInterceptor } from '../../auth/interceptors/security-event.interceptor';
import { WinstonService } from '@/logger/winston.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CourseQueryDto } from '../dto/course-query.dto';
import { PermissionAction, PermissionResource, UserType } from '@/common/enums/user.enums';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../user/entities/user.entity';
import { OwnerOnly } from '../../auth/decorators/owner-only.decorator';
import { UpdateCourseDto } from '../dto/update-course.dto';
import {
  BulkDeleteCoursesDto,
  BulkUpdateCourseCategoryDto,
  BulkUpdateCourseStatusDto,
  BulkUpdateCourseTagsDto,
} from '../dto/bulk-course-operations.dto';
import { GenerateUploadUrlDto } from '../dto/generate-upload-url.dto';
import { ConfirmUploadDto } from '../dto/confirm-upload.dto';

@ApiTags('Course Management')
@Controller('course')
@UseInterceptors(SecurityEventInterceptor)
@ApiBearerAuth()
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CourseController.name);
  }

  // === PUBLIC ENDPOINTS === //
  @Get('public')
  @ApiOperation({ summary: 'Get published courses for public viewing' })
  @ApiResponse({ status: 200, description: 'Published courses retrieved' })
  async getPublicCourses(@Query() queryDto: CourseQueryDto) {
    // Debug logging
    console.log('🔍 getPublicCourses called with queryDto:', queryDto);
    
    queryDto.publishedOnly = true;
    queryDto.status = undefined;
    queryDto.includeTeacher = true; // Ensure teacher relation is loaded
    queryDto.includeCategory = true; // Also include category for display

    if (queryDto.sortBy === 'popularity') {
      queryDto.sortBy = 'totalEnrollments';
    }

    console.log('🔍 Final queryDto before service call:', queryDto);
    const result = await this.courseService.findAll(queryDto);
    console.log('🔍 Service returned:', { totalResults: result.data.length, total: result.meta.total });

    return {
      success: true,
      data: result.data,
      total: result.meta.total,
      page: result.meta.page,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrevious: result.meta.hasPrev,
    };
  }

  @Get('public/:slug')
  @Authorize({ requireAuth: false })
  @ApiOperation({ summary: 'Get published course details for public viewing' })
  @ApiParam({ name: 'slug', description: 'Course Slug' })
  @ApiResponse({ status: 200, description: 'Course details retrieved' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getPublicCourse(@Param('slug') slug: string) {
    const course = await this.courseService.findBySlug(slug, {
      includeTeacher: true,
      includeCategory: true,
      includeSections: true,
    });

    if (course.status !== 'published') {
      throw new NotFoundException('Course not found');
    }

    return {
      success: true,
      data: course,
    };
  }

  // ==================== TEACHER ENDPOINTS ==================== //
  @Post()
  @Authorize({
    roles: [UserType.TEACHER],
    rateLimit: { points: 10, duration: 3600 }, // 10 courses per hour
  })
  @ApiOperation({ summary: 'Create new course (Teachers only)' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() createCourseDto: CreateCourseDto, @CurrentUser() user: User) {
    return this.courseService.create(createCourseDto, user.id);
  }

  @Get('my-courses')
  @Authorize({
    roles: [UserType.TEACHER],
    rateLimit: { points: 50, duration: 60 },
  })
  @ApiOperation({ summary: 'Get current teacher courses' })
  @ApiResponse({ status: 200, description: 'Teacher courses retrieved' })
  async getMyCourses(@Query() queryDto: CourseQueryDto, @CurrentUser() user: User) {
    queryDto.teacherId = user.id;
    return this.courseService.findAll(queryDto);
  }

  @Patch(':id')
  //   @OwnerOnly({
  //     entityType: 'Course',
  //     entityField: 'id',
  //     userField: 'teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @Authorize({
    roles: [UserType.TEACHER],
    rateLimit: { points: 10, duration: 3600 }, // 10 courses per hour
  })
  @ApiOperation({ summary: 'Update course (Owner or Admin only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(
      `Updating course ${id} by user ${user.id} with data: ${JSON.stringify(updateCourseDto)}`,
    );
    return this.courseService.update(id, updateCourseDto, user.id);
  }

  @Post(':id/submit-for-review')
  @Authorize({
    roles: [UserType.TEACHER],
    rateLimit: { points: 10, duration: 3600 }, // 10 courses per hour
  })
  //   @OwnerOnly({
  //     entityType: 'Course',
  //     entityField: 'id',
  //     userField: 'teacherId',
  //   })
  @ApiOperation({ summary: 'Submit course for review (Owner only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course submitted for review' })
  @ApiResponse({ status: 400, description: 'Course cannot be submitted' })
  async submitForReview(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.courseService.submitForReview(id, user.id);
  }

  @Post(':id/publish')
  //   @OwnerOnly({
  //     entityType: 'Course',
  //     entityField: 'id',
  //     userField: 'teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @ApiOperation({ summary: 'Publish course directly (Owner or Admin only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course published successfully' })
  async publishCourse(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.courseService.publishCourse(id, user.id);
  }

  @Post(':id/unpublish')
  @OwnerOnly({
    entityType: 'Course',
    entityField: 'id',
    userField: 'teacherId',
    allowedRoles: [UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Unpublish course (Owner or Admin only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course unpublished successfully' })
  async unpublishCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    return this.courseService.unpublishCourse(id, user.id, reason);
  }

  // ==================== STUDENT ENDPOINTS ====================
  @Get()
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
    rateLimit: { points: 100, duration: 60 },
  })
  @ApiOperation({ summary: 'Get all courses with filtering' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async findAll(@Query() queryDto: CourseQueryDto, @CurrentUser() user: User) {
    if (user.userType === UserType.TEACHER) {
      return this.courseService.findAllByTeacher(queryDto, user.id);
    }
    return this.courseService.findAll(queryDto);
  }

  @Get(':id')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.READ,
      allowOwner: true,
      ownerField: 'teacherId',
    },
  })
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiQuery({ name: 'includeTeacher', required: false, type: Boolean })
  @ApiQuery({ name: 'includeCategory', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSections', required: false, type: Boolean })
  @ApiQuery({ name: 'includeStats', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Course found' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeTeacher') includeTeacher?: boolean,
    @Query('includeCategory') includeCategory?: boolean,
    @Query('includeSections') includeSections?: boolean,
    @Query('includeStats') includeStats?: boolean,
  ) {
    return this.courseService.findById(id, {
      includeTeacher,
      includeCategory,
      includeSections,
      includeStats,
    });
  }

  @Get(':id/statistics')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.READ,
      allowOwner: true,
      ownerField: 'teacherId',
    },
  })
  @ApiOperation({ summary: 'Get course statistics' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course statistics retrieved' })
  async getCourseStatistics(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.getCourseStatistics(id);
  }

  @Get(':id/file-statistics')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.READ,
      allowOwner: true,
      ownerField: 'teacherId',
    },
    rateLimit: { points: 20, duration: 60 },
  })
  @ApiOperation({ summary: 'Get course file upload statistics from database' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Course file statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', example: 'uuid-v4' },
        totalFiles: { type: 'number', example: 25 },
        filesByType: {
          type: 'object',
          properties: {
            video: { type: 'number', example: 5 },
            audio: { type: 'number', example: 2 },
            image: { type: 'number', example: 10 },
            document: { type: 'number', example: 3 },
            thumbnail: { type: 'number', example: 1 },
            trailer: { type: 'number', example: 1 },
            lesson: { type: 'number', example: 8 },
            promotional: { type: 'number', example: 2 },
          },
        },
        totalSize: { type: 'number', example: 524288000 },
        totalSizeMB: { type: 'number', example: 500.0 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseFileStatistics(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Fetching file statistics for course ${id}`);
    return this.courseService.getCourseFileStatistics(id);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post(':id/approve')
  @Authorize({
    roles: [UserType.ADMIN],
    rateLimit: { points: 20, duration: 60 },
  })
  @ApiOperation({ summary: 'Approve course for publication (Admin only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course approved successfully' })
  async approveCourse(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.courseService.approveCourse(id, user.id);
  }

  @Post(':id/reject')
  @Authorize({
    roles: [UserType.ADMIN],
    rateLimit: { points: 20, duration: 60 },
  })
  @ApiOperation({ summary: 'Reject course submission (Admin only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course rejected successfully' })
  async rejectCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    return this.courseService.rejectCourse(id, user.id, reason);
  }

  @Get('admin/awaiting-approval')
  @Authorize({
    roles: [UserType.ADMIN],
    rateLimit: { points: 50, duration: 60 },
  })
  @ApiOperation({ summary: 'Get courses awaiting approval (Admin only)' })
  @ApiResponse({ status: 200, description: 'Courses awaiting approval retrieved' })
  async getCoursesAwaitingApproval() {
    return this.courseService.getCoursesAwaitingApproval();
  }

  @Get('admin/statistics')
  @Authorize({
    roles: [UserType.ADMIN],
    rateLimit: { points: 20, duration: 60 },
  })
  @ApiOperation({ summary: 'Get global course statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Global statistics retrieved' })
  async getGlobalStatistics() {
    return this.courseService.getCourseStatistics();
  }

  @Delete(':id')
  @Authorize({
    roles: [UserType.TEACHER, UserType.ADMIN],
    // resource: {
    //   resource: PermissionResource.COURSE,
    //   action: PermissionAction.DELETE,
    //   allowOwner: true,
    //   ownerField: 'teacherId',
    // },
    rateLimit: { points: 5, duration: 300 }, // 5 deletes per 5 minutes
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course (Owner or Admin only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 204, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.courseService.remove(id, user.id);
  }

  // ==================== BULK OPERATIONS ====================

  @Patch('bulk/status')
  @Authorize({
    permissions: ['update:course'],
    rateLimit: { points: 5, duration: 300 },
  })
  @ApiOperation({ summary: 'Bulk update course status' })
  @ApiResponse({ status: 200, description: 'Courses status updated successfully' })
  async bulkUpdateStatus(
    @Body() bulkUpdateDto: BulkUpdateCourseStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.courseService.bulkUpdateStatus(bulkUpdateDto, user.id);
  }

  @Patch('bulk/category')
  @Authorize({
    permissions: ['update:course'],
    rateLimit: { points: 5, duration: 300 },
  })
  @ApiOperation({ summary: 'Bulk update course category' })
  @ApiResponse({ status: 200, description: 'Courses category updated successfully' })
  async bulkUpdateCategory(
    @Body() bulkUpdateDto: BulkUpdateCourseCategoryDto,
    @CurrentUser() user: User,
  ) {
    return this.courseService.bulkUpdateCategory(bulkUpdateDto, user.id);
  }

  @Patch('bulk/tags')
  @Authorize({
    permissions: ['update:course'],
    rateLimit: { points: 5, duration: 300 },
  })
  @ApiOperation({ summary: 'Bulk update course tags' })
  @ApiResponse({ status: 200, description: 'Courses tags updated successfully' })
  async bulkUpdateTags(@Body() bulkUpdateDto: BulkUpdateCourseTagsDto, @CurrentUser() user: User) {
    return this.courseService.bulkUpdateTags(bulkUpdateDto, user.id);
  }

  @Delete('bulk')
  @Authorize({
    permissions: ['delete:course'],
    rateLimit: { points: 3, duration: 600 }, // 3 bulk deletes per 10 minutes
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete courses' })
  @ApiResponse({ status: 200, description: 'Courses deleted successfully' })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteCoursesDto, @CurrentUser() user: User) {
    return this.courseService.bulkDelete(bulkDeleteDto, user.id);
  }

  // ==================== FILE UPLOADS ====================

  @Post(':id/thumbnail')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.UPDATE,
      allowOwner: true,
      ownerField: 'teacherId',
    },
    rateLimit: { points: 10, duration: 60 }, // 10 uploads per minute
  })
  @UseInterceptors(
    FileInterceptor('thumbnail', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course thumbnail (Owner only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Thumbnail uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  async uploadThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Uploading thumbnail for course ${id} by user ${user.id}`);
    return this.courseService.uploadThumbnail(id, file, user.id);
  }

  @Post(':id/trailer-video')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.UPDATE,
      allowOwner: true,
      ownerField: 'teacherId',
    },
    rateLimit: { points: 5, duration: 300 }, // 5 video uploads per 5 minutes
  })
  @UseInterceptors(
    FileInterceptor('trailerVideo', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // Reduced to 50MB for memory safety
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload course trailer video (Owner only) - Max 50MB' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Trailer video uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 413, description: 'File too large - Maximum 50MB allowed' })
  async uploadTrailerVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Uploading trailer video for course ${id} by user ${user.id}`);
    return this.courseService.uploadTrailerVideo(id, file, user.id);
  }

  @Delete(':id/thumbnail')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.UPDATE,
      allowOwner: true,
      ownerField: 'teacherId',
    },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course thumbnail (Owner only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 204, description: 'Thumbnail deleted successfully' })
  async deleteThumbnail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    this.logger.log(`Deleting thumbnail for course ${id} by user ${user.id}`);
    return this.courseService.deleteThumbnail(id, user.id);
  }

  @Delete(':id/trailer-video')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.UPDATE,
      allowOwner: true,
      ownerField: 'teacherId',
    },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course trailer video (Owner only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 204, description: 'Trailer video deleted successfully' })
  async deleteTrailerVideo(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    this.logger.log(`Deleting trailer video for course ${id} by user ${user.id}`);
    return this.courseService.deleteTrailerVideo(id, user.id);
  }

  // ==================== DIRECT S3 UPLOAD ====================

  @Post(':id/generate-upload-url')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.UPDATE,
      allowOwner: true,
      ownerField: 'teacherId',
    },
    rateLimit: { points: 20, duration: 60 }, // 20 URL generations per minute
  })
  @ApiOperation({ summary: 'Generate presigned URL for direct S3 upload (Owner only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        uploadId: { type: 'string', example: 'upload_1703123456789_abc123' },
        presignedUrl: { type: 'string', example: 'https://s3.amazonaws.com/bucket/...' },
        s3Key: { type: 'string', example: 'courses/uuid/trailer/video.mp4' },
        expiresIn: { type: 'number', example: 900 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid upload parameters' })
  @ApiResponse({ status: 403, description: 'Not authorized to upload to this course' })
  async generateUploadUrl(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() generateUrlDto: GenerateUploadUrlDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(
      `Generating upload URL for course ${courseId} by user ${user.id}, type: ${generateUrlDto.uploadType}`,
    );
    return this.courseService.generateUploadUrl(courseId, generateUrlDto, user.id);
  }

  @Post(':id/confirm-upload')
  @Authorize({
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.UPDATE,
      allowOwner: true,
      ownerField: 'teacherId',
    },
    rateLimit: { points: 20, duration: 60 }, // 20 confirmations per minute
  })
  @ApiOperation({ summary: 'Confirm successful upload and save to database (Owner only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Upload confirmed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        fileRecord: {
          type: 'object',
          description: 'Created file record in database',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Upload confirmation failed' })
  @ApiResponse({ status: 403, description: 'Not authorized to confirm upload' })
  async confirmUpload(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() confirmUploadDto: ConfirmUploadDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(
      `Confirming upload for course ${courseId} by user ${user.id}, uploadId: ${confirmUploadDto.uploadId}`,
    );
    return this.courseService.confirmUpload(courseId, confirmUploadDto, user.id);
  }

  // ==================== ENROLLMENT STATUS ====================

  @Get(':id/enrollment-status')
  @Authorize({ resource: { resource: PermissionResource.COURSE, action: PermissionAction.READ } })
  @ApiOperation({
    summary: 'Check if user is enrolled in a course',
    description: 'Kiểm tra xem user có enrolled trong khóa học hay không',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isEnrolled: { type: 'boolean' },
        enrollment: { type: 'object', nullable: true },
      },
    },
  })
  async checkEnrollmentStatus(
    @Param('id', ParseUUIDPipe) courseId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ isEnrolled: boolean; enrollment?: any }> {
    const enrollment = await this.courseService.getEnrollmentStatus(userId, courseId);
    return {
      isEnrolled: !!enrollment,
      enrollment: enrollment || undefined,
    };
  }

  @Get(':id/progress')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({
    summary: 'Get student progress for course',
    description: 'Lấy tiến độ học tập của student cho khóa học',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 200,
    description: 'Course progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        courseId: { type: 'string' },
        studentId: { type: 'string' },
        progressPercentage: { type: 'number' },
        completedLessons: { type: 'number' },
        totalLessons: { type: 'number' },
        timeSpent: { type: 'number' },
        lastAccessedAt: { type: 'string', format: 'date-time' },
        enrollment: { type: 'object' },
      },
    },
  })
  async getCourseProgress(
    @Param('id', ParseUUIDPipe) courseId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.courseService.getCourseProgress(userId, courseId);
  }

  // ==================== IMPORT/EXPORT ====================

  @Get('export')
  @Authorize({
    permissions: ['export:course'],
    rateLimit: { points: 3, duration: 3600 }, // 3 exports per hour
  })
  @ApiOperation({ summary: 'Export courses to CSV' })
  @ApiResponse({ status: 200, description: 'Courses exported successfully' })
  async exportCourses(@Query() queryDto: CourseQueryDto) {
    const csvContent = await this.courseService.exportCourses(queryDto);
    return {
      content: csvContent,
      filename: `courses-export-${new Date().toISOString().split('T')[0]}.csv`,
      mimeType: 'text/csv',
    };
  }

  // ==================== COURSE REVIEWS ====================

  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Get course reviews',
    description: 'Lấy danh sách reviews cho khóa học',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiQuery({ name: 'page', required: false, type: 'number', description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: 'number', description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Course reviews retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        reviews: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              rating: { type: 'number' },
              comment: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  fullName: { type: 'string' },
                  avatarUrl: { type: 'string' },
                },
              },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            averageRating: { type: 'number' },
            totalReviews: { type: 'number' },
            ratingDistribution: { type: 'object' },
          },
        },
      },
    },
  })
  async getCourseReviews(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.courseService.getCourseReviews(courseId, page, limit);
  }

  @Post(':id/reviews')
  @Authorize({
    roles: [UserType.STUDENT],
  })
  @ApiOperation({
    summary: 'Add course review',
    description: 'Thêm review cho khóa học (chỉ student đã enroll)',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: 201,
    description: 'Review added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Student not enrolled or already reviewed',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async addCourseReview(
    @Param('id', ParseUUIDPipe) courseId: string,
    @CurrentUser('id') userId: string,
    @Body() reviewDto: { rating: number; comment: string },
  ) {
    return this.courseService.addCourseReview(courseId, userId, reviewDto);
  }
}

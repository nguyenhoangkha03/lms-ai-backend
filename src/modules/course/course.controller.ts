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
} from '@nestjs/common';
import { CourseService } from './services/course.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SecurityEventInterceptor } from '../auth/interceptors/security-event.interceptor';
import { WinstonService } from '@/logger/winston.service';
import { Authorize } from '../auth/decorators/authorize.decorator';
import { CourseQueryDto } from './dto/course-query.dto';
import { PermissionAction, PermissionResource, UserType } from '@/common/enums/user.enums';
import { CreateCourseDto } from './dto/create-course.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { OwnerOnly } from '../auth/decorators/owner-only.decorator';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  BulkDeleteCoursesDto,
  BulkUpdateCourseCategoryDto,
  BulkUpdateCourseStatusDto,
  BulkUpdateCourseTagsDto,
} from './dto/bulk-course-operations.dto';

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
  @Authorize({ requireAuth: false })
  @ApiOperation({ summary: 'Get published courses for public viewing' })
  @ApiResponse({ status: 200, description: 'Published courses retrieved' })
  async getPublicCourses(@Query() queryDto: CourseQueryDto) {
    queryDto.publishedOnly = true;
    queryDto.status = undefined;
    return this.courseService.findAll(queryDto);
  }

  @Get('public/:id')
  @Authorize({ requireAuth: false })
  @ApiOperation({ summary: 'Get published course details for public viewing' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course details retrieved' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getPublicCourse(@Param('id', ParseUUIDPipe) id: string) {
    const course = await this.courseService.findById(id, {
      includeTeacher: true,
      includeCategory: true,
      includeSections: true,
    });

    if (course.status !== 'published') {
      throw new NotFoundException('Course not found');
    }

    return course;
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
  @OwnerOnly({
    entityType: 'Course',
    entityField: 'id',
    userField: 'teacherId',
    allowedRoles: [UserType.ADMIN],
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
    return this.courseService.update(id, updateCourseDto, user.id);
  }

  @Post(':id/submit-for-review')
  @OwnerOnly({
    entityType: 'Course',
    entityField: 'id',
    userField: 'teacherId',
  })
  @ApiOperation({ summary: 'Submit course for review (Owner only)' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course submitted for review' })
  @ApiResponse({ status: 400, description: 'Course cannot be submitted' })
  async submitForReview(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.courseService.submitForReview(id, user.id);
  }

  @Post(':id/publish')
  @OwnerOnly({
    entityType: 'Course',
    entityField: 'id',
    userField: 'teacherId',
    allowedRoles: [UserType.ADMIN],
  })
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
    permissions: ['read:course'],
    rateLimit: { points: 100, duration: 60 },
  })
  @ApiOperation({ summary: 'Get all courses with filtering' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async findAll(@Query() queryDto: CourseQueryDto) {
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
    resource: {
      resource: PermissionResource.COURSE,
      action: PermissionAction.DELETE,
      allowOwner: true,
      ownerField: 'teacherId',
    },
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
}

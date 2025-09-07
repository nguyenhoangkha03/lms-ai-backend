import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LessonService } from '../services/lesson.service';
import { FileUploadService } from '../services/file-upload.service';
import { SecurityEventInterceptor } from '../../auth/interceptors/security-event.interceptor';
import { WinstonService } from '@/logger/winston.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OwnerOnly } from '../../auth/decorators/owner-only.decorator';
import { User } from '../../user/entities/user.entity';
import { UserType } from '@/common/enums/user.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateLessonDto } from '../dto/lessons/create-lesson.dto';
import { UpdateLessonDto } from '../dto/lessons/update-lesson.dto';
import { LessonQueryDto } from '../dto/lessons/lesson-query.dto';
import { ModerateLessonDto } from '../dto/lessons/moderate-lesson.dto';
import { BulkUpdateLessonStatusDto } from '../dto/lessons/bulk-update-lesson-status.dto';
import { BulkDeleteLessonsDto } from '../dto/lessons/bulk-delete-lesson.dto';
import { ReorderLessonsDto } from '../dto/lessons/reorder-lesson.dto';
import { RestoreVersionDto } from '../dto/lessons/restore-version.dto';
import { UpdateVideoPositionDto } from '../dto/lessons/update-video-position.dto';

@ApiTags('Lesson Management')
@Controller('lessons')
@UseInterceptors(SecurityEventInterceptor)
@ApiBearerAuth()
export class LessonController {
  constructor(
    private readonly lessonService: LessonService,
    private readonly fileUploadService: FileUploadService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(LessonController.name);
  }

  // === PUBLIC ENDPOINTS === //
  @Get('public')
  @Authorize({ requireAuth: false })
  @ApiOperation({ summary: 'Get public preview lessons' })
  @ApiResponse({ status: 200, description: 'Preview lessons retrieved' })
  async getPublicLessons(@Query() queryDto: LessonQueryDto & PaginationDto) {
    queryDto.isPreview = true;
    queryDto.status = 'published' as any;
    return this.lessonService.findAll(queryDto);
  }

  @Get('public/:id')
  @Authorize({ requireAuth: false })
  @ApiOperation({ summary: 'Get public lesson details' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson found' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async getPublicLesson(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonService.findOne(id);
  }

  // === TEACHER ENDPOINTS === //
  @Post()
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Create new lesson (Teacher/Admin)' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Course ownership required' })
  async create(@Body() createLessonDto: CreateLessonDto, @CurrentUser() user: User) {
    if (!user || !user.id) {
      throw new BadRequestException('Authentication required');
    }
    this.logger.log(`Creating lesson: ${createLessonDto.title} by ${user.id}`);
    return this.lessonService.create(createLessonDto, user.id);
  }

  @Get()
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get lessons with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Lessons retrieved successfully' })
  async findAll(@Query() queryDto: LessonQueryDto & PaginationDto, @CurrentUser() _user: User) {
    return this.lessonService.findAll(queryDto);
  }

  @Get('course/:courseId')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get lessons with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Lessons retrieved successfully' })
  async findAllByCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() queryDto: LessonQueryDto & PaginationDto,
    @CurrentUser() _user: User,
  ) {
    return this.lessonService.findAllByCourse(courseId, queryDto);
  }

  @Get(':id')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get lesson by ID' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiQuery({ name: 'includeContent', required: false, type: Boolean })
  @ApiQuery({ name: 'includeProgress', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lesson found' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeContent') includeContent?: boolean,
    @Query('includeProgress') includeProgress?: boolean,
    @CurrentUser() user?: User,
  ) {
    return this.lessonService.findOne(id, user, includeContent, includeProgress);
  }

  @Patch(':id')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  // @OwnerOnly({
  //   entityType: 'Lesson',
  //   entityField: 'id',
  //   userField: 'course.teacherId',
  //   allowedRoles: [UserType.ADMIN],
  // })
  @ApiOperation({ summary: 'Update lesson (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Updating lesson ${id} by ${user.id}`);
    return this.lessonService.update(id, updateLessonDto, user.id);
  }

  @Delete(':id')
  //   @OwnerOnly({
  //     entityType: 'Lesson',
  //     entityField: 'id',
  //     userField: 'course.teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lesson (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 204, description: 'Lesson deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    this.logger.log(`Deleting lesson ${id} by ${user.id}`);
    return this.lessonService.remove(id, user.id);
  }

  // === PUBLISHING WORKFLOW === //
  @Post(':id/publish')
  //   @OwnerOnly({
  //     entityType: 'Lesson',
  //     entityField: 'id',
  //     userField: 'course.teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Publish lesson (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson published successfully' })
  @ApiResponse({ status: 400, description: 'Lesson cannot be published' })
  async publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    this.logger.log(`Publishing lesson ${id} by ${user.id}`);
    return this.lessonService.publish(id, user.id);
  }

  @Post(':id/unpublish')
  //   @OwnerOnly({
  //     entityType: 'Lesson',
  //     entityField: 'id',
  //     userField: 'course.teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Unpublish lesson (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson unpublished successfully' })
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Unpublishing lesson ${id} by ${user.id}`);
    return this.lessonService.update(
      id,
      {
        status: 'draft' as any,
        versionNote: reason,
      },
      user.id,
    );
  }

  // === CONTENT VERSIONING === //
  @Get(':id/versions')
  //   @OwnerOnly({
  //     entityType: 'Lesson',
  //     entityField: 'id',
  //     userField: 'course.teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get lesson content versions (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Versions retrieved successfully' })
  async getVersions(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.lessonService.getVersions(id, user.id);
  }

  @Post(':id/versions/:versionNumber/restore')
  //   @OwnerOnly({
  //     entityType: 'Lesson',
  //     entityField: 'id',
  //     userField: 'course.teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Restore lesson to specific version (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiParam({ name: 'versionNumber', description: 'Version number to restore' })
  @ApiResponse({ status: 200, description: 'Version restored successfully' })
  async restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber') versionNumber: number,
    @Body() restoreDto: RestoreVersionDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Restoring lesson ${id} to version ${versionNumber} by ${user.id}`);
    return this.lessonService.restoreVersion(id, versionNumber, user.id);
  }

  // === FILE MANAGEMENT === //
  @Post(':id/files')
  //   @OwnerOnly({
  //     entityType: 'Lesson',
  //     entityField: 'id',
  //     userField: 'course.teacherId',
  //     allowedRoles: [UserType.ADMIN],
  //   })
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload lesson attachments (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  async uploadFiles(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Uploading ${files.length} files for lesson ${id} by ${user.id}`);
    return this.fileUploadService.uploadLessonFiles(id, files, user.id);
  }

  @Get(':id/files')
  @Authorize({ permissions: ['read:lesson'] })
  @ApiOperation({ summary: 'Get lesson files' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async getFiles(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.fileUploadService.getLessonFiles(id, user);
  }

  @Delete(':id/files/:fileId')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lesson file (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Deleting file ${fileId} from lesson ${id} by ${user.id}`);
    return this.fileUploadService.deleteFile(fileId, user.id);
  }

  // === VIDEO MANAGEMENT === //
  @Post(':id/video')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @UseInterceptors(FilesInterceptor('video', 1))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload lesson video (Owner or Admin)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 201, description: 'Video uploaded successfully' })
  async uploadVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Uploading video for lesson ${id} by ${user.id}`);
    return this.fileUploadService.uploadLessonVideo(id, files[0], user.id);
  }

  @Get(':id/video/stream')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Stream lesson video' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Video stream URL' })
  async getVideoStream(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.fileUploadService.getVideoStreamUrl(id, user);
  }

  // === ADMIN ENDPOINTS === //
  @Post('bulk/status')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Bulk update lesson status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Lessons updated successfully' })
  async bulkUpdateStatus(
    @Body() bulkUpdateDto: BulkUpdateLessonStatusDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Bulk updating lesson status by ${user.id}`);
    return this.lessonService.bulkUpdateStatus(bulkUpdateDto, user.id);
  }

  @Delete('bulk')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk delete lessons (Admin only)' })
  @ApiResponse({ status: 204, description: 'Lessons deleted successfully' })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteLessonsDto, @CurrentUser() user: User) {
    this.logger.log(`Bulk deleting lessons by ${user.id}`);
    return this.lessonService.bulkDelete(bulkDeleteDto, user.id);
  }

  @Post('reorder')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Reorder lessons (Teacher/Admin)' })
  @ApiResponse({ status: 200, description: 'Lessons reordered successfully' })
  async reorderLessons(@Body() reorderDto: ReorderLessonsDto, @CurrentUser() user: User) {
    this.logger.log(`Reordering lessons by ${user.id}`);
    return this.lessonService.reorderLessons(reorderDto, user.id);
  }

  // === MODERATION ENDPOINTS === //
  @Post(':id/moderate')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Moderate lesson content (Admin only)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson moderated successfully' })
  async moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moderateDto: ModerateLessonDto,
    @CurrentUser() user: User,
  ) {
    this.logger.log(`Moderating lesson ${id} by ${user.id}`);
    return this.lessonService.moderate(id, moderateDto.status, moderateDto.reason, user.id);
  }

  @Get('moderation/pending')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get lessons pending moderation (Admin only)' })
  @ApiResponse({ status: 200, description: 'Pending lessons retrieved' })
  async getPendingModeration(@Query() queryDto: LessonQueryDto & PaginationDto) {
    queryDto.status = 'under_review' as any;
    return this.lessonService.findAll(queryDto);
  }

  // ==================== STUDENT PROGRESS ====================

  @Get(':id/video-position')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get student video position for lesson' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({
    status: 200,
    description: 'Video position retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        lessonId: { type: 'string' },
        lastPosition: { type: 'number' },
        progressPercentage: { type: 'number' },
        timeSpent: { type: 'number' },
      },
    },
  })
  async getVideoPosition(
    @Param('id') lessonId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!lessonId || lessonId === 'undefined' || lessonId === '[object Object]') {
      throw new BadRequestException('Valid lesson ID is required');
    }
    return this.lessonService.getVideoPosition(userId, lessonId);
  }

  @Post('video-position')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Update video position for lesson' })
  @ApiResponse({
    status: 200,
    description: 'Video position updated successfully',
  })
  async updateVideoPosition(
    @Body() updateVideoPositionDto: UpdateVideoPositionDto,
    @CurrentUser('id') userId: string,
  ) {
    const { lessonId, position, duration } = updateVideoPositionDto;
    
    if (!lessonId || lessonId === 'undefined' || lessonId === '[object Object]') {
      throw new BadRequestException('Valid lesson ID is required');
    }
    
    return this.lessonService.updateVideoPosition(userId, lessonId, position, duration);
  }

  @Get(':id/progress')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get student progress for lesson' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({
    status: 200,
    description: 'Lesson progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        lessonId: { type: 'string' },
        status: { type: 'string' },
        progressPercentage: { type: 'number' },
        timeSpent: { type: 'number' },
        lastPosition: { type: 'number' },
        completionDate: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  async getLessonProgress(
    @Param('id') lessonId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!lessonId || lessonId === 'undefined' || lessonId === '[object Object]') {
      throw new BadRequestException('Valid lesson ID is required');
    }
    return this.lessonService.getLessonProgress(userId, lessonId);
  }

  @Get(':id/resources')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get lesson resources (attachments, transcript, subtitles)' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiResponse({
    status: 200,
    description: 'Lesson resources retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              url: { type: 'string' },
              size: { type: 'number' },
              downloadable: { type: 'boolean' },
            },
          },
        },
        transcript: { type: 'string' },
        subtitles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              url: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getLessonResources(
    @Param('id') lessonId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!lessonId || lessonId === 'undefined' || lessonId === '[object Object]') {
      throw new BadRequestException('Valid lesson ID is required');
    }
    return this.lessonService.getLessonResources(userId, lessonId);
  }

  @Get(':id/notes')
  @Authorize({
    roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN],
  })
  @ApiOperation({ summary: 'Get student notes for lesson' })
  @ApiParam({ name: 'id', description: 'Lesson ID' })
  @ApiQuery({ name: 'includePrivate', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Lesson notes retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        lessonId: { type: 'string' },
        notes: { type: 'string', nullable: true },
        bookmarks: { type: 'array' },
      },
    },
  })
  async getLessonNotes(
    @Param('id') lessonId: string,
    @CurrentUser('id') userId: string,
    @Query('includePrivate') includePrivate?: boolean,
  ) {
    if (!lessonId || lessonId === 'undefined' || lessonId === '[object Object]') {
      throw new BadRequestException('Valid lesson ID is required');
    }
    return this.lessonService.getLessonNotes(userId, lessonId, includePrivate);
  }
}

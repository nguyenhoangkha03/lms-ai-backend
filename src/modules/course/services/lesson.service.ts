import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Repository } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseSection } from '../entities/course-section.entity';
import { FileUpload } from '../entities/file-upload.entity';
import { LessonProgress } from '../entities/lesson-progress.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { ContentVersion } from '../entities/content-version.entity';
import { CreateLessonDto } from '../dto/lessons/create-lesson.dto';
import { BulkUpdateLessonStatusDto } from '../dto/lessons/bulk-update-lesson-status.dto';
import { BulkDeleteLessonsDto } from '../dto/lessons/bulk-delete-lesson.dto';
import { ReorderLessonsDto } from '../dto/lessons/reorder-lesson.dto';
import { ContentModerationStatus, ContentStatus } from '@/common/enums/content.enums';
import { User } from '@/modules/user/entities/user.entity';
import { LessonQueryDto } from '../dto/lessons/lesson-query.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { UpdateLessonDto } from '../dto/lessons/update-lesson.dto';
// import { paginate } from 'nestjs-typeorm-paginate';
import { LessonType, LessonProgressStatus } from '@/common/enums/course.enums';

@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    @InjectRepository(ContentVersion)
    private readonly versionRepository: Repository<ContentVersion>,
    @InjectRepository(LessonProgress)
    private readonly progressRepository: Repository<LessonProgress>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
  ) {
    this.logger.setContext(LessonService.name);
  }

  async create(createLessonDto: CreateLessonDto, teacherId: string): Promise<Lesson> {
    this.logger.log(`Creating lesson: ${createLessonDto.title} by teacher ${teacherId}`);

    const course = await this.courseRepository.findOne({
      where: { id: createLessonDto.courseId, teacherId },
    });

    if (!course) {
      throw new ForbiddenException('You can only create lessons for your own courses');
    }

    const section = await this.sectionRepository.findOne({
      where: { id: createLessonDto.sectionId, courseId: createLessonDto.courseId },
    });

    if (!section) {
      throw new BadRequestException('Section does not belong to the specified course');
    }

    if (createLessonDto.sectionId) {
      const section = await this.sectionRepository.findOne({
        where: {
          id: createLessonDto.sectionId,
          courseId: createLessonDto.courseId,
        },
      });

      if (!section) {
        throw new BadRequestException('Section does not belong to the specified course');
      }
    }

    const slug = this.generateSlug(createLessonDto.title);

    const existingLesson = await this.lessonRepository.findOne({
      where: { slug, courseId: createLessonDto.courseId },
    });

    if (existingLesson) {
      throw new BadRequestException('A lesson with this title already exists in the course');
    }

    if (!createLessonDto.orderIndex) {
      const maxOrder = await this.lessonRepository
        .createQueryBuilder('lesson')
        .select('MAX(lesson.orderIndex)', 'maxOrder')
        .where('lesson.courseId = :courseId', { courseId: createLessonDto.courseId })
        .andWhere('lesson.sectionId = :sectionId', {
          sectionId: createLessonDto.sectionId || null,
        })
        .getRawOne();

      createLessonDto.orderIndex = (maxOrder?.maxOrder || 0) + 1;
    }

    const lesson = this.lessonRepository.create({
      ...createLessonDto,
      slug,
      status: ContentStatus.DRAFT,
      moderationStatus: ContentModerationStatus.PENDING,
      createdBy: teacherId,
      updatedBy: teacherId,
    });

    const savedLesson = await this.lessonRepository.save(lesson);

    course.totalLessons++;
    await this.courseRepository.save(course);

    section.totalLessons++;
    await this.sectionRepository.save(section);

    await this.createContentVersion(
      savedLesson,
      {
        content: createLessonDto.content,
        description: createLessonDto.description,
        versionNote: 'Initial version',
      },
      teacherId,
    );

    await this.updateCourseLessonCount(createLessonDto.courseId);

    await this.clearLessonCache(createLessonDto.courseId);

    this.logger.log(`Lesson created successfully: ${savedLesson.id}`);
    return savedLesson;
  }

  async bulkUpdateStatus(
    _bulkUpdateDto: BulkUpdateLessonStatusDto,
    _userId: string,
  ): Promise<void> {
    // viết sau
  }

  async bulkDelete(_bulkDeleteDto: BulkDeleteLessonsDto, _userId: string): Promise<void> {
    // viết sau
  }

  async reorderLessons(_reorderDto: ReorderLessonsDto, _userId: string): Promise<void> {
    // viết sau
  }

  async findOne(
    id: string,
    user?: User,
    includeContent = false,
    includeProgress = false,
  ): Promise<Lesson> {
    const cacheKey = `lesson:${id}:${user?.id || 'public'}:${includeContent}:${includeProgress}`;
    const cached = await this.cacheService.get<Lesson>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .leftJoinAndSelect('lesson.section', 'section')
      .where('lesson.id = :id', { id });

    // Include files/attachments
    queryBuilder.leftJoinAndSelect('lesson.files', 'files', 'files.isActive = :isActive', {
      isActive: true,
    });

    // Include content versions for authorized users
    if (includeContent && user) {
      queryBuilder.leftJoinAndSelect('lesson.versions', 'versions');
    }

    // Include progress for enrolled students
    if (includeProgress && user) {
      queryBuilder.leftJoinAndSelect(
        'lesson.progress',
        'progress',
        'progress.studentId = :userId',
        { userId: user.id },
      );
    }

    const lesson = await queryBuilder.getOne();

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Access control checks
    await this.checkLessonAccess(lesson, user);

    // Filter content based on user permissions
    const filteredLesson = await this.filterLessonContent(lesson, user);

    await this.cacheService.set(cacheKey, filteredLesson, 300); // Cache 5 minutes
    return filteredLesson;
  }

  /**
   * Get lessons with filtering and pagination
   */
  async findAll(queryDto: LessonQueryDto & PaginationDto): Promise<any> {
    const queryBuilder = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .leftJoinAndSelect('lesson.section', 'section')
      .leftJoinAndSelect('lesson.files', 'files', 'files.isActive = :isActive', {
        isActive: true,
      });

    // Apply filters
    if (queryDto.courseId) {
      queryBuilder.andWhere('lesson.courseId = :courseId', { courseId: queryDto.courseId });
    }

    if (queryDto.sectionId) {
      queryBuilder.andWhere('lesson.sectionId = :sectionId', { sectionId: queryDto.sectionId });
    }

    if (queryDto.lessonType) {
      queryBuilder.andWhere('lesson.lessonType = :lessonType', {
        lessonType: queryDto.lessonType,
      });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('lesson.status = :status', { status: queryDto.status });
    }

    if (queryDto.isPreview !== undefined) {
      queryBuilder.andWhere('lesson.isPreview = :isPreview', {
        isPreview: queryDto.isPreview,
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere('(lesson.title LIKE :search OR lesson.description LIKE :search)', {
        search: `%${queryDto.search}%`,
      });
    }

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const sortField = queryDto.sortBy || 'orderIndex';
    const sortOrder = queryDto.sortOrder || 'ASC';
    queryBuilder.orderBy(`lesson.${sortField}`, sortOrder);

    const [lessons, total] = await queryBuilder.getManyAndCount();

    return {
      lessons,
      total,
      page,
      limit,
    };
  }

  async findAllByCourse(courseId: string, queryDto: LessonQueryDto & PaginationDto): Promise<any> {
    const queryBuilder = this.lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .leftJoinAndSelect('lesson.section', 'section')
      .leftJoinAndSelect('lesson.files', 'files', 'files.isActive = :isActive', {
        isActive: true,
      });

    queryBuilder.andWhere('lesson.courseId = :courseId', { courseId });

    if (queryDto.sectionId) {
      queryBuilder.andWhere('lesson.sectionId = :sectionId', { sectionId: queryDto.sectionId });
    }

    if (queryDto.lessonType) {
      queryBuilder.andWhere('lesson.lessonType = :lessonType', {
        lessonType: queryDto.lessonType,
      });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('lesson.status = :status', { status: queryDto.status });
    }

    if (queryDto.isPreview !== undefined) {
      queryBuilder.andWhere('lesson.isPreview = :isPreview', {
        isPreview: queryDto.isPreview,
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere('(lesson.title LIKE :search OR lesson.description LIKE :search)', {
        search: `%${queryDto.search}%`,
      });
    }

    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const sortField = queryDto.sortBy || 'orderIndex';
    const sortOrder = queryDto.sortOrder || 'ASC';
    queryBuilder.orderBy(`lesson.${sortField}`, sortOrder);

    const [lessons, total] = await queryBuilder.getManyAndCount();

    return {
      lessons,
      total,
      page,
      limit,
    };
  }

  /**
   * Update lesson with content versioning
   */
  async update(id: string, updateLessonDto: UpdateLessonDto, userId: string): Promise<Lesson> {
    this.logger.log(`Updating lesson ${id} by user ${userId}`);

    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check ownership
    if (lesson.course.teacherId !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenException('You can only update your own lessons');
    }

    // Handle slug update if title changed
    if (updateLessonDto.title && updateLessonDto.title !== lesson.title) {
      const newSlug = this.generateSlug(updateLessonDto.title);

      const existingLesson = await this.lessonRepository.findOne({
        where: {
          slug: newSlug,
          courseId: lesson.courseId,
          id: { $ne: id } as any,
        },
      });

      if (existingLesson) {
        throw new BadRequestException('A lesson with this title already exists in the course');
      }

      updateLessonDto.slug = newSlug;
    }

    // Create new content version if content changed
    if (updateLessonDto.content && updateLessonDto.content !== lesson.content) {
      await this.createContentVersion(
        lesson,
        {
          content: updateLessonDto.content,
          description: updateLessonDto.description,
          versionNote: updateLessonDto.versionNote || 'Content update',
        },
        userId,
      );
    }

    // Update lesson
    const updatedLesson = await this.lessonRepository.save({
      ...lesson,
      ...updateLessonDto,
      updatedBy: userId,
      moderationStatus:
        lesson.status === ContentStatus.PUBLISHED
          ? ContentModerationStatus.PENDING
          : lesson.moderationStatus,
    });

    // Clear cache
    await this.clearLessonCache(lesson.courseId);

    this.logger.log(`Lesson updated successfully: ${id}`);
    return updatedLesson;
  }

  /**
   * Delete lesson (soft delete)
   */
  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting lesson ${id} by user ${userId}`);

    const lesson = await this.lessonRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check ownership
    if (lesson.course.teacherId !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenException('You can only delete your own lessons');
    }

    // Soft delete
    await this.lessonRepository.softDelete(id);

    // Update course lesson count
    await this.updateCourseLessonCount(lesson.courseId);

    // Clear cache
    await this.clearLessonCache(lesson.courseId);

    this.logger.log(`Lesson deleted successfully: ${id}`);
  }

  /**
   * Publish lesson (make it available to students)
   */
  async publish(id: string, userId: string): Promise<Lesson> {
    const lesson = await this.findOne(id);

    // Check ownership
    if (lesson.course.teacherId !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenException('You can only publish your own lessons');
    }

    // Validate lesson is ready for publishing
    await this.validateLessonForPublishing(lesson);

    lesson.status = ContentStatus.PUBLISHED;
    lesson.moderationStatus = ContentModerationStatus.APPROVED;
    lesson.publishedAt = new Date();
    lesson.updatedBy = userId;

    const publishedLesson = await this.lessonRepository.save(lesson);

    // Clear cache
    await this.clearLessonCache(lesson.courseId);

    this.logger.log(`Lesson published successfully: ${id}`);
    return publishedLesson;
  }

  /**
   * Create content version for lesson
   */
  private async createContentVersion(
    lesson: Lesson,
    versionData: {
      content?: string;
      description?: string;
      versionNote?: string;
    },
    userId: string,
  ): Promise<ContentVersion> {
    // Get current version number
    const lastVersion = await this.versionRepository.findOne({
      where: { lessonId: lesson.id },
      order: { versionNumber: 'DESC' },
    });

    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    const version = this.versionRepository.create({
      lessonId: lesson.id,
      versionNumber,
      content: versionData.content || lesson.content,
      description: versionData.description || lesson.description,
      versionNote: versionData.versionNote,
      createdBy: userId,
    });

    return this.versionRepository.save(version);
  }

  /**
   * Get lesson content versions
   */
  async getVersions(lessonId: string, userId: string): Promise<ContentVersion[]> {
    const lesson = await this.findOne(lessonId);

    // Check access
    if (lesson.course.teacherId !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenException('You can only view versions of your own lessons');
    }

    return this.versionRepository.find({
      where: { lessonId },
      order: { versionNumber: 'DESC' },
      relations: ['creator'],
    });
  }

  /**
   * Restore lesson to specific version
   */
  async restoreVersion(lessonId: string, versionNumber: number, userId: string): Promise<Lesson> {
    const lesson = await this.findOne(lessonId);

    // Check ownership
    if (lesson.course.teacherId !== userId && !this.isAdmin(userId)) {
      throw new ForbiddenException('You can only restore versions of your own lessons');
    }

    const version = await this.versionRepository.findOne({
      where: { lessonId, versionNumber },
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Update lesson with version content
    lesson.content = version.content;
    lesson.description = version.description;
    lesson.updatedBy = userId;

    const restoredLesson = await this.lessonRepository.save(lesson);

    // Create new version entry
    await this.createContentVersion(
      lesson,
      {
        content: version.content,
        description: version.description,
        versionNote: `Restored from version ${versionNumber}`,
      },
      userId,
    );

    // Clear cache
    await this.clearLessonCache(lesson.courseId);

    this.logger.log(`Lesson restored to version ${versionNumber}: ${lessonId}`);
    return restoredLesson;
  }

  /**
   * Moderate lesson content
   */
  async moderate(
    id: string,
    status: ContentModerationStatus,
    reason?: string,
    moderatorId?: string,
  ): Promise<Lesson> {
    const lesson = await this.findOne(id);

    lesson.moderationStatus = status;
    lesson.moderationReason = reason;
    lesson.moderatedBy = moderatorId;
    lesson.moderatedAt = new Date();

    if (status === ContentModerationStatus.REJECTED) {
      lesson.status = ContentStatus.DRAFT;
    }

    const moderatedLesson = await this.lessonRepository.save(lesson);

    // Clear cache
    await this.clearLessonCache(lesson.courseId);

    this.logger.log(`Lesson moderated: ${id}, status: ${status}`);
    return moderatedLesson;
  }

  // === UTILITY METHODS === //

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async checkLessonAccess(lesson: Lesson, user?: User): Promise<void> {
    // Public preview lessons
    if (lesson.isPreview && lesson.status === ContentStatus.PUBLISHED) {
      return;
    }

    // Require authentication for non-preview lessons
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Teachers can access their own lessons
    if (lesson.course.teacherId === user.id) {
      return;
    }

    // Admins can access all lessons
    if (this.isAdmin(user.id)) {
      return;
    }

    // Students need enrollment to access lessons
    // This check would be implemented with enrollment service
    // For now, we'll allow access if lesson is published
    if (lesson.status !== ContentStatus.PUBLISHED) {
      throw new ForbiddenException('Lesson not available');
    }
  }

  private async filterLessonContent(lesson: Lesson, user?: User): Promise<Lesson> {
    // Remove sensitive information for non-owners
    if (!user || (lesson.course.teacherId !== user.id && !this.isAdmin(user.id))) {
      delete lesson.moderationReason;
      delete lesson.moderatedBy;
      delete lesson.moderatedAt;

      // Filter file access based on permissions
      if (lesson.files) {
        lesson.files = lesson.files.filter(file => file.isPublic);
      }
    }

    return lesson;
  }

  private async validateLessonForPublishing(lesson: Lesson): Promise<void> {
    if (!lesson.title?.trim()) {
      throw new BadRequestException('Lesson title is required for publishing');
    }

    if (!lesson.content?.trim() && lesson.lessonType !== LessonType.LIVE_SESSION) {
      throw new BadRequestException('Lesson content is required for publishing');
    }

    if (lesson.lessonType === LessonType.VIDEO && !lesson.videoUrl) {
      throw new BadRequestException('Video URL is required for video lessons');
    }
  }

  private async updateCourseLessonCount(courseId: string): Promise<void> {
    const count = await this.lessonRepository.count({
      where: { courseId, status: ContentStatus.PUBLISHED },
    });

    await this.courseRepository.update(courseId, { totalLessons: count });
  }

  private async clearLessonCache(courseId: string): Promise<void> {
    const patterns = [`lesson:*`, `course:${courseId}:*`, `lessons:course:${courseId}:*`];

    for (const pattern of patterns) {
      await this.cacheService.deletePattern(pattern);
    }
  }

  private isAdmin(_userId: string): boolean {
    // TODO: Implement proper admin role check
    // For now, return true to bypass admin check during development
    return true;
  }

  // ==================== STUDENT PROGRESS METHODS ====================

  async getVideoPosition(userId: string, lessonId: string) {
    const progress = await this.progressRepository.findOne({
      where: { studentId: userId, lessonId },
    });

    if (!progress) {
      // Return default values if no progress exists yet
      return {
        lessonId,
        lastPosition: 0,
        progressPercentage: 0,
        timeSpent: 0,
      };
    }

    return {
      lessonId,
      lastPosition: progress.lastPosition,
      progressPercentage: progress.progressPercentage,
      timeSpent: progress.timeSpent,
    };
  }

  async updateVideoPosition(userId: string, lessonId: string, position: number, duration: number) {
    // Find or create lesson progress record
    let progress = await this.progressRepository.findOne({
      where: { studentId: userId, lessonId },
    });

    if (!progress) {
      // Get the lesson to get courseId
      const lesson = await this.lessonRepository.findOne({
        where: { id: lessonId },
      });

      if (!lesson) {
        throw new BadRequestException('Lesson not found');
      }

      // Find enrollment for this student and course
      const enrollment = await this.enrollmentRepository.findOne({
        where: { studentId: userId, courseId: lesson.courseId },
      });

      if (!enrollment) {
        throw new BadRequestException('Student not enrolled in this course');
      }

      // Create new progress record
      progress = this.progressRepository.create({
        studentId: userId,
        lessonId,
        enrollmentId: enrollment.id,
        progressPercentage: 0,
        timeSpent: 0,
        lastPosition: position,
        status: LessonProgressStatus.IN_PROGRESS,
      });
    } else {
      // Update existing progress
      progress.lastPosition = position;
      
      // Update progress percentage based on video position
      if (duration > 0) {
        progress.progressPercentage = Math.min(100, (position / duration) * 100);
      }
      
      // Mark as completed if video is 95% or more watched
      if (progress.progressPercentage >= 95 && progress.status !== LessonProgressStatus.COMPLETED) {
        progress.status = LessonProgressStatus.COMPLETED;
        progress.completionDate = new Date();
      }
    }

    await this.progressRepository.save(progress);

    return {
      lessonId,
      lastPosition: progress.lastPosition,
      progressPercentage: progress.progressPercentage,
      timeSpent: progress.timeSpent,
      status: progress.status,
    };
  }

  async getLessonProgress(userId: string, lessonId: string) {
    const progress = await this.progressRepository.findOne({
      where: { studentId: userId, lessonId },
      relations: ['lesson'],
    });

    if (!progress) {
      // Return default values if no progress exists yet
      return {
        lessonId,
        status: 'not_started',
        progressPercentage: 0,
        timeSpent: 0,
        lastPosition: 0,
        completionDate: null,
      };
    }

    return {
      lessonId,
      status: progress.status,
      progressPercentage: progress.progressPercentage,
      timeSpent: progress.timeSpent,
      lastPosition: progress.lastPosition,
      completionDate: progress.completionDate,
    };
  }

  async getLessonResources(userId: string, lessonId: string) {
    // First check if lesson exists and user has access
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new BadRequestException('Lesson not found');
    }

    // Check if user is enrolled in the course (for students) or owns the course (for teachers)
    const hasAccess = await this.hasLessonAccess(userId, lesson);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this lesson');
    }

    // Get lesson files/attachments
    const attachments = await this.fileRepository.find({
      where: { lessonId },
      select: ['id', 'originalName', 'mimeType', 'fileUrl', 'fileSize'],
    });

    // Transform attachments to match frontend expected format
    const formattedAttachments = attachments.map(file => ({
      id: file.id,
      name: file.originalName,
      type: file.mimeType,
      url: file.fileUrl,
      size: file.fileSize,
      downloadable: true,
    }));

    return {
      attachments: formattedAttachments,
      transcript: lesson.transcript || null,
      subtitles: lesson.metadata?.subtitles || [],
    };
  }

  private async hasLessonAccess(userId: string, lesson: any): Promise<boolean> {
    // If user is teacher of the course
    if (lesson.course.teacherId === userId) {
      return true;
    }

    // If user is student, check enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId: lesson.courseId },
    });

    return !!enrollment;
  }

  async getLessonNotes(userId: string, lessonId: string, includePrivate = true) {
    const progress = await this.progressRepository.findOne({
      where: { studentId: userId, lessonId },
    });

    if (!progress) {
      // Return default values if no progress exists yet
      return {
        lessonId,
        notes: null,
        bookmarks: [],
      };
    }

    return {
      lessonId,
      notes: includePrivate ? progress.notes : null,
      bookmarks: progress.bookmarks || [],
    };
  }
}

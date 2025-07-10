import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In, Between } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseSection } from '../entities/course-section.entity';
import { Lesson } from '../entities/lesson.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Category } from '../entities/category.entity';
import { CacheService } from '@/cache/cache.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { CourseStatus, EnrollmentStatus, PaymentStatus } from '@/common/enums/course.enums';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';
import { CreateCourseDto } from '../dto/create-course.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CourseQueryDto } from '../dto/course-query.dto';
import {
  BulkUpdateCourseStatusDto,
  BulkUpdateCourseCategoryDto,
  BulkUpdateCourseTagsDto,
  BulkDeleteCoursesDto,
} from '../dto/bulk-course-operations.dto';
import { WinstonService } from '@/logger/winston.service';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CourseStatistics {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrollments: number;
  avgRating: number;
  avgPrice: number;
  topCategories: Array<{ categoryId: string; name: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  recentlyCreated: number;
  recentlyUpdated: number;
}

@Injectable()
export class CourseService {
  private readonly CACHE_TTL = 3600;

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CourseService.name);
  }

  // ==================== CRUD OPERATIONS ==================== //

  async create(createCourseDto: CreateCourseDto, teacherId: string): Promise<Course> {
    const existingCourse = await this.courseRepository.findOne({
      where: { slug: createCourseDto.slug },
    });

    if (existingCourse) {
      throw new BadRequestException('Course with this slug already exists');
    }

    const category = await this.categoryRepository.findOne({
      where: { id: createCourseDto.categoryId, isActive: true },
    });

    if (!category) {
      throw new BadRequestException('Invalid category ID');
    }

    const course = this.courseRepository.create({
      ...createCourseDto,
      teacherId,
      status: CourseStatus.DRAFT,
      availableFrom: createCourseDto.availableFrom
        ? new Date(createCourseDto.availableFrom)
        : undefined,
      availableUntil: createCourseDto.availableUntil
        ? new Date(createCourseDto.availableUntil)
        : undefined,
    });

    const savedCourse = await this.courseRepository.save(course);

    await this.updateCategoryCourseCount(savedCourse.categoryId);

    await this.auditLogService.createAuditLog({
      userId: teacherId,
      action: AuditAction.CREATE,
      entityType: 'Course',
      entityId: savedCourse.id,
      description: `Course created: ${savedCourse.title}`,
      level: AuditLevel.INFO,
      metadata: {
        courseTitle: savedCourse.title,
        courseSlug: savedCourse.slug,
        categoryId: savedCourse.categoryId,
      },
    });

    this.logger.log(`Course created: ${savedCourse.title} by teacher ${teacherId}`);

    return this.findById(savedCourse.id, { includeTeacher: true, includeCategory: true });
  }

  async findAll(queryDto: CourseQueryDto): Promise<PaginatedResult<Course>> {
    const cacheKey = `courses:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheService.get<PaginatedResult<Course>>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.createCourseQueryBuilder(queryDto);
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const sortBy = queryDto.sortOrder ?? 'createdAt';

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(queryDto.limit);

    const sortField = this.mapSortField(sortBy);
    queryBuilder.orderBy(`course.${sortField}`, queryDto.sortOrder);

    const [courses, total] = await queryBuilder.getManyAndCount();

    const result: PaginatedResult<Course> = {
      data: courses,
      meta: {
        page: page,
        limit: limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async findById(
    id: string,
    options?: {
      includeTeacher?: boolean;
      includeCategory?: boolean;
      includeSections?: boolean;
      includeEnrollments?: boolean;
      includeStats?: boolean;
    },
  ): Promise<Course> {
    const cacheKey = `course:${id}:${JSON.stringify(options)}`;
    const cached = await this.cacheService.get<Course>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .where('course.id = :id', { id });

    if (options?.includeTeacher) {
      queryBuilder.leftJoinAndSelect('course.teacher', 'teacher');
    }

    if (options?.includeCategory) {
      queryBuilder.leftJoinAndSelect('course.category', 'category');
    }

    if (options?.includeSections) {
      queryBuilder
        .leftJoinAndSelect('course.sections', 'sections')
        .leftJoinAndSelect('sections.lessons', 'lessons')
        .addOrderBy('sections.orderIndex', 'ASC')
        .addOrderBy('lessons.orderIndex', 'ASC');
    }

    if (options?.includeEnrollments) {
      queryBuilder.leftJoinAndSelect('course.enrollments', 'enrollments');
    }

    const course = await queryBuilder.getOne();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (options?.includeStats) {
      course['statistics'] = await this.getCourseStatistics(id);
    }

    await this.cacheService.set(cacheKey, course, this.CACHE_TTL);
    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, userId: string): Promise<Course> {
    const course = await this.findById(id);

    if (updateCourseDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateCourseDto.categoryId, isActive: true },
      });

      if (!category) {
        throw new BadRequestException('Invalid category ID');
      }
    }

    const oldValues = {
      title: course.title,
      status: course.status,
      categoryId: course.categoryId,
      price: course.price,
    };

    Object.assign(course, {
      ...updateCourseDto,
      availableFrom: updateCourseDto.availableFrom
        ? new Date(updateCourseDto.availableFrom)
        : course.availableFrom,
      availableUntil: updateCourseDto.availableUntil
        ? new Date(updateCourseDto.availableUntil)
        : course.availableUntil,
    });

    const updatedCourse = await this.courseRepository.save(course);

    if (updateCourseDto.categoryId && updateCourseDto.categoryId !== oldValues.categoryId) {
      await this.updateCategoryCourseCount(oldValues.categoryId);
      await this.updateCategoryCourseCount(updateCourseDto.categoryId);
    }

    await this.clearCourseCache(id);

    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    for (const [key, newValue] of Object.entries(updateCourseDto)) {
      if (oldValues[key] !== newValue) {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue,
        });
      }
    }

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Course',
      entityId: id,
      description: `Course updated: ${updatedCourse.title}`,
      level: AuditLevel.INFO,
      changes,
      metadata: {
        courseTitle: updatedCourse.title,
        updatedFields: Object.keys(updateCourseDto),
      },
    });

    this.logger.log(`Course updated: ${updatedCourse.title} by user ${userId}`);
    return updatedCourse;
  }

  async remove(id: string, userId: string): Promise<void> {
    const course = await this.findById(id);

    const enrollmentCount = await this.enrollmentRepository.count({
      where: { courseId: id },
    });

    if (enrollmentCount > 0) {
      course.status = CourseStatus.ARCHIVED;
      await this.courseRepository.save(course);
    } else {
      await this.courseRepository.remove(course);
    }

    await this.updateCategoryCourseCount(course.categoryId);

    await this.clearCourseCache(id);

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Course',
      entityId: id,
      description: `Course ${enrollmentCount > 0 ? 'archived' : 'deleted'}: ${course.title}`,
      level: AuditLevel.INFO,
      metadata: {
        courseTitle: course.title,
        enrollmentCount,
        deletionType: enrollmentCount > 0 ? 'soft' : 'hard',
      },
    });

    this.logger.log(
      `Course ${enrollmentCount > 0 ? 'archived' : 'deleted'}: ${course.title} by user ${userId}`,
    );
  }

  // ==================== COURSE WORKFLOW OPERATIONS ====================

  async submitForReview(id: string, userId: string): Promise<Course> {
    const course = await this.findById(id);

    if (course.status !== CourseStatus.DRAFT) {
      throw new BadRequestException('Only draft courses can be submitted for review');
    }

    await this.validateCourseCompleteness(course);

    course.status = CourseStatus.UNDER_REVIEW;
    const updatedCourse = await this.courseRepository.save(course);

    await this.clearCourseCache(id);

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Course',
      entityId: id,
      description: `Course submitted for review: ${course.title}`,
      level: AuditLevel.INFO,
      metadata: {
        courseTitle: course.title,
        statusChange: { from: CourseStatus.DRAFT, to: CourseStatus.UNDER_REVIEW },
      },
    });

    this.logger.log(`Course submitted for review: ${course.title} by user ${userId}`);
    return updatedCourse;
  }

  async approveCourse(id: string, adminId: string): Promise<Course> {
    const course = await this.findById(id);

    if (course.status !== CourseStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only courses under review can be approved');
    }

    course.status = CourseStatus.PUBLISHED;
    course.publishedAt = new Date();
    const updatedCourse = await this.courseRepository.save(course);

    await this.clearCourseCache(id);

    await this.auditLogService.createAuditLog({
      userId: adminId,
      action: AuditAction.APPROVE,
      entityType: 'Course',
      entityId: id,
      description: `Course approved and published: ${course.title}`,
      level: AuditLevel.INFO,
      metadata: {
        courseTitle: course.title,
        statusChange: { from: CourseStatus.UNDER_REVIEW, to: CourseStatus.PUBLISHED },
        publishedAt: course.publishedAt,
      },
    });

    this.logger.log(`Course approved: ${course.title} by admin ${adminId}`);
    return updatedCourse;
  }

  async rejectCourse(id: string, adminId: string, reason: string): Promise<Course> {
    const course = await this.findById(id);

    if (course.status !== CourseStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only courses under review can be rejected');
    }

    course.status = CourseStatus.DRAFT;
    course.metadata = {
      ...course.metadata,
      rejectionReason: reason,
      rejectedAt: new Date(),
      rejectedBy: adminId,
    };

    const updatedCourse = await this.courseRepository.save(course);

    await this.clearCourseCache(id);

    await this.auditLogService.createAuditLog({
      userId: adminId,
      action: AuditAction.REJECT,
      entityType: 'Course',
      entityId: id,
      description: `Course rejected: ${course.title} - Reason: ${reason}`,
      level: AuditLevel.WARNING,
      metadata: {
        courseTitle: course.title,
        statusChange: { from: CourseStatus.UNDER_REVIEW, to: CourseStatus.DRAFT },
        rejectionReason: reason,
      },
    });

    this.logger.warn(`Course rejected: ${course.title} by admin ${adminId}. Reason: ${reason}`);
    return updatedCourse;
  }

  async publishCourse(id: string, userId: string): Promise<Course> {
    const course = await this.findById(id);

    if (course.status !== CourseStatus.DRAFT) {
      throw new BadRequestException('Only draft courses can be published directly');
    }

    await this.validateCourseCompleteness(course);

    course.status = CourseStatus.PUBLISHED;
    course.publishedAt = new Date();
    const updatedCourse = await this.courseRepository.save(course);

    await this.clearCourseCache(id);

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Course',
      entityId: id,
      description: `Course published: ${course.title}`,
      level: AuditLevel.INFO,
      metadata: {
        courseTitle: course.title,
        statusChange: { from: CourseStatus.DRAFT, to: CourseStatus.PUBLISHED },
        publishedAt: course.publishedAt,
      },
    });

    this.logger.log(`Course published: ${course.title} by user ${userId}`);
    return updatedCourse;
  }

  async unpublishCourse(id: string, userId: string, reason?: string): Promise<Course> {
    const course = await this.findById(id);

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Only published courses can be unpublished');
    }

    course.status = CourseStatus.DRAFT;
    course.metadata = {
      ...course.metadata,
      unpublishedReason: reason,
      unpublishedAt: new Date(),
      unpublishedBy: userId,
    };

    const updatedCourse = await this.courseRepository.save(course);

    await this.clearCourseCache(id);

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Course',
      entityId: id,
      description: `Course unpublished: ${course.title}${reason ? ` - Reason: ${reason}` : ''}`,
      level: AuditLevel.WARNING,
      metadata: {
        courseTitle: course.title,
        statusChange: { from: CourseStatus.PUBLISHED, to: CourseStatus.DRAFT },
        unpublishedReason: reason,
      },
    });

    this.logger.warn(`Course unpublished: ${course.title} by user ${userId}`);
    return updatedCourse;
  }

  // ==================== BULK OPERATIONS ====================

  async bulkUpdateStatus(
    bulkUpdateDto: BulkUpdateCourseStatusDto,
    userId: string,
  ): Promise<{ affected: number }> {
    const courses = await this.courseRepository.findBy({ id: In(bulkUpdateDto.courseIds) });

    if (courses.length !== bulkUpdateDto.courseIds.length) {
      throw new NotFoundException('Some courses not found');
    }

    for (const course of courses) {
      if (!this.isValidStatusTransition(course.status, bulkUpdateDto.status)) {
        throw new BadRequestException(`Invalid status transition for course "${course.title}"`);
      }
    }

    const result = await this.courseRepository.update(
      { id: In(bulkUpdateDto.courseIds) },
      {
        status: bulkUpdateDto.status,
        publishedAt: bulkUpdateDto.status === CourseStatus.PUBLISHED ? new Date() : undefined,
        metadata: bulkUpdateDto.reason
          ? ({ bulkUpdateReason: bulkUpdateDto.reason } as Record<string, any>)
          : undefined,
      },
    );

    await Promise.all(bulkUpdateDto.courseIds.map(id => this.clearCourseCache(id)));

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      description: `Bulk status update: ${result.affected} courses updated to ${bulkUpdateDto.status}`,
      level: AuditLevel.INFO,
      metadata: {
        courseIds: bulkUpdateDto.courseIds,
        newStatus: bulkUpdateDto.status,
        reason: bulkUpdateDto.reason,
        affectedCount: result.affected,
      },
    });

    this.logger.log(
      `Bulk status update: ${result.affected} courses updated to ${bulkUpdateDto.status} by user ${userId}`,
    );
    return { affected: result.affected || 0 };
  }

  async bulkUpdateCategory(
    bulkUpdateDto: BulkUpdateCourseCategoryDto,
    userId: string,
  ): Promise<{ affected: number }> {
    const category = await this.categoryRepository.findOne({
      where: { id: bulkUpdateDto.categoryId, isActive: true },
    });

    if (!category) {
      throw new BadRequestException('Invalid category ID');
    }

    const courses = await this.courseRepository.findBy({ id: In(bulkUpdateDto.courseIds) });

    if (courses.length !== bulkUpdateDto.courseIds.length) {
      throw new NotFoundException('Some courses not found');
    }

    const oldCategoryIds = [...new Set(courses.map(c => c.categoryId))];

    const result = await this.courseRepository.update(
      { id: In(bulkUpdateDto.courseIds) },
      { categoryId: bulkUpdateDto.categoryId },
    );

    await Promise.all([
      ...oldCategoryIds.map(id => this.updateCategoryCourseCount(id)),
      this.updateCategoryCourseCount(bulkUpdateDto.categoryId),
    ]);

    await Promise.all(bulkUpdateDto.courseIds.map(id => this.clearCourseCache(id)));

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      description: `Bulk category update: ${result.affected} courses moved to category ${category.name}`,
      level: AuditLevel.INFO,
      metadata: {
        courseIds: bulkUpdateDto.courseIds,
        newCategoryId: bulkUpdateDto.categoryId,
        newCategoryName: category.name,
        affectedCount: result.affected,
      },
    });

    this.logger.log(`Bulk category update: ${result.affected} courses updated by user ${userId}`);
    return { affected: result.affected || 0 };
  }

  async bulkUpdateTags(
    bulkUpdateDto: BulkUpdateCourseTagsDto,
    userId: string,
  ): Promise<{ affected: number }> {
    const courses = await this.courseRepository.findBy({ id: In(bulkUpdateDto.courseIds) });

    if (courses.length !== bulkUpdateDto.courseIds.length) {
      throw new NotFoundException('Some courses not found');
    }

    let affected = 0;
    for (const course of courses) {
      let newTags = course.tags || [];

      switch (bulkUpdateDto.action) {
        case 'add':
          newTags = [...new Set([...newTags, ...bulkUpdateDto.tags])];
          break;
        case 'remove':
          newTags = newTags.filter(tag => !bulkUpdateDto.tags.includes(tag));
          break;
        case 'replace':
          newTags = bulkUpdateDto.tags;
          break;
      }

      if (JSON.stringify(newTags.sort()) !== JSON.stringify((course.tags || []).sort())) {
        course.tags = newTags;
        await this.courseRepository.save(course);
        affected++;
      }
    }

    await Promise.all(bulkUpdateDto.courseIds.map(id => this.clearCourseCache(id)));

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      description: `Bulk tags ${bulkUpdateDto.action}: ${affected} courses updated`,
      level: AuditLevel.INFO,
      metadata: {
        courseIds: bulkUpdateDto.courseIds,
        tagsAction: bulkUpdateDto.action,
        tags: bulkUpdateDto.tags,
        affectedCount: affected,
      },
    });

    this.logger.log(
      `Bulk tags ${bulkUpdateDto.action}: ${affected} courses updated by user ${userId}`,
    );
    return { affected };
  }

  async bulkDelete(
    bulkDeleteDto: BulkDeleteCoursesDto,
    userId: string,
  ): Promise<{ affected: number }> {
    const courses = await this.courseRepository.findBy({ id: In(bulkDeleteDto.courseIds) });

    if (courses.length !== bulkDeleteDto.courseIds.length) {
      throw new NotFoundException('Some courses not found');
    }

    let affected = 0;

    for (const course of courses) {
      const enrollmentCount = await this.enrollmentRepository.count({
        where: { courseId: course.id },
      });

      if (enrollmentCount > 0 && !bulkDeleteDto.force) {
        course.status = CourseStatus.ARCHIVED;
        await this.courseRepository.save(course);
        affected++;
      } else if (bulkDeleteDto.force || enrollmentCount === 0) {
        await this.courseRepository.remove(course);
        affected++;
      }

      await this.updateCategoryCourseCount(course.categoryId);
    }

    await Promise.all(bulkDeleteDto.courseIds.map(id => this.clearCourseCache(id)));

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.DELETE,
      description: `Bulk delete: ${affected} courses ${bulkDeleteDto.force ? 'deleted' : 'archived'}`,
      level: AuditLevel.WARNING,
      metadata: {
        courseIds: bulkDeleteDto.courseIds,
        forceDelete: bulkDeleteDto.force,
        affectedCount: affected,
      },
    });

    this.logger.warn(`Bulk delete: ${affected} courses processed by user ${userId}`);
    return { affected };
  }

  // ==================== STATISTICS AND ANALYTICS ====================

  async getCourseStatistics(courseId?: string): Promise<any> {
    const cacheKey = courseId ? `course_stats:${courseId}` : 'course_stats:global';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    let stats: any;

    if (courseId) {
      const course = await this.findById(courseId, { includeEnrollments: true });

      const [totalLessons, totalSections, avgProgress, completionRate, recentEnrollments] =
        await Promise.all([
          this.lessonRepository.count({ where: { courseId } }),
          this.sectionRepository.count({ where: { courseId } }),
          this.getAverageProgress(courseId),
          this.getCompletionRate(courseId),
          this.getRecentEnrollments(courseId, 30), // Last 30 days
        ]);

      stats = {
        totalEnrollments: course.totalEnrollments,
        totalLessons,
        totalSections,
        rating: course.rating,
        avgProgress,
        completionRate,
        recentEnrollments,
        revenue: await this.getCourseRevenue(courseId),
      };
    } else {
      // Global statistics
      const [
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        avgRating,
        avgPrice,
        topCategories,
        topTags,
        recentlyCreated,
        recentlyUpdated,
      ] = await Promise.all([
        this.courseRepository.count(),
        this.courseRepository.count({ where: { status: CourseStatus.PUBLISHED } }),
        this.courseRepository.count({ where: { status: CourseStatus.DRAFT } }),
        this.enrollmentRepository.count(),
        this.getAverageRating(),
        this.getAveragePrice(),
        this.getTopCategories(),
        this.getTopTags(),
        this.getRecentlyCreatedCount(7), // Last 7 days
        this.getRecentlyUpdatedCount(7), // Last 7 days
      ]);

      stats = {
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        avgRating,
        avgPrice,
        topCategories,
        topTags,
        recentlyCreated,
        recentlyUpdated,
      };
    }

    await this.cacheService.set(cacheKey, stats, 1800); // 30 minutes cache
    return stats;
  }

  async getCoursesAwaitingApproval(): Promise<Course[]> {
    const cacheKey = 'courses:awaiting_approval';
    const cached = await this.cacheService.get<Course[]>(cacheKey);
    if (cached) return cached;

    const courses = await this.courseRepository.find({
      where: { status: CourseStatus.UNDER_REVIEW },
      relations: ['teacher', 'category'],
      order: { createdAt: 'ASC' },
    });

    await this.cacheService.set(cacheKey, courses, 300); // 5 minutes cache
    return courses;
  }

  async exportCourses(queryDto: CourseQueryDto): Promise<string> {
    const { data: courses } = await this.findAll({ ...queryDto, limit: 10000 });

    const csvHeaders = [
      'ID',
      'Title',
      'Slug',
      'Teacher',
      'Category',
      'Level',
      'Status',
      'Price',
      'Currency',
      'Rating',
      'Enrollments',
      'Created',
      'Published',
    ];

    const csvRows = courses.map(course => [
      course.id,
      course.title,
      course.slug,
      course.teacher?.fullName || 'N/A',
      course.category?.name || 'N/A',
      course.level,
      course.status,
      course.price,
      course.currency,
      course.rating || 0,
      course.totalEnrollments || 0,
      course.createdAt.toISOString().split('T')[0],
      course.publishedAt?.toISOString().split('T')[0] || 'N/A',
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // ==================== HELPER METHODS ====================

  private createCourseQueryBuilder(queryDto: CourseQueryDto): SelectQueryBuilder<Course> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course');

    if (queryDto.includeTeacher) {
      queryBuilder.leftJoinAndSelect('course.teacher', 'teacher');
    }

    if (queryDto.includeCategory) {
      queryBuilder.leftJoinAndSelect('course.category', 'category');
    }

    if (queryDto.includeSections) {
      queryBuilder
        .leftJoinAndSelect('course.sections', 'sections')
        .leftJoinAndSelect('sections.lessons', 'lessons')
        .addOrderBy('sections.orderIndex', 'ASC')
        .addOrderBy('lessons.orderIndex', 'ASC');
    }

    // Apply filters
    if (queryDto.categoryId) {
      queryBuilder.andWhere('course.categoryId = :categoryId', { categoryId: queryDto.categoryId });
    }

    if (queryDto.teacherId) {
      queryBuilder.andWhere('course.teacherId = :teacherId', { teacherId: queryDto.teacherId });
    }

    if (queryDto.level) {
      queryBuilder.andWhere('course.level = :level', { level: queryDto.level });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('course.status = :status', { status: queryDto.status });
    } else if (queryDto.publishedOnly) {
      queryBuilder.andWhere('course.status = :status', { status: CourseStatus.PUBLISHED });
    }

    if (queryDto.isFree !== undefined) {
      queryBuilder.andWhere('course.isFree = :isFree', { isFree: queryDto.isFree });
    }

    if (queryDto.featured !== undefined) {
      queryBuilder.andWhere('course.featured = :featured', { featured: queryDto.featured });
    }

    if (queryDto.minPrice !== undefined) {
      queryBuilder.andWhere('course.price >= :minPrice', { minPrice: queryDto.minPrice });
    }

    if (queryDto.maxPrice !== undefined) {
      queryBuilder.andWhere('course.price <= :maxPrice', { maxPrice: queryDto.maxPrice });
    }

    if (queryDto.minRating !== undefined) {
      queryBuilder.andWhere('course.rating >= :minRating', { minRating: queryDto.minRating });
    }

    if (queryDto.language) {
      queryBuilder.andWhere('course.language = :language', { language: queryDto.language });
    }

    if (queryDto.tags && queryDto.tags.length > 0) {
      queryBuilder.andWhere('JSON_OVERLAPS(course.tags, :tags)', {
        tags: JSON.stringify(queryDto.tags),
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(course.title LIKE :search OR course.description LIKE :search OR course.shortDescription LIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.createdAfter) {
      queryBuilder.andWhere('course.createdAt >= :createdAfter', {
        createdAfter: queryDto.createdAfter,
      });
    }

    if (queryDto.updatedAfter) {
      queryBuilder.andWhere('course.updatedAt >= :updatedAfter', {
        updatedAfter: queryDto.updatedAfter,
      });
    }

    return queryBuilder;
  }

  private mapSortField(sortBy: string): string {
    const sortFieldMap = {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      title: 'title',
      price: 'price',
      rating: 'rating',
      totalEnrollments: 'totalEnrollments',
      publishedAt: 'publishedAt',
      featured: 'featured',
    };

    return sortFieldMap[sortBy] || 'createdAt';
  }

  private async validateCourseCompleteness(course: Course): Promise<void> {
    const errors: string[] = [];

    // Check basic fields
    if (!course.title || course.title.length < 5) {
      errors.push('Course title must be at least 5 characters long');
    }

    if (!course.description || course.description.length < 20) {
      errors.push('Course description must be at least 20 characters long');
    }

    if (!course.thumbnailUrl) {
      errors.push('Course thumbnail is required');
    }

    // Check if course has at least one section and lesson
    const sectionsCount = await this.sectionRepository.count({ where: { courseId: course.id } });
    if (sectionsCount === 0) {
      errors.push('Course must have at least one section');
    } else {
      const lessonsCount = await this.lessonRepository.count({ where: { courseId: course.id } });
      if (lessonsCount === 0) {
        errors.push('Course must have at least one lesson');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Course validation failed: ${errors.join(', ')}`);
    }
  }

  private isValidStatusTransition(fromStatus: CourseStatus, toStatus: CourseStatus): boolean {
    const validTransitions = {
      [CourseStatus.DRAFT]: [
        CourseStatus.UNDER_REVIEW,
        CourseStatus.PUBLISHED,
        CourseStatus.ARCHIVED,
      ],
      [CourseStatus.UNDER_REVIEW]: [
        CourseStatus.DRAFT,
        CourseStatus.PUBLISHED,
        CourseStatus.ARCHIVED,
      ],
      [CourseStatus.PUBLISHED]: [CourseStatus.DRAFT, CourseStatus.ARCHIVED, CourseStatus.SUSPENDED],
      [CourseStatus.ARCHIVED]: [CourseStatus.DRAFT, CourseStatus.PUBLISHED],
      [CourseStatus.SUSPENDED]: [CourseStatus.PUBLISHED, CourseStatus.ARCHIVED],
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  private async updateCategoryCourseCount(categoryId: string): Promise<void> {
    const count = await this.courseRepository.count({
      where: { categoryId, status: CourseStatus.PUBLISHED },
    });

    await this.categoryRepository.update(categoryId, { courseCount: count });
  }

  private async clearCourseCache(courseId: string): Promise<void> {
    const patterns = [`course:${courseId}:*`, `courses:*`, `course_stats:*`];

    for (const pattern of patterns) {
      await this.cacheService.del(pattern);
    }
  }

  private async getAverageProgress(courseId: string): Promise<number> {
    const result = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('AVG(enrollment.progressPercentage)', 'avg')
      .where('enrollment.courseId = :courseId', { courseId })
      .getRawOne();

    return parseFloat(result.avg) || 0;
  }

  private async getCompletionRate(courseId: string): Promise<number> {
    const [total, completed] = await Promise.all([
      this.enrollmentRepository.count({ where: { courseId } }),
      this.enrollmentRepository.count({
        where: { courseId, status: EnrollmentStatus.COMPLETED },
      }),
    ]);

    return total > 0 ? (completed / total) * 100 : 0;
  }

  private async getRecentEnrollments(courseId: string, days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.enrollmentRepository.count({
      where: {
        courseId,
        enrollmentDate: Between(since, new Date()),
      },
    });
  }

  private async getCourseRevenue(courseId: string): Promise<number> {
    const result = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('SUM(enrollment.paymentAmount)', 'total')
      .where('enrollment.courseId = :courseId', { courseId })
      .andWhere('enrollment.paymentStatus = :status', { status: PaymentStatus.PAID })
      .getRawOne();

    return parseFloat(result.total) || 0;
  }

  private async getAverageRating(): Promise<number> {
    const result = await this.courseRepository
      .createQueryBuilder('course')
      .select('AVG(course.rating)', 'avg')
      .where('course.rating IS NOT NULL')
      .getRawOne();

    return parseFloat(result.avg) || 0;
  }

  private async getAveragePrice(): Promise<number> {
    const result = await this.courseRepository
      .createQueryBuilder('course')
      .select('AVG(course.price)', 'avg')
      .where('course.isFree = false')
      .getRawOne();

    return parseFloat(result.avg) || 0;
  }

  private async getTopCategories(): Promise<
    Array<{ categoryId: string; name: string; count: number }>
  > {
    const result = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.categoryId', 'categoryId')
      .addSelect('category.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('course.category', 'category')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .groupBy('course.categoryId')
      .addGroupBy('category.name')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map(row => ({
      categoryId: row.categoryId,
      name: row.name,
      count: parseInt(row.count),
    }));
  }

  private async getTopTags(): Promise<Array<{ tag: string; count: number }>> {
    // This would require a more complex query to extract tags from JSON field
    // For now, returning empty array - would need to implement tag extraction logic
    return [];
  }

  private async getRecentlyCreatedCount(days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.courseRepository.count({
      where: { createdAt: Between(since, new Date()) },
    });
  }

  private async getRecentlyUpdatedCount(days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.courseRepository.count({
      where: { updatedAt: Between(since, new Date()) },
    });
  }
}

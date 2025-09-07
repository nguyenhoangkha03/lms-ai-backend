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
import { FileManagementService } from '../../file-management/services/file-management.service';
import { FileType, FileRelatedType } from '@/common/enums/course.enums';
import { FileAccessLevel } from '@/common/enums/file.enums';
import { S3UploadService } from './s3-upload.service';
import { GenerateUploadUrlDto } from '../dto/generate-upload-url.dto';
import { ConfirmUploadDto } from '../dto/confirm-upload.dto';
import { FileUpload } from '../entities/file-upload.entity';

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
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly fileManagementService: FileManagementService,
    private readonly s3UploadService: S3UploadService,
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
      enrollmentLimit: createCourseDto.enrollmentLimit,
    });

    const savedCourse = await this.courseRepository.save(course);

    await this.updateAffectedCategoriesCourseCount(undefined, savedCourse.categoryId);

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

  //   async findAll(queryDto: CourseQueryDto): Promise<PaginatedResult<Course>> {
  //     const cacheKey = `courses:${JSON.stringify(queryDto)}`;
  //     const cached = await this.cacheService.get<PaginatedResult<Course>>(cacheKey);
  //     if (cached) {
  //       return cached;
  //     }

  //     const queryBuilder = this.createCourseQueryBuilder(queryDto);
  //     const page = queryDto.page ?? 1;
  //     const limit = queryDto.limit ?? 10;
  //     const sortBy = queryDto.sortOrder ?? 'createdAt';

  //     const skip = (page - 1) * limit;
  //     queryBuilder.skip(skip).take(queryDto.limit);

  //     const sortField = this.mapSortField(sortBy);
  //     queryBuilder.orderBy(`course.${sortField}`, queryDto.sortOrder);

  //     const [courses, total] = await queryBuilder.getManyAndCount();

  //     const result: PaginatedResult<Course> = {
  //       data: courses,
  //       meta: {
  //         page: page,
  //         limit: limit,
  //         total,
  //         totalPages: Math.ceil(total / limit),
  //         hasNext: page < Math.ceil(total / limit),
  //         hasPrev: page > 1,
  //       },
  //     };

  //     await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
  //     return result;
  //   }

  async findAll(queryDto: CourseQueryDto): Promise<PaginatedResult<Course>> {
    console.log('🔍 CourseService.findAll called with:', queryDto);
    
    // Quick check: count total courses in DB
    const totalInDB = await this.courseRepository.count();
    console.log(`🔍 Total courses in database: ${totalInDB}`);
    
    // Quick check: count published courses
    const publishedCount = await this.courseRepository.count({ 
      where: { status: CourseStatus.PUBLISHED } 
    });
    console.log(`🔍 Published courses in database: ${publishedCount}`);
    
    // Debug: show some course titles to understand the data
    const sampleCourses = await this.courseRepository.find({
      where: { status: CourseStatus.PUBLISHED },
      select: ['id', 'title', 'shortDescription'],
      take: 5
    });
    console.log('🔍 Sample course titles:');
    sampleCourses.forEach((course, index) => {
      console.log(`  ${index + 1}. "${course.title}" - ${course.shortDescription?.substring(0, 50)}...`);
    });
    
    const page = queryDto.page ?? 1;
    const limit = queryDto.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build relations array
    const relations: string[] = [];
    if (queryDto.includeTeacher) {
      relations.push('teacher');
      relations.push('teacher.teacherProfile');
      // Optional: Include teacher profile
    }
    if (queryDto.includeCategory) {
      relations.push('category');
    }
    if (queryDto.includeSections) {
      relations.push('sections', 'sections.lessons');
    }

    // Build where conditions
    const where: any = {};

    if (queryDto.publishedOnly || queryDto.status) {
      where.status = queryDto.status || CourseStatus.PUBLISHED;
    }

    // Handle category filtering with hierarchical support
    let categoryIds: string[] = [];
    if (queryDto.categoryId) {
      // Get the selected category and all its descendants
      const selectedCategory = await this.categoryRepository.findOne({
        where: { id: queryDto.categoryId }
      });
      
      if (selectedCategory) {
        categoryIds.push(queryDto.categoryId);
        
        // Get all descendant categories
        const descendants = await this.getCategoryDescendants(queryDto.categoryId);
        categoryIds.push(...descendants.map(cat => cat.id));
        
        where.categoryId = In(categoryIds);
      }
    }

    if (queryDto.teacherId) {
      where.teacherId = queryDto.teacherId;
    }

    if (queryDto.level) {
      where.level = queryDto.level;
    }

    if (queryDto.isFree !== undefined) {
      where.isFree = queryDto.isFree;
    }

    if (queryDto.featured !== undefined) {
      where.featured = queryDto.featured;
    }

    // Build order
    const sortBy = queryDto.sortBy ?? 'createdAt';
    const sortOrder = queryDto.sortOrder ?? 'DESC';

    // Use QueryBuilder for more complex queries (like excluding enrolled courses)
    let queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('teacher.teacherProfile', 'teacherProfile');

    // Add relations based on query options
    if (queryDto.includeCategory) {
      queryBuilder = queryBuilder.leftJoinAndSelect('course.category', 'category');
    }
    if (queryDto.includeSections) {
      queryBuilder = queryBuilder
        .leftJoinAndSelect('course.sections', 'sections')
        .leftJoinAndSelect('sections.lessons', 'lessons');
    }

    // Apply all where conditions
    Object.entries(where).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle IN conditions (like categoryId In([...]))
        queryBuilder = queryBuilder.andWhere(`course.${key} IN (:...${key})`, { [key]: value });
      } else {
        queryBuilder = queryBuilder.andWhere(`course.${key} = :${key}`, { [key]: value });
      }
    });

    // Exclude courses user is already enrolled in
    if (queryDto.excludeEnrolledFor) {
      queryBuilder = queryBuilder
        .andWhere('course.id NOT IN (' +
          'SELECT enrollment.courseId FROM enrollments enrollment ' +
          'WHERE enrollment.studentId = :userId' +
        ')', { userId: queryDto.excludeEnrolledFor });
    }

    // Add search functionality
    if (queryDto.search) {
      queryBuilder = queryBuilder.andWhere(
        '(course.title LIKE :search OR course.description LIKE :search OR course.shortDescription LIKE :search)',
        { search: `%${queryDto.search}%` }
      );
    }

    // Add ordering, pagination
    queryBuilder = queryBuilder
      .orderBy(`course.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit);

    console.log('🔍 Generated SQL query:', queryBuilder.getQuery());
    console.log('🔍 Query parameters:', queryBuilder.getParameters());
    
    const [courses, total] = await queryBuilder.getManyAndCount();
    console.log(`🔍 Query result: Found ${total} courses, returning ${courses.length}`);

    return {
      data: courses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findAllSimpleTest(): Promise<any> {
    console.log('=== SIMPLE TEST - NO FILTERS ===');

    // Test 1: Lấy tất cả courses với teacher, không filter gì
    const [courses, total] = await this.courseRepository.findAndCount({
      relations: ['teacher'],
      take: 3, // Chỉ lấy 3 records để test
    });

    console.log(`Found ${total} total courses, showing ${courses.length}`);

    courses.forEach((course, index) => {
      console.log(`Course ${index + 1}:`);
      console.log(`  - ID: ${course.id}`);
      console.log(`  - Title: ${course.title}`);
      console.log(`  - TeacherId: ${course.teacherId}`);
      console.log(`  - Status: ${course.status}`);
      console.log(`  - Has teacher: ${!!course.teacher}`);

      if (course.teacher) {
        console.log(`  - Teacher ID: ${course.teacher.id}`);
        console.log(`  - Teacher Email: ${course.teacher.email}`);
        console.log(`  - Teacher Name: ${course.teacher.fullName}`);
      } else {
        console.log(`  - Teacher: NULL`);
      }
      console.log('---');
    });

    return {
      data: courses.map(course => ({
        id: course.id,
        title: course.title,
        teacherId: course.teacherId,
        status: course.status,
        teacher: course.teacher
          ? {
              id: course.teacher.id,
              email: course.teacher.email,
              fullName: course.teacher.fullName,
            }
          : null,
      })),
      meta: {
        total,
        page: 1,
        limit: 3,
        totalPages: Math.ceil(total / 3),
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  async findAllByTeacher(
    queryDto: CourseQueryDto,
    teacherId: string,
  ): Promise<PaginatedResult<Course>> {
    const cacheKey = `courses:teacher:${teacherId}:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheService.get<PaginatedResult<Course>>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.createCourseQueryBuilder(queryDto);

    queryBuilder.andWhere('course.teacherId = :teacherId', { teacherId });

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

  //   async findById(
  //     id: string,
  //     options?: {
  //       includeTeacher?: boolean;
  //       includeCategory?: boolean;
  //       includeSections?: boolean;
  //       includeEnrollments?: boolean;
  //       includeStats?: boolean;
  //     },
  //   ): Promise<Course> {
  //     const cacheKey = `course:${id}:${JSON.stringify(options)}`;
  //     const cached = await this.cacheService.get<Course>(cacheKey);
  //     if (cached) {
  //       return cached;
  //     }

  //     const queryBuilder = this.courseRepository
  //       .createQueryBuilder('course')
  //       .where('course.id = :id', { id });

  //     if (options?.includeTeacher) {
  //       queryBuilder.leftJoinAndSelect('course.teacher', 'teacher');
  //     }

  //     if (options?.includeCategory) {
  //       queryBuilder.leftJoinAndSelect('course.category', 'category');
  //     }

  //     if (options?.includeSections) {
  //       queryBuilder
  //         .leftJoinAndSelect('course.sections', 'sections')
  //         .leftJoinAndSelect('sections.lessons', 'lessons')
  //         .addOrderBy('sections.orderIndex', 'ASC')
  //         .addOrderBy('lessons.orderIndex', 'ASC');
  //     }

  //     if (options?.includeEnrollments) {
  //       queryBuilder.leftJoinAndSelect('course.enrollments', 'enrollments');
  //     }

  //     const course = await queryBuilder.getOne();
  //     if (!course) {
  //       throw new NotFoundException(`Course with ID ${id} not found`);
  //     }

  //     if (options?.includeStats) {
  //       course['statistics'] = await this.getCourseStatistics(id);
  //     }

  //     await this.cacheService.set(cacheKey, course, this.CACHE_TTL);
  //     return course;
  //   }

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
    if (cached) return cached;

    const relations: string[] = [];
    if (options?.includeTeacher) relations.push('teacher');
    if (options?.includeCategory) relations.push('category');
    if (options?.includeSections) relations.push('sections', 'sections.lessons');
    if (options?.includeEnrollments) relations.push('enrollments');

    const course = await this.courseRepository.findOne({
      where: { id },
      relations,
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // ✅ Sort bằng JavaScript
    if (options?.includeSections && course.sections?.length) {
      course.sections.sort((a, b) => a.orderIndex - b.orderIndex);
      course.sections.forEach(section => {
        if (section.lessons?.length) {
          section.lessons.sort((a, b) => a.orderIndex - b.orderIndex);
        }
      });
    }

    if (options?.includeStats) {
      course['statistics'] = await this.getCourseStatistics(id);
    }

    await this.cacheService.set(cacheKey, course, this.CACHE_TTL);
    return course;
  }

  async findBySlug(
    slug: string,
    options?: {
      includeTeacher?: boolean;
      includeCategory?: boolean;
      includeSections?: boolean;
      includeEnrollments?: boolean;
      includeStats?: boolean;
    },
  ): Promise<Course> {
    const cacheKey = `course:slug:${slug}:${JSON.stringify(options)}`;
    const cached = await this.cacheService.get<Course>(cacheKey);
    if (cached) return cached;

    const relations: string[] = [];
    if (options?.includeTeacher) {
      relations.push('teacher');
      relations.push('teacher.teacherProfile');
    }
    if (options?.includeCategory) relations.push('category');
    if (options?.includeSections) relations.push('sections', 'sections.lessons');
    if (options?.includeEnrollments) relations.push('enrollments');

    const course = await this.courseRepository.findOne({
      where: { slug },
      relations,
    });

    if (!course) {
      throw new NotFoundException(`Course with slug "${slug}" not found`);
    }

    // Sort sections and lessons by order
    if (options?.includeSections && course.sections?.length) {
      course.sections.sort((a, b) => a.orderIndex - b.orderIndex);
      course.sections.forEach(section => {
        if (section.lessons?.length) {
          section.lessons.sort((a, b) => a.orderIndex - b.orderIndex);
        }
      });
    }

    if (options?.includeStats) {
      course['statistics'] = await this.getCourseStatistics(course.id);
    }

    await this.cacheService.set(cacheKey, course, this.CACHE_TTL);
    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, userId: string): Promise<Course> {
    // const course = await this.findById(id);
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

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

    const updatedCourseDontSave = await this.courseRepository.preload({
      id: course.id,
      ...updateCourseDto,
      availableFrom: updateCourseDto.availableFrom
        ? new Date(updateCourseDto.availableFrom)
        : course.availableFrom,
      availableUntil: updateCourseDto.availableUntil
        ? new Date(updateCourseDto.availableUntil)
        : course.availableUntil,
      enrollmentLimit:
        updateCourseDto.enrollmentLimit !== undefined
          ? updateCourseDto.enrollmentLimit
          : course.enrollmentLimit,
    });

    if (!updatedCourseDontSave) {
      throw new NotFoundException(`Course with ID ${id} not found for update`);
    }

    this.logger.log('Hereeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
    this.logger.log(updatedCourseDontSave);

    const updatedCourse = await this.courseRepository.save(updatedCourseDontSave);

    if (updateCourseDto.categoryId && updateCourseDto.categoryId !== oldValues.categoryId) {
      await this.updateAffectedCategoriesCourseCount(oldValues.categoryId, updateCourseDto.categoryId);
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

    await this.updateAffectedCategoriesCourseCount(course.categoryId, undefined);

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

    // Update course counts for all affected categories
    const allAffectedCategoryIds = new Set([...oldCategoryIds, bulkUpdateDto.categoryId]);
    for (const categoryId of allAffectedCategoryIds) {
      await this.updateAffectedCategoriesCourseCount(undefined, categoryId);
    }

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

      await this.updateAffectedCategoriesCourseCount(course.categoryId, undefined);
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

  async getCourseStats(): Promise<any> {
    const cacheKey = 'admin_course_stats';
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [total, published, draft, underReview, archived, totalEnrollments, completions] =
      await Promise.all([
        this.courseRepository.count(),
        this.courseRepository.count({ where: { status: CourseStatus.PUBLISHED } }),
        this.courseRepository.count({ where: { status: CourseStatus.DRAFT } }),
        this.courseRepository.count({ where: { status: CourseStatus.UNDER_REVIEW } }),
        this.courseRepository.count({ where: { status: CourseStatus.ARCHIVED } }),
        this.enrollmentRepository.count(),
        this.enrollmentRepository.count({ where: { status: EnrollmentStatus.COMPLETED } }),
      ]);

    const stats = {
      total,
      published,
      draft,
      underReview,
      archived,
      totalEnrollments,
      completions,
    };

    await this.cacheService.set(cacheKey, stats, 1800); // 30 minutes cache
    return stats;
  }

  async getCourseFileStatistics(courseId: string): Promise<{
    courseId: string;
    totalFiles: number;
    filesByType: {
      video: number;
      audio: number;
      image: number;
      document: number;
      thumbnail: number;
      trailer: number;
      lesson: number;
      promotional: number;
    };
    totalSize: number;
    totalSizeMB: number;
  }> {
    const cacheKey = `course_file_stats:${courseId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached as any;

    // Verify course exists
    const course = await this.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Query file statistics from file_uploads table
    const fileStats = await this.fileRepository
      .createQueryBuilder('file')
      .select('COUNT(*)', 'totalFiles')
      .addSelect('SUM(file.fileSize)', 'totalSize')
      .addSelect('file.fileType', 'fileType')
      .addSelect('file.relatedType', 'relatedType')
      .where('file.courseId = :courseId', { courseId })
      .andWhere('file.isActive = :isActive', { isActive: true })
      .groupBy('file.fileType, file.relatedType')
      .getRawMany();

    // Initialize counters
    const filesByType = {
      video: 0,
      audio: 0,
      image: 0,
      document: 0,
      thumbnail: 0,
      trailer: 0,
      lesson: 0,
      promotional: 0,
    };

    let totalFiles = 0;
    let totalSize = 0;

    // Process results and categorize files
    for (const stat of fileStats) {
      const count = parseInt(stat.totalFiles) || 0;
      const size = parseInt(stat.totalSize) || 0;

      totalFiles += count;
      totalSize += size;

      // Map by fileType
      if (stat.fileType === 'video') filesByType.video += count;
      if (stat.fileType === 'audio') filesByType.audio += count;
      if (stat.fileType === 'image') filesByType.image += count;
      if (stat.fileType === 'document') filesByType.document += count;

      // Map by relatedType
      if (stat.relatedType === 'course_thumbnail') filesByType.thumbnail += count;
      if (stat.relatedType === 'course_trailer') filesByType.trailer += count;
      if (stat.relatedType === 'lesson_video' || stat.relatedType === 'lesson_attachment')
        filesByType.lesson += count;
      if (stat.relatedType === 'course_promotional') filesByType.promotional += count;
    }

    const result = {
      courseId,
      totalFiles,
      filesByType,
      totalSize,
      totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100, // Round to 2 decimal places
    };

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, result, 600);
    return result;
  }

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

  // ==================== ENROLLMENT STATUS ====================

  async getEnrollmentStatus(userId: string, courseId: string): Promise<any> {
    return await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
      relations: ['course'],
    });
  }

  async getCourseProgress(userId: string, courseId: string) {
    // Get enrollment first
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
      relations: ['course', 'lessonProgress', 'lessonProgress.lesson'],
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    // Get total lessons in course
    const totalLessons = await this.lessonRepository.count({
      where: { courseId },
    });

    // Calculate completed lessons and total time spent
    const lessonProgress = enrollment.lessonProgress || [];
    const completedLessons = lessonProgress.filter(p => p.isCompleted).length;
    const timeSpent = lessonProgress.reduce((total, p) => total + p.timeSpent, 0);

    return {
      courseId,
      studentId: userId,
      progressPercentage: enrollment.progressPercentage,
      completedLessons,
      totalLessons,
      timeSpent,
      lastAccessedAt: enrollment.lastAccessedAt,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate,
        completionDate: enrollment.completionDate,
      },
    };
  }

  async getUserEnrollmentForCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    return await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
      relations: ['course'],
    });
  }

  async enrollUserInCourse(userId: string, courseId: string): Promise<Enrollment> {
    // Check if already enrolled
    const existingEnrollment = await this.getUserEnrollmentForCourse(userId, courseId);
    if (existingEnrollment) {
      throw new BadRequestException('User is already enrolled in this course');
    }

    // Check if course exists
    const course = await this.findById(courseId);
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      studentId: userId,
      courseId: courseId,
      status: EnrollmentStatus.ACTIVE,
      enrollmentDate: new Date(),
      progressPercentage: 0,
    });

    return await this.enrollmentRepository.save(enrollment);
  }

  async getUserEnrollments(
    userId: string,
    options?: {
      status?: 'active' | 'completed' | 'paused';
      page?: number;
      limit?: number;
    },
  ): Promise<Enrollment[]> {
    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category')
      .where('enrollment.studentId = :userId', { userId });

    if (options?.status) {
      queryBuilder.andWhere('enrollment.status = :status', { status: options.status });
    }

    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      queryBuilder.skip(skip).take(options.limit);
    }

    return await queryBuilder.getMany();
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
    // Get all descendant categories (including the category itself)
    const descendantCategories = await this.getCategoryDescendants(categoryId);
    const allCategoryIds = [categoryId, ...descendantCategories.map(cat => cat.id)];

    // Count courses in the category and all its descendants
    const count = await this.courseRepository.count({
      where: { 
        categoryId: In(allCategoryIds), 
        status: CourseStatus.PUBLISHED 
      },
    });

    await this.categoryRepository.update(categoryId, { courseCount: count });
  }

  /**
   * Updates course count for all parent categories when a course's category changes
   */
  private async updateAffectedCategoriesCourseCount(oldCategoryId?: string, newCategoryId?: string): Promise<void> {
    const categoriesToUpdate = new Set<string>();
    
    if (oldCategoryId) {
      // Add old category and its ancestors
      categoriesToUpdate.add(oldCategoryId);
      const oldAncestors = await this.getCategoryAncestors(oldCategoryId);
      oldAncestors.forEach(cat => categoriesToUpdate.add(cat.id));
    }
    
    if (newCategoryId) {
      // Add new category and its ancestors
      categoriesToUpdate.add(newCategoryId);
      const newAncestors = await this.getCategoryAncestors(newCategoryId);
      newAncestors.forEach(cat => categoriesToUpdate.add(cat.id));
    }

    // Update all affected categories
    for (const categoryId of categoriesToUpdate) {
      await this.updateCategoryCourseCount(categoryId);
    }
  }

  private async getCategoryDescendants(categoryId: string): Promise<Category[]> {
    try {
      // Use direct parent-child relationship instead of TypeORM Tree
      // TypeORM Tree repository can have issues with mpath after seeding
      
      const directChildren = await this.categoryRepository.find({
        where: { parentId: categoryId },
      });

      // Recursively get all descendants
      let allDescendants: Category[] = [...directChildren];

      for (const child of directChildren) {
        const grandChildren = await this.getCategoryDescendants(child.id);
        allDescendants = allDescendants.concat(grandChildren);
      }

      return allDescendants;
    } catch (error) {
      this.logger.error(`Error getting category descendants: ${error.message}`);
      return [];
    }
  }

  private async getCategoryAncestors(categoryId: string): Promise<Category[]> {
    try {
      const ancestors: Category[] = [];
      let currentCategory = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });

      while (currentCategory?.parentId) {
        const parent = await this.categoryRepository.findOne({
          where: { id: currentCategory.parentId },
        });
        
        if (parent) {
          ancestors.push(parent);
          currentCategory = parent;
        } else {
          break;
        }
      }

      return ancestors;
    } catch (error) {
      this.logger.error(`Error getting category ancestors: ${error.message}`);
      return [];
    }
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

  // ==================== FILE UPLOAD METHODS ====================

  async uploadThumbnail(
    courseId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ thumbnailUrl: string; fileId?: string; processingStatus?: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const course = await this.findCourseForUpdate(courseId, userId);

    try {
      this.logger.log(`Uploading thumbnail for course ${courseId} using FileManagementService`);

      // Upload file using FileManagementService (integrates with AWS S3)
      const fileRecord = await this.fileManagementService.uploadFile(
        file,
        {
          fileType: FileType.IMAGE,
          relatedType: FileRelatedType.COURSE_THUMBNAIL,
          relatedId: courseId,
          accessLevel: FileAccessLevel.PUBLIC,
          description: `Thumbnail for course: ${course.title}`,
        },
        userId,
      );

      // Update course with new thumbnail URL
      const oldThumbnailUrl = course.thumbnailUrl;
      course.thumbnailUrl = fileRecord.fileUrl;
      await this.courseRepository.save(course);

      // Log the action
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.UPDATE,
        description: `Thumbnail uploaded for course: ${course.title}`,
        entityType: 'Course',
        entityId: courseId,
        level: AuditLevel.INFO,
        changes: [
          { field: 'thumbnailUrl', oldValue: oldThumbnailUrl, newValue: fileRecord.fileUrl },
        ],
      });

      this.logger.log(
        `Thumbnail uploaded successfully for course ${courseId} by user ${userId}. URL: ${fileRecord.fileUrl}`,
      );

      return {
        thumbnailUrl: fileRecord.fileUrl,
        fileId: fileRecord.id,
        processingStatus: fileRecord.processingStatus,
      };
    } catch (error) {
      this.logger.error(`Failed to upload thumbnail for course ${courseId}:`, error);
      throw new BadRequestException('Failed to upload thumbnail');
    }
  }

  async uploadTrailerVideo(
    courseId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ trailerVideoUrl: string; fileId?: string; processingStatus?: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const course = await this.findCourseForUpdate(courseId, userId);

    try {
      this.logger.log(`Uploading trailer video for course ${courseId} using FileManagementService`);

      // Upload file using FileManagementService (integrates with AWS S3)
      const fileRecord = await this.fileManagementService.uploadFile(
        file,
        {
          fileType: FileType.VIDEO,
          relatedType: FileRelatedType.COURSE_TRAILER,
          relatedId: courseId,
          accessLevel: FileAccessLevel.PUBLIC,
          description: `Trailer video for course: ${course.title}`,
        },
        userId,
      );

      // Update course with new trailer video URL
      const oldTrailerVideoUrl = course.trailerVideoUrl;
      course.trailerVideoUrl = fileRecord.fileUrl;
      await this.courseRepository.save(course);

      // Log the action
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Course',
        entityId: courseId,
        description: `Trailer video uploaded for course: ${course.title}`,
        level: AuditLevel.INFO,
        changes: [
          { field: 'trailerVideoUrl', oldValue: oldTrailerVideoUrl, newValue: fileRecord.fileUrl },
        ],
      });

      this.logger.log(
        `Trailer video uploaded successfully for course ${courseId} by user ${userId}. URL: ${fileRecord.fileUrl}`,
      );

      return {
        trailerVideoUrl: fileRecord.fileUrl,
        fileId: fileRecord.id,
        processingStatus: fileRecord.processingStatus,
      };
    } catch (error) {
      this.logger.error(`Failed to upload trailer video for course ${courseId}:`, error);
      throw new BadRequestException('Failed to upload trailer video');
    }
  }

  async deleteThumbnail(courseId: string, userId: string): Promise<void> {
    const course = await this.findCourseForUpdate(courseId, userId);

    if (!course.thumbnailUrl) {
      throw new BadRequestException('Course has no thumbnail to delete');
    }

    const oldThumbnailUrl = course.thumbnailUrl;

    try {
      this.logger.log(`Deleting thumbnail for course ${courseId}`);

      // Note: FileManagementService handles file deletion through soft delete in database
      // The actual S3 files are cleaned up by background jobs
      // We just need to remove the URL reference from the course

      // Update course to remove thumbnail URL
      course.thumbnailUrl = null;
      await this.courseRepository.save(course);

      // Log the action
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Course',
        entityId: courseId,
        description: `Thumbnail deleted for course: ${course.title}`,
        level: AuditLevel.INFO,
        changes: [{ field: 'thumbnailUrl', oldValue: oldThumbnailUrl, newValue: null }],
      });

      this.logger.log(`Thumbnail deleted successfully for course ${courseId} by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete thumbnail for course ${courseId}:`, error);
      throw new BadRequestException('Failed to delete thumbnail');
    }
  }

  async deleteTrailerVideo(courseId: string, userId: string): Promise<void> {
    const course = await this.findCourseForUpdate(courseId, userId);

    if (!course.trailerVideoUrl) {
      throw new BadRequestException('Course has no trailer video to delete');
    }

    const oldTrailerVideoUrl = course.trailerVideoUrl;

    try {
      this.logger.log(`Deleting trailer video for course ${courseId}`);

      // Note: FileManagementService handles file deletion through soft delete in database
      // The actual S3 files are cleaned up by background jobs
      // We just need to remove the URL reference from the course

      // Update course to remove trailer video URL
      course.trailerVideoUrl = null;
      await this.courseRepository.save(course);

      // Log the action
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Course',
        entityId: courseId,
        description: `Trailer video deleted for course: ${course.title}`,
        level: AuditLevel.INFO,
        changes: [{ field: 'trailerVideoUrl', oldValue: oldTrailerVideoUrl, newValue: null }],
      });

      this.logger.log(
        `Trailer video deleted successfully for course ${courseId} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete trailer video for course ${courseId}:`, error);
      throw new BadRequestException('Failed to delete trailer video');
    }
  }

  // ==================== DIRECT S3 UPLOAD METHODS ====================

  async generateUploadUrl(
    courseId: string,
    generateUrlDto: GenerateUploadUrlDto,
    userId: string,
  ): Promise<{
    uploadId: string;
    presignedUrl: string;
    s3Key: string;
    expiresIn: number;
  }> {
    // Verify course ownership
    const course = await this.findCourseForUpdate(courseId, userId);

    // Validate upload parameters
    this.s3UploadService.validateUploadParams(
      generateUrlDto.fileSize,
      generateUrlDto.mimeType,
      generateUrlDto.uploadType,
    );

    // For lesson uploads, validate lesson exists and belongs to course
    if (generateUrlDto.uploadType === 'lesson' && generateUrlDto.lessonId) {
      const lesson = await this.lessonRepository.findOne({
        where: {
          id: generateUrlDto.lessonId,
          course: { id: courseId },
        },
      });

      if (!lesson) {
        throw new BadRequestException('Lesson not found or does not belong to this course');
      }
    }

    // Generate unique upload ID
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Generate S3 key
    const s3Key = this.s3UploadService.generateS3Key(
      courseId,
      generateUrlDto.uploadType,
      generateUrlDto.fileName,
      uploadId,
    );

    try {
      // Generate presigned URL (15 minutes expiry)
      const presignedUrl = await this.s3UploadService.generatePresignedUploadUrl(s3Key, {
        expiresIn: 15 * 60, // 15 minutes
        contentType: generateUrlDto.mimeType,
        contentLength: generateUrlDto.fileSize,
        metadata: {
          uploadId,
          courseId,
          uploaderId: userId,
          uploadType: generateUrlDto.uploadType,
          originalFileName: generateUrlDto.fileName,
          ...(generateUrlDto.lessonId && { lessonId: generateUrlDto.lessonId }),
        },
      });

      // Store upload intention in cache (15 minutes TTL)
      await this.cacheService.set(
        `upload:${uploadId}`,
        {
          uploadId,
          courseId,
          userId,
          s3Key,
          fileName: generateUrlDto.fileName,
          fileSize: generateUrlDto.fileSize,
          mimeType: generateUrlDto.mimeType,
          uploadType: generateUrlDto.uploadType,
          lessonId: generateUrlDto.lessonId,
          metadata: generateUrlDto.metadata,
          createdAt: new Date(),
          status: 'pending',
        },
        15 * 60 * 1000, // 15 minutes
      );

      // Log the action
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.CREATE,
        entityType: 'Upload',
        entityId: uploadId,
        description: `Generated presigned URL for ${generateUrlDto.uploadType} upload: ${generateUrlDto.fileName}`,
        level: AuditLevel.INFO,
        metadata: {
          courseId,
          s3Key,
          fileSize: generateUrlDto.fileSize,
          mimeType: generateUrlDto.mimeType,
        },
      });

      this.logger.log(
        `Generated presigned URL for course ${courseId}, upload ${uploadId}, type: ${generateUrlDto.uploadType}`,
      );

      return {
        uploadId,
        presignedUrl,
        s3Key,
        expiresIn: 15 * 60,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for course ${courseId}:`, error);
      throw new BadRequestException('Failed to generate upload URL');
    }
  }

  async confirmUpload(
    courseId: string,
    confirmUploadDto: ConfirmUploadDto,
    userId: string,
  ): Promise<{ success: boolean; fileRecord: FileUpload }> {
    // Get upload intention from cache
    const uploadIntention = await this.cacheService.get<{
      uploadId: string;
      courseId: string;
      userId: string;
      s3Key: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      uploadType: string;
      lessonId: string;
      metadata: any;
      createdAt: Date;
      status: string;
    }>(`upload:${confirmUploadDto.uploadId}`);

    this.logger.log(`🔍 Looking for upload session: upload:${confirmUploadDto.uploadId}`);
    this.logger.log(
      `🔍 Upload intention found: ${uploadIntention ? 'YES' : 'NO'}`,
      uploadIntention ? 'Session exists' : 'Session missing/expired',
    );

    if (!uploadIntention) {
      throw new BadRequestException('Upload session expired or invalid');
    }

    // Verify ownership and course match
    if (uploadIntention.userId !== userId || uploadIntention.courseId !== courseId) {
      throw new BadRequestException('Unauthorized upload confirmation');
    }

    try {
      // Verify file exists in S3 and get metadata
      const s3Object = await this.s3UploadService.headObject(confirmUploadDto.s3Key);

      if (!s3Object) {
        throw new BadRequestException('File not found in S3 storage');
      }

      // Verify ETag matches (content integrity check)
      const s3ETag = s3Object.ETag?.replace(/"/g, '');
      if (s3ETag !== confirmUploadDto.etag) {
        throw new BadRequestException('File verification failed - ETag mismatch');
      }

      // Verify file size
      const actualSize = s3Object.ContentLength || 0;
      if (Math.abs(actualSize - confirmUploadDto.actualFileSize) > 1024) {
        // Allow 1KB tolerance
        throw new BadRequestException('File size verification failed');
      }

      // Generate public URL
      const fileUrl = this.s3UploadService.getPublicUrl(confirmUploadDto.s3Key);

      // Create file record in database
      const fileRecord = this.fileRepository.create({
        uploaderId: userId,
        originalName: uploadIntention.fileName,
        storedName: confirmUploadDto.s3Key.split('/').pop() || uploadIntention.fileName,
        filePath: confirmUploadDto.s3Key,
        fileUrl: fileUrl,
        fileSize: confirmUploadDto.actualFileSize,
        mimeType: uploadIntention.mimeType,
        fileType: this.getFileTypeFromMimeType(uploadIntention.mimeType),
        relatedType: this.getRelatedTypeFromUploadType(
          uploadIntention.uploadType,
          uploadIntention.mimeType,
        ),
        accessLevel: FileAccessLevel.PUBLIC,
        checksum: confirmUploadDto.etag,
        lessonId: uploadIntention.lessonId,
        courseId: courseId,
        isActive: true,
        metadata: {
          uploadId: confirmUploadDto.uploadId,
          uploadType: uploadIntention.uploadType,
          uploadedViaPresignedUrl: true,
          s3Bucket: this.s3UploadService.bucketName,
          s3Key: confirmUploadDto.s3Key,
          uploadedAt: new Date(),
          originalMetadata: uploadIntention.metadata,
          ...confirmUploadDto.uploadMetadata,
        },
      });

      const savedFile = await this.fileRepository.save(fileRecord);

      // Update course record based on upload type
      if (uploadIntention.uploadType === 'trailer') {
        await this.courseRepository.update(courseId, {
          trailerVideoUrl: fileUrl,
        });
      } else if (uploadIntention.uploadType === 'promotional') {
        // Update course thumbnail URL for promotional images
        await this.courseRepository.update(courseId, {
          thumbnailUrl: fileUrl,
        });
      }

      // Update lesson record for lesson uploads
      if (uploadIntention.uploadType === 'lesson' && uploadIntention.lessonId) {
        const updateData: any = {};

        // Update based on file type
        const fileType = this.getFileTypeFromMimeType(uploadIntention.mimeType);
        if (fileType === FileType.VIDEO) {
          updateData.videoUrl = fileUrl;
          updateData.videoDuration = 0; // Will be updated by background processing
        } else if (fileType === FileType.AUDIO) {
          updateData.audioUrl = fileUrl;
        } else if (fileType === FileType.IMAGE) {
          updateData.thumbnailUrl = fileUrl;
        }

        if (Object.keys(updateData).length > 0) {
          await this.lessonRepository.update(uploadIntention.lessonId, updateData);
          this.logger.log(
            `Updated lesson ${uploadIntention.lessonId} with ${Object.keys(updateData).join(', ')}`,
          );
        }
      }

      // Queue background processing (thumbnail generation, video optimization, etc.)
      await this.queueFileProcessing(savedFile);

      // Cleanup cache
      await this.cacheService.del(`upload:${confirmUploadDto.uploadId}`);

      // Log successful upload
      await this.auditLogService.createAuditLog({
        userId,
        action: AuditAction.CREATE,
        entityType: 'File',
        entityId: savedFile.id,
        description: `Direct S3 upload completed: ${uploadIntention.fileName}`,
        level: AuditLevel.INFO,
        metadata: {
          courseId,
          uploadType: uploadIntention.uploadType,
          fileSize: confirmUploadDto.actualFileSize,
          s3Key: confirmUploadDto.s3Key,
        },
      });

      this.logger.log(
        `Upload confirmed successfully: ${confirmUploadDto.uploadId}, file: ${savedFile.id}`,
      );

      return {
        success: true,
        fileRecord: savedFile,
      };
    } catch (error) {
      this.logger.error(`Upload confirmation failed for ${confirmUploadDto.uploadId}:`, error);

      // Mark as failed in cache for debugging
      await this.cacheService.set(
        `upload:${confirmUploadDto.uploadId}:failed`,
        {
          error: error.message,
          failedAt: new Date(),
          uploadIntention,
        },
        60 * 60, // 1 hour
      );

      throw new BadRequestException(`Upload confirmation failed: ${error.message}`);
    }
  }

  private getRelatedTypeFromUploadType(uploadType: string, mimeType?: string): FileRelatedType {
    switch (uploadType) {
      case 'trailer':
        return FileRelatedType.COURSE_TRAILER;
      case 'lesson':
        // Determine lesson file type based on MIME type
        if (mimeType?.startsWith('video/')) {
          return FileRelatedType.LESSON_VIDEO;
        } else if (mimeType?.startsWith('audio/')) {
          return FileRelatedType.LESSON_ATTACHMENT; // or create LESSON_AUDIO if exists
        } else if (mimeType?.startsWith('image/')) {
          return FileRelatedType.LESSON_ATTACHMENT; // or lesson thumbnail
        } else {
          return FileRelatedType.LESSON_ATTACHMENT;
        }
      case 'promotional':
        return FileRelatedType.COURSE_THUMBNAIL; // Use course_thumbnail for promotional images
      default:
        return FileRelatedType.COURSE_TRAILER; // Default fallback
    }
  }

  private getFileTypeFromMimeType(mimeType: string): FileType {
    if (mimeType.startsWith('video/')) {
      return FileType.VIDEO;
    } else if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    } else if (mimeType.startsWith('audio/')) {
      return FileType.AUDIO;
    } else if (
      mimeType === 'application/pdf' ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-powerpoint' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimeType === 'text/plain' ||
      mimeType === 'text/csv' ||
      mimeType === 'application/rtf' ||
      mimeType.includes('document') ||
      mimeType.includes('text')
    ) {
      return FileType.DOCUMENT;
    } else if (
      mimeType === 'application/zip' ||
      mimeType === 'application/x-rar-compressed' ||
      mimeType.includes('zip') ||
      mimeType.includes('rar') ||
      mimeType.includes('tar')
    ) {
      return FileType.ARCHIVE;
    } else {
      return FileType.OTHER;
    }
  }

  private async queueFileProcessing(fileRecord: FileUpload): Promise<void> {
    try {
      // For now, just log. Later you can integrate with Bull queue for:
      // - Video thumbnail generation
      // - Video optimization (multiple qualities)
      // - Duration extraction
      // - Content analysis
      this.logger.log(`Queuing file processing for: ${fileRecord.id}`);

      // TODO: Add to video processing queue
      // await this.videoProcessingQueue.add('process-video', {
      //   fileId: fileRecord.id,
      //   s3Key: fileRecord.filePath,
      //   fileType: fileRecord.fileType,
      // });
    } catch (error) {
      this.logger.error(`Failed to queue file processing for ${fileRecord.id}:`, error);
      // Don't throw error - file upload should still succeed
    }
  }

  private async findCourseForUpdate(courseId: string, userId: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user owns the course
    if (course.teacherId !== userId) {
      throw new BadRequestException('You can only modify your own courses');
    }

    return course;
  }

  /**
   * Get user achievements data
   */
  async getUserAchievements(userId: string): Promise<{ achievements: any[] }> {
    try {
      // For now, calculate achievements based on enrollments and completions
      const enrollments = await this.getUserEnrollments(userId);
      const achievements: any[] = [];
      
      // Course completion achievements
      const completedCourses = enrollments.filter(e => e.status === 'completed');
      if (completedCourses.length >= 1) {
        achievements.push({
          id: 'first-course',
          title: 'First Course Complete',
          description: 'Completed your first course',
          type: 'course_completed',
          earnedAt: completedCourses[0]?.completionDate || new Date(),
        });
      }
      
      if (completedCourses.length >= 5) {
        achievements.push({
          id: 'course-master',
          title: 'Course Master', 
          description: 'Completed 5 courses',
          type: 'course_completed',
          earnedAt: completedCourses[4]?.completionDate || new Date(),
        });
      }

      // Time-based achievements
      const totalTimeSpent = enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0);
      const totalHours = Math.floor(totalTimeSpent / 3600);
      
      if (totalHours >= 10) {
        achievements.push({
          id: 'dedicated-learner',
          title: 'Dedicated Learner',
          description: 'Studied for 10+ hours',
          type: 'time_milestone', 
          earnedAt: new Date(),
        });
      }

      return { achievements };
    } catch (error) {
      console.error('Failed to get user achievements:', error);
      return { achievements: [] };
    }
  }

  /**
   * Calculate user learning streak
   */
  async calculateUserStreak(userId: string): Promise<number> {
    try {
      // Calculate streak based on enrollment activity and last access dates
      const enrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .where('enrollment.studentId = :userId', { userId })
        .orderBy('enrollment.lastAccessedAt', 'DESC')
        .getMany();

      if (!enrollments.length) return 0;

      let streak = 0;
      const today = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;

      for (const enrollment of enrollments) {
        if (!enrollment.lastAccessedAt) break;
        
        const daysDiff = Math.floor((today.getTime() - enrollment.lastAccessedAt.getTime()) / msPerDay);
        
        if (daysDiff <= 1) {
          streak = Math.max(streak, 1);
        }
        
        // Simple streak calculation - in real app would be more sophisticated
        if (enrollment.totalTimeSpent && enrollment.totalTimeSpent > 0) {
          const hoursSpent = enrollment.totalTimeSpent / 3600;
          if (hoursSpent >= 0.5) { // At least 30 minutes learning
            streak += 1;
          }
        }
      }

      return Math.min(streak, 30); // Cap at 30 days
    } catch (error) {
      console.error('Failed to calculate user streak:', error);
      return 0;
    }
  }

  /**
   * Get course reviews with summary statistics
   */
  async getCourseReviews(courseId: string, page: number = 1, limit: number = 10) {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get reviews from enrollments
    const skip = (page - 1) * limit;
    
    const reviewsQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .where('enrollment.courseId = :courseId', { courseId })
      .andWhere('enrollment.rating IS NOT NULL')
      .andWhere('enrollment.review IS NOT NULL')
      .orderBy('enrollment.reviewDate', 'DESC')
      .skip(skip)
      .take(limit);

    const [reviews, totalReviews] = await reviewsQuery.getManyAndCount();

    // Calculate summary statistics
    const allReviewsQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('enrollment.rating', 'rating')
      .where('enrollment.courseId = :courseId', { courseId })
      .andWhere('enrollment.rating IS NOT NULL');

    const allRatings = await allReviewsQuery.getRawMany();
    
    const totalRatings = allRatings.length;
    const averageRating = totalRatings > 0 
      ? allRatings.reduce((sum, r) => sum + Number(r.rating), 0) / totalRatings
      : 0;

    // Rating distribution
    const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allRatings.forEach(r => {
      const rating = Math.floor(Number(r.rating));
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    });

    // Format reviews response
    const formattedReviews = reviews.map(enrollment => ({
      id: enrollment.id,
      rating: Number(enrollment.rating),
      comment: enrollment.review,
      createdAt: enrollment.reviewDate,
      user: {
        id: enrollment.student.id,
        fullName: enrollment.student.fullName,
        avatarUrl: enrollment.student.avatarUrl,
      },
    }));

    return {
      reviews: formattedReviews,
      summary: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: totalRatings,
        ratingDistribution,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalReviews / limit),
        totalItems: totalReviews,
      }
    };
  }

  /**
   * Add a new course review
   */
  async addCourseReview(courseId: string, userId: string, reviewDto: { rating: number; comment: string }) {
    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: courseId }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Find user's enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        courseId,
        studentId: userId
      }
    });

    if (!enrollment) {
      throw new BadRequestException('You must be enrolled in this course to leave a review');
    }

    // Check if already reviewed
    if (enrollment.rating !== null || enrollment.review !== null) {
      throw new BadRequestException('You have already reviewed this course');
    }

    // Validate rating
    if (reviewDto.rating < 1 || reviewDto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Validate comment
    if (!reviewDto.comment || reviewDto.comment.trim().length < 10) {
      throw new BadRequestException('Review comment must be at least 10 characters long');
    }

    // Update enrollment with review
    enrollment.rating = reviewDto.rating;
    enrollment.review = reviewDto.comment.trim();
    enrollment.reviewDate = new Date();

    await this.enrollmentRepository.save(enrollment);

    // Update course rating statistics (optional - could be done via trigger or cron job)
    await this.updateCourseRatingStats(courseId);

    return {
      message: 'Review added successfully',
      review: {
        id: enrollment.id,
        rating: enrollment.rating,
        comment: enrollment.review,
        reviewDate: enrollment.reviewDate,
      }
    };
  }

  /**
   * Update course rating statistics after a new review
   */
  private async updateCourseRatingStats(courseId: string) {
    try {
      const ratingsQuery = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .select('AVG(enrollment.rating)', 'avgRating')
        .addSelect('COUNT(enrollment.rating)', 'totalRatings')
        .where('enrollment.courseId = :courseId', { courseId })
        .andWhere('enrollment.rating IS NOT NULL')
        .getRawOne();

      const avgRating = Number(ratingsQuery.avgRating) || 0;
      const totalRatings = Number(ratingsQuery.totalRatings) || 0;

      // Update course with new rating stats
      await this.courseRepository.update(courseId, {
        rating: Math.round(avgRating * 10) / 10,
        totalRatings: totalRatings,
      });

    } catch (error) {
      console.error('Failed to update course rating stats:', error);
      // Don't throw error as this is not critical
    }
  }
}

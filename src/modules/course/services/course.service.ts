import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { CourseSection } from '../entities/course-section.entity';
import { Repository } from 'typeorm';
import { Lesson } from '../entities/lesson.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { CacheService } from '@/cache/cache.service';
import { CourseStatus, EnrollmentStatus, PaymentStatus } from '@/common/enums/course.enums';
import { CreateCourseDto } from '../dto/create-course.dto';
import { WinstonLoggerService } from '@/logger/winston-logger.service';
import { CourseQueryDto } from '../dto/course-query.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(CourseService.name);
  }

  async create(createCourseDto: CreateCourseDto, teacherId: string): Promise<Course> {
    // Check if slug is unique
    const existingCourse = await this.courseRepository.findOne({
      where: { slug: createCourseDto.slug },
    });

    if (existingCourse) {
      throw new BadRequestException('Course with this slug already exists');
    }

    // Create course entity
    const course = this.courseRepository.create({
      ...createCourseDto,
      teacherId,
      status: CourseStatus.DRAFT,
    });

    const savedCourse = await this.courseRepository.save(course);

    // Update category course count
    await this.updateCategoryCourseCount(savedCourse.categoryId);

    this.logger.log(`Course created: ${savedCourse.title} by teacher ${teacherId}`);

    return this.findById(savedCourse.id, { includeTeacher: true, includeCategory: true });
  }

  async findById(
    id: string,
    options?: {
      includeTeacher?: boolean;
      includeCategory?: boolean;
      includeSections?: boolean;
      includeEnrollments?: boolean;
    },
  ): Promise<Course> {
    const cacheKey = `course:${id}:${JSON.stringify(options || {})}`;
    const cached = await this.cacheService.get<Course>(cacheKey);

    if (cached) {
      return cached;
    }

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
      throw new NotFoundException('Course not found');
    }

    await this.cacheService.set(cacheKey, course, 300); // Cache for 5 minutes

    return course;
  }

  async findBySlug(slug: string): Promise<Course> {
    const cacheKey = `course:slug:${slug}`;
    const cached = await this.cacheService.get<Course>(cacheKey);

    if (cached) {
      return cached;
    }

    const course = await this.courseRepository.findOne({
      where: { slug },
      relations: ['teacher', 'category', 'sections', 'sections.lessons'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.cacheService.set(cacheKey, course, 300);

    return course;
  }

  async findAll(queryDto: CourseQueryDto): Promise<{ courses: Course[]; total: number }> {
    const {
      categoryId,
      teacherId,
      level,
      status,
      isFree,
      featured,
      search,
      minPrice,
      maxPrice,
      language,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = queryDto;

    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.teacher', 'teacher')
      .leftJoinAndSelect('course.category', 'category');

    // Apply filters
    if (categoryId) {
      queryBuilder.andWhere('course.categoryId = :categoryId', { categoryId });
    }

    if (teacherId) {
      queryBuilder.andWhere('course.teacherId = :teacherId', { teacherId });
    }

    if (level) {
      queryBuilder.andWhere('course.level = :level', { level });
    }

    if (status) {
      queryBuilder.andWhere('course.status = :status', { status });
    } else {
      // Default to published courses for public queries
      queryBuilder.andWhere('course.status = :status', { status: CourseStatus.PUBLISHED });
    }

    if (typeof isFree === 'boolean') {
      queryBuilder.andWhere('course.isFree = :isFree', { isFree });
    }

    if (typeof featured === 'boolean') {
      queryBuilder.andWhere('course.featured = :featured', { featured });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('course.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('course.price <= :maxPrice', { maxPrice });
    }

    if (language) {
      queryBuilder.andWhere('course.language = :language', { language });
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('JSON_OVERLAPS(course.tags, :tags)', { tags: JSON.stringify(tags) });
    }

    if (search) {
      queryBuilder.andWhere(
        '(course.title LIKE :search OR course.description LIKE :search OR course.shortDescription LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    const validSortFields = [
      'createdAt',
      'updatedAt',
      'title',
      'price',
      'rating',
      'totalEnrollments',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`course.${sortField}`, sortOrder as 'ASC' | 'DESC');

    // Apply pagination
    const [courses, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { courses, total };
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, teacherId?: string): Promise<Course> {
    const course = await this.findById(id);
    // Check if user has permission to update
    if (teacherId && course.teacherId !== teacherId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // Check slug uniqueness if being updated
    if (updateCourseDto.slug && updateCourseDto.slug !== course.slug) {
      const existingCourse = await this.courseRepository.findOne({
        where: { slug: updateCourseDto.slug },
      });

      if (existingCourse && existingCourse.id !== id) {
        throw new BadRequestException('Course with this slug already exists');
      }
    }

    Object.assign(course, updateCourseDto);
    course.lastUpdatedAt = new Date();

    const updatedCourse = await this.courseRepository.save(course);

    // Update category course count if category changed
    if (updateCourseDto.categoryId && updateCourseDto.categoryId !== course.categoryId) {
      await this.updateCategoryCourseCount(course.categoryId); // Old category
      await this.updateCategoryCourseCount(updateCourseDto.categoryId); // New category
    }

    // Invalidate cache
    await this.invalidateCourseCache(id);

    this.logger.log(`Course updated: ${updatedCourse.id}`);

    return this.findById(id, { includeTeacher: true, includeCategory: true });
  }

  async updateStatus(id: string, status: CourseStatus, teacherId?: string): Promise<Course> {
    const course = await this.findById(id);
    if (teacherId && course.teacherId !== teacherId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    course.status = status;

    if (status === CourseStatus.PUBLISHED && !course.publishedAt) {
      course.publishedAt = new Date();
    }

    await this.courseRepository.save(course);
    await this.invalidateCourseCache(id);

    this.logger.log(`Course status updated: ${id} -> ${status}`);

    return course;
  }

  async enroll(courseId: string, studentId: string): Promise<Enrollment> {
    const course = await this.findById(courseId);
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Course is not available for enrollment');
    }

    if (course.enrollmentLimit && course.totalEnrollments >= course.enrollmentLimit) {
      throw new BadRequestException('Course enrollment is full');
    }

    // Check if already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId, courseId },
    });

    if (existingEnrollment) {
      throw new BadRequestException('Already enrolled in this course');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      studentId,
      courseId,
      paymentAmount: course.price,
      paymentCurrency: course.currency,
      paymentStatus: course.isFree ? PaymentStatus.PAID : PaymentStatus.PENDING,
      totalLessons: course.totalLessons,
    });

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    // Update course enrollment count
    await this.courseRepository.increment({ id: courseId }, 'totalEnrollments', 1);
    await this.invalidateCourseCache(courseId);

    this.logger.log(`Student ${studentId} enrolled in course ${courseId}`);

    return savedEnrollment;
  }

  async getEnrollment(courseId: string, studentId: string): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({
      where: { courseId, studentId },
      relations: ['course', 'student'],
    });
  }
  async updateProgress(courseId: string, studentId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { courseId, studentId },
      relations: ['lessonProgress'],
    });
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const totalLessons = enrollment.totalLessons;
    const completedLessons =
      enrollment.lessonProgress?.filter(progress => progress.status === 'completed').length || 0;

    const progressPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    enrollment.progressPercentage = progressPercentage;
    enrollment.lessonsCompleted = completedLessons;
    enrollment.lastAccessedAt = new Date();

    // Update status based on progress
    if (progressPercentage >= 100) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completionDate = new Date();
    } else if (progressPercentage > 0) {
      enrollment.status = EnrollmentStatus.IN_PROGRESS;
    }

    await this.enrollmentRepository.save(enrollment);

    // Update course completion count
    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      await this.courseRepository.increment({ id: courseId }, 'totalCompletions', 1);
    }
  }

  async getCourseStatistics(courseId: string): Promise<any> {
    const course = await this.findById(courseId);
    const enrollmentStats = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select([
        'COUNT(*) as totalEnrollments',
        'COUNT(CASE WHEN status = "completed" THEN 1 END) as completedEnrollments',
        'AVG(progressPercentage) as averageProgress',
        'AVG(rating) as averageRating',
        'SUM(totalTimeSpent) as totalTimeSpent',
      ])
      .where('enrollment.courseId = :courseId', { courseId })
      .getRawOne();

    const monthlyEnrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select(['DATE_FORMAT(enrollmentDate, "%Y-%m") as month', 'COUNT(*) as count'])
      .where('enrollment.courseId = :courseId', { courseId })
      .groupBy('month')
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    return {
      course: {
        id: course.id,
        title: course.title,
        status: course.status,
        totalSections: course.totalSections,
        totalLessons: course.totalLessons,
      },
      enrollments: enrollmentStats,
      trends: {
        monthlyEnrollments,
      },
    };
  }

  async getFeaturedCourses(limit: number = 10): Promise<Course[]> {
    const cacheKey = `courses:featured:${limit}`;
    const cached = await this.cacheService.get<Course[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const courses = await this.courseRepository.find({
      where: {
        featured: true,
        status: CourseStatus.PUBLISHED,
      },
      relations: ['teacher', 'category'],
      order: { rating: 'DESC', totalEnrollments: 'DESC' },
      take: limit,
    });

    await this.cacheService.set(cacheKey, courses, 600); // Cache for 10 minutes

    return courses;
  }

  async getPopularCourses(limit: number = 10): Promise<Course[]> {
    const cacheKey = `courses:popular:${limit}`;
    const cached = await this.cacheService.get<Course[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const courses = await this.courseRepository.find({
      where: { status: CourseStatus.PUBLISHED },
      relations: ['teacher', 'category'],
      order: { totalEnrollments: 'DESC', rating: 'DESC' },
      take: limit,
    });

    await this.cacheService.set(cacheKey, courses, 600);

    return courses;
  }

  async getNewCourses(limit: number = 10): Promise<Course[]> {
    const cacheKey = `courses:new:${limit}`;
    const cached = await this.cacheService.get<Course[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const courses = await this.courseRepository.find({
      where: { status: CourseStatus.PUBLISHED },
      relations: ['teacher', 'category'],
      order: { publishedAt: 'DESC' },
      take: limit,
    });

    await this.cacheService.set(cacheKey, courses, 600);

    return courses;
  }

  async updateCourseStats(courseId: string): Promise<void> {
    const sectionsCount = await this.sectionRepository.count({
      where: { courseId, isActive: true },
    });
    const lessonsCount = await this.lessonRepository.count({
      where: { courseId, isActive: true },
    });

    const totalVideoDuration = await this.lessonRepository
      .createQueryBuilder('lesson')
      .select('SUM(lesson.videoDuration)', 'total')
      .where('lesson.courseId = :courseId', { courseId })
      .andWhere('lesson.lessonType = :type', { type: 'video' })
      .getRawOne();

    await this.courseRepository.update(courseId, {
      totalSections: sectionsCount,
      totalLessons: lessonsCount,
      totalVideoDuration: totalVideoDuration?.total || 0,
    });

    await this.invalidateCourseCache(courseId);
  }
  async delete(id: string, teacherId?: string): Promise<void> {
    const course = await this.findById(id);
    if (teacherId && course.teacherId !== teacherId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    // Check if course has enrollments
    const enrollmentCount = await this.enrollmentRepository.count({
      where: { courseId: id },
    });

    if (enrollmentCount > 0) {
      // Soft delete if has enrollments
      course.deletedAt = new Date();
      await this.courseRepository.save(course);
    } else {
      // Hard delete if no enrollments
      await this.courseRepository.delete(id);
    }

    // Update category course count
    await this.updateCategoryCourseCount(course.categoryId);
    await this.invalidateCourseCache(id);

    this.logger.log(`Course deleted: ${id}`);
  }

  private async updateCategoryCourseCount(categoryId: string): Promise<void> {
    const count = await this.courseRepository.count({
      where: { categoryId, status: CourseStatus.PUBLISHED },
    });
    await this.courseRepository.query('UPDATE categories SET courseCount = ? WHERE id = ?', [
      count,
      categoryId,
    ]);
  }

  private async invalidateCourseCache(courseId: string): Promise<void> {
    const patterns = [
      `course:${courseId}:*`,
      `course:slug:*`,
      `courses:featured:*`,
      `courses:popular:*`,
      `courses:new:*`,
    ];
    for (const pattern of patterns) {
      await this.cacheService.invalidateByTag(pattern);
    }
  }
}

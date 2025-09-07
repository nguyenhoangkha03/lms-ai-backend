import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { CourseSection } from '../entities/course-section.entity';
import { Course } from '../entities/course.entity';
import { CreateSectionDto } from '../dto/sections/create-section.dto';
import { UpdateSectionDto } from '../dto/sections/update-section.dto';
import { SectionQueryDto } from '../dto/sections/section-query.dto';
import { ReorderSectionsDto } from '../dto/sections/reorder-sections.dto';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class SectionService {
  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(SectionService.name);
  }

  async create(createSectionDto: CreateSectionDto, userId: string): Promise<CourseSection> {
    this.logger.log(
      `Creating section: ${createSectionDto.title} for course: ${createSectionDto.courseId}`,
    );

    // Verify course exists and user has permission
    const course = await this.courseRepository.findOne({
      where: { id: createSectionDto.courseId },
      relations: ['teacher'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== userId) {
      throw new ForbiddenException('You can only create sections for your own courses');
    }

    // Get the next order index if not provided
    let orderIndex = createSectionDto.orderIndex;
    if (orderIndex === undefined) {
      const lastSection = await this.sectionRepository.findOne({
        where: { courseId: createSectionDto.courseId },
        order: { orderIndex: 'DESC' },
      });
      orderIndex = lastSection ? lastSection.orderIndex + 1 : 0;
    }

    // Create section
    const section = this.sectionRepository.create({
      ...createSectionDto,
      orderIndex,
      availableFrom: createSectionDto.availableFrom
        ? new Date(createSectionDto.availableFrom)
        : undefined,
      availableUntil: createSectionDto.availableUntil
        ? new Date(createSectionDto.availableUntil)
        : undefined,
    });

    const savedSection = await this.sectionRepository.save(section);

    course.totalSections++;
    await this.courseRepository.save(course);

    this.logger.log(`Section created successfully: ${savedSection.id}`);
    return savedSection;
  }

  async findAll(queryDto: SectionQueryDto): Promise<{
    data: CourseSection[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      courseId,
      isActive,
      isRequired,
      search,
      includeLessons = false,
      page = 1,
      limit = 10,
      sortBy = 'orderIndex',
      sortOrder = 'ASC',
    } = queryDto;

    const queryBuilder: SelectQueryBuilder<CourseSection> =
      this.sectionRepository.createQueryBuilder('section');

    // Relations
    if (includeLessons) {
      queryBuilder.leftJoinAndSelect('section.lessons', 'lessons');
    }

    // Filters
    if (courseId) {
      queryBuilder.andWhere('section.courseId = :courseId', { courseId });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('section.isActive = :isActive', { isActive });
    }

    if (isRequired !== undefined) {
      queryBuilder.andWhere('section.isRequired = :isRequired', { isRequired });
    }

    if (search) {
      queryBuilder.andWhere('(section.title ILIKE :search OR section.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Sorting
    queryBuilder.orderBy(`section.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string, includeLessons = false): Promise<CourseSection> {
    const queryBuilder = this.sectionRepository.createQueryBuilder('section');

    if (includeLessons) {
      queryBuilder.leftJoinAndSelect('section.lessons', 'lessons');
    }

    const section = await queryBuilder.where('section.id = :id', { id }).getOne();

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async findByCourseId(courseId: string, includeLessons = false): Promise<CourseSection[]> {
    const queryBuilder = this.sectionRepository.createQueryBuilder('section');

    if (includeLessons) {
      queryBuilder.leftJoinAndSelect('section.lessons', 'lessons');
    }

    return queryBuilder
      .where('section.courseId = :courseId', { courseId })
      .orderBy('section.orderIndex', 'ASC')
      .getMany();
  }

  async update(
    id: string,
    updateSectionDto: UpdateSectionDto,
    userId: string,
  ): Promise<CourseSection> {
    this.logger.log(`Updating section: ${id}`);

    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (section.course.teacherId !== userId) {
      throw new ForbiddenException('You can only update sections of your own courses');
    }

    // Update date fields
    const updateData = {
      ...updateSectionDto,
      availableFrom: updateSectionDto.availableFrom
        ? new Date(updateSectionDto.availableFrom)
        : undefined,
      availableUntil: updateSectionDto.availableUntil
        ? new Date(updateSectionDto.availableUntil)
        : undefined,
    };

    Object.assign(section, updateData);
    const updatedSection = await this.sectionRepository.save(section);

    this.logger.log(`Section updated successfully: ${id}`);
    return updatedSection;
  }

  async reorder(reorderDto: ReorderSectionsDto, userId: string): Promise<CourseSection[]> {
    this.logger.log(`Reordering sections for course: ${reorderDto.courseId}`);

    // Verify course ownership
    const course = await this.courseRepository.findOne({
      where: { id: reorderDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== userId) {
      throw new ForbiddenException('You can only reorder sections of your own courses');
    }

    // Get all sections
    const sections = await this.sectionRepository.find({
      where: { id: In(reorderDto.sectionIds) },
    });

    if (sections.length !== reorderDto.sectionIds.length) {
      throw new BadRequestException('Some section IDs are invalid');
    }

    // Update order indices
    const updatePromises = reorderDto.sectionIds.map((sectionId, index) =>
      this.sectionRepository.update(sectionId, { orderIndex: index }),
    );

    await Promise.all(updatePromises);

    // Return updated sections
    return this.findByCourseId(reorderDto.courseId);
  }

  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`Deleting section: ${id}`);

    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ['course', 'lessons'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    if (section.course.teacherId !== userId) {
      throw new ForbiddenException('You can only delete sections of your own courses');
    }

    if (section.lessons && section.lessons.length > 0) {
      throw new BadRequestException(
        'Cannot delete section with existing lessons. Delete lessons first.',
      );
    }

    const course = section.course;
    course.totalSections--;
    await this.courseRepository.save(course);

    await this.sectionRepository.remove(section);
    this.logger.log(`Section deleted successfully: ${id}`);
  }

  async getSectionStats(id: string): Promise<{
    totalLessons: number;
    totalDuration: number;
    publishedLessons: number;
    draftLessons: number;
    averageLessonDuration: number;
  }> {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ['lessons'],
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const lessons = section.lessons || [];
    const totalLessons = lessons.length;
    const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.estimatedDuration || 0), 0);
    const publishedLessons = lessons.filter(lesson => lesson.status === 'published').length;
    const draftLessons = lessons.filter(lesson => lesson.status === 'draft').length;
    const averageLessonDuration = totalLessons > 0 ? totalDuration / totalLessons : 0;

    return {
      totalLessons,
      totalDuration,
      publishedLessons,
      draftLessons,
      averageLessonDuration,
    };
  }
}

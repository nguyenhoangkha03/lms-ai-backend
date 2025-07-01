import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseSeeder } from './base.seeder';
import { Category } from '@/modules/course/entities/category.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { CourseSection } from '@/modules/course/entities/course-section.entity';
import { Lesson } from '@/modules/course/entities/lesson.entity';
import { User } from '@/modules/user/entities/user.entity';
import { CourseLevel, CourseStatus, LessonType } from '../../common/enums/course.enums';
import { WinstonLoggerService } from '@/logger/winston-logger.service';
import { UserType } from '@/common/enums/user.enums';

@Injectable()
export class CourseSeeder extends BaseSeeder {
  constructor(dataSource: DataSource, logger: WinstonLoggerService) {
    super(dataSource, logger);
  }

  async run(): Promise<void> {
    this.logger.log('📚 Running Course Seeder...');

    await this.seedCategories();
    await this.seedSampleCourses();

    this.logger.log('✅ Course Seeder completed');
  }

  private async seedCategories(): Promise<void> {
    const categoryRepository = await this.getRepository<Category>(Category);

    const categories = [
      {
        name: 'Programming & Development',
        slug: 'programming-development',
        description: 'Learn programming languages and software development',
        iconUrl: 'https://example.com/icons/programming.svg',
        color: '#3B82F6',
        orderIndex: 1,
        level: 0,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
      },
      {
        name: 'Web Development',
        slug: 'web-development',
        description: 'Frontend and backend web development',
        iconUrl: 'https://example.com/icons/web.svg',
        color: '#10B981',
        orderIndex: 1,
        level: 1,
        isActive: true,
        showInMenu: true,
        parentId: null, // Will be set to Programming & Development ID
      },
      {
        name: 'Mobile Development',
        slug: 'mobile-development',
        description: 'iOS and Android app development',
        iconUrl: 'https://example.com/icons/mobile.svg',
        color: '#8B5CF6',
        orderIndex: 2,
        level: 1,
        isActive: true,
        showInMenu: true,
        parentId: null, // Will be set to Programming & Development ID
      },
      {
        name: 'Data Science & AI',
        slug: 'data-science-ai',
        description: 'Machine learning, data analysis, and artificial intelligence',
        iconUrl: 'https://example.com/icons/ai.svg',
        color: '#F59E0B',
        orderIndex: 2,
        level: 0,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
      },
      {
        name: 'Business & Marketing',
        slug: 'business-marketing',
        description: 'Business skills and digital marketing',
        iconUrl: 'https://example.com/icons/business.svg',
        color: '#EF4444',
        orderIndex: 3,
        level: 0,
        isActive: true,
        showInMenu: true,
      },
      {
        name: 'Design & Creativity',
        slug: 'design-creativity',
        description: 'Graphic design, UI/UX, and creative skills',
        iconUrl: 'https://example.com/icons/design.svg',
        color: '#EC4899',
        orderIndex: 4,
        level: 0,
        isActive: true,
        showInMenu: true,
      },
    ];

    const savedCategories = await this.insertBatch(
      categoryRepository,
      categories as Partial<Category>[],
    );

    // Set parent relationships
    const programmingCategory = savedCategories.find(c => c.slug === 'programming-development');
    if (programmingCategory) {
      await categoryRepository.update(
        { slug: 'web-development' },
        { parentId: programmingCategory.id },
      );
      await categoryRepository.update(
        { slug: 'mobile-development' },
        { parentId: programmingCategory.id },
      );
    }

    this.logger.log(`📁 Created ${categories.length} categories`);
  }

  private async seedSampleCourses(): Promise<void> {
    const courseRepository = await this.getRepository<Course>(Course);
    const sectionRepository = await this.getRepository<CourseSection>(CourseSection);
    const lessonRepository = await this.getRepository<Lesson>(Lesson);
    const userRepository = await this.getRepository<User>(User);
    const categoryRepository = await this.getRepository<Category>(Category);

    // Get a teacher user and categories
    const teacher = await userRepository.findOne({ where: { userType: UserType.TEACHER } });
    const webDevCategory = await categoryRepository.findOne({ where: { slug: 'web-development' } });
    const aiCategory = await categoryRepository.findOne({ where: { slug: 'data-science-ai' } });

    if (!teacher || !webDevCategory || !aiCategory) {
      this.logger.warn('⚠️ No teacher user or categories found, skipping course creation');
      return;
    }

    // Sample courses
    const courses = [
      {
        title: 'Complete JavaScript Masterclass',
        slug: 'complete-javascript-masterclass',
        description:
          'Learn JavaScript from beginner to advanced level with hands-on projects and real-world applications.',
        shortDescription: 'Master JavaScript with practical examples and projects',
        teacherId: teacher.id,
        categoryId: webDevCategory.id,
        level: CourseLevel.BEGINNER,
        language: 'en',
        durationHours: 40,
        durationMinutes: 0,
        price: 99.99,
        currency: 'USD',
        isFree: false,
        status: CourseStatus.PUBLISHED,
        tags: ['javascript', 'programming', 'web-development'],
        requirements: ['Basic computer skills', 'Text editor installed'],
        whatYouWillLearn: [
          'JavaScript fundamentals and ES6+ features',
          'DOM manipulation and event handling',
          'Asynchronous programming with promises and async/await',
          'Modern JavaScript frameworks introduction',
        ],
        targetAudience: ['Beginner programmers', 'Web development enthusiasts'],
        rating: 4.8,
        totalRatings: 150,
        totalEnrollments: 1250,
        totalCompletions: 890,
        featured: true,
        allowReviews: true,
        allowDiscussions: true,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-01-15'),
      },
      {
        title: 'Machine Learning with Python',
        slug: 'machine-learning-python',
        description:
          'Comprehensive course on machine learning algorithms and their implementation using Python and popular libraries.',
        shortDescription: 'Learn ML algorithms with Python and scikit-learn',
        teacherId: teacher.id,
        categoryId: aiCategory.id,
        level: CourseLevel.INTERMEDIATE,
        language: 'en',
        durationHours: 60,
        durationMinutes: 30,
        price: 149.99,
        currency: 'USD',
        isFree: false,
        status: CourseStatus.PUBLISHED,
        tags: ['machine-learning', 'python', 'data-science', 'ai'],
        requirements: ['Python programming knowledge', 'Basic statistics understanding'],
        whatYouWillLearn: [
          'Supervised and unsupervised learning algorithms',
          'Feature engineering and data preprocessing',
          'Model evaluation and validation techniques',
          'Real-world ML project implementation',
        ],
        targetAudience: ['Python developers', 'Data enthusiasts', 'Career changers'],
        rating: 4.9,
        totalRatings: 89,
        totalEnrollments: 567,
        totalCompletions: 234,
        featured: true,
        allowReviews: true,
        allowDiscussions: true,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-02-01'),
      },
      {
        title: 'Free HTML & CSS Basics',
        slug: 'free-html-css-basics',
        description:
          'Start your web development journey with this free course covering HTML and CSS fundamentals.',
        shortDescription: 'Free introduction to HTML and CSS',
        teacherId: teacher.id,
        categoryId: webDevCategory.id,
        level: CourseLevel.BEGINNER,
        language: 'en',
        durationHours: 12,
        durationMinutes: 0,
        price: 0,
        currency: 'USD',
        isFree: true,
        status: CourseStatus.PUBLISHED,
        tags: ['html', 'css', 'web-development', 'free'],
        requirements: ['Just a computer and internet connection'],
        whatYouWillLearn: [
          'HTML structure and semantic elements',
          'CSS styling and layout techniques',
          'Responsive design basics',
          'Creating your first website',
        ],
        targetAudience: ['Complete beginners', 'Career changers', 'Students'],
        rating: 4.6,
        totalRatings: 234,
        totalEnrollments: 2341,
        totalCompletions: 1567,
        featured: false,
        isNew: true,
        allowReviews: true,
        allowDiscussions: true,
        hasCertificate: false,
        lifetimeAccess: true,
        publishedAt: new Date('2024-03-01'),
      },
    ];

    const savedCourses = await this.insertBatch(courseRepository, courses as Partial<Course>[]);

    // Create sections and lessons for the first course
    await this.createCourseSections(savedCourses[0], sectionRepository, lessonRepository);

    this.logger.log(`📚 Created ${courses.length} sample courses with content`);
  }

  private async createCourseSections(
    course: Course,
    sectionRepository: any,
    lessonRepository: any,
  ): Promise<void> {
    const sections = [
      {
        courseId: course.id,
        title: 'Introduction to JavaScript',
        description: 'Getting started with JavaScript programming',
        orderIndex: 1,
        isActive: true,
        objectives: ['Understand what JavaScript is', 'Set up development environment'],
      },
      {
        courseId: course.id,
        title: 'JavaScript Fundamentals',
        description: 'Core JavaScript concepts and syntax',
        orderIndex: 2,
        isActive: true,
        objectives: ['Variables and data types', 'Functions and scope', 'Control structures'],
      },
      {
        courseId: course.id,
        title: 'Advanced JavaScript',
        description: 'Advanced concepts and modern JavaScript features',
        orderIndex: 3,
        isActive: true,
        objectives: ['Closures and prototypes', 'ES6+ features', 'Async programming'],
      },
    ];

    const savedSections = (await this.insertBatch(sectionRepository, sections)) as CourseSection[];

    // Create lessons for each section
    for (const section of savedSections) {
      const lessons = await this.createSectionLessons(course.id, section.id, section.orderIndex);
      await this.insertBatch(lessonRepository, lessons);
    }

    // Update course stats
    const totalSections = savedSections.length;
    const totalLessons = savedSections.length * 3; // 3 lessons per section

    await sectionRepository.query(
      'UPDATE courses SET totalSections = ?, totalLessons = ? WHERE id = ?',
      [totalSections, totalLessons, course.id],
    );
  }

  private createSectionLessons(courseId: string, sectionId: string, sectionIndex: number): any[] {
    const baseLessons = [
      {
        courseId,
        sectionId,
        title: 'Introduction',
        slug: `section-${sectionIndex}-introduction`,
        description: 'Introduction to this section',
        content: '<p>Welcome to this section of the course.</p>',
        lessonType: LessonType.TEXT,
        orderIndex: 1,
        isPreview: sectionIndex === 1, // First section lessons are preview
        estimatedDuration: 10,
        points: 10,
      },
      {
        courseId,
        sectionId,
        title: 'Video Lesson',
        slug: `section-${sectionIndex}-video`,
        description: 'Main video content',
        videoUrl: 'https://example.com/videos/lesson.mp4',
        videoDuration: 1200, // 20 minutes
        lessonType: LessonType.VIDEO,
        orderIndex: 2,
        estimatedDuration: 20,
        points: 20,
      },
      {
        courseId,
        sectionId,
        title: 'Practice Exercise',
        slug: `section-${sectionIndex}-exercise`,
        description: 'Hands-on practice',
        content: '<p>Complete the following exercise to practice what you learned.</p>',
        lessonType: LessonType.INTERACTIVE,
        orderIndex: 3,
        isMandatory: true,
        estimatedDuration: 15,
        points: 30,
      },
    ];

    return baseLessons;
  }
}

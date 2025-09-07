import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '@/modules/course/entities/category.entity';

@Injectable()
export class CategorySeeder {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async seed(): Promise<void> {
    // Check if data already exists
    const existingCategories = await this.categoryRepository.count();
    if (existingCategories > 0) {
      console.log('Categories already exist, skipping seeding...');
      return;
    }

    console.log('Seeding categories...');

    // Create root categories first and store their IDs
    const rootCategories: Category[] = [];

    // Level 0 - Root Categories
    const rootCategoriesData = [
      {
        name: 'Programming & Development',
        slug: 'programming-development',
        description:
          'Learn programming languages, web development, mobile development, and software engineering',
        color: '#3B82F6',
        orderIndex: 1,
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/6656/6656266.png',
        coverUrl:
          'https://static.vecteezy.com/system/resources/previews/006/362/890/non_2x/programming-and-software-development-web-page-banner-program-code-on-screen-device-software-development-coding-process-concept-vector.jpg',
        level: 0,
        parentId: null,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Programming & Development Courses',
          description: 'Master programming with our comprehensive courses',
          keywords: ['programming', 'development', 'coding', 'software'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'code',
          difficulty: 'all-levels',
        },
      },
      {
        name: 'Business & Marketing',
        slug: 'business-marketing',
        description:
          'Develop business skills, marketing strategies, and entrepreneurship knowledge',
        color: '#10B981',
        orderIndex: 2,
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/6656/6656266.png',
        coverUrl:
          'https://static.vecteezy.com/system/resources/previews/006/362/890/non_2x/programming-and-software-development-web-page-banner-program-code-on-screen-device-software-development-coding-process-concept-vector.jpg',
        level: 0,
        parentId: null,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Business & Marketing Courses',
          description: 'Grow your business skills and marketing expertise',
          keywords: ['business', 'marketing', 'entrepreneurship', 'strategy'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'briefcase',
          difficulty: 'all-levels',
        },
      },
      {
        name: 'Design & Creative Arts',
        slug: 'design-creative-arts',
        description: 'Explore graphic design, UI/UX design, illustration, and creative skills',
        color: '#F59E0B',
        orderIndex: 3,
        level: 0,
        parentId: null,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Design & Creative Arts Courses',
          description: 'Unleash your creativity with design and art courses',
          keywords: ['design', 'creative', 'art', 'graphics', 'ui', 'ux'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'palette',
          difficulty: 'all-levels',
        },
      },
      {
        name: 'Data Science & Analytics',
        slug: 'data-science-analytics',
        description: 'Master data analysis, machine learning, and artificial intelligence',
        color: '#8B5CF6',
        orderIndex: 4,
        level: 0,
        parentId: null,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Data Science & Analytics Courses',
          description: 'Learn data science, machine learning, and AI',
          keywords: ['data science', 'analytics', 'machine learning', 'ai'],
        },
        settings: {
          allowGuestAccess: false,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'chart-bar',
          difficulty: 'intermediate',
        },
      },
      {
        name: 'Language & Communication',
        slug: 'language-communication',
        description: 'Master foreign languages, public speaking, and communication skills',
        color: '#EF4444',
        orderIndex: 5,
        level: 0,
        parentId: null,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Language & Communication Courses',
          description: 'Learn languages and improve communication skills',
          keywords: ['language', 'communication', 'english', 'speaking'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'translate',
          difficulty: 'all-levels',
        },
      },
    ];

    // Create root categories
    for (const categoryData of rootCategoriesData) {
      const category = this.categoryRepository.create(categoryData);
      const savedCategory = await this.categoryRepository.save(category);
      rootCategories.push(savedCategory);
    }

    // Now create subcategories using the actual IDs of saved root categories
    const subcategoriesData = [
      // Programming & Development subcategories
      {
        name: 'Web Development',
        slug: 'web-development',
        description: 'Frontend, backend, and full-stack web development',
        color: '#3B82F6',
        orderIndex: 1,
        level: 1,
        parentId: rootCategories[0].id,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Web Development Courses',
          description: 'Learn modern web development technologies',
          keywords: ['web development', 'html', 'css', 'javascript'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'globe',
          difficulty: 'beginner',
        },
      },
      {
        name: 'Mobile Development',
        slug: 'mobile-development',
        description: 'iOS, Android, and cross-platform mobile app development',
        color: '#3B82F6',
        orderIndex: 2,
        level: 1,
        parentId: rootCategories[0].id,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Mobile Development Courses',
          description: 'Build mobile apps for iOS and Android',
          keywords: ['mobile development', 'ios', 'android', 'react native'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'device-mobile',
          difficulty: 'intermediate',
        },
      },
      {
        name: 'Backend Development',
        slug: 'backend-development',
        description: 'Server-side development, APIs, and database management',
        color: '#3B82F6',
        orderIndex: 3,
        level: 1,
        parentId: rootCategories[0].id,
        isActive: true,
        showInMenu: false,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Backend Development Courses',
          description: 'Master server-side programming and APIs',
          keywords: ['backend', 'server', 'api', 'database'],
        },
        settings: {
          allowGuestAccess: false,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'server',
          difficulty: 'intermediate',
        },
      },

      // Business & Marketing subcategories
      {
        name: 'Digital Marketing',
        slug: 'digital-marketing',
        description: 'SEO, social media marketing, content marketing, and online advertising',
        color: '#10B981',
        orderIndex: 1,
        level: 1,
        parentId: rootCategories[1].id,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Digital Marketing Courses',
          description: 'Master digital marketing strategies and tools',
          keywords: ['digital marketing', 'seo', 'social media', 'ppc'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'speakerphone',
          difficulty: 'beginner',
        },
      },
      {
        name: 'Entrepreneurship',
        slug: 'entrepreneurship',
        description: 'Starting and growing your own business',
        color: '#10B981',
        orderIndex: 2,
        level: 1,
        parentId: rootCategories[1].id,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Entrepreneurship Courses',
          description: 'Learn how to start and scale your business',
          keywords: ['entrepreneurship', 'startup', 'business plan'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'lightbulb',
          difficulty: 'intermediate',
        },
      },
      {
        name: 'Project Management',
        slug: 'project-management',
        description: 'Agile, Scrum, and traditional project management methodologies',
        color: '#10B981',
        orderIndex: 3,
        level: 1,
        parentId: rootCategories[1].id,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Project Management Courses',
          description: 'Learn project management skills and methodologies',
          keywords: ['project management', 'agile', 'scrum', 'pmp'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'clipboard-list',
          difficulty: 'intermediate',
        },
      },

      // Design & Creative Arts subcategories
      {
        name: 'Graphic Design',
        slug: 'graphic-design',
        description: 'Visual design, branding, and print design',
        color: '#F59E0B',
        orderIndex: 1,
        level: 1,
        parentId: rootCategories[2].id,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Graphic Design Courses',
          description: 'Learn visual design and branding',
          keywords: ['graphic design', 'photoshop', 'illustrator', 'branding'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'photograph',
          difficulty: 'beginner',
        },
      },
      {
        name: 'UI/UX Design',
        slug: 'ui-ux-design',
        description: 'User interface and user experience design',
        color: '#F59E0B',
        orderIndex: 2,
        level: 1,
        parentId: rootCategories[2].id,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'UI/UX Design Courses',
          description: 'Master user interface and experience design',
          keywords: ['ui design', 'ux design', 'figma', 'sketch'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'template',
          difficulty: 'intermediate',
        },
      },
      {
        name: 'Photography',
        slug: 'photography',
        description: 'Digital photography, editing, and visual storytelling',
        color: '#F59E0B',
        orderIndex: 3,
        level: 1,
        parentId: rootCategories[2].id,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Photography Courses',
          description: 'Learn photography techniques and editing',
          keywords: ['photography', 'photo editing', 'lightroom', 'camera'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'camera',
          difficulty: 'beginner',
        },
      },

      // Data Science & Analytics subcategories
      {
        name: 'Machine Learning',
        slug: 'machine-learning',
        description: 'Algorithms, models, and AI implementation',
        color: '#8B5CF6',
        orderIndex: 1,
        level: 1,
        parentId: rootCategories[3].id,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'Machine Learning Courses',
          description: 'Learn ML algorithms and AI implementation',
          keywords: ['machine learning', 'ai', 'python', 'tensorflow'],
        },
        settings: {
          allowGuestAccess: false,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'cpu-chip',
          difficulty: 'advanced',
        },
      },
      {
        name: 'Data Analysis',
        slug: 'data-analysis',
        description: 'Statistical analysis, visualization, and business intelligence',
        color: '#8B5CF6',
        orderIndex: 2,
        level: 1,
        parentId: rootCategories[3].id,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Data Analysis Courses',
          description: 'Master data analysis and visualization',
          keywords: ['data analysis', 'statistics', 'excel', 'python', 'r'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'chart-pie',
          difficulty: 'intermediate',
        },
      },

      // Language & Communication subcategories
      {
        name: 'English Language',
        slug: 'english-language',
        description: 'Grammar, vocabulary, speaking, and writing skills',
        color: '#EF4444',
        orderIndex: 1,
        level: 1,
        parentId: rootCategories[4].id,
        isActive: true,
        showInMenu: true,
        isFeatured: true,
        courseCount: 0,
        seoMeta: {
          title: 'English Language Courses',
          description: 'Improve your English language skills',
          keywords: ['english', 'grammar', 'vocabulary', 'speaking', 'writing'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'academic-cap',
          difficulty: 'all-levels',
        },
      },
      {
        name: 'Public Speaking',
        slug: 'public-speaking',
        description: 'Presentation skills, confidence building, and communication techniques',
        color: '#EF4444',
        orderIndex: 2,
        level: 1,
        parentId: rootCategories[4].id,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Public Speaking Courses',
          description: 'Master public speaking and presentation skills',
          keywords: ['public speaking', 'presentation', 'communication', 'confidence'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'microphone',
          difficulty: 'beginner',
        },
      },
      {
        name: 'Writing Skills',
        slug: 'writing-skills',
        description: 'Creative writing, technical writing, and content creation',
        color: '#EF4444',
        orderIndex: 3,
        level: 1,
        parentId: rootCategories[4].id,
        isActive: true,
        showInMenu: true,
        isFeatured: false,
        courseCount: 0,
        seoMeta: {
          title: 'Writing Skills Courses',
          description: 'Develop your writing and content creation skills',
          keywords: ['writing', 'content creation', 'copywriting', 'technical writing'],
        },
        settings: {
          allowGuestAccess: true,
          certificateEnabled: true,
        },
        metadata: {
          icon: 'pencil',
          difficulty: 'beginner',
        },
      },
    ];

    // Create subcategories
    for (const subcategoryData of subcategoriesData) {
      const subcategory = this.categoryRepository.create(subcategoryData);
      await this.categoryRepository.save(subcategory);
    }

    const totalCategories = rootCategories.length + subcategoriesData.length;
    console.log(`Seeded ${totalCategories} categories successfully!`);
    console.log(`- ${rootCategories.length} root categories`);
    console.log(`- ${subcategoriesData.length} subcategories`);
  }

  async clear(): Promise<void> {
    console.log('Clearing categories...');
    await this.categoryRepository.delete({});
    console.log('Categories cleared successfully!');
  }
}

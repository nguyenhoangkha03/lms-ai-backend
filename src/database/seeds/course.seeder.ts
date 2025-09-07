import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '@/modules/course/entities/course.entity';
import { Category } from '@/modules/course/entities/category.entity';
import {
  CourseLevel,
  CourseStatus,
  CourseLanguage,
  CoursePricing,
} from '@/common/enums/course.enums';

@Injectable()
export class CourseSeeder {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async seed(): Promise<void> {
    // Check if data already exists
    const existingCourses = await this.courseRepository.count();
    if (existingCourses > 0) {
      console.log('Courses already exist, skipping seeding...');
      return;
    }

    console.log('Seeding courses...');

    // Get all categories to reference their IDs
    const categories = await this.categoryRepository.find();
    const categoryMap = new Map(categories.map(cat => [cat.slug, cat.id]));

    const teacherId = '7cf931ac-a8ef-4388-b0c6-441a1f3d875b';

    const coursesData = [
      // Web Development Courses
      {
        title: 'Complete Web Development Bootcamp 2024',
        slug: 'complete-web-development-bootcamp-2024',
        description:
          'Master modern web development with HTML5, CSS3, JavaScript ES6+, React, Node.js, and MongoDB. Build 15+ real-world projects including e-commerce sites, social media apps, and portfolio websites. Learn responsive design, API development, database management, and deployment strategies.',
        shortDescription:
          'Learn full-stack web development from scratch with hands-on projects and real-world applications.',
        thumbnailUrl:
          'https://vision-inst.com/wp-content/uploads/2022/10/Teachable-Thumbnails-1.png',
        trailerVideoUrl: 'https://youtu.be/TYxtWnFNkDw?si=P3kKW9Y0pSqy0Vdb',
        teacherId,
        categoryId: categoryMap.get('web-development'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 65,
        durationMinutes: 30,
        price: 89.99,
        currency: 'USD',
        originalPrice: 199.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['html', 'css', 'javascript', 'react', 'nodejs', 'mongodb'],
        requirements: [
          'Basic computer literacy',
          'No prior programming experience required',
          'A computer with internet connection',
        ],
        whatYouWillLearn: [
          'Build responsive websites from scratch',
          'Master React.js and modern JavaScript',
          'Create REST APIs with Node.js',
          'Work with databases using MongoDB',
          'Deploy applications to the cloud',
          'Understand web security best practices',
        ],
        targetAudience: [
          'Complete beginners to web development',
          'Students looking to switch careers',
          'Entrepreneurs wanting to build their own websites',
        ],
        rating: 4.8,
        totalRatings: 12847,
        totalEnrollments: 45623,
        totalCompletions: 18249,
        totalReviews: 8934,
        totalSections: 16,
        totalLessons: 245,
        totalVideoDuration: 235800, // 65.5 hours in seconds
        featured: true,
        bestseller: true,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-01-15'),
        seoMeta: {
          title: 'Complete Web Development Bootcamp 2024 - Learn HTML, CSS, JavaScript, React',
          description:
            'Master full-stack web development with our comprehensive bootcamp. Build real projects and launch your career.',
          keywords: ['web development', 'html', 'css', 'javascript', 'react', 'nodejs', 'bootcamp'],
          ogImage: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=1200',
        },
        settings: {
          allowDownloads: true,
          allowQA: true,
          showProgress: true,
        },
        metadata: {
          difficulty: 'beginner-friendly',
          projectCount: 15,
          certificate: 'yes',
        },
      },

      {
        title: 'React.js Masterclass: Build Modern Web Applications',
        slug: 'react-js-masterclass-build-modern-web-applications',
        description:
          'Deep dive into React.js ecosystem including React Hooks, Context API, Redux Toolkit, Next.js, TypeScript, and testing. Build production-ready applications with best practices, performance optimization, and modern development workflows.',
        shortDescription:
          'Advanced React.js course covering hooks, state management, Next.js, and modern development practices.',
        thumbnailUrl:
          'https://dugsiiyeimages.s3.ap-south-1.amazonaws.com/uploads/1736825096679-React.js%20Masterclass1.jpg',
        trailerVideoUrl: 'https://youtu.be/dCLhUialKPQ?si=f-azCAA_FPhueN8Q',
        teacherId,
        categoryId: categoryMap.get('web-development'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 42,
        durationMinutes: 15,
        price: 79.99,
        currency: 'USD',
        originalPrice: 149.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['react', 'javascript', 'hooks', 'redux', 'nextjs', 'typescript'],
        requirements: [
          'Solid understanding of JavaScript ES6+',
          'Basic knowledge of HTML and CSS',
          'Some experience with React basics',
        ],
        whatYouWillLearn: [
          'Master React Hooks and functional components',
          'Implement state management with Redux Toolkit',
          'Build server-side rendered apps with Next.js',
          'Write type-safe code with TypeScript',
          'Test React applications effectively',
          'Optimize performance and bundle size',
        ],
        targetAudience: [
          'JavaScript developers wanting to master React',
          'Frontend developers seeking advanced skills',
          'Developers preparing for React job interviews',
        ],
        rating: 4.7,
        totalRatings: 8924,
        totalEnrollments: 23456,
        totalCompletions: 12108,
        totalReviews: 5234,
        totalSections: 12,
        totalLessons: 156,
        totalVideoDuration: 152100, // 42.25 hours in seconds
        featured: true,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-02-20'),
        seoMeta: {
          title: 'React.js Masterclass - Advanced React Development Course',
          description:
            'Master advanced React concepts, hooks, state management, and Next.js. Build production-ready applications.',
          keywords: ['react', 'javascript', 'frontend', 'hooks', 'redux', 'nextjs'],
        },
      },

      {
        title: 'Node.js & Express.js Backend Development',
        slug: 'nodejs-express-backend-development',
        description:
          'Complete backend development course covering Node.js fundamentals, Express.js framework, MongoDB integration, authentication, API design, security, testing, and deployment. Build scalable server-side applications.',
        shortDescription:
          'Learn backend development with Node.js, Express.js, and MongoDB. Build robust APIs and web services.',
        thumbnailUrl: 'https://cdn-media-0.freecodecamp.org/size/w2000/2021/04/nodeexpress.png',
        trailerVideoUrl: 'https://youtu.be/T55Kb8rrH1g?si=j6lYa-K5v0Hs-GXn',
        teacherId,
        categoryId: categoryMap.get('backend-development'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 38,
        durationMinutes: 45,
        price: 69.99,
        currency: 'USD',
        originalPrice: 129.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['nodejs', 'express', 'mongodb', 'api', 'backend', 'javascript'],
        requirements: [
          'Good understanding of JavaScript',
          'Basic knowledge of databases',
          'Familiarity with command line',
        ],
        whatYouWillLearn: [
          'Build RESTful APIs with Express.js',
          'Work with MongoDB and Mongoose',
          'Implement user authentication and authorization',
          'Handle file uploads and email sending',
          'Write comprehensive tests',
          'Deploy applications to cloud platforms',
        ],
        targetAudience: [
          'Frontend developers wanting to learn backend',
          'JavaScript developers expanding their skills',
          'Students preparing for full-stack roles',
        ],
        rating: 4.6,
        totalRatings: 6751,
        totalEnrollments: 18234,
        totalCompletions: 8967,
        totalReviews: 3842,
        totalSections: 11,
        totalLessons: 134,
        totalVideoDuration: 139500, // 38.75 hours in seconds
        featured: false,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-03-10'),
        seoMeta: {
          title: 'Node.js & Express.js Backend Development Course',
          description:
            'Learn server-side development with Node.js and Express.js. Build APIs, handle databases, and deploy applications.',
          keywords: ['nodejs', 'express', 'backend', 'api', 'javascript', 'mongodb'],
        },
      },

      // Mobile Development Courses
      {
        title: 'React Native: Build Cross-Platform Mobile Apps',
        slug: 'react-native-build-cross-platform-mobile-apps',
        description:
          'Master React Native development and build native mobile applications for iOS and Android. Learn navigation, state management, native modules, animations, and app store deployment strategies.',
        shortDescription:
          'Build native mobile apps for iOS and Android using React Native. From basics to app store deployment.',
        thumbnailUrl:
          'https://www.infomazeelite.com/wp-content/uploads/2023/12/Building-a-Cross-Platform-App-with-React-Native.jpg',
        trailerVideoUrl: 'https://youtu.be/ZBCUegTZF7M?si=iaqkKBHcZlfsHLBd',
        teacherId,
        categoryId: categoryMap.get('mobile-development'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 35,
        durationMinutes: 20,
        price: 74.99,
        currency: 'USD',
        originalPrice: 139.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['react-native', 'mobile', 'ios', 'android', 'javascript', 'expo'],
        requirements: [
          'Strong knowledge of React.js',
          'JavaScript ES6+ proficiency',
          'Basic understanding of mobile app concepts',
        ],
        whatYouWillLearn: [
          'Build cross-platform mobile applications',
          'Implement native navigation and routing',
          'Work with device APIs and native modules',
          'Handle user authentication and data storage',
          'Optimize app performance and user experience',
          'Deploy apps to App Store and Google Play',
        ],
        targetAudience: [
          'React developers wanting to build mobile apps',
          'Mobile developers new to React Native',
          'Entrepreneurs building their own apps',
        ],
        rating: 4.5,
        totalRatings: 5234,
        totalEnrollments: 15678,
        totalCompletions: 6789,
        totalReviews: 2891,
        totalSections: 10,
        totalLessons: 118,
        totalVideoDuration: 127200, // 35.33 hours in seconds
        featured: false,
        bestseller: false,
        isNew: true,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-04-05'),
        seoMeta: {
          title: 'React Native Mobile App Development Course',
          description:
            'Learn to build cross-platform mobile apps with React Native. Deploy to iOS and Android app stores.',
          keywords: ['react native', 'mobile development', 'ios', 'android', 'cross-platform'],
        },
      },

      // Digital Marketing Courses
      {
        title: 'Complete Digital Marketing Strategy & Analytics',
        slug: 'complete-digital-marketing-strategy-analytics',
        description:
          'Comprehensive digital marketing course covering SEO, SEM, social media marketing, content marketing, email marketing, analytics, and conversion optimization. Learn to create and execute successful marketing campaigns.',
        shortDescription:
          'Master digital marketing with SEO, social media, content marketing, and analytics. Build successful campaigns.',
        thumbnailUrl:
          'https://www.lucidadvertising.com/wp-content/uploads/2022/09/Digital-Marketing-image-1024x683.jpeg',
        trailerVideoUrl: 'https://youtu.be/eg4I-RU_vKU?si=Gt_QmO0uFLlOv5XW',
        teacherId,
        categoryId: categoryMap.get('digital-marketing'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 28,
        durationMinutes: 30,
        price: 59.99,
        currency: 'USD',
        originalPrice: 119.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['digital-marketing', 'seo', 'social-media', 'analytics', 'content-marketing'],
        requirements: [
          'Basic computer skills',
          'Understanding of business concepts',
          'No prior marketing experience needed',
        ],
        whatYouWillLearn: [
          'Develop comprehensive marketing strategies',
          'Master SEO and search engine marketing',
          'Create engaging social media campaigns',
          'Analyze marketing performance with tools',
          'Build effective email marketing funnels',
          'Optimize conversion rates and ROI',
        ],
        targetAudience: [
          'Business owners wanting to market online',
          'Marketing professionals seeking skills update',
          'Students interested in digital marketing career',
        ],
        rating: 4.4,
        totalRatings: 7456,
        totalEnrollments: 24567,
        totalCompletions: 11234,
        totalReviews: 4123,
        totalSections: 9,
        totalLessons: 95,
        totalVideoDuration: 102600, // 28.5 hours in seconds
        featured: true,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-01-25'),
        seoMeta: {
          title: 'Complete Digital Marketing Course - SEO, Social Media, Analytics',
          description:
            'Learn digital marketing from scratch. Master SEO, social media, content marketing, and analytics.',
          keywords: [
            'digital marketing',
            'seo',
            'social media marketing',
            'analytics',
            'marketing strategy',
          ],
        },
      },

      {
        title: 'SEO Mastery: Rank #1 on Google in 2024',
        slug: 'seo-mastery-rank-1-google-2024',
        description:
          'Advanced SEO course covering technical SEO, keyword research, content optimization, link building, local SEO, and Google algorithm updates. Learn to rank websites on the first page of Google.',
        shortDescription:
          'Advanced SEO strategies to rank #1 on Google. Technical SEO, link building, and content optimization.',
        thumbnailUrl: 'https://i.ytimg.com/vi/-lG92U1f1Sw/maxresdefault.jpg',
        trailerVideoUrl: 'https://youtu.be/LOLzw_ZkoIc?si=0ENc-V8eEaERImmC',
        teacherId,
        categoryId: categoryMap.get('digital-marketing'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 22,
        durationMinutes: 15,
        price: 49.99,
        currency: 'USD',
        originalPrice: 99.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['seo', 'google', 'search-engine-optimization', 'ranking', 'traffic'],
        requirements: [
          'Basic understanding of websites',
          'Some marketing knowledge helpful',
          'Access to a website or blog',
        ],
        whatYouWillLearn: [
          'Conduct comprehensive keyword research',
          'Optimize website technical performance',
          'Create SEO-friendly content strategies',
          'Build high-quality backlink profiles',
          'Track and analyze SEO performance',
          'Stay updated with Google algorithm changes',
        ],
        targetAudience: [
          'Digital marketers wanting to specialize in SEO',
          'Website owners seeking organic traffic',
          'Bloggers and content creators',
        ],
        rating: 4.6,
        totalRatings: 4789,
        totalEnrollments: 16234,
        totalCompletions: 8901,
        totalReviews: 2567,
        totalSections: 8,
        totalLessons: 87,
        totalVideoDuration: 80100, // 22.25 hours in seconds
        featured: false,
        bestseller: true,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-02-14'),
        seoMeta: {
          title: 'SEO Mastery Course - Rank #1 on Google 2024',
          description:
            'Master advanced SEO techniques to rank #1 on Google. Technical SEO, keyword research, and link building.',
          keywords: [
            'seo',
            'google ranking',
            'search engine optimization',
            'seo course',
            'organic traffic',
          ],
        },
      },

      // Entrepreneurship Courses
      {
        title: 'Start Your Online Business: From Idea to Profit',
        slug: 'start-online-business-idea-to-profit',
        description:
          'Complete entrepreneurship course covering business idea validation, market research, business model creation, funding strategies, marketing, and scaling. Turn your ideas into profitable online businesses.',
        shortDescription:
          'Launch and scale your online business from scratch. Business planning, marketing, and growth strategies.',
        thumbnailUrl:
          'https://dokan.co/app/uploads/2025/03/Profitable-Online-Business-Ideas.-1.jpg',
        trailerVideoUrl: 'https://youtu.be/EeQFi-wm85Q?si=NKRlONWOMT5OgyzW',
        teacherId,
        categoryId: categoryMap.get('entrepreneurship'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 31,
        durationMinutes: 45,
        price: 64.99,
        currency: 'USD',
        originalPrice: 129.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['entrepreneurship', 'startup', 'business', 'online-business', 'marketing'],
        requirements: [
          'No business experience required',
          'Passion for starting a business',
          'Willingness to take action',
        ],
        whatYouWillLearn: [
          'Validate business ideas effectively',
          'Create compelling business models',
          'Develop marketing and sales strategies',
          'Understand legal and financial basics',
          'Build and manage remote teams',
          'Scale businesses systematically',
        ],
        targetAudience: [
          'Aspiring entrepreneurs with business ideas',
          'Professionals wanting to start side businesses',
          'Students interested in entrepreneurship',
        ],
        rating: 4.3,
        totalRatings: 3456,
        totalEnrollments: 12789,
        totalCompletions: 5234,
        totalReviews: 1876,
        totalSections: 10,
        totalLessons: 102,
        totalVideoDuration: 114300, // 31.75 hours in seconds
        featured: false,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-03-20'),
        seoMeta: {
          title: 'Start Your Online Business Course - From Idea to Profit',
          description:
            'Learn to start and grow your online business. Business planning, marketing, and scaling strategies.',
          keywords: [
            'entrepreneurship',
            'online business',
            'startup',
            'business course',
            'make money online',
          ],
        },
      },

      // Project Management Courses
      {
        title: 'Agile Project Management & Scrum Master Certification Prep',
        slug: 'agile-project-management-scrum-master-certification',
        description:
          'Comprehensive Agile and Scrum training covering frameworks, ceremonies, artifacts, and roles. Prepare for Scrum Master certification while learning practical project management skills.',
        shortDescription:
          'Master Agile project management and prepare for Scrum Master certification. Hands-on training included.',
        thumbnailUrl: 'https://img-c.udemycdn.com/course/750x422/4705070_47e6.jpg',
        trailerVideoUrl: 'https://youtu.be/SWDhGSZNF9M?si=0O5dwlQ1rYC8A5kv',
        teacherId,
        categoryId: categoryMap.get('project-management'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 26,
        durationMinutes: 30,
        price: 79.99,
        currency: 'USD',
        originalPrice: 159.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['agile', 'scrum', 'project-management', 'certification', 'leadership'],
        requirements: [
          'Basic understanding of project concepts',
          'Some work experience preferred',
          'Interest in team leadership',
        ],
        whatYouWillLearn: [
          'Master Agile principles and practices',
          'Facilitate Scrum ceremonies effectively',
          'Manage product backlogs and sprints',
          'Lead cross-functional development teams',
          'Handle stakeholder communication',
          'Prepare for Scrum Master certification exam',
        ],
        targetAudience: [
          'Project managers transitioning to Agile',
          'Team leads wanting Scrum Master skills',
          'Professionals seeking certification',
        ],
        rating: 4.5,
        totalRatings: 2845,
        totalEnrollments: 9876,
        totalCompletions: 4567,
        totalReviews: 1234,
        totalSections: 8,
        totalLessons: 76,
        totalVideoDuration: 95400, // 26.5 hours in seconds
        featured: false,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-04-10'),
        seoMeta: {
          title: 'Agile Project Management & Scrum Master Certification Course',
          description:
            'Master Agile and Scrum methodologies. Prepare for Scrum Master certification with hands-on training.',
          keywords: ['agile', 'scrum master', 'project management', 'certification', 'scrum'],
        },
      },

      // Graphic Design Courses
      {
        title: 'Adobe Creative Suite Mastery: Photoshop, Illustrator & InDesign',
        slug: 'adobe-creative-suite-photoshop-illustrator-indesign',
        description:
          'Complete Adobe Creative Suite training covering Photoshop, Illustrator, and InDesign. Learn photo editing, vector graphics, layout design, and create professional marketing materials.',
        shortDescription:
          'Master Adobe Photoshop, Illustrator, and InDesign. Create stunning graphics, logos, and layouts.',
        thumbnailUrl: 'https://img-c.udemycdn.com/course/750x422/5545188_d66e.jpg',
        trailerVideoUrl: 'https://youtu.be/h5acbSbwmIo?si=tQ_fjFUJkbKf6wRF',
        teacherId,
        categoryId: categoryMap.get('graphic-design'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 44,
        durationMinutes: 15,
        price: 84.99,
        currency: 'USD',
        originalPrice: 169.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['adobe', 'photoshop', 'illustrator', 'indesign', 'graphic-design'],
        requirements: [
          'Computer with Adobe Creative Suite',
          'No design experience required',
          'Basic computer skills',
        ],
        whatYouWillLearn: [
          'Master photo editing in Photoshop',
          'Create vector graphics in Illustrator',
          'Design layouts with InDesign',
          'Understand design principles and color theory',
          'Create logos, brochures, and marketing materials',
          'Prepare files for print and digital use',
        ],
        targetAudience: [
          'Beginners wanting to learn graphic design',
          'Marketing professionals needing design skills',
          'Freelancers expanding their services',
        ],
        rating: 4.7,
        totalRatings: 6234,
        totalEnrollments: 19876,
        totalCompletions: 9123,
        totalReviews: 3456,
        totalSections: 12,
        totalLessons: 167,
        totalVideoDuration: 159300, // 44.25 hours in seconds
        featured: true,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-01-30'),
        seoMeta: {
          title: 'Adobe Creative Suite Mastery - Photoshop, Illustrator, InDesign Course',
          description:
            'Master Adobe Creative Suite with comprehensive training in Photoshop, Illustrator, and InDesign.',
          keywords: [
            'adobe photoshop',
            'illustrator',
            'indesign',
            'graphic design',
            'creative suite',
          ],
        },
      },

      // UI/UX Design Courses
      {
        title: 'UI/UX Design Complete Course: Figma to Prototype',
        slug: 'ui-ux-design-complete-figma-prototype',
        description:
          'Comprehensive UI/UX design course covering user research, wireframing, prototyping, visual design, and usability testing. Master Figma, design systems, and create portfolio-worthy projects.',
        shortDescription:
          'Master UI/UX design with Figma. From user research to interactive prototypes and design systems.',
        thumbnailUrl:
          'https://elearning.spectrumfilmschool.com/wp-content/uploads/2023/06/Figma-UI-UX-Design.jpg',
        trailerVideoUrl: 'https://youtu.be/D56hs0Twfco?si=kTVRqaNH4P1k364d',
        teacherId,
        categoryId: categoryMap.get('ui-ux-design'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 39,
        durationMinutes: 45,
        price: 89.99,
        currency: 'USD',
        originalPrice: 179.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['ui-design', 'ux-design', 'figma', 'prototyping', 'user-research'],
        requirements: [
          'Basic understanding of design concepts',
          'Figma account (free version works)',
          'Interest in user-centered design',
        ],
        whatYouWillLearn: [
          'Conduct user research and create personas',
          'Design wireframes and user flows',
          'Create beautiful user interfaces in Figma',
          'Build interactive prototypes',
          'Develop design systems and style guides',
          'Test designs with real users',
        ],
        targetAudience: [
          'Graphic designers transitioning to UI/UX',
          'Developers wanting design skills',
          'Career changers entering UX field',
        ],
        rating: 4.8,
        totalRatings: 4567,
        totalEnrollments: 14321,
        totalCompletions: 7890,
        totalReviews: 2456,
        totalSections: 11,
        totalLessons: 143,
        totalVideoDuration: 143100, // 39.75 hours in seconds
        featured: true,
        bestseller: true,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-02-25'),
        seoMeta: {
          title: 'Complete UI/UX Design Course - Figma to Prototype',
          description:
            'Master UI/UX design with Figma. Learn user research, wireframing, prototyping, and design systems.',
          keywords: ['ui ux design', 'figma', 'prototyping', 'user experience', 'interface design'],
        },
      },

      // Photography Courses
      {
        title: 'Digital Photography Masterclass: DSLR to Editing',
        slug: 'digital-photography-masterclass-dslr-editing',
        description:
          'Complete photography course covering camera basics, composition, lighting, portrait photography, landscape photography, and photo editing in Lightroom and Photoshop.',
        shortDescription:
          'Master digital photography from camera basics to advanced editing. DSLR techniques and post-processing.',
        thumbnailUrl: 'https://img-c.udemycdn.com/course/750x422/1364284_7cf7_5.jpg',
        trailerVideoUrl: 'https://youtu.be/V7z7BAZdt2M?si=VfJ7pE5yOv6b8cVy',
        teacherId,
        categoryId: categoryMap.get('photography'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 33,
        durationMinutes: 20,
        price: 69.99,
        currency: 'USD',
        originalPrice: 139.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['photography', 'dslr', 'lightroom', 'photoshop', 'composition'],
        requirements: [
          'DSLR or mirrorless camera',
          'Computer for editing software',
          'No photography experience needed',
        ],
        whatYouWillLearn: [
          'Master camera settings and controls',
          'Understand composition and lighting',
          'Shoot portraits and landscapes professionally',
          'Edit photos in Lightroom and Photoshop',
          'Build a photography portfolio',
          'Start a photography business',
        ],
        targetAudience: [
          'Beginners wanting to learn photography',
          'Hobbyists improving their skills',
          'Aspiring professional photographers',
        ],
        rating: 4.6,
        totalRatings: 3421,
        totalEnrollments: 11234,
        totalCompletions: 5678,
        totalReviews: 1890,
        totalSections: 9,
        totalLessons: 112,
        totalVideoDuration: 120000, // 33.33 hours in seconds
        featured: false,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-03-15'),
        seoMeta: {
          title: 'Digital Photography Masterclass - DSLR to Photo Editing',
          description:
            'Learn professional photography techniques and photo editing. From camera basics to advanced post-processing.',
          keywords: ['photography', 'dslr', 'photo editing', 'lightroom', 'composition'],
        },
      },

      // Machine Learning Courses
      {
        title: 'Machine Learning A-Z: Python & R for Data Science',
        slug: 'machine-learning-python-r-data-science',
        description:
          'Comprehensive machine learning course covering supervised learning, unsupervised learning, deep learning, and reinforcement learning. Hands-on projects with Python and R programming.',
        shortDescription:
          'Master machine learning algorithms with Python and R. From regression to neural networks and AI.',
        thumbnailUrl:
          'https://www.multisoftsystems.com/img/interview-img/machine-learning-a-z-hands-on-python-&-r-in-data-science-interview-questions-answers.png',
        trailerVideoUrl: 'https://youtu.be/_xIwjmCH6D4?si=578clx0Jzr4kCQ0s',
        teacherId,
        categoryId: categoryMap.get('machine-learning'),
        level: CourseLevel.ADVANCED,
        language: CourseLanguage.ENGLISH,
        durationHours: 52,
        durationMinutes: 30,
        price: 94.99,
        currency: 'USD',
        originalPrice: 199.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['machine-learning', 'python', 'data-science', 'ai', 'tensorflow'],
        requirements: [
          'Strong mathematical background',
          'Basic programming knowledge',
          'Understanding of statistics',
        ],
        whatYouWillLearn: [
          'Implement machine learning algorithms from scratch',
          'Build predictive models with Python and R',
          'Master deep learning and neural networks',
          'Work with TensorFlow and scikit-learn',
          'Handle real-world data science projects',
          'Deploy ML models to production',
        ],
        targetAudience: [
          'Data scientists and analysts',
          'Software engineers entering AI field',
          'Students pursuing ML careers',
        ],
        rating: 4.9,
        totalRatings: 8934,
        totalEnrollments: 21456,
        totalCompletions: 8234,
        totalReviews: 4567,
        totalSections: 15,
        totalLessons: 198,
        totalVideoDuration: 189000, // 52.5 hours in seconds
        featured: true,
        bestseller: true,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-01-10'),
        seoMeta: {
          title: 'Machine Learning A-Z Course - Python & R for Data Science',
          description:
            'Master machine learning with Python and R. Build AI models, neural networks, and data science projects.',
          keywords: ['machine learning', 'python', 'data science', 'ai', 'deep learning'],
        },
      },

      {
        title: 'Deep Learning & Neural Networks with TensorFlow',
        slug: 'deep-learning-neural-networks-tensorflow',
        description:
          'Advanced deep learning course covering convolutional neural networks, recurrent neural networks, GANs, and transformer models. Build AI applications with TensorFlow and Keras.',
        shortDescription:
          'Master deep learning and neural networks. Build AI applications with TensorFlow, CNNs, and RNNs.',
        thumbnailUrl:
          'https://thegeeksdiary.com/wp-content/uploads/2023/03/deep-learning-ai-business.jpg',
        trailerVideoUrl: 'https://youtu.be/qFJeN9V1ZsI?si=ursyWURMSjd2iOE0',
        teacherId,
        categoryId: categoryMap.get('machine-learning'),
        level: CourseLevel.ADVANCED,
        language: CourseLanguage.ENGLISH,
        durationHours: 46,
        durationMinutes: 15,
        price: 99.99,
        currency: 'USD',
        originalPrice: 199.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['deep-learning', 'tensorflow', 'neural-networks', 'ai', 'keras'],
        requirements: [
          'Machine learning fundamentals',
          'Python programming proficiency',
          'Linear algebra and calculus knowledge',
        ],
        whatYouWillLearn: [
          'Build and train neural networks from scratch',
          'Implement CNNs for computer vision',
          'Create RNNs for sequence prediction',
          'Develop GANs for generative AI',
          'Use transfer learning techniques',
          'Deploy deep learning models at scale',
        ],
        targetAudience: [
          'ML engineers specializing in deep learning',
          'Researchers in AI and computer vision',
          'Advanced data scientists',
        ],
        rating: 4.8,
        totalRatings: 5678,
        totalEnrollments: 13456,
        totalCompletions: 4789,
        totalReviews: 2345,
        totalSections: 12,
        totalLessons: 156,
        totalVideoDuration: 166500, // 46.25 hours in seconds
        featured: true,
        bestseller: false,
        isNew: true,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-04-20'),
        seoMeta: {
          title: 'Deep Learning & Neural Networks with TensorFlow Course',
          description:
            'Master deep learning and AI with TensorFlow. Build CNNs, RNNs, GANs, and deploy neural networks.',
          keywords: ['deep learning', 'tensorflow', 'neural networks', 'ai', 'computer vision'],
        },
      },

      // Data Analysis Courses
      {
        title: 'Data Analysis with Python: Pandas, NumPy & Matplotlib',
        slug: 'data-analysis-python-pandas-numpy-matplotlib',
        description:
          'Complete data analysis course using Python libraries. Learn data cleaning, manipulation, visualization, and statistical analysis with pandas, NumPy, and matplotlib.',
        shortDescription:
          'Master data analysis with Python. Learn pandas, NumPy, matplotlib for data science projects.',
        thumbnailUrl:
          'https://camo.githubusercontent.com/11c42e967c65f6e80460bd4d1d1851d8e0cef46d71deb23f646076f9b22a6982/68747470733a2f2f7777772e66726565636f646563616d702e6f72672f6e6577732f636f6e74656e742f696d616765732f73697a652f77323030302f323032312f30322f6461746161707974686f6e2e706e67',
        trailerVideoUrl: 'https://youtu.be/aYmcRnmZVGQ?si=k8GCevXEO21xVADO',
        teacherId,
        categoryId: categoryMap.get('data-analysis'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 34,
        durationMinutes: 45,
        price: 64.99,
        currency: 'USD',
        originalPrice: 129.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['python', 'pandas', 'data-analysis', 'numpy', 'matplotlib'],
        requirements: [
          'Basic Python programming knowledge',
          'Understanding of mathematical concepts',
          'Interest in working with data',
        ],
        whatYouWillLearn: [
          'Master pandas for data manipulation',
          'Perform statistical analysis with NumPy',
          'Create compelling data visualizations',
          'Clean and preprocess messy datasets',
          'Build data analysis pipelines',
          'Generate insights from real-world data',
        ],
        targetAudience: [
          'Python developers entering data science',
          'Business analysts upgrading skills',
          'Students learning data analysis',
        ],
        rating: 4.7,
        totalRatings: 4321,
        totalEnrollments: 16789,
        totalCompletions: 7654,
        totalReviews: 2890,
        totalSections: 10,
        totalLessons: 128,
        totalVideoDuration: 125100, // 34.75 hours in seconds
        featured: false,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-02-05'),
        seoMeta: {
          title: 'Data Analysis with Python - Pandas, NumPy, Matplotlib Course',
          description:
            'Learn data analysis with Python libraries. Master pandas, NumPy, and matplotlib for data science.',
          keywords: ['python data analysis', 'pandas', 'numpy', 'matplotlib', 'data science'],
        },
      },

      // English Language Courses
      {
        title: 'English Speaking Confidence: From Beginner to Fluent',
        slug: 'english-speaking-confidence-beginner-fluent',
        description:
          'Comprehensive English speaking course focusing on pronunciation, conversation skills, grammar in context, and confidence building. Practice with real-life scenarios and interactive exercises.',
        shortDescription:
          'Build English speaking confidence with pronunciation, conversation practice, and fluency techniques.',
        thumbnailUrl: 'https://7esl.com/wp-content/uploads/2018/10/how-to-speak-english-2.jpeg',
        trailerVideoUrl: 'https://youtu.be/7bEStwqNPqU?si=JsEd-k5EyOcIQxYf',
        teacherId,
        categoryId: categoryMap.get('english-language'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 29,
        durationMinutes: 30,
        price: 39.99,
        currency: 'USD',
        originalPrice: 79.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['english', 'speaking', 'pronunciation', 'conversation', 'fluency'],
        requirements: [
          'Basic English vocabulary knowledge',
          'Willingness to practice speaking',
          'Recording device for practice',
        ],
        whatYouWillLearn: [
          'Improve pronunciation and accent',
          'Build conversation confidence',
          'Master everyday English expressions',
          'Understand grammar in context',
          'Practice with native-like fluency',
          'Overcome speaking anxiety',
        ],
        targetAudience: [
          'Non-native English speakers',
          'Students preparing for exams',
          'Professionals needing English skills',
        ],
        rating: 4.5,
        totalRatings: 6789,
        totalEnrollments: 23456,
        totalCompletions: 12890,
        totalReviews: 4567,
        totalSections: 8,
        totalLessons: 94,
        totalVideoDuration: 106200, // 29.5 hours in seconds
        featured: false,
        bestseller: true,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-01-20'),
        seoMeta: {
          title: 'English Speaking Confidence Course - Beginner to Fluent',
          description:
            'Build English speaking confidence with pronunciation, conversation practice, and fluency training.',
          keywords: [
            'english speaking',
            'pronunciation',
            'english conversation',
            'fluency',
            'accent',
          ],
        },
      },

      // Public Speaking Courses
      {
        title: 'Master Public Speaking: Overcome Fear & Speak Confidently',
        slug: 'master-public-speaking-overcome-fear-speak-confidently',
        description:
          'Comprehensive public speaking course covering speech preparation, delivery techniques, body language, handling nervousness, and engaging audiences. Build confidence through practice.',
        shortDescription:
          'Overcome public speaking fear and speak confidently. Presentation skills, body language, and audience engagement.',
        thumbnailUrl:
          'https://kajabi-storefronts-production.kajabi-cdn.com/kajabi-storefronts-production/sites/169051/images/FE21gg0JRAidYSGRa7hQ_Untitled_design_67.png',
        trailerVideoUrl: 'https://youtu.be/962eYqe--Yc?si=bfho93UHeSu1-zGD',
        teacherId,
        categoryId: categoryMap.get('public-speaking'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 18,
        durationMinutes: 45,
        price: 44.99,
        currency: 'USD',
        originalPrice: 89.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['public-speaking', 'presentation', 'confidence', 'communication', 'leadership'],
        requirements: [
          'No prior speaking experience needed',
          'Willingness to practice and record yourself',
          'Basic recording equipment helpful',
        ],
        whatYouWillLearn: [
          'Overcome public speaking anxiety',
          'Structure compelling presentations',
          'Master vocal variety and body language',
          'Handle difficult questions and situations',
          'Engage and captivate audiences',
          'Build long-term speaking confidence',
        ],
        targetAudience: [
          'Professionals needing presentation skills',
          'Students preparing for presentations',
          'Anyone wanting to overcome speaking fear',
        ],
        rating: 4.6,
        totalRatings: 2987,
        totalEnrollments: 14567,
        totalCompletions: 8901,
        totalReviews: 1678,
        totalSections: 7,
        totalLessons: 65,
        totalVideoDuration: 67500, // 18.75 hours in seconds
        featured: false,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-03-05'),
        seoMeta: {
          title: 'Master Public Speaking Course - Overcome Fear & Speak Confidently',
          description:
            'Build public speaking confidence and presentation skills. Overcome fear and engage audiences effectively.',
          keywords: [
            'public speaking',
            'presentation skills',
            'confidence',
            'overcome fear',
            'communication',
          ],
        },
      },

      // Writing Skills Courses
      {
        title: 'Creative Writing Masterclass: Fiction, Poetry & Storytelling',
        slug: 'creative-writing-masterclass-fiction-poetry-storytelling',
        description:
          'Comprehensive creative writing course covering fiction writing, poetry, character development, plot structure, and storytelling techniques. Develop your unique writing voice.',
        shortDescription:
          'Master creative writing with fiction, poetry, and storytelling. Develop characters, plots, and your voice.',
        thumbnailUrl: 'https://www.classcentral.com/report/wp-content/uploads/2022/03/Frame-2.png',
        trailerVideoUrl: 'https://youtu.be/RSoRzTtwgP4?si=Yd4r6HQ-BDNDEE0M',
        teacherId,
        categoryId: categoryMap.get('writing-skills'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 25,
        durationMinutes: 20,
        price: 54.99,
        currency: 'USD',
        originalPrice: 109.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['creative-writing', 'fiction', 'poetry', 'storytelling', 'writing'],
        requirements: [
          'Basic writing skills in English',
          'Love for reading and storytelling',
          'Computer or notebook for writing',
        ],
        whatYouWillLearn: [
          'Develop compelling characters and plots',
          'Master different writing styles and genres',
          'Write engaging poetry and short stories',
          'Understand narrative structure and pacing',
          'Edit and revise your work effectively',
          'Find your unique writing voice',
        ],
        targetAudience: [
          'Aspiring writers and authors',
          'Students interested in creative writing',
          'Anyone wanting to improve storytelling skills',
        ],
        rating: 4.4,
        totalRatings: 1876,
        totalEnrollments: 8734,
        totalCompletions: 4123,
        totalReviews: 987,
        totalSections: 8,
        totalLessons: 78,
        totalVideoDuration: 91200, // 25.33 hours in seconds
        featured: false,
        bestseller: false,
        isNew: false,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-04-01'),
        seoMeta: {
          title: 'Creative Writing Masterclass - Fiction, Poetry & Storytelling',
          description:
            'Learn creative writing techniques for fiction, poetry, and storytelling. Develop your writing voice.',
          keywords: [
            'creative writing',
            'fiction writing',
            'poetry',
            'storytelling',
            'writing course',
          ],
        },
      },

      {
        title: 'Content Writing & Copywriting for Digital Marketing',
        slug: 'content-writing-copywriting-digital-marketing',
        description:
          'Master content writing and copywriting for digital marketing. Learn to write compelling web copy, blog posts, email campaigns, social media content, and sales pages that convert.',
        shortDescription:
          'Write compelling marketing content and copy. Blog posts, emails, social media, and sales pages.',
        thumbnailUrl:
          'https://www.digitalakash.in/wp-content/uploads/2024/12/Difference-between-content-writing-and-copywriting-1.png',
        trailerVideoUrl: 'https://youtu.be/sGDajJ2T4OY?si=JIj2IpWxL0MIJteI',
        teacherId,
        categoryId: categoryMap.get('writing-skills'),
        level: CourseLevel.INTERMEDIATE,
        language: CourseLanguage.ENGLISH,
        durationHours: 23,
        durationMinutes: 15,
        price: 59.99,
        currency: 'USD',
        originalPrice: 119.99,
        isFree: false,
        pricingModel: CoursePricing.PAID,
        status: CourseStatus.PUBLISHED,
        tags: ['copywriting', 'content-writing', 'marketing', 'conversion', 'sales'],
        requirements: [
          'Good command of English language',
          'Basic understanding of marketing',
          'Interest in persuasive writing',
        ],
        whatYouWillLearn: [
          'Write persuasive sales copy that converts',
          'Create engaging blog posts and articles',
          'Craft compelling email marketing campaigns',
          'Master social media content strategies',
          'Understand consumer psychology in writing',
          'Build a freelance writing business',
        ],
        targetAudience: [
          'Marketers needing writing skills',
          'Freelance writers expanding services',
          'Business owners creating their own content',
        ],
        rating: 4.5,
        totalRatings: 3456,
        totalEnrollments: 12890,
        totalCompletions: 6789,
        totalReviews: 2134,
        totalSections: 9,
        totalLessons: 89,
        totalVideoDuration: 83700, // 23.25 hours in seconds
        featured: false,
        bestseller: false,
        isNew: true,
        hasCertificate: true,
        lifetimeAccess: true,
        publishedAt: new Date('2024-04-15'),
        seoMeta: {
          title: 'Content Writing & Copywriting for Digital Marketing Course',
          description:
            'Master content writing and copywriting for marketing. Create compelling copy that converts and engages.',
          keywords: [
            'copywriting',
            'content writing',
            'digital marketing',
            'sales copy',
            'conversion',
          ],
        },
      },

      // Additional Course - FREE Course Example
      {
        title: 'Introduction to Programming: Your First Steps in Code',
        slug: 'introduction-programming-first-steps-code',
        description:
          'Free introductory programming course covering basic concepts, problem-solving, and getting started with coding. Perfect foundation before diving into specific programming languages.',
        shortDescription:
          'Free introduction to programming concepts. Perfect foundation for beginners starting their coding journey.',
        thumbnailUrl: 'https://i.ytimg.com/vi/6RVKMlXtWg4/maxresdefault.jpg',
        trailerVideoUrl: 'https://youtu.be/bJzb-RuUcMU?si=zc8OHHaR8rpR7Q2U',
        teacherId,
        categoryId: categoryMap.get('web-development'),
        level: CourseLevel.BEGINNER,
        language: CourseLanguage.ENGLISH,
        durationHours: 8,
        durationMinutes: 30,
        price: 0,
        currency: 'USD',
        originalPrice: null,
        isFree: true,
        pricingModel: CoursePricing.FREE,
        status: CourseStatus.PUBLISHED,
        tags: ['programming', 'beginner', 'coding', 'fundamentals', 'free'],
        requirements: [
          'No programming experience required',
          'Computer with internet connection',
          'Curiosity and willingness to learn',
        ],
        whatYouWillLearn: [
          'Understand basic programming concepts',
          'Learn problem-solving approaches',
          'Get familiar with coding terminology',
          'Explore different programming languages',
          'Set up your development environment',
          'Write your first lines of code',
        ],
        targetAudience: [
          'Complete programming beginners',
          'Students exploring tech careers',
          'Anyone curious about coding',
        ],
        rating: 4.3,
        totalRatings: 15678,
        totalEnrollments: 67890,
        totalCompletions: 34567,
        totalReviews: 12345,
        totalSections: 5,
        totalLessons: 42,
        totalVideoDuration: 30600, // 8.5 hours in seconds
        featured: true,
        bestseller: false,
        isNew: false,
        hasCertificate: false,
        lifetimeAccess: true,
        publishedAt: new Date('2024-01-05'),
        seoMeta: {
          title: 'Free Introduction to Programming Course - Your First Steps in Code',
          description:
            'Free programming course for complete beginners. Learn coding fundamentals and start your programming journey.',
          keywords: [
            'free programming course',
            'learn to code',
            'programming basics',
            'coding for beginners',
          ],
        },
      },
    ];

    // Create all courses
    const createdCourses: Course[] = [];
    for (const courseData of coursesData) {
      const course = this.courseRepository.create(courseData as Course);
      const savedCourse = await this.courseRepository.save(course);
      createdCourses.push(savedCourse);
    }

    console.log(`Seeded ${createdCourses.length} courses successfully!`);
    console.log('Course distribution by category:');

    // Count courses by category
    const categoryStats = new Map();
    createdCourses.forEach(course => {
      const categoryName = categories.find(c => c.id === course.categoryId)?.name || 'Unknown';
      categoryStats.set(categoryName, (categoryStats.get(categoryName) || 0) + 1);
    });

    categoryStats.forEach((count, categoryName) => {
      console.log(`- ${categoryName}: ${count} courses`);
    });

    // Additional statistics
    const freeCoursesCount = createdCourses.filter(c => c.isFree).length;
    const paidCoursesCount = createdCourses.filter(c => !c.isFree).length;
    const featuredCoursesCount = createdCourses.filter(c => c.featured).length;
    const bestsellerCoursesCount = createdCourses.filter(c => c.bestseller).length;

    console.log('\nCourse Statistics:');
    console.log(`- Free courses: ${freeCoursesCount}`);
    console.log(`- Paid courses: ${paidCoursesCount}`);
    console.log(`- Featured courses: ${featuredCoursesCount}`);
    console.log(`- Bestseller courses: ${bestsellerCoursesCount}`);

    const avgPrice =
      createdCourses.filter(c => !c.isFree).reduce((sum, c) => sum + Number(c.price), 0) /
      paidCoursesCount;
    console.log(`- Average course price: ${avgPrice.toFixed(2)}`);
  }

  async clear(): Promise<void> {
    console.log('Clearing courses...');
    await this.courseRepository.delete({});
    console.log('Courses cleared successfully!');
  }
}

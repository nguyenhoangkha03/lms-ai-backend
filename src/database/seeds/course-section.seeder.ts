import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSection } from '@/modules/course/entities/course-section.entity';
import { Course } from '@/modules/course/entities/course.entity';

@Injectable()
export class CourseSectionSeeder {
  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async seed(): Promise<void> {
    // Check if data already exists
    const existingSections = await this.sectionRepository.count();
    if (existingSections > 0) {
      console.log('Course sections already exist, skipping seeding...');
      return;
    }

    console.log('Seeding course sections...');

    // Get all courses to reference their data
    const courses = await this.courseRepository.find();
    const courseMap = new Map(courses.map(course => [course.slug, course]));

    const sectionsData = [
      // Complete Web Development Bootcamp 2024 - 16 sections
      {
        courseSlug: 'complete-web-development-bootcamp-2024',
        sections: [
          {
            title: 'Getting Started with Web Development',
            description:
              'Introduction to web development, setting up your development environment, and understanding the web.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'HTML5 Fundamentals',
            description: 'Master HTML5 elements, semantic markup, forms, and modern HTML features.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'CSS3 Styling and Layout',
            description:
              'Learn CSS3 properties, selectors, flexbox, grid, and responsive design principles.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'JavaScript ES6+ Fundamentals',
            description:
              'Variables, data types, functions, objects, arrays, and modern JavaScript features.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'DOM Manipulation and Events',
            description: 'Interact with the DOM, handle user events, and create dynamic web pages.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Asynchronous JavaScript',
            description: 'Promises, async/await, fetch API, and handling asynchronous operations.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'React.js Introduction',
            description:
              'Components, JSX, props, state, and building your first React application.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'React Hooks and State Management',
            description:
              'useState, useEffect, custom hooks, and managing component state effectively.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Building React Projects',
            description:
              'Create multiple React projects including todo app, weather app, and portfolio site.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Node.js Backend Development',
            description: 'Server-side JavaScript, modules, file system, and building web servers.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Express.js Framework',
            description: 'Routing, middleware, templating engines, and building RESTful APIs.',
            orderIndex: 11,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Database Integration with MongoDB',
            description: 'NoSQL databases, MongoDB operations, Mongoose ODM, and data modeling.',
            orderIndex: 12,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Authentication and Security',
            description:
              'User authentication, JWT tokens, password hashing, and security best practices.',
            orderIndex: 13,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Full-Stack Project Development',
            description: 'Build a complete e-commerce application from frontend to backend.',
            orderIndex: 14,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 480, // 8 hours
          },
          {
            title: 'Testing and Quality Assurance',
            description: 'Unit testing, integration testing, and ensuring code quality.',
            orderIndex: 15,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Deployment and DevOps',
            description:
              'Deploy applications to cloud platforms, CI/CD, and production best practices.',
            orderIndex: 16,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // React.js Masterclass - 12 sections
      {
        courseSlug: 'react-js-masterclass-build-modern-web-applications',
        sections: [
          {
            title: 'Advanced React Concepts',
            description: 'Deep dive into React internals, reconciliation, and advanced patterns.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'React Hooks Mastery',
            description: 'All built-in hooks, custom hooks, and advanced hook patterns.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Context API and State Management',
            description: 'Global state management, useContext, useReducer, and state patterns.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Redux Toolkit Implementation',
            description: 'Modern Redux with Redux Toolkit, slices, and async thunks.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'React Router and Navigation',
            description: 'Client-side routing, dynamic routes, and navigation patterns.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Performance Optimization',
            description: 'React.memo, useMemo, useCallback, and performance profiling.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'TypeScript with React',
            description: 'Type-safe React components, props typing, and TypeScript patterns.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Testing React Applications',
            description: 'Jest, React Testing Library, component testing, and testing strategies.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Next.js Fundamentals',
            description: 'Server-side rendering, static generation, and Next.js features.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Next.js Advanced Features',
            description: 'API routes, middleware, internationalization, and deployment.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Real-World Project Development',
            description: 'Build a complete social media application with modern React stack.',
            orderIndex: 11,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 480, // 8 hours
          },
          {
            title: 'Production Deployment and Best Practices',
            description: 'Optimizing for production, monitoring, and maintenance strategies.',
            orderIndex: 12,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // Node.js & Express.js Backend Development - 11 sections
      {
        courseSlug: 'nodejs-express-backend-development',
        sections: [
          {
            title: 'Node.js Fundamentals',
            description: 'Understanding Node.js runtime, event loop, and core modules.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Express.js Setup and Routing',
            description: 'Setting up Express servers, routing, and middleware basics.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Middleware and Error Handling',
            description:
              'Custom middleware, third-party middleware, and error handling strategies.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Database Integration',
            description: 'Connecting to MongoDB, Mongoose ODM, and database operations.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'RESTful API Development',
            description: 'Building REST APIs, HTTP methods, and API design principles.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Authentication and Authorization',
            description: 'JWT implementation, user authentication, and role-based access.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'File Upload and Storage',
            description: 'Handling file uploads, cloud storage integration, and image processing.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Email Services and Notifications',
            description: 'Sending emails, notification systems, and third-party integrations.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'API Testing and Documentation',
            description: 'Testing APIs with Jest and Supertest, API documentation with Swagger.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Security and Performance',
            description:
              'API security best practices, rate limiting, and performance optimization.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Deployment and Production',
            description: 'Deploying to cloud platforms, environment configuration, and monitoring.',
            orderIndex: 11,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // React Native - 10 sections
      {
        courseSlug: 'react-native-build-cross-platform-mobile-apps',
        sections: [
          {
            title: 'React Native Introduction',
            description:
              'Setting up development environment, understanding React Native architecture.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Core Components and Styling',
            description: 'Text, View, StyleSheet, and mobile-specific styling approaches.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Navigation and Routing',
            description:
              'React Navigation, stack navigation, tab navigation, and drawer navigation.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'State Management in Mobile Apps',
            description: 'Managing state in React Native apps, Context API, and Redux integration.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Working with APIs and Data',
            description: 'Fetching data, handling network requests, and data persistence.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Device Features and Native Modules',
            description: 'Camera, GPS, contacts, push notifications, and native functionality.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Animations and Gestures',
            description: 'React Native Animated API, gesture handling, and smooth interactions.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Testing Mobile Applications',
            description: 'Unit testing, component testing, and E2E testing for mobile apps.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Performance Optimization',
            description: 'Memory management, rendering optimization, and app performance tuning.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'App Store Deployment',
            description: 'Building for production, app store submission, and release management.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // Complete Digital Marketing Strategy & Analytics - 9 sections
      {
        courseSlug: 'complete-digital-marketing-strategy-analytics',
        sections: [
          {
            title: 'Digital Marketing Fundamentals',
            description:
              'Understanding digital marketing landscape, customer journey, and marketing funnels.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Search Engine Optimization (SEO)',
            description:
              'Keyword research, on-page optimization, technical SEO, and link building.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Search Engine Marketing (SEM)',
            description: 'Google Ads, PPC campaigns, keyword bidding, and campaign optimization.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Social Media Marketing',
            description:
              'Platform strategies, content creation, community management, and social advertising.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Content Marketing Strategy',
            description:
              'Content planning, creation, distribution, and measuring content performance.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Email Marketing and Automation',
            description: 'Email campaigns, segmentation, automation workflows, and deliverability.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Analytics and Data Analysis',
            description: 'Google Analytics, data interpretation, KPIs, and performance tracking.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Conversion Rate Optimization',
            description: 'A/B testing, landing page optimization, and improving conversion rates.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Digital Marketing Strategy and Planning',
            description:
              'Creating comprehensive marketing strategies, budgeting, and campaign planning.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // SEO Mastery - 8 sections
      {
        courseSlug: 'seo-mastery-rank-1-google-2024',
        sections: [
          {
            title: 'SEO Fundamentals and Strategy',
            description: 'Understanding search engines, SEO basics, and developing SEO strategies.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Advanced Keyword Research',
            description: 'Keyword tools, search intent analysis, and competitive keyword research.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Technical SEO Mastery',
            description:
              'Site structure, crawling, indexing, page speed, and technical optimization.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'On-Page Optimization',
            description: 'Content optimization, meta tags, internal linking, and page-level SEO.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Content Strategy for SEO',
            description: 'Creating SEO-friendly content, topic clusters, and content optimization.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Link Building Strategies',
            description: 'White-hat link building, outreach, and earning high-quality backlinks.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Local SEO and Mobile Optimization',
            description: 'Local search optimization, Google My Business, and mobile-first SEO.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'SEO Analytics and Performance Tracking',
            description:
              'Measuring SEO success, Google Search Console, and performance monitoring.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // Start Your Online Business - 10 sections
      {
        courseSlug: 'start-online-business-idea-to-profit',
        sections: [
          {
            title: 'Entrepreneurship Mindset and Fundamentals',
            description:
              'Developing entrepreneurial thinking, overcoming fears, and success principles.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Business Idea Generation and Validation',
            description:
              'Finding profitable ideas, market research, and validating business concepts.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Market Research and Competitor Analysis',
            description:
              'Understanding your market, analyzing competition, and finding opportunities.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Business Model Development',
            description:
              'Creating sustainable business models, revenue streams, and value propositions.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Legal and Financial Foundations',
            description:
              'Business registration, legal requirements, accounting basics, and tax planning.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Building Your Online Presence',
            description: 'Website development, branding, social media setup, and digital assets.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Digital Marketing for Startups',
            description:
              'Low-cost marketing strategies, content marketing, and customer acquisition.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Sales and Customer Relations',
            description: 'Sales processes, customer service, and building long-term relationships.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Operations and Team Building',
            description: 'Streamlining operations, hiring strategies, and building remote teams.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Scaling and Growth Strategies',
            description: 'Growing your business, funding options, and long-term sustainability.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // Agile Project Management & Scrum Master Certification - 8 sections
      {
        courseSlug: 'agile-project-management-scrum-master-certification',
        sections: [
          {
            title: 'Agile Fundamentals and Principles',
            description: 'Understanding Agile methodology, values, principles, and mindset.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Scrum Framework Deep Dive',
            description: 'Scrum roles, events, artifacts, and the complete Scrum framework.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Scrum Master Role and Responsibilities',
            description: 'Servant leadership, facilitation skills, and Scrum Master duties.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Sprint Planning and Management',
            description: 'Sprint planning techniques, backlog management, and sprint execution.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Scrum Events and Ceremonies',
            description:
              'Daily standups, sprint reviews, retrospectives, and effective facilitation.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Team Dynamics and Coaching',
            description:
              'Building high-performing teams, conflict resolution, and coaching skills.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Scaling Agile and Advanced Practices',
            description: 'SAFe, LeSS, Nexus frameworks, and scaling Agile in large organizations.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Certification Preparation and Practice',
            description: 'Exam preparation, practice questions, and certification guidance.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // Adobe Creative Suite Mastery - 12 sections
      {
        courseSlug: 'adobe-creative-suite-photoshop-illustrator-indesign',
        sections: [
          {
            title: 'Creative Suite Overview and Workflow',
            description:
              'Understanding Adobe Creative Cloud, file formats, and cross-application workflow.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Photoshop Fundamentals',
            description: 'Interface, layers, tools, and basic photo editing techniques.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Advanced Photoshop Techniques',
            description:
              'Advanced selections, compositing, retouching, and professional workflows.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Illustrator Basics and Vector Graphics',
            description: 'Vector concepts, shapes, paths, and basic illustration techniques.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Advanced Illustrator Design',
            description:
              'Logo design, complex illustrations, typography, and advanced vector techniques.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'InDesign Layout Fundamentals',
            description: 'Page layout, typography, styles, and basic publication design.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Advanced InDesign Publishing',
            description: 'Multi-page documents, master pages, tables, and professional publishing.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Color Theory and Brand Design',
            description: 'Color systems, brand identity creation, and consistent visual design.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Print Design and Preparation',
            description:
              'Print-ready files, color profiles, bleeds, and working with print vendors.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Digital Design and Web Graphics',
            description: 'Web graphics, social media assets, and digital design optimization.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Portfolio Development',
            description:
              'Creating professional portfolios, presentation techniques, and client work.',
            orderIndex: 11,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Freelance and Business Skills',
            description: 'Client management, pricing strategies, and building a design business.',
            orderIndex: 12,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // UI/UX Design Complete Course - 11 sections
      {
        courseSlug: 'ui-ux-design-complete-figma-prototype',
        sections: [
          {
            title: 'UX Design Fundamentals',
            description:
              'User-centered design principles, design thinking process, and UX methodology.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'User Research and Analysis',
            description:
              'User interviews, surveys, personas, user journey mapping, and research methods.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Information Architecture and User Flows',
            description: 'Organizing content, site maps, user flows, and navigation structures.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Wireframing and Low-Fidelity Prototyping',
            description: 'Creating wireframes, sketching techniques, and low-fidelity prototypes.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Figma Mastery and Interface Design',
            description:
              'Complete Figma training, components, variants, and design systems in Figma.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Visual Design and UI Principles',
            description:
              'Color theory, typography, layout, visual hierarchy, and aesthetic principles.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Interactive Prototyping',
            description:
              'High-fidelity prototypes, micro-interactions, and advanced prototyping techniques.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Design Systems and Style Guides',
            description:
              'Creating scalable design systems, component libraries, and brand guidelines.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Usability Testing and Validation',
            description: 'Testing methods, user feedback, iteration based on testing results.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Mobile and Responsive Design',
            description:
              'Mobile-first design, responsive principles, and cross-platform considerations.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Portfolio and Career Development',
            description: 'Building UX portfolio, case studies, job search, and career advancement.',
            orderIndex: 11,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // Digital Photography Masterclass - 9 sections
      {
        courseSlug: 'digital-photography-masterclass-dslr-editing',
        sections: [
          {
            title: 'Camera Fundamentals and Settings',
            description: 'Understanding your camera, exposure triangle, and manual controls.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Composition and Creative Techniques',
            description:
              'Rule of thirds, leading lines, framing, and advanced composition techniques.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Lighting and Natural Light Photography',
            description:
              'Understanding light, golden hour, natural lighting, and available light techniques.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Portrait Photography Mastery',
            description:
              'Portrait techniques, posing, working with subjects, and portrait lighting.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Landscape and Nature Photography',
            description:
              'Landscape techniques, nature photography, outdoor shooting, and equipment.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Adobe Lightroom Editing',
            description:
              'Complete Lightroom workflow, organization, and photo enhancement techniques.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Advanced Photoshop for Photographers',
            description:
              'Photoshop techniques specific to photography, retouching, and compositing.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Building Your Photography Portfolio',
            description:
              'Curating work, creating portfolios, and presenting your photography professionally.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Photography Business and Marketing',
            description:
              'Starting a photography business, pricing, marketing, and client management.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // Machine Learning A-Z - 15 sections
      {
        courseSlug: 'machine-learning-python-r-data-science',
        sections: [
          {
            title: 'Machine Learning Fundamentals',
            description: 'Introduction to ML, types of learning, and mathematical foundations.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Python for Machine Learning',
            description: 'Python libraries: NumPy, Pandas, Matplotlib, and Scikit-learn setup.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'R Programming for Data Science',
            description: 'R fundamentals, data manipulation, and statistical computing in R.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Data Preprocessing and Feature Engineering',
            description:
              'Data cleaning, transformation, feature selection, and engineering techniques.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Simple Linear Regression',
            description:
              'Understanding linear relationships, implementing regression from scratch.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Multiple Linear Regression',
            description:
              'Multiple variables, polynomial features, and advanced regression techniques.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Logistic Regression and Classification',
            description:
              'Binary and multiclass classification, logistic regression implementation.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Decision Trees and Random Forest',
            description: 'Tree-based algorithms, ensemble methods, and feature importance.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Support Vector Machines (SVM)',
            description: 'SVM theory, kernel methods, and implementation for classification.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'K-Means Clustering and Hierarchical Clustering',
            description: 'Unsupervised learning, clustering algorithms, and cluster analysis.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Association Rule Learning',
            description: 'Market basket analysis, Apriori algorithm, and recommendation systems.',
            orderIndex: 11,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Reinforcement Learning',
            description: 'RL fundamentals, Q-learning, and implementing basic RL algorithms.',
            orderIndex: 12,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Natural Language Processing',
            description: 'Text processing, sentiment analysis, and NLP with machine learning.',
            orderIndex: 13,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Deep Learning Introduction',
            description: 'Neural networks, backpropagation, and introduction to TensorFlow.',
            orderIndex: 14,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Model Selection and Boosting',
            description: 'Cross-validation, hyperparameter tuning, XGBoost, and model evaluation.',
            orderIndex: 15,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
        ],
      },

      // Deep Learning & Neural Networks - 12 sections
      {
        courseSlug: 'deep-learning-neural-networks-tensorflow',
        sections: [
          {
            title: 'Deep Learning Fundamentals',
            description: 'Neural network theory, perceptrons, and mathematical foundations.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'TensorFlow and Keras Setup',
            description: 'Environment setup, TensorFlow basics, and Keras high-level API.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Building Your First Neural Networks',
            description: 'Creating simple networks, training process, and basic architectures.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Deep Neural Networks and Optimization',
            description: 'Deep architectures, backpropagation, gradient descent, and optimization.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Convolutional Neural Networks (CNNs)',
            description: 'CNN architecture, convolution, pooling, and image classification.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 480, // 8 hours
          },
          {
            title: 'Advanced CNN Architectures',
            description: 'ResNet, VGG, Inception, and state-of-the-art CNN models.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Recurrent Neural Networks (RNNs)',
            description: 'RNN fundamentals, LSTM, GRU, and sequence modeling.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Natural Language Processing with Deep Learning',
            description: 'Text processing, word embeddings, and NLP with neural networks.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Generative Adversarial Networks (GANs)',
            description: 'GAN theory, implementation, and generating synthetic data.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Transfer Learning and Pre-trained Models',
            description: 'Using pre-trained models, fine-tuning, and transfer learning techniques.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Model Deployment and Production',
            description: 'Deploying models, serving predictions, and production considerations.',
            orderIndex: 11,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Advanced Topics and Future Trends',
            description: 'Attention mechanisms, Transformers, and cutting-edge developments.',
            orderIndex: 12,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // Data Analysis with Python - 10 sections
      {
        courseSlug: 'data-analysis-python-pandas-numpy-matplotlib',
        sections: [
          {
            title: 'Python Data Analysis Setup',
            description: 'Environment setup, Jupyter notebooks, and data analysis workflow.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'NumPy Fundamentals',
            description: 'Arrays, mathematical operations, broadcasting, and numerical computing.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Pandas Data Structures and Operations',
            description: 'DataFrames, Series, indexing, and basic data manipulation.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Data Cleaning and Preprocessing',
            description: 'Handling missing data, duplicates, data types, and cleaning techniques.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Data Transformation and Aggregation',
            description: 'GroupBy operations, merging, reshaping, and data transformation.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Exploratory Data Analysis (EDA)',
            description:
              'Statistical summaries, distributions, correlations, and data exploration.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Data Visualization with Matplotlib',
            description:
              'Creating plots, customization, subplots, and visualization best practices.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Advanced Visualization with Seaborn',
            description: 'Statistical visualizations, heatmaps, and publication-ready plots.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Time Series Analysis',
            description: 'Working with dates, time series data, and temporal analysis.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Real-World Data Analysis Projects',
            description: 'Complete data analysis projects and building analysis pipelines.',
            orderIndex: 10,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
        ],
      },

      // English Speaking Confidence - 8 sections
      {
        courseSlug: 'english-speaking-confidence-beginner-fluent',
        sections: [
          {
            title: 'Foundation and Mindset',
            description: 'Building confidence, overcoming fear, and setting learning goals.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Pronunciation and Phonetics',
            description: 'English sounds, phonetic symbols, and improving pronunciation accuracy.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Vocabulary Building and Usage',
            description: 'Essential vocabulary, collocations, and using words in context.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Grammar in Conversation',
            description: 'Practical grammar for speaking, common patterns, and natural usage.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Everyday Conversations',
            description: 'Common situations, small talk, and practical conversation skills.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 420, // 7 hours
          },
          {
            title: 'Professional and Business English',
            description: 'Workplace communication, presentations, and professional interactions.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Fluency and Natural Speech',
            description: 'Speaking rhythm, intonation, connected speech, and fluency techniques.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Advanced Speaking Skills',
            description: 'Debate, storytelling, advanced topics, and maintaining conversations.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // Public Speaking Mastery - 7 sections
      {
        courseSlug: 'master-public-speaking-overcome-fear-speak-confidently',
        sections: [
          {
            title: 'Overcoming Speaking Anxiety',
            description:
              'Understanding fear, building confidence, and mental preparation techniques.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Speech Structure and Content Development',
            description: 'Organizing ideas, creating compelling content, and speech frameworks.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Vocal Techniques and Delivery',
            description: 'Voice projection, pace, tone, and vocal variety for engaging delivery.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Body Language and Stage Presence',
            description: 'Non-verbal communication, gestures, movement, and commanding presence.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Audience Engagement and Interaction',
            description: 'Reading the audience, interactive techniques, and handling questions.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Visual Aids and Presentation Technology',
            description: 'Using slides effectively, visual design, and technology integration.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Advanced Speaking Scenarios',
            description: 'Impromptu speaking, difficult audiences, and professional presentations.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
        ],
      },

      // Creative Writing Masterclass - 8 sections
      {
        courseSlug: 'creative-writing-masterclass-fiction-poetry-storytelling',
        sections: [
          {
            title: 'Creative Writing Fundamentals',
            description: 'Finding your voice, writing process, and overcoming creative blocks.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Character Development and Dialogue',
            description: 'Creating compelling characters, realistic dialogue, and character arcs.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Plot Structure and Story Development',
            description: 'Story structure, plot development, conflict, and narrative pacing.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Setting and World Building',
            description:
              'Creating vivid settings, world-building techniques, and atmospheric writing.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Poetry and Poetic Techniques',
            description: 'Poetic forms, rhythm, imagery, metaphor, and contemporary poetry.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Genre Writing and Style',
            description: 'Different genres, writing styles, and finding your unique approach.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Revision and Editing Techniques',
            description: 'Self-editing, revision strategies, and polishing your work.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Publishing and Sharing Your Work',
            description:
              'Publication options, submission guidelines, and building a writing career.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // Content Writing & Copywriting - 9 sections
      {
        courseSlug: 'content-writing-copywriting-digital-marketing',
        sections: [
          {
            title: 'Content Writing vs Copywriting Fundamentals',
            description:
              'Understanding the difference, goals, and applications of each discipline.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Understanding Your Audience',
            description:
              'Audience research, buyer personas, and writing for specific demographics.',
            orderIndex: 2,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Persuasive Writing and Psychology',
            description: 'Psychological triggers, persuasion techniques, and consumer behavior.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Blog Writing and Content Strategy',
            description:
              'Blog post structure, SEO writing, content planning, and editorial calendars.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 360, // 6 hours
          },
          {
            title: 'Sales Copy and Landing Pages',
            description: 'Writing high-converting sales pages, headlines, and call-to-action copy.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 300, // 5 hours
          },
          {
            title: 'Email Marketing and Automation',
            description: 'Email sequences, newsletter writing, and automated email campaigns.',
            orderIndex: 6,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Social Media Content Creation',
            description:
              'Platform-specific content, viral content strategies, and engagement writing.',
            orderIndex: 7,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'SEO and Content Optimization',
            description:
              'Keyword research, SEO writing, and optimizing content for search engines.',
            orderIndex: 8,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 240, // 4 hours
          },
          {
            title: 'Building a Freelance Writing Business',
            description:
              'Finding clients, pricing strategies, and building a sustainable writing career.',
            orderIndex: 9,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
        ],
      },

      // Introduction to Programming - 5 sections
      {
        courseSlug: 'introduction-programming-first-steps-code',
        sections: [
          {
            title: 'What is Programming?',
            description:
              'Understanding programming concepts, how computers work, and programming applications.',
            orderIndex: 1,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 120, // 2 hours
          },
          {
            title: 'Programming Languages Overview',
            description:
              'Different programming languages, their uses, and choosing the right language.',
            orderIndex: 2,
            isPublished: true,
            isPreview: true,
            estimatedDuration: 120, // 2 hours
          },
          {
            title: 'Basic Programming Concepts',
            description:
              'Variables, data types, functions, loops, and fundamental programming constructs.',
            orderIndex: 3,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 180, // 3 hours
          },
          {
            title: 'Problem-Solving and Algorithms',
            description:
              'Thinking like a programmer, breaking down problems, and basic algorithms.',
            orderIndex: 4,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 120, // 2 hours
          },
          {
            title: 'Getting Started with Code',
            description:
              'Writing your first programs, development tools, and next steps in programming.',
            orderIndex: 5,
            isPublished: true,
            isPreview: false,
            estimatedDuration: 60, // 1 hour
          },
        ],
      },
    ];

    // Create all sections
    let totalSectionsCreated = 0;
    for (const courseData of sectionsData) {
      const course = courseMap.get(courseData.courseSlug);
      if (!course) {
        console.warn(`Course not found for slug: ${courseData.courseSlug}`);
        continue;
      }

      for (const sectionData of courseData.sections) {
        const section = this.sectionRepository.create({
          ...sectionData,
          courseId: course.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await this.sectionRepository.save(section);
        totalSectionsCreated++;
      }
    }

    console.log(`Seeded ${totalSectionsCreated} course sections successfully!`);
    console.log('Section distribution by course:');

    const courseStats = new Map();
    for (const courseData of sectionsData) {
      const course = courseMap.get(courseData.courseSlug);
      if (course) {
        courseStats.set(course.title, courseData.sections.length);
      }
    }

    // Display statistics
    console.log('Section distribution by course:');
    courseStats.forEach((sectionCount, courseTitle) => {
      console.log(`  - ${courseTitle}: ${sectionCount} sections`);
    });

    console.log(`\nSection Statistics:`);
    console.log(`- Total courses with sections: ${courseStats.size}`);
    console.log(`- Total sections created: ${totalSectionsCreated}`);

    // Calculate average sections per course
    const avgSectionsPerCourse = totalSectionsCreated / courseStats.size;
    console.log(`- Average sections per course: ${avgSectionsPerCourse.toFixed(1)}`);

    // Count sections by status
    const publishedSectionsCount = sectionsData.reduce(
      (count, courseData) => count + courseData.sections.filter(s => s.isPublished).length,
      0,
    );
    const previewSectionsCount = sectionsData.reduce(
      (count, courseData) => count + courseData.sections.filter(s => s.isPreview).length,
      0,
    );

    console.log(`- Published sections: ${publishedSectionsCount}`);
    console.log(`- Preview sections: ${previewSectionsCount}`);
    console.log(`- Regular sections: ${totalSectionsCreated - previewSectionsCount}`);

    // Calculate total estimated duration
    const totalEstimatedDuration = sectionsData.reduce(
      (total, courseData) =>
        total + courseData.sections.reduce((sum, section) => sum + section.estimatedDuration, 0),
      0,
    );
    const avgSectionDuration = totalEstimatedDuration / totalSectionsCreated;

    console.log(
      `- Total estimated duration: ${Math.floor(totalEstimatedDuration / 60)} hours ${totalEstimatedDuration % 60} minutes`,
    );
    console.log(
      `- Average section duration: ${Math.floor(avgSectionDuration / 60)}h ${avgSectionDuration % 60}m`,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '@/modules/course/entities/lesson.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { CourseSection } from '@/modules/course/entities/course-section.entity';
import { ContentStatus, ContentModerationStatus, LessonType } from '@/common/enums/content.enums';

@Injectable()
export class LessonSeeder {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseSection)
    private readonly courseSectionRepository: Repository<CourseSection>,
  ) {}

  async seed(): Promise<void> {
    // Check if lessons already exist
    const existingLessons = await this.lessonRepository.count();
    if (existingLessons > 0) {
      console.log('Lessons already exist, skipping seeding...');
      return;
    }

    console.log('Seeding lessons for Complete Web Development Bootcamp 2024...');

    // Get the course
    const course = await this.courseRepository.findOne({
      where: { slug: 'complete-web-development-bootcamp-2024' },
    });

    if (!course) {
      console.log('Course not found. Please run course seeder first.');
      return;
    }

    // Get all sections for this course
    const sections = await this.courseSectionRepository.find({
      where: { courseId: course.id },
      order: { orderIndex: 'ASC' },
    });

    if (sections.length === 0) {
      console.log('No sections found. Please run section seeder first.');
      return;
    }

    const lessonsData = this.getLessonsData(course.id, sections);

    // Create lessons
    for (const lessonData of lessonsData) {
      const lesson = this.lessonRepository.create(lessonData);
      await this.lessonRepository.save(lesson);
    }

    console.log(`Seeded ${lessonsData.length} lessons successfully!`);
  }

  private getLessonsData(courseId: string, sections: CourseSection[]): Partial<Lesson>[] {
    const lessons: Partial<Lesson>[] = [];

    // Section 1: Getting Started with Web Development
    const section1 = sections.find(s => s.orderIndex === 1);
    if (section1) {
      lessons.push(
        {
          courseId,
          sectionId: section1.id,
          title: 'Welcome to the Complete Web Development Bootcamp',
          slug: 'welcome-to-bootcamp',
          description:
            'Introduction to the course, what you will learn, and how to get the most out of this bootcamp.',
          content: `<h2>Welcome to Your Web Development Journey!</h2>
          <p>Congratulations on taking the first step towards becoming a web developer! In this comprehensive bootcamp, you'll master everything needed to build modern, professional websites and web applications.</p>
          <h3>What You'll Achieve</h3>
          <ul>
            <li>Build 15+ real-world projects</li>
            <li>Master HTML5, CSS3, and JavaScript ES6+</li>
            <li>Learn React.js for modern frontend development</li>
            <li>Create backend APIs with Node.js and Express</li>
            <li>Work with databases using MongoDB</li>
            <li>Deploy your projects to the cloud</li>
          </ul>`,
          videoUrl: 'https://youtu.be/16lCOvU5k30?si=K8e13lW0Dwp6p1qh',
          thumbnailUrl: 'https://img.youtube.com/vi/16lCOvU5k30/maxresdefault.jpg',
          videoDuration: 480, // 8 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 1,
          isPreview: true,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 10,
          points: 50,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand the course structure and learning path',
            'Set expectations for the bootcamp journey',
            'Learn about the projects you will build',
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: false,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['introduction', 'overview', 'web development'],
            language: 'english',
            seo: {
              metaTitle: 'Welcome to Web Development Bootcamp',
              metaDescription:
                'Start your web development journey with this comprehensive introduction',
              keywords: ['web development', 'bootcamp', 'introduction'],
            },
          },
        },
        {
          courseId,
          sectionId: section1.id,
          title: 'Setting Up Your Development Environment',
          slug: 'setting-up-development-environment',
          description:
            'Install and configure all the tools you need: VS Code, Node.js, Git, and essential extensions.',
          content: `<h2>Development Environment Setup</h2>
          <p>Before we start coding, let's set up a professional development environment that will make you productive and efficient.</p>
          <h3>Required Software</h3>
          <ol>
            <li><strong>Visual Studio Code</strong> - Our primary code editor</li>
            <li><strong>Node.js</strong> - JavaScript runtime environment</li>
            <li><strong>Git</strong> - Version control system</li>
            <li><strong>Google Chrome</strong> - For testing and debugging</li>
          </ol>`,
          videoUrl: 'https://youtu.be/wBCzjbgY3FM?si=wpJ9TTB7rGCzwDvz',
          thumbnailUrl: 'https://img.youtube.com/vi/wBCzjbgY3FM/maxresdefault.jpg',
          videoDuration: 900, // 15 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 2,
          isPreview: true,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 20,
          points: 75,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Install Visual Studio Code and essential extensions',
            'Set up Node.js and npm',
            'Configure Git for version control',
            'Test your development environment',
          ],
          attachments: [
            {
              filename: 'vscode-extensions.txt',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 1024,
              mimeType: 'text/plain',
            },
            {
              filename: 'setup-checklist.pdf',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 256000,
              mimeType: 'application/pdf',
            },
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['setup', 'vscode', 'nodejs', 'git'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section1.id,
          title: 'How the Web Works: A Complete Overview',
          slug: 'how-web-works-overview',
          description:
            'Understanding browsers, servers, HTTP protocol, and the client-server architecture.',
          content: `<h2>Understanding How the Web Works</h2>
          <p>To become an effective web developer, you need to understand the fundamental concepts of how the web operates.</p>
          <h3>Key Concepts</h3>
          <ul>
            <li><strong>Client-Server Architecture</strong></li>
            <li><strong>HTTP/HTTPS Protocol</strong></li>
            <li><strong>Domain Names and DNS</strong></li>
            <li><strong>Web Browsers and Rendering</strong></li>
            <li><strong>Web Servers and Hosting</strong></li>
          </ul>`,
          videoUrl: 'https://youtu.be/dIoeM2ikajQ?si=xznHuXxKFhUsq9Br',
          thumbnailUrl: 'https://img.youtube.com/vi/dIoeM2ikajQ/maxresdefault.jpg',
          videoDuration: 1200, // 20 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 3,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 25,
          points: 100,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand client-server architecture',
            'Learn about HTTP and HTTPS protocols',
            'Grasp the concept of DNS and domain names',
            'Understand how browsers render web pages',
          ],
          interactiveElements: {
            quizzes: [
              {
                question: 'What does HTTP stand for?',
                options: [
                  'HyperText Transfer Protocol',
                  'High Transfer Text Protocol',
                  'Home Tool Transfer Protocol',
                ],
                correctAnswer: 0,
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: false,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['web fundamentals', 'http', 'client-server', 'dns'],
            language: 'english',
          },
        },
      );
    }

    // Section 2: HTML5 Fundamentals
    const section2 = sections.find(s => s.orderIndex === 2);
    if (section2) {
      lessons.push(
        {
          courseId,
          sectionId: section2.id,
          title: 'HTML5 Introduction and Document Structure',
          slug: 'html5-introduction-document-structure',
          description: 'Learn HTML5 basics, document structure, and create your first webpage.',
          content: `<h2>Introduction to HTML5</h2>
          <p>HTML (HyperText Markup Language) is the foundation of all web pages. HTML5 is the latest version, offering powerful new features and improved semantics.</p>
          <h3>HTML Document Structure</h3>
          <pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;
    &lt;title&gt;My First Webpage&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
    &lt;h1&gt;Hello World!&lt;/h1&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>`,
          videoUrl: 'https://youtu.be/yKnLFNCTXro?si=KCWHbp_uXu_djEms',
          thumbnailUrl: 'https://img.youtube.com/vi/yKnLFNCTXro/maxresdefault.jpg',
          videoDuration: 720, // 12 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 1,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 15,
          points: 100,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand HTML5 document structure',
            'Learn about DOCTYPE and meta tags',
            'Create your first HTML5 webpage',
            'Understand HTML syntax and rules',
          ],
          attachments: [
            {
              filename: 'first-webpage.html',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 512,
              mimeType: 'text/html',
            },
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['html5', 'document structure', 'webpage'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section2.id,
          title: 'HTML5 Semantic Elements',
          slug: 'html5-semantic-elements',
          description:
            'Master semantic HTML5 elements like header, nav, main, article, section, aside, and footer.',
          content: `<h2>HTML5 Semantic Elements</h2>
          <p>Semantic elements provide meaning to your content, making it more accessible and SEO-friendly.</p>
          <h3>Key Semantic Elements</h3>
          <ul>
            <li><code>&lt;header&gt;</code> - Page or section header</li>
            <li><code>&lt;nav&gt;</code> - Navigation links</li>
            <li><code>&lt;main&gt;</code> - Main content area</li>
            <li><code>&lt;article&gt;</code> - Independent content</li>
            <li><code>&lt;section&gt;</code> - Thematic content grouping</li>
            <li><code>&lt;aside&gt;</code> - Sidebar content</li>
            <li><code>&lt;footer&gt;</code> - Page or section footer</li>
          </ul>`,
          videoUrl: 'https://youtu.be/PxXU-ip507s?si=9GTnM8180HyeWx1s',
          thumbnailUrl: 'https://img.youtube.com/vi/PxXU-ip507s/maxresdefault.jpg',
          videoDuration: 840, // 14 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 2,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 18,
          points: 125,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand the importance of semantic HTML',
            'Learn all major HTML5 semantic elements',
            'Structure a webpage using semantic elements',
            'Improve accessibility and SEO',
          ],
          prerequisites: ['html5-introduction-document-structure'],
          interactiveElements: {
            exercises: [
              {
                title: 'Build a Semantic Blog Layout',
                description: 'Create a blog page layout using semantic HTML5 elements',
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['html5', 'semantic elements', 'accessibility', 'seo'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section2.id,
          title: 'HTML Forms and Input Types',
          slug: 'html-forms-input-types',
          description:
            'Create interactive forms with various input types, validation, and best practices.',
          content: `<h2>HTML Forms and Input Types</h2>
          <p>Forms are essential for user interaction. HTML5 introduced many new input types and validation features.</p>
          <h3>Common Input Types</h3>
          <ul>
            <li><code>text, email, password, tel, url</code></li>
            <li><code>number, range, date, time, datetime-local</code></li>
            <li><code>color, file, hidden, search</code></li>
            <li><code>checkbox, radio, submit, reset</code></li>
          </ul>`,
          videoUrl: 'https://youtu.be/Hj9WbispPg0?si=7JOGsk135RcZ3061',
          thumbnailUrl: 'https://img.youtube.com/vi/Hj9WbispPg0/maxresdefault.jpg',
          videoDuration: 960, // 16 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 3,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 20,
          points: 150,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Master all HTML5 input types',
            'Implement form validation',
            'Create accessible forms',
            'Understand form submission',
          ],
          attachments: [
            {
              filename: 'contact-form.html',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 2048,
              mimeType: 'text/html',
            },
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['html5', 'forms', 'input types', 'validation'],
            language: 'english',
          },
        },
      );
    }

    // Section 3: CSS3 Styling and Layout
    const section3 = sections.find(s => s.orderIndex === 3);
    if (section3) {
      lessons.push(
        {
          courseId,
          sectionId: section3.id,
          title: 'CSS3 Fundamentals and Selectors',
          slug: 'css3-fundamentals-selectors',
          description: 'Learn CSS basics, syntax, selectors, and how to style HTML elements.',
          content: `<h2>CSS3 Fundamentals</h2>
          <p>CSS (Cascading Style Sheets) is used to style and layout web pages. CSS3 adds powerful new features like animations, transitions, and advanced selectors.</p>
          <h3>CSS Syntax</h3>
          <pre><code>selector {
    property: value;
    property: value;
}</code></pre>
          <h3>Types of Selectors</h3>
          <ul>
            <li>Element selectors: <code>h1, p, div</code></li>
            <li>Class selectors: <code>.classname</code></li>
            <li>ID selectors: <code>#idname</code></li>
            <li>Attribute selectors: <code>[attribute=value]</code></li>
            <li>Pseudo-classes: <code>:hover, :active, :focus</code></li>
          </ul>`,
          videoUrl: 'https://youtu.be/IYsGD5l8Ol8?si=u22GknuCoWRp6fQc',
          thumbnailUrl: 'https://img.youtube.com/vi/IYsGD5l8Ol8/maxresdefault.jpg',
          videoDuration: 900, // 15 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 1,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 20,
          points: 100,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand CSS syntax and structure',
            'Master different types of selectors',
            'Learn CSS specificity and cascade',
            'Style HTML elements effectively',
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['css3', 'selectors', 'styling', 'fundamentals'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section3.id,
          title: 'Flexbox Layout Mastery',
          slug: 'flexbox-layout-mastery',
          description: 'Master CSS Flexbox for creating flexible and responsive layouts.',
          content: `<h2>CSS Flexbox Layout</h2>
          <p>Flexbox is a powerful layout method that makes it easy to design flexible and responsive layout structures.</p>
          <h3>Flex Container Properties</h3>
          <ul>
            <li><code>display: flex</code></li>
            <li><code>flex-direction: row | column</code></li>
            <li><code>justify-content: flex-start | center | space-between</code></li>
            <li><code>align-items: stretch | center | flex-start</code></li>
            <li><code>flex-wrap: nowrap | wrap</code></li>
          </ul>`,
          videoUrl: 'https://youtu.be/VresAuRUMO4?si=jIpFhpVd0MKfg5FU',
          thumbnailUrl: 'https://img.youtube.com/vi/VresAuRUMO4/maxresdefault.jpg',
          videoDuration: 1080, // 18 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 2,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 25,
          points: 150,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Master flexbox container properties',
            'Learn flex item properties',
            'Create responsive layouts with flexbox',
            'Solve common layout problems',
          ],
          attachments: [
            {
              filename: 'flexbox-cheatsheet.pdf',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 512000,
              mimeType: 'application/pdf',
            },
          ],
          interactiveElements: {
            exercises: [
              {
                title: 'Flexbox Navigation Bar',
                description: 'Create a responsive navigation bar using flexbox',
              },
              {
                title: 'Card Layout with Flexbox',
                description: 'Build a responsive card layout using flexbox properties',
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['css3', 'flexbox', 'layout', 'responsive'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section3.id,
          title: 'CSS Grid Layout System',
          slug: 'css-grid-layout-system',
          description: 'Learn CSS Grid for creating complex two-dimensional layouts.',
          content: `<h2>CSS Grid Layout</h2>
          <p>CSS Grid is a two-dimensional layout system that allows you to create complex layouts with rows and columns.</p>
          <h3>Grid Container Properties</h3>
          <ul>
            <li><code>display: grid</code></li>
            <li><code>grid-template-columns: 1fr 2fr 1fr</code></li>
            <li><code>grid-template-rows: auto 1fr auto</code></li>
            <li><code>grid-gap: 20px</code></li>
            <li><code>grid-template-areas</code></li>
          </ul>`,
          videoUrl: 'https://youtu.be/AhDPtHd_7i0?si=eq71NwRatjQdGEZu',
          thumbnailUrl: 'https://img.youtube.com/vi/AhDPtHd_7i0/maxresdefault.jpg',
          videoDuration: 1200, // 20 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 3,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 30,
          points: 175,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand CSS Grid fundamentals',
            'Create complex two-dimensional layouts',
            'Use grid template areas',
            'Build responsive designs with Grid',
          ],
          prerequisites: ['flexbox-layout-mastery'],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['css3', 'css grid', 'layout', '2d layout'],
            language: 'english',
          },
        },
      );
    }

    // Section 4: JavaScript ES6+ Fundamentals
    const section4 = sections.find(s => s.orderIndex === 4);
    if (section4) {
      lessons.push(
        {
          courseId,
          sectionId: section4.id,
          title: 'JavaScript Basics: Variables and Data Types',
          slug: 'javascript-basics-variables-data-types',
          description:
            'Learn JavaScript fundamentals including variables, data types, and basic operations.',
          content: `<h2>JavaScript Basics</h2>
          <p>JavaScript is the programming language of the web. Let's start with the fundamentals: variables and data types.</p>
          <h3>Variable Declarations</h3>
          <pre><code>let name = "John";        // String
const age = 25;           // Number
let isStudent = true;     // Boolean
let hobbies = ["reading", "coding"]; // Array
let person = { name: "John", age: 25 }; // Object</code></pre>
          <h3>Data Types</h3>
          <ul>
            <li><strong>Primitive:</strong> string, number, boolean, undefined, null, symbol</li>
            <li><strong>Non-primitive:</strong> object, array, function</li>
          </ul>`,
          videoUrl: 'https://youtu.be/berhfH0W4Vw?si=7C6Q9UurDmPCvrdL',
          thumbnailUrl: 'https://img.youtube.com/vi/berhfH0W4Vw/maxresdefault.jpg',
          videoDuration: 960, // 16 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 1,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 20,
          points: 100,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand JavaScript variable declarations',
            'Learn about different data types',
            'Practice variable assignments',
            'Understand type coercion',
          ],
          interactiveElements: {
            exercises: [
              {
                title: 'Variable Practice',
                description: 'Practice declaring and using different types of variables',
              },
            ],
            quizzes: [
              {
                question: 'Which keyword is used to declare a constant in JavaScript?',
                options: ['var', 'let', 'const', 'final'],
                correctAnswer: 2,
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['javascript', 'variables', 'data types', 'basics'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section4.id,
          title: 'Functions and Arrow Functions',
          slug: 'functions-arrow-functions',
          description:
            'Master JavaScript functions, including traditional functions and ES6 arrow functions.',
          content: `<h2>JavaScript Functions</h2>
          <p>Functions are reusable blocks of code that perform specific tasks. ES6 introduced arrow functions with a more concise syntax.</p>
          <h3>Function Declaration</h3>
          <pre><code>function greet(name) {
    return "Hello, " + name + "!";
}</code></pre>
          <h3>Arrow Functions</h3>
          <pre><code>const greet = (name) => {
    return \`Hello, \${name}!\`;
};

// Shorter syntax for single expressions
const greet = name => \`Hello, \${name}!\`;</code></pre>`,
          videoUrl: 'https://youtu.be/9P9h5h9kBmU?si=FX4Z8rDKJKSblbyw',
          thumbnailUrl: 'https://img.youtube.com/vi/9P9h5h9kBmU/maxresdefault.jpg',
          videoDuration: 1080, // 18 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 2,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 25,
          points: 125,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand function declarations and expressions',
            'Master ES6 arrow function syntax',
            'Learn about function parameters and return values',
            'Understand function scope and closures',
          ],
          prerequisites: ['javascript-basics-variables-data-types'],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['javascript', 'functions', 'arrow functions', 'es6'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section4.id,
          title: 'Objects and Arrays Deep Dive',
          slug: 'objects-arrays-deep-dive',
          description:
            'Master JavaScript objects and arrays with modern ES6+ methods and techniques.',
          content: `<h2>Objects and Arrays in JavaScript</h2>
          <p>Objects and arrays are fundamental data structures in JavaScript. ES6+ introduced powerful methods for working with them.</p>
          <h3>Object Methods</h3>
          <pre><code>const person = { name: "John", age: 25, city: "New York" };

// Destructuring
const { name, age } = person;

// Object.keys(), Object.values(), Object.entries()
const keys = Object.keys(person);
const values = Object.values(person);</code></pre>
          <h3>Array Methods</h3>
          <pre><code>const numbers = [1, 2, 3, 4, 5];

// ES6+ methods
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);</code></pre>`,
          videoUrl: 'https://youtu.be/aHayyIbxIAo?si=X3_2ik_HiEIwQJUM',
          thumbnailUrl: 'https://img.youtube.com/vi/aHayyIbxIAo/maxresdefault.jpg',
          videoDuration: 1320, // 22 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 3,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 30,
          points: 150,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Master object creation and manipulation',
            'Learn array methods: map, filter, reduce',
            'Understand destructuring assignment',
            'Practice with spread and rest operators',
          ],
          attachments: [
            {
              filename: 'array-methods-cheatsheet.pdf',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 128000,
              mimeType: 'application/pdf',
            },
            {
              filename: 'object-exercises.js',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 4096,
              mimeType: 'text/javascript',
            },
          ],
          interactiveElements: {
            exercises: [
              {
                title: 'Array Methods Practice',
                description: 'Practice using map, filter, and reduce methods',
              },
              {
                title: 'Object Destructuring Challenge',
                description: 'Master destructuring with nested objects',
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['javascript', 'objects', 'arrays', 'destructuring', 'es6'],
            language: 'english',
          },
        },
      );
    }

    // Section 5: DOM Manipulation and Events
    const section5 = sections.find(s => s.orderIndex === 5);
    if (section5) {
      lessons.push(
        {
          courseId,
          sectionId: section5.id,
          title: 'Understanding the DOM',
          slug: 'understanding-the-dom',
          description:
            'Learn about the Document Object Model and how to select and manipulate HTML elements.',
          content: `<h2>The Document Object Model (DOM)</h2>
          <p>The DOM is a programming interface for HTML documents. It represents the page as a tree structure that programs can change.</p>
          <h3>DOM Selection Methods</h3>
          <pre><code>// Select elements
document.getElementById('myId');
document.getElementsByClassName('myClass');
document.getElementsByTagName('div');
document.querySelector('.myClass');
document.querySelectorAll('.myClass');</code></pre>
          <h3>DOM Manipulation</h3>
          <pre><code>// Change content
element.textContent = 'New text';
element.innerHTML = '<strong>Bold text</strong>';

// Change attributes
element.setAttribute('class', 'new-class');
element.style.color = 'blue';</code></pre>`,
          videoUrl: 'https://youtu.be/UPARgGhfb5E?si=hU0gtZY5UJ36Jt_D',
          thumbnailUrl: 'https://img.youtube.com/vi/UPARgGhfb5E/maxresdefault.jpg',
          videoDuration: 900, // 15 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 1,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 20,
          points: 100,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand the DOM structure',
            'Learn DOM selection methods',
            'Practice element manipulation',
            'Change element attributes and styles',
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['javascript', 'dom', 'manipulation', 'selection'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section5.id,
          title: 'Event Handling and User Interactions',
          slug: 'event-handling-user-interactions',
          description:
            'Master JavaScript events, event listeners, and creating interactive user experiences.',
          content: `<h2>JavaScript Events</h2>
          <p>Events are actions that happen in the browser, such as clicks, key presses, or page loads. We can respond to these events to create interactive experiences.</p>
          <h3>Adding Event Listeners</h3>
          <pre><code>// Button click event
button.addEventListener('click', function() {
    alert('Button clicked!');
});

// Modern arrow function syntax
button.addEventListener('click', () => {
    console.log('Button clicked!');
});</code></pre>
          <h3>Common Events</h3>
          <ul>
            <li><code>click</code> - Mouse click</li>
            <li><code>submit</code> - Form submission</li>
            <li><code>keydown/keyup</code> - Keyboard input</li>
            <li><code>load</code> - Page/image loaded</li>
            <li><code>resize</code> - Window resized</li>
          </ul>`,
          videoUrl: 'https://youtu.be/HVhD13U5Bh0?si=16wH5Nxqj3n1bjp3',
          thumbnailUrl: 'https://img.youtube.com/vi/HVhD13U5Bh0/maxresdefault.jpg',
          videoDuration: 1080, // 18 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 2,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 25,
          points: 125,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand JavaScript events',
            'Learn to add event listeners',
            'Handle different types of events',
            'Create interactive user interfaces',
          ],
          prerequisites: ['understanding-the-dom'],
          interactiveElements: {
            exercises: [
              {
                title: 'Interactive Button Challenge',
                description: 'Create buttons with different interactive behaviors',
              },
              {
                title: 'Form Validation Project',
                description: 'Build a form with real-time validation',
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['javascript', 'events', 'event listeners', 'interactivity'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section5.id,
          title: 'Building a Dynamic To-Do List Project',
          slug: 'building-dynamic-todo-list-project',
          description:
            'Put your DOM manipulation skills to practice by building a fully functional to-do list application.',
          content: `<h2>Project: Dynamic To-Do List</h2>
          <p>Now it's time to apply everything you've learned about DOM manipulation and events by building a complete to-do list application.</p>
          <h3>Project Features</h3>
          <ul>
            <li>Add new tasks</li>
            <li>Mark tasks as complete</li>
            <li>Delete tasks</li>
            <li>Filter tasks (all, active, completed)</li>
            <li>Local storage persistence</li>
            <li>Responsive design</li>
          </ul>
          <h3>Key Skills Practiced</h3>
          <ul>
            <li>DOM element creation and removal</li>
            <li>Event delegation</li>
            <li>Array manipulation</li>
            <li>Local storage API</li>
            <li>CSS classes manipulation</li>
          </ul>`,
          videoUrl: 'https://youtu.be/Hc0O0u9C_u4?si=a_JEravXEaWs86tL',
          thumbnailUrl: 'https://img.youtube.com/vi/Hc0O0u9C_u4/maxresdefault.jpg',
          videoDuration: 2400, // 40 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 3,
          isPreview: false,
          isMandatory: false,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 60,
          points: 200,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Build a complete JavaScript application',
            'Practice DOM manipulation techniques',
            'Implement local storage for data persistence',
            'Create a responsive user interface',
          ],
          prerequisites: ['understanding-the-dom', 'event-handling-user-interactions'],
          attachments: [
            {
              filename: 'todo-starter-files.zip',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 8192,
              mimeType: 'application/zip',
            },
            {
              filename: 'todo-solution.zip',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 16384,
              mimeType: 'application/zip',
            },
          ],
          interactiveElements: {
            exercises: [
              {
                title: 'To-Do List Enhancement',
                description: 'Add additional features like due dates and priority levels',
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['javascript', 'project', 'todo list', 'dom manipulation', 'local storage'],
            language: 'english',
          },
        },
      );
    }

    // Section 6: Asynchronous JavaScript
    const section6 = sections.find(s => s.orderIndex === 6);
    if (section6) {
      lessons.push(
        {
          courseId,
          sectionId: section6.id,
          title: 'Promises and Async/Await',
          slug: 'promises-async-await',
          description:
            'Master asynchronous JavaScript with Promises and the modern async/await syntax.',
          content: `<h2>Asynchronous JavaScript</h2>
          <p>JavaScript is single-threaded, but we can handle asynchronous operations using Promises and async/await.</p>
          <h3>Promises</h3>
          <pre><code>const fetchData = () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('Data fetched successfully!');
        }, 1000);
    });
};

fetchData()
    .then(data => console.log(data))
    .catch(error => console.error(error));</code></pre>
          <h3>Async/Await</h3>
          <pre><code>const getData = async () => {
    try {
        const data = await fetchData();
        console.log(data);
    } catch (error) {
        console.error(error);
    }
};</code></pre>`,
          videoUrl: 'https://youtu.be/uO0RRCBsEIY?si=G8fpOZE1csNToBTK',
          thumbnailUrl: 'https://img.youtube.com/vi/uO0RRCBsEIY/maxresdefault.jpg',
          videoDuration: 1200, // 20 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 1,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 30,
          points: 150,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand asynchronous JavaScript concepts',
            'Master Promise creation and consumption',
            'Learn async/await syntax',
            'Handle errors in asynchronous code',
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['javascript', 'promises', 'async await', 'asynchronous'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section6.id,
          title: 'Fetch API and Making HTTP Requests',
          slug: 'fetch-api-http-requests',
          description: 'Learn to make HTTP requests using the Fetch API and work with APIs.',
          content: `<h2>Fetch API</h2>
          <p>The Fetch API provides a modern interface for making HTTP requests in JavaScript.</p>
          <h3>Basic GET Request</h3>
          <pre><code>fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));</code></pre>
          <h3>POST Request with Async/Await</h3>
          <pre><code>const postData = async (url, data) => {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error:', error);
    }
};</code></pre>`,
          videoUrl: 'https://youtu.be/hhO8aiDgN9A?si=BBlpWJnJDikUy7Xh',
          thumbnailUrl: 'https://img.youtube.com/vi/hhO8aiDgN9A/maxresdefault.jpg',
          videoDuration: 1080, // 18 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 2,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 25,
          points: 125,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Learn the Fetch API syntax',
            'Make GET and POST requests',
            'Handle response data and errors',
            'Work with JSON data',
          ],
          prerequisites: ['promises-async-await'],
          interactiveElements: {
            exercises: [
              {
                title: 'Weather App API Integration',
                description: 'Build a weather app that fetches data from a weather API',
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['javascript', 'fetch api', 'http requests', 'api'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section6.id,
          title: 'Building a Weather App with API Integration',
          slug: 'building-weather-app-api-integration',
          description:
            'Create a complete weather application using the OpenWeatherMap API and geolocation.',
          content: `<h2>Project: Weather Application</h2>
          <p>Build a responsive weather app that fetches real-time weather data and displays it beautifully.</p>
          <h3>Project Features</h3>
          <ul>
            <li>Current weather display</li>
            <li>5-day weather forecast</li>
            <li>Geolocation support</li>
            <li>Search by city name</li>
            <li>Responsive design</li>
            <li>Weather icons and animations</li>
          </ul>
          <h3>APIs and Technologies</h3>
          <ul>
            <li>OpenWeatherMap API</li>
            <li>Geolocation API</li>
            <li>Fetch API</li>
            <li>CSS animations</li>
            <li>Local storage for recent searches</li>
          </ul>`,
          videoUrl: 'https://youtu.be/jsttBfsjIWc?si=aYGDSM9k_iAF77Mx',
          thumbnailUrl: 'https://img.youtube.com/vi/jsttBfsjIWc/maxresdefault.jpg',
          videoDuration: 3000, // 50 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 3,
          isPreview: false,
          isMandatory: false,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 75,
          points: 250,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Integrate third-party APIs',
            'Handle geolocation requests',
            'Create dynamic user interfaces',
            'Implement error handling for API failures',
          ],
          prerequisites: ['fetch-api-http-requests'],
          attachments: [
            {
              filename: 'weather-app-starter.zip',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 12288,
              mimeType: 'application/zip',
            },
            {
              filename: 'weather-icons.zip',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 256000,
              mimeType: 'application/zip',
            },
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['javascript', 'project', 'weather app', 'api integration', 'geolocation'],
            language: 'english',
          },
        },
      );
    }

    // Section 7: React.js Introduction
    const section7 = sections.find(s => s.orderIndex === 7);
    if (section7) {
      lessons.push(
        {
          courseId,
          sectionId: section7.id,
          title: 'Introduction to React and JSX',
          slug: 'introduction-react-jsx',
          description: 'Learn React fundamentals, component-based architecture, and JSX syntax.',
          content: `<h2>Introduction to React</h2>
          <p>React is a JavaScript library for building user interfaces, especially single-page applications where you need dynamic, interactive UIs.</p>
          <h3>Why React?</h3>
          <ul>
            <li>Component-based architecture</li>
            <li>Virtual DOM for performance</li>
            <li>Reusable UI components</li>
            <li>Strong ecosystem and community</li>
            <li>Maintained by Meta (Facebook)</li>
          </ul>
          <h3>JSX Syntax</h3>
          <pre><code>const Welcome = () => {
    const name = "React";
    return (
        &lt;div&gt;
            &lt;h1&gt;Hello, {name}!&lt;/h1&gt;
            &lt;p&gt;Welcome to React development&lt;/p&gt;
        &lt;/div&gt;
    );
};</code></pre>`,
          videoUrl: 'https://youtu.be/XSevUMHPC3o?si=Qmc-L0RWjTNMl0Cu',
          thumbnailUrl: 'https://img.youtube.com/vi/XSevUMHPC3o/maxresdefault.jpg',
          videoDuration: 900, // 15 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 1,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 20,
          points: 100,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            "Understand React's component-based architecture",
            'Learn JSX syntax and rules',
            'Set up a React development environment',
            'Create your first React component',
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['react', 'jsx', 'components', 'introduction'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section7.id,
          title: 'React Components and Props',
          slug: 'react-components-props',
          description: 'Master React components, props, and component composition patterns.',
          content: `<h2>React Components and Props</h2>
          <p>Components are the building blocks of React applications. Props allow you to pass data between components.</p>
          <h3>Functional Components</h3>
          <pre><code>const Greeting = (props) => {
    return &lt;h1&gt;Hello, {props.name}!&lt;/h1&gt;;
};

// Using the component
&lt;Greeting name="Alice" /&gt;</code></pre>
          <h3>Props Destructuring</h3>
          <pre><code>const UserCard = ({ name, email, avatar }) => {
    return (
        &lt;div className="user-card"&gt;
            &lt;img src={avatar} alt={name} /&gt;
            &lt;h3&gt;{name}&lt;/h3&gt;
            &lt;p&gt;{email}&lt;/p&gt;
        &lt;/div&gt;
    );
};</code></pre>`,
          videoUrl: 'https://youtu.be/hz9Zpv36jAM?si=uikYGZgsIv4LJvvU',
          thumbnailUrl: 'https://img.youtube.com/vi/hz9Zpv36jAM/maxresdefault.jpg',
          videoDuration: 1200, // 20 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 2,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 25,
          points: 125,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Create functional React components',
            'Understand props and data flow',
            'Practice component composition',
            'Learn props destructuring patterns',
          ],
          prerequisites: ['introduction-react-jsx'],
          interactiveElements: {
            exercises: [
              {
                title: 'User Profile Components',
                description: 'Build reusable user profile components with props',
              },
            ],
          },
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'beginner',
            tags: ['react', 'components', 'props', 'functional components'],
            language: 'english',
          },
        },
        {
          courseId,
          sectionId: section7.id,
          title: 'State Management with useState',
          slug: 'state-management-usestate',
          description:
            'Learn React state management using the useState hook for interactive components.',
          content: `<h2>React State with useState</h2>
          <p>State allows React components to change their output over time in response to user actions, network responses, and other events.</p>
          <h3>useState Hook</h3>
          <pre><code>import { useState } from 'react';

const Counter = () => {
    const [count, setCount] = useState(0);

    const increment = () => {
        setCount(count + 1);
    };

    return (
        &lt;div&gt;
            &lt;p&gt;Count: {count}&lt;/p&gt;
            &lt;button onClick={increment}&gt;+1&lt;/button&gt;
        &lt;/div&gt;
    );
};</code></pre>
          <h3>State with Objects</h3>
          <pre><code>const [user, setUser] = useState({
    name: '',
    email: '',
    age: 0
});

const updateName = (newName) => {
    setUser(prevUser => ({
        ...prevUser,
        name: newName
    }));
};</code></pre>`,
          videoUrl: 'https://youtu.be/EDnmuuBTbHw?si=Amztx98k0fJYkiX9',
          thumbnailUrl: 'https://img.youtube.com/vi/EDnmuuBTbHw/maxresdefault.jpg',
          videoDuration: 1080, // 18 minutes
          lessonType: LessonType.VIDEO,
          orderIndex: 3,
          isPreview: false,
          isMandatory: true,
          isActive: true,
          status: ContentStatus.PUBLISHED,
          moderationStatus: ContentModerationStatus.APPROVED,
          estimatedDuration: 25,
          points: 150,
          publishedAt: new Date('2024-01-15'),
          objectives: [
            'Understand React state concepts',
            'Master the useState hook',
            'Manage different types of state',
            'Handle state updates correctly',
          ],
          prerequisites: ['react-components-props'],
          attachments: [
            {
              filename: 'react-hooks-cheatsheet.pdf',
              url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
              fileSize: 64000,
              mimeType: 'application/pdf',
            },
          ],
          settings: {
            allowComments: true,
            showProgress: true,
            allowDownload: true,
            autoPlay: false,
            showTranscript: true,
          },
          metadata: {
            difficulty: 'intermediate',
            tags: ['react', 'useState', 'state management', 'hooks'],
            language: 'english',
          },
        },
      );
    }

    // Add more sections following the same pattern...
    // For brevity, I'll add a few lessons from later sections to show the variety

    // Section 10: Node.js Backend Development
    const section10 = sections.find(s => s.orderIndex === 10);
    if (section10) {
      lessons.push({
        courseId,
        sectionId: section10.id,
        title: 'Introduction to Node.js and NPM',
        slug: 'introduction-nodejs-npm',
        description:
          'Learn Node.js fundamentals, NPM package management, and setting up a Node.js project.',
        content: `<h2>Introduction to Node.js</h2>
          <p>Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine, allowing you to run JavaScript on the server side.</p>
          <h3>What is Node.js?</h3>
          <ul>
            <li>Server-side JavaScript runtime</li>
            <li>Event-driven, non-blocking I/O</li>
            <li>Built on V8 JavaScript engine</li>
            <li>Large ecosystem of packages (NPM)</li>
          </ul>
          <h3>Creating Your First Node.js App</h3>
          <pre><code>// app.js
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('&lt;h1&gt;Hello from Node.js!&lt;/h1&gt;');
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});</code></pre>`,
        videoUrl: 'https://youtu.be/ZCJtWCSZ5p8?si=peLeCP93bUSCQxvZ',
        thumbnailUrl: 'https://img.youtube.com/vi/ZCJtWCSZ5p8/maxresdefault.jpg',
        videoDuration: 960, // 16 minutes
        lessonType: LessonType.VIDEO,
        orderIndex: 1,
        isPreview: false,
        isMandatory: true,
        isActive: true,
        status: ContentStatus.PUBLISHED,
        moderationStatus: ContentModerationStatus.APPROVED,
        estimatedDuration: 20,
        points: 100,
        publishedAt: new Date('2024-01-15'),
        objectives: [
          'Understand Node.js and its use cases',
          'Learn about NPM and package management',
          'Create your first Node.js application',
          'Understand the Node.js module system',
        ],
        settings: {
          allowComments: true,
          showProgress: true,
          allowDownload: true,
          autoPlay: false,
          showTranscript: true,
        },
        metadata: {
          difficulty: 'beginner',
          tags: ['nodejs', 'npm', 'backend', 'server'],
          language: 'english',
        },
      });
    }

    // Section 14: Full-Stack Project Development
    const section14 = sections.find(s => s.orderIndex === 14);
    if (section14) {
      lessons.push({
        courseId,
        sectionId: section14.id,
        title: 'E-commerce Project: Planning and Setup',
        slug: 'ecommerce-project-planning-setup',
        description:
          'Plan and set up the architecture for a complete e-commerce application with React frontend and Node.js backend.',
        content: `<h2>Full-Stack E-commerce Project</h2>
          <p>In this capstone project, we'll build a complete e-commerce application that demonstrates all the skills you've learned throughout this bootcamp.</p>
          <h3>Project Features</h3>
          <ul>
            <li>User authentication and authorization</li>
            <li>Product catalog with search and filtering</li>
            <li>Shopping cart functionality</li>
            <li>Order processing and payment integration</li>
            <li>Admin panel for product management</li>
            <li>Responsive design for all devices</li>
          </ul>
          <h3>Technology Stack</h3>
          <ul>
            <li><strong>Frontend:</strong> React, Context API, React Router</li>
            <li><strong>Backend:</strong> Node.js, Express.js</li>
            <li><strong>Database:</strong> MongoDB with Mongoose</li>
            <li><strong>Authentication:</strong> JWT tokens</li>
            <li><strong>Payment:</strong> Stripe API integration</li>
            <li><strong>Deployment:</strong> Heroku and Netlify</li>
          </ul>`,
        videoUrl: 'https://youtu.be/E59DytaXTio?si=X3rQN76pps-AR1E5',
        thumbnailUrl: 'https://img.youtube.com/vi/E59DytaXTio/maxresdefault.jpg',
        videoDuration: 1800, // 30 minutes
        lessonType: LessonType.VIDEO,
        orderIndex: 1,
        isPreview: false,
        isMandatory: true,
        isActive: true,
        status: ContentStatus.PUBLISHED,
        moderationStatus: ContentModerationStatus.APPROVED,
        estimatedDuration: 45,
        points: 200,
        publishedAt: new Date('2024-01-15'),
        objectives: [
          'Plan a full-stack application architecture',
          'Set up development environment for full-stack project',
          'Understand project requirements and user stories',
          'Create database schema and API endpoints plan',
        ],
        attachments: [
          {
            filename: 'ecommerce-requirements.pdf',
            url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
            fileSize: 1024000,
            mimeType: 'application/pdf',
          },
          {
            filename: 'project-starter-files.zip',
            url: 'https://nguyenhoangkha1910.github.io/hoangkha2003/index.html',
            fileSize: 32768,
            mimeType: 'application/zip',
          },
        ],
        settings: {
          allowComments: true,
          showProgress: true,
          allowDownload: true,
          autoPlay: false,
          showTranscript: true,
        },
        metadata: {
          difficulty: 'advanced',
          tags: ['full-stack', 'ecommerce', 'project', 'planning', 'architecture'],
          language: 'english',
        },
      });
    }

    return lessons;
  }

  async clear(): Promise<void> {
    console.log('Clearing lessons...');
    await this.lessonRepository.delete({});
    console.log('Lessons cleared successfully!');
  }
}

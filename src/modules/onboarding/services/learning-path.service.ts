import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from '@/modules/user/entities/student-profile.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { Enrollment } from '@/modules/course/entities/enrollment.entity';
import { AIRecommendation } from '@/modules/ai/entities/ai-recommendation.entity';
import {
  LearningPathDto,
  LearningPathCourseDto,
  SelectLearningPathDto,
  DifficultyPreference,
} from '../dto/onboarding.dto';
import { CourseStatus, EnrollmentStatus } from '@/common/enums/course.enums';
import { UserType } from '@/common/enums/user.enums';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class LearningPathService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(AIRecommendation)
    private readonly aiRecommendationRepository: Repository<AIRecommendation>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(LearningPathService.name);
  }

  async getRecommendedPaths(userId: string): Promise<LearningPathDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;
    const assessmentResults = studentProfile.analyticsData?.skillAssessmentResults;

    // Generate AI-recommended learning paths based on assessment results
    const recommendedPaths = await this.generateRecommendedPaths(assessmentResults, studentProfile);

    this.logger.log(`Generated ${recommendedPaths.length} recommended learning paths for user ${userId}`);

    return recommendedPaths;
  }

  async getAllPaths(): Promise<LearningPathDto[]> {
    // Fetch actual courses from database and create learning paths
    const courses = await this.courseRepository.find({
      where: { 
        status: CourseStatus.PUBLISHED
      },
      relations: ['teacher', 'category'],
      order: { rating: 'DESC', totalEnrollments: 'DESC' }
    });

    // Group courses by category and level to create learning paths
    const pathsMap = new Map<string, any>();
    
    for (const course of courses) {
      const categoryName = course.category?.name || 'General';
      const level = course.level || 'beginner';
      const pathKey = `${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${level}`;
      
      if (!pathsMap.has(pathKey)) {
        pathsMap.set(pathKey, {
          id: pathKey,
          title: `${categoryName} - ${this.capitalizeFirst(level)}`,
          description: `Learn ${categoryName.toLowerCase()} from ${level} level with real courses from our platform`,
          level: this.mapCourseLevelToDifficultyPreference(level),
          estimatedDuration: this.calculateEstimatedDuration(level),
          courses: [],
          skills: [],
          prerequisites: this.getPrerequisites(level),
          isRecommended: false,
          aiConfidence: 0.85,
        });
      }
      
      const path = pathsMap.get(pathKey);
      path.courses.push({
        id: course.id,
        title: course.title,
        description: course.shortDescription || course.description?.substring(0, 100) + '...',
        duration: `${course.estimatedDuration || 4} weeks`,
        order: path.courses.length + 1,
        isRequired: path.courses.length < 2, // First 2 courses are required
      });
      
      // Extract skills from course title and description
      const skillsFromCourse = this.extractSkillsFromCourse(course);
      path.skills = [...new Set([...path.skills, ...skillsFromCourse])];
    }
    
    const realPaths = Array.from(pathsMap.values());
    
    // If no real courses found, fall back to sample paths
    if (realPaths.length === 0) {
      this.logger.warn('No published courses found, returning sample learning paths');
      return this.getSamplePaths();
    }
    
    this.logger.log(`Generated ${realPaths.length} learning paths from ${courses.length} courses`);
    
    return realPaths;
  }

  private getSamplePaths(): LearningPathDto[] {
    // Fallback sample paths when no real courses exist
    const samplePaths: LearningPathDto[] = [
      {
        id: 'frontend-beginner',
        title: 'Frontend Development - Beginner',
        description: 'Learn the fundamentals of web development with HTML, CSS, and JavaScript',
        level: DifficultyPreference.BEGINNER,
        estimatedDuration: '3-4 months',
        courses: [
          {
            id: 'html-css-basics',
            title: 'HTML & CSS Fundamentals',
            description: 'Master the building blocks of web pages',
            duration: '4 weeks',
            order: 1,
            isRequired: true,
          },
          {
            id: 'javascript-intro',
            title: 'JavaScript for Beginners',
            description: 'Learn programming with JavaScript',
            duration: '6 weeks',
            order: 2,
            isRequired: true,
          },
          {
            id: 'responsive-design',
            title: 'Responsive Web Design',
            description: 'Create websites that work on all devices',
            duration: '3 weeks',
            order: 3,
            isRequired: false,
          },
        ],
        skills: ['HTML', 'CSS', 'JavaScript', 'Responsive Design'],
        prerequisites: [],
        isRecommended: false,
        aiConfidence: 0.85,
      },
      {
        id: 'backend-beginner',
        title: 'Backend Development - Beginner',
        description: 'Learn server-side programming and database management',
        level: DifficultyPreference.BEGINNER,
        estimatedDuration: '4-5 months',
        courses: [
          {
            id: 'programming-basics',
            title: 'Programming Fundamentals',
            description: 'Core programming concepts and logic',
            duration: '4 weeks',
            order: 1,
            isRequired: true,
          },
          {
            id: 'database-intro',
            title: 'Database Fundamentals',
            description: 'Learn SQL and database design',
            duration: '5 weeks',
            order: 2,
            isRequired: true,
          },
          {
            id: 'api-development',
            title: 'API Development',
            description: 'Build REST APIs and web services',
            duration: '6 weeks',
            order: 3,
            isRequired: true,
          },
        ],
        skills: ['Programming Logic', 'SQL', 'Database Design', 'API Development'],
        prerequisites: [],
        isRecommended: false,
        aiConfidence: 0.82,
      },
      {
        id: 'fullstack-intermediate',
        title: 'Full-Stack Development - Intermediate',
        description: 'Combine frontend and backend skills for complete web applications',
        level: DifficultyPreference.INTERMEDIATE,
        estimatedDuration: '6-8 months',
        courses: [
          {
            id: 'react-fundamentals',
            title: 'React.js Fundamentals',
            description: 'Build modern frontend applications',
            duration: '6 weeks',
            order: 1,
            isRequired: true,
          },
          {
            id: 'node-express',
            title: 'Node.js & Express',
            description: 'Server-side JavaScript development',
            duration: '5 weeks',
            order: 2,
            isRequired: true,
          },
          {
            id: 'fullstack-project',
            title: 'Full-Stack Project',
            description: 'Build a complete web application',
            duration: '8 weeks',
            order: 3,
            isRequired: true,
          },
        ],
        skills: ['React.js', 'Node.js', 'Express', 'Full-Stack Architecture'],
        prerequisites: ['Basic HTML/CSS', 'JavaScript fundamentals'],
        isRecommended: false,
        aiConfidence: 0.78,
      },
      {
        id: 'data-science-beginner',
        title: 'Data Science - Beginner',
        description: 'Introduction to data analysis and machine learning',
        level: DifficultyPreference.BEGINNER,
        estimatedDuration: '5-6 months',
        courses: [
          {
            id: 'python-basics',
            title: 'Python Programming',
            description: 'Learn Python for data science',
            duration: '5 weeks',
            order: 1,
            isRequired: true,
          },
          {
            id: 'data-analysis',
            title: 'Data Analysis with Pandas',
            description: 'Manipulate and analyze data',
            duration: '4 weeks',
            order: 2,
            isRequired: true,
          },
          {
            id: 'machine-learning-intro',
            title: 'Introduction to Machine Learning',
            description: 'Basic ML concepts and algorithms',
            duration: '6 weeks',
            order: 3,
            isRequired: true,
          },
        ],
        skills: ['Python', 'Data Analysis', 'Pandas', 'Machine Learning'],
        prerequisites: ['Basic mathematics', 'Statistics fundamentals'],
        isRecommended: false,
        aiConfidence: 0.88,
      },
    ];

    return samplePaths;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private calculateEstimatedDuration(level: string): string {
    switch (level.toLowerCase()) {
      case 'beginner':
        return '3-4 months';
      case 'intermediate':
        return '4-6 months';
      case 'advanced':
        return '6-8 months';
      default:
        return '3-6 months';
    }
  }

  private getPrerequisites(level: string): string[] {
    switch (level.toLowerCase()) {
      case 'beginner':
        return [];
      case 'intermediate':
        return ['Basic programming concepts', 'Fundamental knowledge in the subject'];
      case 'advanced':
        return ['Intermediate level knowledge', 'Practical experience', 'Previous coursework'];
      default:
        return [];
    }
  }

  private extractSkillsFromCourse(course: any): string[] {
    const skills: string[] = [];
    const text = `${course.title} ${course.description || ''}`.toLowerCase();
    
    // Common programming and tech skills to extract
    const skillKeywords = [
      'javascript', 'python', 'java', 'html', 'css', 'react', 'node',
      'database', 'sql', 'api', 'web development', 'mobile', 'android',
      'ios', 'machine learning', 'data science', 'blockchain', 'ai',
      'cybersecurity', 'cloud', 'aws', 'docker', 'kubernetes'
    ];
    
    for (const keyword of skillKeywords) {
      if (text.includes(keyword)) {
        skills.push(this.capitalizeFirst(keyword));
      }
    }
    
    return skills.length > 0 ? skills : ['General Programming'];
  }

  private mapCourseLevelToDifficultyPreference(courseLevel: string): DifficultyPreference {
    switch (courseLevel.toLowerCase()) {
      case 'beginner':
        return DifficultyPreference.BEGINNER;
      case 'intermediate':
        return DifficultyPreference.INTERMEDIATE;
      case 'advanced':
        return DifficultyPreference.ADVANCED;
      default:
        return DifficultyPreference.BEGINNER;
    }
  }

  async selectPath(
    userId: string,
    selectionDto: SelectLearningPathDto,
  ): Promise<{ success: boolean; enrolledCourses: string[] }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile'],
    });

    if (!user || !user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const studentProfile = user.studentProfile;

    // Find the selected learning path
    const allPaths = await this.getAllPaths();
    const selectedPath = allPaths.find(path => path.id === selectionDto.pathId);

    if (!selectedPath) {
      throw new NotFoundException('Learning path not found');
    }

    // Actually enroll student in the required courses
    const enrolledCourses: string[] = [];
    const requiredCourses = selectedPath.courses.filter(course => course.isRequired);
    
    for (const courseInfo of requiredCourses) {
      // Check if course actually exists in database
      const course = await this.courseRepository.findOne({
        where: { id: courseInfo.id }
      });
      
      if (course) {
        // Check if student is already enrolled
        const existingEnrollment = await this.enrollmentRepository.findOne({
          where: {
            studentId: userId,
            courseId: course.id
          }
        });
        
        if (!existingEnrollment) {
          // Create new enrollment
          const enrollment = this.enrollmentRepository.create({
            studentId: userId,
            courseId: course.id,
            enrollmentDate: new Date(),
            status: EnrollmentStatus.ENROLLED,
            progressPercentage: 0,
            paymentAmount: 0,
            paymentCurrency: 'USD',
            totalTimeSpent: 0,
            lessonsCompleted: 0,
            totalLessons: 0,
          });
          
          await this.enrollmentRepository.save(enrollment);
          enrolledCourses.push(course.id);
          
          this.logger.log(`Enrolled user ${userId} in course ${course.title}`);
        } else {
          enrolledCourses.push(course.id);
        }
      }
    }

    // Update student profile with selected path
    const analyticsData = studentProfile.analyticsData || {};
    analyticsData.selectedLearningPath = {
      pathId: selectionDto.pathId,
      pathTitle: selectedPath.title,
      selectedAt: new Date().toISOString(),
      customization: selectionDto.customization,
      enrolledCourses: enrolledCourses,
    };
    analyticsData.learningPathSelected = true;

    await this.studentProfileRepository.update(studentProfile.id, {
      analyticsData,
      lastActivityAt: new Date(),
    });

    this.logger.log(`Learning path ${selectionDto.pathId} selected for user ${userId}`);

    return {
      success: true,
      enrolledCourses,
    };
  }

  private async generateRecommendedPaths(
    assessmentResults: any,
    studentProfile: StudentProfile,
  ): Promise<LearningPathDto[]> {
    const allPaths = await this.getAllPaths();

    if (!assessmentResults) {
      // If no assessment results, return basic beginner paths
      return allPaths
        .filter(path => path.level === DifficultyPreference.BEGINNER)
        .slice(0, 3)
        .map(path => ({ ...path, isRecommended: true, aiConfidence: 0.7 }));
    }

    const skillScores = assessmentResults.skillScores || {};
    const recommendedPaths: LearningPathDto[] = [];

    // Recommend paths based on skill assessment
    if (skillScores['Programming'] < 40) {
      // Beginner in programming - recommend frontend or basic programming paths
      const beginnerPaths = allPaths.filter(path => 
        path.level === DifficultyPreference.BEGINNER &&
        (path.id.includes('frontend') || path.id.includes('backend'))
      );
      recommendedPaths.push(...beginnerPaths.map(path => ({
        ...path,
        isRecommended: true,
        aiConfidence: 0.9,
      })));
    } else if (skillScores['Programming'] >= 40 && skillScores['Programming'] < 80) {
      // Intermediate programming skills
      const intermediatePaths = allPaths.filter(path => 
        path.level === DifficultyPreference.INTERMEDIATE
      );
      recommendedPaths.push(...intermediatePaths.map(path => ({
        ...path,
        isRecommended: true,
        aiConfidence: 0.85,
      })));
    }

    // Check for data science interest
    const responses = assessmentResults.responses || [];
    const goalsResponse = responses.find((r: any) => r.questionId === 'q5');
    if (goalsResponse && goalsResponse.answer.toLowerCase().includes('data')) {
      const dataSciencePath = allPaths.find(path => path.id.includes('data-science'));
      if (dataSciencePath) {
        recommendedPaths.push({
          ...dataSciencePath,
          isRecommended: true,
          aiConfidence: 0.92,
        });
      }
    }

    // Ensure we have at least 2-3 recommended paths
    if (recommendedPaths.length < 2) {
      const additionalPaths = allPaths
        .filter(path => !recommendedPaths.some(rp => rp.id === path.id))
        .slice(0, 3 - recommendedPaths.length);
      
      recommendedPaths.push(...additionalPaths.map(path => ({
        ...path,
        isRecommended: true,
        aiConfidence: 0.75,
      })));
    }

    return recommendedPaths.slice(0, 3); // Return top 3 recommendations
  }
}
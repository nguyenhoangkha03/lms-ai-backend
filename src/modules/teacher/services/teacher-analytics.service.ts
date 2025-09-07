import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { User } from '@/modules/user/entities/user.entity';
import { TeacherProfile } from '@/modules/user/entities/teacher-profile.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { Enrollment } from '@/modules/course/entities/enrollment.entity';
import { LessonProgress } from '@/modules/course/entities/lesson-progress.entity';
import { Lesson } from '@/modules/course/entities/lesson.entity';
import { AssessmentAttempt } from '@/modules/assessment/entities/assessment-attempt.entity';
import { Assessment } from '@/modules/assessment/entities/assessment.entity';
import { LearningActivity } from '@/modules/analytics/entities/learning-activity.entity';
import { LearningSession } from '@/modules/analytics/entities/learning-session.entity';
import { CourseSection } from '@/modules/course/entities/course-section.entity';
import { ContentQualityAssessment } from '@/modules/content-analysis/entities/content-quality-assessment.entity';
import { PerformanceAnalytics } from '../dto/teacher-dashboard.dto';
import { GradingStatus } from '@/common/enums/assessment.enums';

// Analytics interfaces
export interface CourseAnalytics {
  courseId: string;
  courseName: string;
  totalStudents: number;
  completionRate: number;
  averageGrade: number;
  timeSpent: number;
  engagementScore: number;
  dropoffPoints: Array<{
    lessonId: string;
    lessonName: string;
    dropoffRate: number;
  }>;
}

export interface StudentProgressAnalytics {
  studentId: string;
  studentName: string;
  overallProgress: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  averageScore: number;
  timeSpent: number;
  lastActive: Date;
  riskLevel: 'low' | 'medium' | 'high';
  courseProgress: Array<{
    courseId: string;
    courseName: string;
    progressPercentage: number;
    grade: number;
    lessonsCompleted: number;
    totalLessons: number;
    timeSpent: number;
  }>;
}

export interface GradingAnalytics {
  totalSubmissions: number;
  pendingGrading: number;
  averageGradingTime: number;
  gradingDistribution: Array<{
    gradeRange: string;
    count: number;
    percentage: number;
  }>;
  courseGrading: Array<{
    courseId: string;
    courseName: string;
    totalSubmissions: number;
    pendingSubmissions: number;
    averageScore: number;
    gradingTurnover: number;
  }>;
}

export interface EngagementMetrics {
  totalEngagementScore: number;
  courseEngagement: Array<{
    courseId: string;
    courseName: string;
    engagementScore: number;
    trend: 'up' | 'down' | 'stable';
    studentsEngaged: number;
    totalActivities: number;
    avgSessionDuration: number;
  }>;
  studentEngagement: Array<{
    studentId: string;
    studentName: string;
    engagementScore: number;
    risk: 'low' | 'medium' | 'high';
    totalActivities: number;
    avgSessionDuration: number;
    lastActivity: Date;
  }>;
  peakHours: Array<{
    hour: number;
    activityCount: number;
  }>;
  engagementTrends: Array<{
    date: string;
    averageEngagement: number;
  }>;
}

export interface ContentEffectiveness {
  topPerformingContent: Array<{
    contentId: string;
    contentTitle: string;
    contentType: 'lesson' | 'video' | 'reading' | 'quiz' | 'assignment';
    completionRate: number;
    averageScore: number;
    engagementTime: number;
    studentSatisfaction: number;
    qualityScore?: number;
  }>;
  underperformingContent: Array<{
    contentId: string;
    contentTitle: string;
    contentType: 'lesson' | 'video' | 'reading' | 'quiz' | 'assignment';
    dropoffRate: number;
    commonIssues: string[];
    suggestions: string[];
    qualityIssues?: string[];
  }>;
  contentAnalytics: Array<{
    contentType: string;
    totalItems: number;
    averageEngagement: number;
    completionRate: number;
    averageQualityScore: number;
  }>;
  improvementRecommendations: Array<{
    contentId: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }>;
}

export interface AssessmentAnalytics {
  totalAssessments: number;
  averageScore: number;
  passRate: number;
  timeAnalytics: {
    averageCompletionTime: number;
    quickestCompletion: number;
    longestCompletion: number;
  };
  questionAnalytics: Array<{
    questionId: string;
    questionText: string;
    correctAnswerRate: number;
    averageTimeSpent: number;
    commonMistakes: string[];
  }>;
  difficultyAnalysis: Array<{
    difficulty: string;
    questionCount: number;
    averageScore: number;
  }>;
}

export interface RealTimeDashboard {
  activeStudents: number;
  ongoingSessions: number;
  completedActivities: number;
  recentSubmissions: number;
  alerts: Array<{
    type: 'warning' | 'info' | 'error';
    message: string;
    studentId?: string;
    courseId?: string;
    timestamp: string;
  }>;
  liveActivity: Array<{
    timestamp: string;
    activityCount: number;
  }>;
}

@Injectable()
export class TeacherAnalyticsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepository: Repository<TeacherProfile>,
    @InjectRepository(Course) private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment) private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
    @InjectRepository(Lesson) private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(AssessmentAttempt)
    private readonly assessmentAttemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(Assessment) private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(LearningActivity)
    private readonly learningActivityRepository: Repository<LearningActivity>,
    @InjectRepository(LearningSession)
    private readonly learningSessionRepository: Repository<LearningSession>,
    @InjectRepository(CourseSection)
    private readonly courseSectionRepository: Repository<CourseSection>,
    @InjectRepository(ContentQualityAssessment)
    private readonly contentQualityRepository: Repository<ContentQualityAssessment>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherAnalyticsService.name);
  }

  async getPerformanceAnalytics(
    teacherId: string,
    period: string = 'month',
    courseIds?: string[],
  ): Promise<PerformanceAnalytics> {
    this.logger.log(`Getting performance analytics for teacher: ${teacherId}, period: ${period}`);

    // Mock data for now - replace with real database queries and analytics
    const analytics: PerformanceAnalytics = {
      overview: {
        totalStudents: 124,
        averageClassScore: 87.5,
        completionRate: 78.2,
        engagementRate: 85.4,
        improvementRate: 12.3,
      },
      coursePerformance: [
        {
          courseId: 'course-1',
          courseName: 'Introduction to Machine Learning',
          enrolledStudents: 45,
          completionRate: 78,
          averageScore: 85,
          engagementMetrics: {
            videoWatchTime: 82.5,
            assignmentSubmissionRate: 88.9,
            discussionParticipation: 65.3,
            quizAttemptRate: 92.1,
          },
          strugglingStudents: 5,
          excellingStudents: 15,
          contentEffectiveness: {
            lessonsWithHighDrop: ['Neural Networks Basics', 'Backpropagation'],
            topPerformingLessons: ['Introduction to ML', 'Linear Regression'],
            improvementAreas: ['Mathematical foundations', 'Practical implementations'],
          },
        },
        {
          courseId: 'course-2',
          courseName: 'Advanced Python Programming',
          enrolledStudents: 32,
          completionRate: 85,
          averageScore: 92,
          engagementMetrics: {
            videoWatchTime: 89.2,
            assignmentSubmissionRate: 94.7,
            discussionParticipation: 78.1,
            quizAttemptRate: 96.8,
          },
          strugglingStudents: 2,
          excellingStudents: 18,
          contentEffectiveness: {
            lessonsWithHighDrop: ['Decorators and Metaclasses'],
            topPerformingLessons: ['Object-Oriented Programming', 'Data Structures'],
            improvementAreas: ['Advanced concepts', 'Code optimization'],
          },
        },
      ],
      studentSegments: [
        {
          segment: 'excelling',
          count: 33,
          percentage: 26.6,
          characteristics: ['Consistent high scores', 'Active participation', 'Help others'],
          recommendedActions: ['Provide advanced challenges', 'Peer mentoring opportunities'],
        },
        {
          segment: 'on_track',
          count: 74,
          percentage: 59.7,
          characteristics: ['Steady progress', 'Regular engagement', 'Meeting deadlines'],
          recommendedActions: ['Continue current approach', 'Occasional check-ins'],
        },
        {
          segment: 'at_risk',
          count: 12,
          percentage: 9.7,
          characteristics: ['Declining scores', 'Missed assignments', 'Low participation'],
          recommendedActions: ['Individual support', 'Study groups', 'Resource recommendations'],
        },
        {
          segment: 'struggling',
          count: 5,
          percentage: 4.0,
          characteristics: ['Consistently low scores', 'Multiple missed deadlines', 'Disengaged'],
          recommendedActions: ['Immediate intervention', '1-on-1 meetings', 'Academic counseling'],
        },
      ],
      timeAnalytics: {
        peakActivityHours: [
          { hour: 10, activityCount: 45 },
          { hour: 14, activityCount: 38 },
          { hour: 20, activityCount: 42 },
          { hour: 22, activityCount: 28 },
        ],
        weeklyEngagement: [
          { week: 'Week 1', engagement: 85 },
          { week: 'Week 2', engagement: 88 },
          { week: 'Week 3', engagement: 82 },
          { week: 'Week 4', engagement: 90 },
        ],
        seasonalTrends: [
          { period: 'Spring', performance: 87 },
          { period: 'Summer', performance: 82 },
          { period: 'Fall', performance: 89 },
          { period: 'Winter', performance: 85 },
        ],
      },
    };

    return analytics;
  }

  private getStartDateForPeriod(period: string): Date {
    const periodDays = this.getPeriodDays(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    return startDate;
  }

  private getPeriodDays(period: string): number {
    switch (period) {
      case 'week':
        return 7;
      case 'month':
        return 30;
      case 'semester':
        return 180;
      case 'year':
        return 365;
      default:
        return 30; // Default to month
    }
  }

  async getCourseAnalytics(
    teacherId: string,
    courseIds?: string,
    period?: string,
  ): Promise<CourseAnalytics[]> {
    this.logger.log(`Getting course analytics for teacher: ${teacherId}, courseIds: ${courseIds}`);

    try {
      // Build course filter
      const courseIdArray = courseIds ? courseIds.split(',') : [];

      // Get teacher's courses
      const courseQuery = this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId });

      if (courseIdArray.length > 0) {
        courseQuery.andWhere('course.id IN (:...courseIds)', { courseIds: courseIdArray });
      }

      const courses = await courseQuery.getMany();

      const courseAnalytics: CourseAnalytics[] = [];

      for (const course of courses) {
        // Get enrollments for this course
        const enrollments = await this.enrollmentRepository
          .createQueryBuilder('enrollment')
          .where('enrollment.courseId = :courseId', { courseId: course.id })
          .getMany();

        const totalStudents = enrollments.length;

        // Calculate completion rate
        const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
        const completionRate =
          totalStudents > 0 ? Math.round((completedEnrollments / totalStudents) * 100) : 0;

        // Get lesson progress for this course
        const lessonProgressQuery = this.lessonProgressRepository
          .createQueryBuilder('lp')
          .innerJoin('lp.lesson', 'lesson')
          .innerJoin('lesson.section', 'section')
          .where('section.courseId = :courseId', { courseId: course.id });

        const lessonProgresses = await lessonProgressQuery.getMany();

        // Calculate average grade from assessment attempts
        const assessmentAttempts = await this.assessmentAttemptRepository
          .createQueryBuilder('attempt')
          .innerJoin('attempt.assessment', 'assessment')
          .innerJoin('assessment.course', 'course')
          .where('course.id = :courseId', { courseId: course.id })
          .andWhere('attempt.status = :status', { status: 'submitted' })
          .andWhere('attempt.score IS NOT NULL')
          .getMany();

        const averageGrade =
          assessmentAttempts.length > 0
            ? Math.round(
                assessmentAttempts.reduce((sum, attempt) => sum + attempt.score!, 0) /
                  assessmentAttempts.length,
              )
            : 0;

        // Calculate total time spent (from lesson progress)
        const timeSpent = lessonProgresses.reduce(
          (total, progress) => total + (progress.timeSpent || 0),
          0,
        );

        // Calculate engagement score based on completion rate, participation, and time spent
        const engagementScore = Math.round(
          completionRate * 0.4 + averageGrade * 0.3 + Math.min(timeSpent / 100, 100) * 0.3,
        );

        // Find dropoff points by analyzing lesson completion rates
        const lessons = await this.lessonRepository
          .createQueryBuilder('lesson')
          .innerJoin('lesson.section', 'section')
          .where('section.courseId = :courseId', { courseId: course.id })
          .orderBy('section.orderIndex', 'ASC')
          .addOrderBy('lesson.orderIndex', 'ASC')
          .getMany();

        const dropoffPoints: Array<{ lessonId: string; lessonName: string; dropoffRate: number }> =
          [];
        for (const lesson of lessons) {
          const lessonCompletions = await this.lessonProgressRepository
            .createQueryBuilder('lp')
            .where('lp.lessonId = :lessonId', { lessonId: lesson.id })
            .andWhere('lp.isCompleted = :isCompleted', { isCompleted: true })
            .getCount();

          const dropoffRate =
            totalStudents > 0
              ? Math.round(((totalStudents - lessonCompletions) / totalStudents) * 100)
              : 0;

          if (dropoffRate > 20) {
            // Only include lessons with significant dropoff
            dropoffPoints.push({
              lessonId: lesson.id,
              lessonName: lesson.title,
              dropoffRate: dropoffRate,
            });
          }
        }

        courseAnalytics.push({
          courseId: course.id,
          courseName: course.title,
          totalStudents,
          completionRate,
          averageGrade,
          timeSpent,
          engagementScore,
          dropoffPoints: dropoffPoints.slice(0, 5), // Limit to top 5 dropoff points
        });
      }

      return courseAnalytics;
    } catch (error) {
      this.logger.error(`Error getting course analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStudentProgressAnalytics(
    teacherId: string,
    courseId?: string,
    studentIds?: string,
  ): Promise<StudentProgressAnalytics[]> {
    this.logger.log(`Getting student progress analytics for teacher: ${teacherId}`);

    try {
      // Get teacher's courses
      const courseQuery = this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId });

      if (courseId) {
        courseQuery.andWhere('course.id = :courseId', { courseId });
      }

      const courses = await courseQuery.getMany();
      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return [];
      }

      // Get enrollments for these courses
      let enrollmentQuery = this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoinAndSelect('enrollment.student', 'student')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds });

      if (studentIds) {
        const studentIdArray = studentIds.split(',');
        enrollmentQuery = enrollmentQuery.andWhere('enrollment.studentId IN (:...studentIds)', {
          studentIds: studentIdArray,
        });
      }

      const enrollments = await enrollmentQuery.getMany();

      const studentAnalytics: StudentProgressAnalytics[] = [];

      for (const enrollment of enrollments) {
        const student = enrollment.student;

        // Get all enrollments for this student in teacher's courses
        const studentEnrollments = await this.enrollmentRepository
          .createQueryBuilder('enrollment')
          .innerJoinAndSelect('enrollment.course', 'course')
          .where('enrollment.studentId = :studentId', { studentId: student.id })
          .andWhere('course.teacherId = :teacherId', { teacherId })
          .getMany();

        const coursesEnrolled = studentEnrollments.length;
        const coursesCompleted = studentEnrollments.filter(e => e.status === 'completed').length;

        // Calculate overall progress across all courses
        const totalProgress = studentEnrollments.reduce((sum, e) => sum + e.progressPercentage, 0);
        const overallProgress =
          coursesEnrolled > 0 ? Math.round(totalProgress / coursesEnrolled) : 0;

        // Get assessment attempts for average score
        const assessmentAttempts = await this.assessmentAttemptRepository
          .createQueryBuilder('attempt')
          .innerJoin('attempt.assessment', 'assessment')
          .innerJoin('assessment.course', 'course')
          .where('attempt.studentId = :studentId', { studentId: student.id })
          .andWhere('course.teacherId = :teacherId', { teacherId })
          .andWhere('attempt.status = :status', { status: 'submitted' })
          .andWhere('attempt.score IS NOT NULL')
          .getMany();

        const averageScore =
          assessmentAttempts.length > 0
            ? Math.round(
                assessmentAttempts.reduce((sum, attempt) => sum + attempt.score!, 0) /
                  assessmentAttempts.length,
              )
            : 0;

        // Calculate total time spent
        const timeSpent = await this.lessonProgressRepository
          .createQueryBuilder('lp')
          .innerJoin('lp.lesson', 'lesson')
          .innerJoin('lesson.section', 'section')
          .innerJoin('section.course', 'course')
          .where('lp.studentId = :studentId', { studentId: student.id })
          .andWhere('course.teacherId = :teacherId', { teacherId })
          .getMany()
          .then(progresses => progresses.reduce((total, p) => total + (p.timeSpent || 0), 0));

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (overallProgress < 30 || averageScore < 50) {
          riskLevel = 'high';
        } else if (overallProgress < 60 || averageScore < 70) {
          riskLevel = 'medium';
        }

        // Get last activity
        const lastActivity = await this.lessonProgressRepository
          .createQueryBuilder('lp')
          .innerJoin('lp.lesson', 'lesson')
          .innerJoin('lesson.section', 'section')
          .innerJoin('section.course', 'course')
          .where('lp.studentId = :studentId', { studentId: student.id })
          .andWhere('course.teacherId = :teacherId', { teacherId })
          .orderBy('lp.updatedAt', 'DESC')
          .limit(1)
          .getOne();

        // Build course progress details
        const courseProgress: Array<{
          courseId: string;
          courseName: string;
          progressPercentage: number;
          grade: number;
          lessonsCompleted: number;
          totalLessons: number;
          timeSpent: number;
        }> = [];
        for (const studentEnrollment of studentEnrollments) {
          const course = studentEnrollment.course;

          // Get lessons for this course
          const lessonCount = await this.lessonRepository
            .createQueryBuilder('lesson')
            .innerJoin('lesson.section', 'section')
            .where('section.courseId = :courseId', { courseId: course.id })
            .getCount();

          // Get completed lessons
          const completedLessons = await this.lessonProgressRepository
            .createQueryBuilder('lp')
            .innerJoin('lp.lesson', 'lesson')
            .innerJoin('lesson.section', 'section')
            .where('lp.studentId = :studentId', { studentId: student.id })
            .andWhere('section.courseId = :courseId', { courseId: course.id })
            .andWhere('lp.isCompleted = :isCompleted', { isCompleted: true })
            .getCount();

          // Get course-specific assessment attempts
          const courseAssessmentAttempts = assessmentAttempts.filter(
            attempt => attempt.assessment?.course?.id === course.id,
          );

          const courseAverageScore =
            courseAssessmentAttempts.length > 0
              ? Math.round(
                  courseAssessmentAttempts.reduce((sum, attempt) => sum + attempt.score!, 0) /
                    courseAssessmentAttempts.length,
                )
              : 0;

          // Calculate time spent in this course
          const courseTimeSpent = await this.lessonProgressRepository
            .createQueryBuilder('lp')
            .innerJoin('lp.lesson', 'lesson')
            .innerJoin('lesson.section', 'section')
            .where('lp.studentId = :studentId', { studentId: student.id })
            .andWhere('section.courseId = :courseId', { courseId: course.id })
            .getMany()
            .then(progresses => progresses.reduce((total, p) => total + (p.timeSpent || 0), 0));

          courseProgress.push({
            courseId: course.id,
            courseName: course.title,
            progressPercentage: studentEnrollment.progressPercentage,
            grade: courseAverageScore,
            lessonsCompleted: completedLessons,
            totalLessons: lessonCount,
            timeSpent: courseTimeSpent,
          });
        }

        // Check if this student already exists in the array (to avoid duplicates)
        const existingIndex = studentAnalytics.findIndex(s => s.studentId === student.id);
        if (existingIndex === -1) {
          studentAnalytics.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            overallProgress,
            coursesEnrolled,
            coursesCompleted,
            averageScore,
            timeSpent,
            lastActive: lastActivity?.updatedAt || new Date(),
            riskLevel,
            courseProgress,
          });
        }
      }

      return studentAnalytics;
    } catch (error) {
      this.logger.error(`Error getting student progress analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getGradingAnalytics(
    teacherId: string,
    period?: string,
    courseIds?: string,
  ): Promise<GradingAnalytics> {
    this.logger.log(`Getting grading analytics for teacher: ${teacherId}`);

    try {
      // Build course filter
      const courseIdArray = courseIds ? courseIds.split(',') : [];

      // Get teacher's courses
      const courseQuery = this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId });

      if (courseIdArray.length > 0) {
        courseQuery.andWhere('course.id IN (:...courseIds)', { courseIds: courseIdArray });
      }

      const courses = await courseQuery.getMany();
      const teacherCourseIds = courses.map(c => c.id);

      if (teacherCourseIds.length === 0) {
        return {
          totalSubmissions: 0,
          pendingGrading: 0,
          averageGradingTime: 0,
          gradingDistribution: [],
          courseGrading: [],
        };
      }

      // Get all assessment attempts for teacher's courses
      const assessmentAttemptsQuery = this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.assessment', 'assessment')
        .innerJoin('assessment.course', 'course')
        .where('course.teacherId = :teacherId', { teacherId });

      if (period) {
        const startDate = this.getStartDateForPeriod(period);
        assessmentAttemptsQuery.andWhere('attempt.submittedAt >= :startDate', { startDate });
      }

      if (courseIdArray.length > 0) {
        assessmentAttemptsQuery.andWhere('course.id IN (:...courseIds)', {
          courseIds: courseIdArray,
        });
      }

      const allAttempts = await assessmentAttemptsQuery.getMany();

      const totalSubmissions = allAttempts.length;
      const pendingGrading = allAttempts.filter(
        attempt =>
          attempt.gradingStatus === GradingStatus.PENDING ||
          attempt.gradingStatus === GradingStatus.IN_PROGRESS,
      ).length;

      // Calculate average grading time for graded attempts
      const gradedAttempts = allAttempts.filter(
        attempt =>
          attempt.gradingStatus === GradingStatus.GRADED && attempt.gradedAt && attempt.submittedAt,
      );

      const averageGradingTime =
        gradedAttempts.length > 0
          ? gradedAttempts.reduce((sum, attempt) => {
              const gradingTime =
                (new Date(attempt.gradedAt!).getTime() - new Date(attempt.submittedAt!).getTime()) /
                (1000 * 60); // minutes
              return sum + gradingTime;
            }, 0) / gradedAttempts.length
          : 0;

      // Calculate grade distribution
      const scoredAttempts = allAttempts.filter(
        attempt => attempt.score !== null && attempt.score !== undefined,
      );
      const gradingDistribution: any = [];

      if (scoredAttempts.length > 0) {
        const aCount = scoredAttempts.filter(a => a.score! >= 90).length;
        const bCount = scoredAttempts.filter(a => a.score! >= 80 && a.score! < 90).length;
        const cCount = scoredAttempts.filter(a => a.score! >= 70 && a.score! < 80).length;
        const dCount = scoredAttempts.filter(a => a.score! >= 60 && a.score! < 70).length;
        const fCount = scoredAttempts.filter(a => a.score! < 60).length;
        const total = scoredAttempts.length;

        gradingDistribution.push(
          {
            gradeRange: '90-100 (A)',
            count: aCount,
            percentage: Math.round((aCount / total) * 100),
          },
          {
            gradeRange: '80-89 (B)',
            count: bCount,
            percentage: Math.round((bCount / total) * 100),
          },
          {
            gradeRange: '70-79 (C)',
            count: cCount,
            percentage: Math.round((cCount / total) * 100),
          },
          {
            gradeRange: '60-69 (D)',
            count: dCount,
            percentage: Math.round((dCount / total) * 100),
          },
          { gradeRange: '0-59 (F)', count: fCount, percentage: Math.round((fCount / total) * 100) },
        );
      }

      // Calculate course-specific grading data
      const courseGrading: any = [];
      for (const course of courses) {
        const courseAttempts = allAttempts.filter(
          attempt => attempt.assessment?.course?.id === course.id,
        );
        const coursePendingSubmissions = courseAttempts.filter(
          attempt => attempt.gradingStatus === 'pending' || attempt.gradingStatus === 'in_progress',
        ).length;

        const courseScoredAttempts = courseAttempts.filter(attempt => attempt.score !== null);
        const courseAverageScore =
          courseScoredAttempts.length > 0
            ? Math.round(
                courseScoredAttempts.reduce((sum, attempt) => sum + attempt.score!, 0) /
                  courseScoredAttempts.length,
              )
            : 0;

        // Calculate grading turnaround time for this course
        const courseGradedAttempts = courseAttempts.filter(
          attempt => attempt.gradingStatus === 'graded' && attempt.gradedAt && attempt.submittedAt,
        );

        const gradingTurnover =
          courseGradedAttempts.length > 0
            ? courseGradedAttempts.reduce((sum, attempt) => {
                const turnoverHours =
                  (new Date(attempt.gradedAt!).getTime() -
                    new Date(attempt.submittedAt!).getTime()) /
                  (1000 * 60 * 60);
                return sum + turnoverHours;
              }, 0) / courseGradedAttempts.length
            : 0;

        courseGrading.push({
          courseId: course.id,
          courseName: course.title,
          totalSubmissions: courseAttempts.length,
          pendingSubmissions: coursePendingSubmissions,
          averageScore: courseAverageScore,
          gradingTurnover: Math.round(gradingTurnover * 100) / 100, // Round to 2 decimal places
        });
      }

      return {
        totalSubmissions,
        pendingGrading,
        averageGradingTime: Math.round(averageGradingTime * 100) / 100, // Round to 2 decimal places
        gradingDistribution,
        courseGrading,
      };
    } catch (error) {
      this.logger.error(`Error getting grading analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getEngagementMetrics(teacherId: string, period?: string): Promise<EngagementMetrics> {
    this.logger.log(`Getting engagement metrics for teacher: ${teacherId}`);

    try {
      // Calculate period date range
      const startDate = this.getStartDateForPeriod(period || 'month');

      // Get teacher's courses
      const courses = await this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId })
        .getMany();

      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return {
          totalEngagementScore: 0,
          courseEngagement: [],
          studentEngagement: [],
          peakHours: [],
          engagementTrends: [],
        };
      }

      // Get learning activities for teacher's courses
      const activities = await this.learningActivityRepository
        .createQueryBuilder('activity')
        .where('activity.courseId IN (:...courseIds)', { courseIds })
        .andWhere('activity.timestamp >= :startDate', { startDate })
        .orderBy('activity.timestamp', 'DESC')
        .getMany();

      // Get learning sessions for students in teacher's courses
      const enrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .getMany();

      const studentIds = [...new Set(enrollments.map(e => e.studentId))];

      const sessions = await this.learningSessionRepository
        .createQueryBuilder('session')
        .where('session.studentId IN (:...studentIds)', { studentIds })
        .andWhere('session.startTime >= :startDate', { startDate })
        .getMany();

      // Calculate course engagement
      const courseEngagement: any = [];
      for (const course of courses) {
        const courseActivities = activities.filter(a => a.courseId === course.id);
        const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
        const courseStudentIds = courseEnrollments.map(e => e.studentId);
        const courseSessions = sessions.filter(s => courseStudentIds.includes(s.studentId));

        const totalActivities = courseActivities.length;
        const studentsEngaged = new Set(courseActivities.map(a => a.studentId)).size;
        const avgSessionDuration =
          courseSessions.length > 0
            ? courseSessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
              courseSessions.length /
              60 // minutes
            : 0;

        // Calculate engagement score based on activities, unique students, and session duration
        const activityScore = Math.min(
          (totalActivities / (courseEnrollments.length || 1)) * 10,
          40,
        );
        const participationScore = Math.min(
          (studentsEngaged / (courseEnrollments.length || 1)) * 100,
          40,
        );
        const durationScore = Math.min(avgSessionDuration / 2, 20); // up to 20 points for session duration

        const engagementScore = Math.round(activityScore + participationScore + durationScore);

        // Calculate trend (compare with previous period)
        const periodDays = this.getPeriodDays(period || 'month');
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - periodDays);
        const previousActivities = await this.learningActivityRepository
          .createQueryBuilder('activity')
          .where('activity.courseId = :courseId', { courseId: course.id })
          .andWhere('activity.timestamp >= :previousStartDate', { previousStartDate })
          .andWhere('activity.timestamp < :startDate', { startDate })
          .getCount();

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (totalActivities > previousActivities * 1.1) trend = 'up';
        else if (totalActivities < previousActivities * 0.9) trend = 'down';

        courseEngagement.push({
          courseId: course.id,
          courseName: course.title,
          engagementScore,
          trend,
          studentsEngaged,
          totalActivities,
          avgSessionDuration: Math.round(avgSessionDuration),
        });
      }

      // Calculate student engagement
      const studentEngagement: any = [];
      for (const studentId of studentIds) {
        const studentActivities = activities.filter(a => a.studentId === studentId);
        const studentSessions = sessions.filter(s => s.studentId === studentId);

        const student = await this.userRepository.findOne({ where: { id: studentId } });
        if (!student) continue;

        const totalActivities = studentActivities.length;
        const avgSessionDuration =
          studentSessions.length > 0
            ? studentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
              studentSessions.length /
              60
            : 0;

        // Calculate engagement score for student
        const activityScore = Math.min(totalActivities * 2, 50);
        const durationScore = Math.min(avgSessionDuration / 2, 30);
        const consistencyScore =
          studentSessions.length > 0 ? Math.min(studentSessions.length * 2, 20) : 0;

        const engagementScore = Math.round(activityScore + durationScore + consistencyScore);

        // Determine risk level
        let risk: 'low' | 'medium' | 'high' = 'low';
        if (engagementScore < 30 || totalActivities < 5) risk = 'high';
        else if (engagementScore < 60 || totalActivities < 15) risk = 'medium';

        const lastActivity =
          studentActivities.length > 0
            ? new Date(Math.max(...studentActivities.map(a => new Date(a.timestamp).getTime())))
            : new Date();

        studentEngagement.push({
          studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          engagementScore,
          risk,
          totalActivities,
          avgSessionDuration: Math.round(avgSessionDuration),
          lastActivity,
        });
      }

      // Calculate peak hours
      const hourlyActivity = new Array(24).fill(0);
      activities.forEach(activity => {
        const hour = new Date(activity.timestamp).getHours();
        hourlyActivity[hour]++;
      });

      const peakHours = hourlyActivity
        .map((count, hour) => ({ hour, activityCount: count }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 4);

      // Calculate engagement trends over the period
      const engagementTrends: any = [];
      const periodDays = this.getPeriodDays(period || 'month');
      const daysInPeriod = Math.min(periodDays, 30); // Limit to 30 days for trends
      for (let i = 0; i < daysInPeriod; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayActivities = activities.filter(a => {
          const activityDate = new Date(a.timestamp);
          return activityDate >= dayStart && activityDate < dayEnd;
        });

        const averageEngagement =
          dayActivities.length > 0
            ? Math.round((dayActivities.length / Math.max(studentIds.length, 1)) * 100)
            : 0;

        engagementTrends.push({
          date: dateStr,
          averageEngagement,
        });
      }

      // Calculate total engagement score
      const totalEngagementScore =
        courseEngagement.length > 0
          ? Math.round(
              courseEngagement.reduce((sum, c) => sum + c.engagementScore, 0) /
                courseEngagement.length,
            )
          : 0;

      return {
        totalEngagementScore,
        courseEngagement,
        studentEngagement: studentEngagement.slice(0, 20), // Limit to top 20 students
        peakHours,
        engagementTrends,
      };
    } catch (error) {
      this.logger.error(`Error getting engagement metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getContentEffectiveness(
    teacherId: string,
    courseId?: string,
    contentType?: string,
  ): Promise<ContentEffectiveness> {
    this.logger.log(`Getting content effectiveness for teacher: ${teacherId}`);

    try {
      // Get teacher's courses
      const courseQuery = this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId });

      if (courseId) {
        courseQuery.andWhere('course.id = :courseId', { courseId });
      }

      const courses = await courseQuery.getMany();
      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return {
          topPerformingContent: [],
          underperformingContent: [],
          contentAnalytics: [],
          improvementRecommendations: [],
        };
      }

      // Get all lessons for the courses
      const lessonsQuery = this.lessonRepository
        .createQueryBuilder('lesson')
        .innerJoin('lesson.section', 'section')
        .where('section.courseId IN (:...courseIds)', { courseIds })
        .orderBy('section.orderIndex', 'ASC')
        .addOrderBy('lesson.orderIndex', 'ASC');

      if (contentType === 'lesson' || contentType === 'video' || contentType === 'reading') {
        lessonsQuery.andWhere('lesson.type = :contentType', { contentType });
      }

      const lessons = await lessonsQuery.getMany();

      // Get assessments for the courses
      const assessments = await this.assessmentRepository
        .createQueryBuilder('assessment')
        .where('assessment.courseId IN (:...courseIds)', { courseIds })
        .getMany();

      const topPerformingContent: any[] = [];
      const underperformingContent: any[] = [];

      // Analyze lesson effectiveness
      for (const lesson of lessons) {
        // Get lesson progress data
        const lessonProgresses = await this.lessonProgressRepository
          .createQueryBuilder('lp')
          .where('lp.lessonId = :lessonId', { lessonId: lesson.id })
          .getMany();

        const totalStudents = await this.enrollmentRepository
          .createQueryBuilder('enrollment')
          .innerJoin('enrollment.course', 'course')
          .innerJoin('course.sections', 'section')
          .innerJoin('section.lessons', 'lesson')
          .where('lesson.id = :lessonId', { lessonId: lesson.id })
          .getCount();

        if (totalStudents === 0) continue;

        const completedCount = lessonProgresses.filter(lp => lp.isCompleted).length;
        const completionRate = Math.round((completedCount / totalStudents) * 100);

        // Calculate average score (if lesson has quizzes/assessments)
        const lessonAssessments = assessments.filter(a => a.lessonId === lesson.id);
        let averageScore = 0;
        if (lessonAssessments.length > 0) {
          const attempts = await this.assessmentAttemptRepository
            .createQueryBuilder('attempt')
            .where('attempt.assessmentId IN (:...assessmentIds)', {
              assessmentIds: lessonAssessments.map(a => a.id),
            })
            .andWhere('attempt.status = :status', { status: 'submitted' })
            .andWhere('attempt.score IS NOT NULL')
            .getMany();

          if (attempts.length > 0) {
            averageScore = Math.round(
              attempts.reduce((sum, att) => sum + att.score!, 0) / attempts.length,
            );
          }
        }

        // Calculate engagement time
        const avgEngagementTime =
          lessonProgresses.length > 0
            ? Math.round(
                lessonProgresses.reduce((sum, lp) => sum + (lp.timeSpent || 0), 0) /
                  lessonProgresses.length /
                  60,
              ) // minutes
            : 0;

        // Get content quality assessment
        const qualityAssessment = await this.contentQualityRepository
          .createQueryBuilder('cqa')
          .where('cqa.contentId = :contentId', { contentId: lesson.id })
          .andWhere('cqa.contentType = :contentType', { contentType: 'lesson' })
          .andWhere('cqa.isLatest = :isLatest', { isLatest: true })
          .orderBy('cqa.assessedAt', 'DESC')
          .getOne();

        const qualityScore = qualityAssessment?.overallScore || 0;

        // Calculate student satisfaction (approximated from completion + engagement)
        const studentSatisfaction = Math.round(
          completionRate * 0.6 + (avgEngagementTime / 10) * 0.4,
        );

        const contentData = {
          contentId: lesson.id,
          contentTitle: lesson.title,
          contentType: (lesson.lessonType || 'lesson') as
            | 'lesson'
            | 'video'
            | 'reading'
            | 'quiz'
            | 'assignment',
          completionRate,
          averageScore,
          engagementTime: avgEngagementTime,
          studentSatisfaction: Math.min(studentSatisfaction, 100),
          qualityScore,
        };

        // Categorize as top performing or underperforming
        if (completionRate >= 80 && avgEngagementTime >= 5 && qualityScore >= 75) {
          topPerformingContent.push(contentData);
        } else if (completionRate < 50 || qualityScore < 50) {
          const dropoffRate = 100 - completionRate;
          const commonIssues: string[] = [];
          const suggestions: string[] = [];
          const qualityIssues: string[] = [];

          // Analyze issues based on data
          if (completionRate < 30) {
            commonIssues.push('Very low completion rate');
            suggestions.push('Review content difficulty and prerequisites');
          }
          if (avgEngagementTime < 3) {
            commonIssues.push('Low engagement time');
            suggestions.push('Add interactive elements or multimedia');
          }
          if (qualityScore < 40) {
            qualityIssues.push('Poor content quality score');
            suggestions.push('Review and improve content quality');
          }

          underperformingContent.push({
            contentId: lesson.id,
            contentTitle: lesson.title,
            contentType: (lesson.lessonType || 'lesson') as
              | 'lesson'
              | 'video'
              | 'reading'
              | 'quiz'
              | 'assignment',
            dropoffRate,
            commonIssues,
            suggestions,
            qualityIssues,
          });
        }
      }

      // Analyze assessment effectiveness
      for (const assessment of assessments) {
        const attempts = await this.assessmentAttemptRepository
          .createQueryBuilder('attempt')
          .where('attempt.assessmentId = :assessmentId', { assessmentId: assessment.id })
          .getMany();

        const totalEnrollments = await this.enrollmentRepository
          .createQueryBuilder('enrollment')
          .where('enrollment.courseId = :courseId', { courseId: assessment.courseId })
          .getCount();

        if (totalEnrollments === 0) continue;

        const completionRate = Math.round((attempts.length / totalEnrollments) * 100);
        const submittedAttempts = attempts.filter(
          att => att.status === 'submitted' && att.score !== null,
        );
        const averageScore =
          submittedAttempts.length > 0
            ? Math.round(
                submittedAttempts.reduce((sum, att) => sum + att.score!, 0) /
                  submittedAttempts.length,
              )
            : 0;

        const avgTime =
          attempts.length > 0
            ? attempts.reduce((sum, att) => {
                if (att.submittedAt && att.startedAt) {
                  return (
                    sum +
                    (new Date(att.submittedAt).getTime() - new Date(att.startedAt).getTime()) /
                      (1000 * 60)
                  );
                }
                return sum;
              }, 0) / attempts.length
            : 0;

        const contentData = {
          contentId: assessment.id,
          contentTitle: assessment.title,
          contentType: (assessment.assessmentType || 'quiz') as
            | 'lesson'
            | 'video'
            | 'reading'
            | 'quiz'
            | 'assignment',
          completionRate,
          averageScore,
          engagementTime: Math.round(avgTime),
          studentSatisfaction: Math.round((completionRate + averageScore) / 2),
          qualityScore: 0, // Assessments don't have quality scores in this context
        };

        if (completionRate >= 80 && averageScore >= 75) {
          topPerformingContent.push(contentData);
        } else if (completionRate < 50 || averageScore < 60) {
          underperformingContent.push({
            contentId: assessment.id,
            contentTitle: assessment.title,
            contentType: (assessment.assessmentType || 'quiz') as
              | 'lesson'
              | 'video'
              | 'reading'
              | 'quiz'
              | 'assignment',
            dropoffRate: 100 - completionRate,
            commonIssues:
              averageScore < 60
                ? ['Low average scores', 'Possible difficulty issues']
                : ['Low completion rate'],
            suggestions:
              averageScore < 60
                ? ['Review question difficulty', 'Provide more practice materials']
                : ['Review assessment instructions', 'Check technical issues'],
            qualityIssues: [],
          });
        }
      }

      // Content analytics by type
      const contentTypes = ['lesson', 'video', 'reading', 'quiz', 'assignment'];
      const contentAnalytics: any[] = [];

      for (const type of contentTypes) {
        const typeContent = [...topPerformingContent, ...underperformingContent].filter(
          c => c.contentType === type,
        );

        if (typeContent.length === 0) continue;

        const totalItems = typeContent.length;
        const averageEngagement = Math.round(
          typeContent.reduce((sum, c) => sum + c.engagementTime, 0) / totalItems,
        );
        const completionRate = Math.round(
          typeContent.reduce((sum, c) => sum + c.completionRate, 0) / totalItems,
        );
        const averageQualityScore = Math.round(
          typeContent.reduce((sum, c) => sum + (c.qualityScore || 0), 0) / totalItems,
        );

        contentAnalytics.push({
          contentType: type,
          totalItems,
          averageEngagement,
          completionRate,
          averageQualityScore,
        });
      }

      // Generate improvement recommendations
      const improvementRecommendations: any[] = [];

      // Prioritize underperforming content
      const sortedUnderperforming = underperformingContent
        .sort((a, b) => b.dropoffRate - a.dropoffRate)
        .slice(0, 5);

      for (const content of sortedUnderperforming) {
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (content.dropoffRate > 70) priority = 'high';
        else if (content.dropoffRate < 40) priority = 'low';

        const recommendation = content.suggestions[0] || 'Review and improve content';
        const expectedImpact =
          content.dropoffRate > 70
            ? 'High impact - could improve completion by 20-30%'
            : 'Medium impact - could improve completion by 10-20%';

        improvementRecommendations.push({
          contentId: content.contentId,
          recommendation,
          priority,
          expectedImpact,
        });
      }

      return {
        topPerformingContent: topPerformingContent
          .sort((a, b) => b.completionRate + b.averageScore - (a.completionRate + a.averageScore))
          .slice(0, 10),
        underperformingContent: underperformingContent
          .sort((a, b) => b.dropoffRate - a.dropoffRate)
          .slice(0, 10),
        contentAnalytics,
        improvementRecommendations,
      };
    } catch (error) {
      this.logger.error(`Error getting content effectiveness: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAssessmentAnalytics(
    teacherId: string,
    assessmentId?: string,
    courseId?: string,
    period?: string,
  ): Promise<AssessmentAnalytics> {
    try {
      this.logger.log(`Getting assessment analytics for teacher: ${teacherId}`);

      // Get teacher's courses
      let courseQuery = this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId });

      if (courseId) {
        courseQuery.andWhere('course.id = :courseId', { courseId });
      }

      const courses = await courseQuery.getMany();
      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return {
          totalAssessments: 0,
          averageScore: 0,
          passRate: 0,
          timeAnalytics: {
            averageCompletionTime: 0,
            quickestCompletion: 0,
            longestCompletion: 0,
          },
          questionAnalytics: [],
          difficultyAnalysis: [],
        };
      }

      // Get assessments for these courses
      let assessmentQuery = this.assessmentRepository
        .createQueryBuilder('assessment')
        .where('assessment.courseId IN (:...courseIds)', { courseIds });

      if (assessmentId) {
        assessmentQuery.andWhere('assessment.id = :assessmentId', { assessmentId });
      }

      if (period) {
        const startDate = this.getStartDateForPeriod(period);
        assessmentQuery.andWhere('assessment.createdAt >= :startDate', { startDate });
      }

      const assessments = await assessmentQuery.getMany();
      const assessmentIds = assessments.map(a => a.id);

      if (assessmentIds.length === 0) {
        return {
          totalAssessments: 0,
          averageScore: 0,
          passRate: 0,
          timeAnalytics: {
            averageCompletionTime: 0,
            quickestCompletion: 0,
            longestCompletion: 0,
          },
          questionAnalytics: [],
          difficultyAnalysis: [],
        };
      }

      // Get assessment attempts for these assessments
      const attempts = await this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.assessment', 'assessment')
        .where('attempt.assessmentId IN (:...assessmentIds)', { assessmentIds })
        .andWhere('attempt.status = :status', { status: 'completed' })
        .getMany();

      const totalAssessments = assessments.length;
      const totalAttempts = attempts.length;

      if (totalAttempts === 0) {
        return {
          totalAssessments,
          averageScore: 0,
          passRate: 0,
          timeAnalytics: {
            averageCompletionTime: 0,
            quickestCompletion: 0,
            longestCompletion: 0,
          },
          questionAnalytics: [],
          difficultyAnalysis: [],
        };
      }

      // Calculate average score and pass rate
      const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0);
      const averageScore = Math.round(totalScore / totalAttempts);

      // Assume passing score is 60%
      const passingScore = 60;
      const passedAttempts = attempts.filter(a => (a.score || 0) >= passingScore).length;
      const passRate = Math.round((passedAttempts / totalAttempts) * 100);

      // Time analytics
      const completionTimes = attempts
        .map(attempt => {
          if (attempt.startedAt && attempt.submittedAt) {
            return (attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / (1000 * 60); // minutes
          }
          return 0;
        })
        .filter(time => time > 0);

      const averageCompletionTime =
        completionTimes.length > 0
          ? Math.round(
              completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length,
            )
          : 0;

      const quickestCompletion =
        completionTimes.length > 0 ? Math.round(Math.min(...completionTimes)) : 0;
      const longestCompletion =
        completionTimes.length > 0 ? Math.round(Math.max(...completionTimes)) : 0;

      // Question analytics (simplified - using mock data structure)
      const questionAnalytics: any[] = [];
      for (let i = 0; i < Math.min(5, totalAssessments * 2); i++) {
        const correctAnswerRate = Math.round(Math.random() * 40 + 60); // 60-100%
        const averageTimeSpent = Math.round(Math.random() * 180 + 60); // 60-240 seconds

        questionAnalytics.push({
          questionId: `q${i + 1}`,
          questionText: `Assessment Question ${i + 1}`,
          correctAnswerRate,
          averageTimeSpent,
          commonMistakes:
            correctAnswerRate < 70
              ? ['Misunderstanding concept', 'Calculation errors', 'Time pressure']
              : ['Minor calculation errors'],
        });
      }

      // Difficulty analysis (simplified)
      const difficultyLevels: any[] = ['easy', 'medium', 'hard'];
      const difficultyAnalysis: any[] = [];

      for (const difficulty of difficultyLevels) {
        const questionCount = Math.floor(Math.random() * 5 + 2); // 2-6 questions per difficulty
        let difficultyScore = averageScore;

        if (difficulty === 'easy')
          difficultyScore += Math.random() * 15 + 5; // Higher for easy
        else if (difficulty === 'hard') difficultyScore -= Math.random() * 20 + 10; // Lower for hard

        difficultyScore = Math.max(0, Math.min(100, difficultyScore));

        difficultyAnalysis.push({
          difficulty,
          questionCount,
          averageScore: Math.round(difficultyScore),
        });
      }

      return {
        totalAssessments,
        averageScore,
        passRate,
        timeAnalytics: {
          averageCompletionTime,
          quickestCompletion,
          longestCompletion,
        },
        questionAnalytics,
        difficultyAnalysis,
      };
    } catch (error) {
      this.logger.error(`Error getting assessment analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getRealTimeDashboard(teacherId: string): Promise<RealTimeDashboard> {
    try {
      this.logger.log(`Getting real-time dashboard for teacher: ${teacherId}`);

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get teacher's courses
      const courses = await this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId })
        .getMany();

      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return {
          activeStudents: 0,
          ongoingSessions: 0,
          completedActivities: 0,
          recentSubmissions: 0,
          alerts: [],
          liveActivity: [],
        };
      }

      // Get active students (students with recent activity)
      const recentActivities = await this.learningActivityRepository
        .createQueryBuilder('activity')
        .innerJoin('activity.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds })
        .andWhere('activity.timestamp >= :oneHourAgo', { oneHourAgo })
        .getMany();

      const activeStudentIds = [...new Set(recentActivities.map(a => a.studentId))];
      const activeStudents = activeStudentIds.length;

      // Get ongoing sessions
      const ongoingSessions = await this.learningSessionRepository
        .createQueryBuilder('session')
        .innerJoin('session.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds })
        .andWhere('session.endTime IS NULL OR session.endTime > :now', { now })
        .andWhere('session.startTime >= :oneDayAgo', { oneDayAgo })
        .getCount();

      // Get completed activities in last hour
      const completedActivities = await this.learningActivityRepository
        .createQueryBuilder('activity')
        .innerJoin('activity.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds })
        .andWhere('activity.timestamp >= :oneHourAgo', { oneHourAgo })
        .andWhere('activity.activityType = :type', { type: 'completion' })
        .getCount();

      // Get recent submissions (assessment attempts in last hour)
      const recentSubmissions = await this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.assessment', 'assessment')
        .innerJoin('assessment.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds })
        .andWhere('attempt.completedAt >= :oneHourAgo', { oneHourAgo })
        .getCount();

      // Generate alerts
      const alerts: any[] = [];

      // Check for inactive students (no activity in 3 days)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const enrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoinAndSelect('enrollment.student', 'student')
        .innerJoinAndSelect('enrollment.course', 'course')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .andWhere('enrollment.status = :status', { status: 'active' })
        .getMany();

      for (const enrollment of enrollments.slice(0, 5)) {
        // Limit to 5 alerts
        const studentActivities = await this.learningActivityRepository
          .createQueryBuilder('activity')
          .where('activity.studentId = :studentId', { studentId: enrollment.student.id })
          .andWhere('activity.courseId = :courseId', { courseId: enrollment.course.id })
          .andWhere('activity.timestamp >= :threeDaysAgo', { threeDaysAgo })
          .getCount();

        if (studentActivities === 0) {
          alerts.push({
            type: 'warning' as const,
            message: `Student ${enrollment.student.firstName} ${enrollment.student.lastName} has been inactive for 3+ days`,
            studentId: enrollment.student.id,
            courseId: enrollment.course.id,
            timestamp: now.toISOString(),
          });
        }
      }

      // Check for recent submissions
      const recentAttempts = await this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoinAndSelect('attempt.student', 'student')
        .innerJoinAndSelect('attempt.assessment', 'assessment')
        .innerJoin('assessment.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds })
        .andWhere('attempt.completedAt >= :oneHourAgo', { oneHourAgo })
        .orderBy('attempt.completedAt', 'DESC')
        .limit(3)
        .getMany();

      for (const attempt of recentAttempts) {
        alerts.push({
          type: 'info' as const,
          message: `New submission from ${attempt.student.firstName} ${attempt.student.lastName} on ${attempt.assessment.title}`,
          studentId: attempt.student.id,
          courseId: attempt.assessment.courseId,
          timestamp: attempt.submittedAt?.toISOString() || '',
        });
      }

      // Generate live activity data (activity count for last 12 intervals of 5 minutes each)
      const liveActivity: any[] = [];
      for (let i = 11; i >= 0; i--) {
        const intervalStart = new Date(now.getTime() - (i + 1) * 5 * 60 * 1000);
        const intervalEnd = new Date(now.getTime() - i * 5 * 60 * 1000);

        const activityCount = await this.learningActivityRepository
          .createQueryBuilder('activity')
          .innerJoin('activity.course', 'course')
          .where('course.id IN (:...courseIds)', { courseIds })
          .andWhere('activity.timestamp >= :start', { start: intervalStart })
          .andWhere('activity.timestamp < :end', { end: intervalEnd })
          .getCount();

        liveActivity.push({
          timestamp: intervalEnd.toISOString(),
          activityCount,
        });
      }

      return {
        activeStudents,
        ongoingSessions,
        completedActivities,
        recentSubmissions,
        alerts: alerts.slice(0, 10), // Limit to 10 alerts
        liveActivity,
      };
    } catch (error) {
      this.logger.error(`Error getting real-time dashboard: ${error.message}`, error.stack);
      throw error;
    }
  }
}

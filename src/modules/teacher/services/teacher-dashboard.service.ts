import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { User } from '@/modules/user/entities/user.entity';
import { TeacherProfile } from '@/modules/user/entities/teacher-profile.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { Enrollment } from '@/modules/course/entities/enrollment.entity';
import { Assessment } from '@/modules/assessment/entities/assessment.entity';
import { AssessmentAttempt } from '@/modules/assessment/entities/assessment-attempt.entity';
import { LearningActivity } from '@/modules/analytics/entities/learning-activity.entity';
import { LearningSession } from '@/modules/analytics/entities/learning-session.entity';
import {
  TeacherDashboardStats,
  ClassOverview,
  TeacherActivityFeedItem,
  TeacherQuickAction,
  TeachingInsight,
  AtRiskStudent,
  GradingQueue,
  StudentOverview,
} from '../dto/teacher-dashboard.dto';

@Injectable()
export class TeacherDashboardService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepository: Repository<TeacherProfile>,
    @InjectRepository(Course) private readonly courseRepository: Repository<Course>,
    @InjectRepository(Enrollment) private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Assessment) private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(AssessmentAttempt)
    private readonly assessmentAttemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(LearningActivity)
    private readonly learningActivityRepository: Repository<LearningActivity>,
    @InjectRepository(LearningSession)
    private readonly learningSessionRepository: Repository<LearningSession>,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherDashboardService.name);
  }

  async getDashboardStats(teacherId: string): Promise<TeacherDashboardStats> {
    this.logger.log(`Getting dashboard stats for teacher: ${teacherId}`);

    try {
      // Get teacher's courses
      const teacherCourses = await this.courseRepository.find({
        where: { teacherId },
        relations: ['enrollments'],
      });

      const courseIds = teacherCourses.map(course => course.id);

      // Calculate total students from all teacher's courses
      const totalStudents = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .where('enrollment.courseId IN (:...courseIds)', {
          courseIds: courseIds.length > 0 ? courseIds : [''],
        })
        .andWhere('enrollment.status IN (:...statuses)', {
          statuses: ['enrolled', 'in_progress', 'completed'],
        })
        .getCount();

      // Count active courses (published status)
      const activeCourses = teacherCourses.filter(course => course.status === 'published').length;

      const totalCourses = teacherCourses.length;

      // Count completed assignments (assessment attempts that are completed)
      const completedAssignments = await this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.assessment', 'assessment')
        .where('assessment.teacherId = :teacherId', { teacherId })
        .andWhere('attempt.status = :status', { status: 'completed' })
        .getCount();

      // Count pending grading (submitted but not graded)
      const pendingGrading = await this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.assessment', 'assessment')
        .where('assessment.teacherId = :teacherId', { teacherId })
        .andWhere('attempt.status = :status', { status: 'submitted' })
        .andWhere('attempt.score IS NULL')
        .getCount();

      // Calculate average class performance from all enrollments
      let averageClassPerformance = 0;
      if (courseIds.length > 0) {
        const performanceResult = await this.enrollmentRepository
          .createQueryBuilder('enrollment')
          .select('AVG(enrollment.progressPercentage)', 'average')
          .where('enrollment.courseId IN (:...courseIds)', { courseIds })
          .getRawOne();

        averageClassPerformance = parseFloat(performanceResult?.average || 0);
      }

      // Count this month's enrollments
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonthEnrollments =
        courseIds.length > 0
          ? await this.enrollmentRepository
              .createQueryBuilder('enrollment')
              .where('enrollment.courseId IN (:...courseIds)', { courseIds })
              .andWhere('enrollment.enrollmentDate >= :startOfMonth', { startOfMonth })
              .getCount()
          : 0;

      const stats: TeacherDashboardStats = {
        totalStudents,
        activeCourses,
        totalCourses,
        completedAssignments,
        pendingGrading,
        averageClassPerformance: Math.round(averageClassPerformance * 100) / 100,
        thisMonthEnrollments,
        recentActivityCount: totalStudents + completedAssignments,
      };

      return stats;
    } catch (error) {
      this.logger.error(`Error getting dashboard stats: ${error.message}`);
      // Fallback to basic stats if error occurs
      return {
        totalStudents: 0,
        activeCourses: 0,
        totalCourses: 0,
        completedAssignments: 0,
        pendingGrading: 0,
        averageClassPerformance: 0,
        thisMonthEnrollments: 0,
        recentActivityCount: 0,
      };
    }
  }

  async getClassOverview(teacherId: string): Promise<ClassOverview[]> {
    this.logger.log(`Getting class overview for teacher: ${teacherId}`);

    try {
      // Get teacher's courses with enrollments
      const teacherCourses = await this.courseRepository.find({
        where: { teacherId },
        relations: ['enrollments', 'enrollments.student'],
      });

      const classOverviews: ClassOverview[] = [];

      for (const course of teacherCourses) {
        const enrollments = course.enrollments || [];
        const totalStudents = enrollments.length;

        // Count active students (enrolled or in progress)
        const activeStudents = enrollments.filter(
          e => e.status === 'enrolled' || e.status === 'in_progress',
        ).length;

        // Calculate average progress
        const averageProgress =
          totalStudents > 0
            ? enrollments.reduce((sum, e) => sum + Number(e.progressPercentage), 0) / totalStudents
            : 0;

        // Calculate completion rate
        const completedStudents = enrollments.filter(e => e.status === 'completed').length;
        const completionRate = totalStudents > 0 ? (completedStudents / totalStudents) * 100 : 0;

        // Get assessment scores for this course
        const assessmentAttempts = await this.assessmentAttemptRepository
          .createQueryBuilder('attempt')
          .innerJoin('attempt.assessment', 'assessment')
          .where('assessment.courseId = :courseId', { courseId: course.id })
          .andWhere('attempt.score IS NOT NULL')
          .getMany();

        const averageScore =
          assessmentAttempts.length > 0
            ? assessmentAttempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) /
              assessmentAttempts.length
            : 0;

        // Get recent activity (last enrollment or progress update)
        const recentEnrollments = enrollments.sort(
          (a, b) =>
            new Date(b.lastAccessedAt || b.enrollmentDate).getTime() -
            new Date(a.lastAccessedAt || a.enrollmentDate).getTime(),
        );

        const lastActivity =
          recentEnrollments.length > 0
            ? recentEnrollments[0].lastAccessedAt || recentEnrollments[0].enrollmentDate
            : course.updatedAt;

        // Count struggling students (low progress)
        const strugglingStudents = enrollments.filter(
          e => Number(e.progressPercentage) < 30 && e.status !== 'completed',
        ).length;

        // Count excelling students (high progress)
        const excellingStudents = enrollments.filter(
          e => Number(e.progressPercentage) >= 80,
        ).length;

        // Count upcoming deadlines (assessments that are available soon)
        const upcomingDeadlines = await this.assessmentRepository
          .createQueryBuilder('assessment')
          .where('assessment.courseId = :courseId', { courseId: course.id })
          .andWhere('assessment.availableUntil > NOW()')
          .andWhere('assessment.availableUntil <= DATE_ADD(NOW(), INTERVAL 7 DAY)')
          .getCount();

        // Count recent submissions (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const recentSubmissions = await this.assessmentAttemptRepository
          .createQueryBuilder('attempt')
          .innerJoin('attempt.assessment', 'assessment')
          .where('assessment.courseId = :courseId', { courseId: course.id })
          .andWhere('attempt.submittedAt >= :weekAgo', { weekAgo })
          .getCount();

        classOverviews.push({
          courseId: course.id,
          courseName: course.title,
          totalStudents,
          activeStudents,
          averageProgress: Math.round(averageProgress * 100) / 100,
          averageScore: Math.round(averageScore * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100,
          lastActivity: lastActivity.toISOString(),
          upcomingDeadlines,
          recentSubmissions,
          strugglingStudents,
          excellingStudents,
          status: course.status === 'published' ? 'active' : 'inactive',
        });
      }

      return classOverviews;
    } catch (error) {
      this.logger.error(`Error getting class overview: ${error.message}`);
      return [];
    }
  }

  async getActivityFeed(
    teacherId: string,
    limit: number,
    offset: number,
    priority?: string,
  ): Promise<TeacherActivityFeedItem[]> {
    this.logger.log(`Getting activity feed for teacher: ${teacherId}`);

    try {
      const activities: TeacherActivityFeedItem[] = [];

      // Get recent submissions
      const recentSubmissions = await this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoinAndSelect('attempt.assessment', 'assessment')
        .innerJoinAndSelect('attempt.student', 'student')
        .innerJoinAndSelect('assessment.course', 'course')
        .where('assessment.teacherId = :teacherId', { teacherId })
        .andWhere('attempt.submittedAt IS NOT NULL')
        .orderBy('attempt.submittedAt', 'DESC')
        .limit(10)
        .getMany();

      // Add submission activities
      for (const submission of recentSubmissions) {
        activities.push({
          id: `submission-${submission.id}`,
          type: 'assignment_submitted',
          title: 'New Assignment Submission',
          description: `${submission.student.firstName || 'Student'} ${submission.student.lastName || ''} submitted ${submission.assessment.title}`,
          timestamp: submission.submittedAt?.toISOString() || submission.updatedAt.toISOString(),
          studentName:
            `${submission.student.firstName || 'Student'} ${submission.student.lastName || ''}`.trim(),
          studentId: submission.studentId,
          courseId: submission.assessment.courseId || '',
          courseName: submission.assessment.course?.title || 'Unknown Course',
          priority: submission.assessment.isMandatory ? 'high' : 'medium',
          actionRequired: !submission.score, // Needs grading
        });
      }

      // Get recent enrollments
      const recentEnrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoinAndSelect('enrollment.student', 'student')
        .innerJoinAndSelect('enrollment.course', 'course')
        .where('course.teacherId = :teacherId', { teacherId })
        .orderBy('enrollment.enrollmentDate', 'DESC')
        .limit(10)
        .getMany();

      // Add enrollment activities
      for (const enrollment of recentEnrollments) {
        activities.push({
          id: `enrollment-${enrollment.id}`,
          type: 'student_enrolled',
          title: 'New Student Enrollment',
          description: `${enrollment.student.firstName || 'Student'} ${enrollment.student.lastName || ''} enrolled in ${enrollment.course.title}`,
          timestamp: enrollment.enrollmentDate.toISOString(),
          studentName:
            `${enrollment.student.firstName || 'Student'} ${enrollment.student.lastName || ''}`.trim(),
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          courseName: enrollment.course.title,
          priority: 'low',
          actionRequired: false,
        });
      }

      // Sort all activities by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply priority filter if specified
      const filteredActivities = priority
        ? activities.filter(activity => activity.priority === priority)
        : activities;

      return filteredActivities.slice(offset, offset + limit);
    } catch (error) {
      this.logger.error(`Error getting activity feed: ${error.message}`);
      return [];
    }
  }

  async getQuickActions(teacherId: string): Promise<TeacherQuickAction[]> {
    this.logger.log(`Getting quick actions for teacher: ${teacherId}`);

    try {
      const actions: TeacherQuickAction[] = [];

      // Count pending grading
      const pendingGrading = await this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoin('attempt.assessment', 'assessment')
        .where('assessment.teacherId = :teacherId', { teacherId })
        .andWhere('attempt.status = :status', { status: 'submitted' })
        .andWhere('attempt.score IS NULL')
        .getCount();

      if (pendingGrading > 0) {
        actions.push({
          id: 'action-grade-assignments',
          type: 'grade_assignments',
          title: 'Grade Pending Assignments',
          description: `You have ${pendingGrading} assignments waiting for your review`,
          actionText: 'Start Grading',
          href: '/teacher/grading',
          priority: pendingGrading > 10 ? 'high' : 'medium',
          count: pendingGrading,
          estimatedTime: pendingGrading * 7, // 7 minutes per assignment
          urgent: pendingGrading > 15,
        });
      }

      // Count at-risk students
      const atRiskStudents = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoin('enrollment.course', 'course')
        .where('course.teacherId = :teacherId', { teacherId })
        .andWhere('enrollment.progressPercentage < :threshold', { threshold: 30 })
        .andWhere('enrollment.status != :completedStatus', { completedStatus: 'completed' })
        .getCount();

      if (atRiskStudents > 0) {
        actions.push({
          id: 'action-contact-struggling',
          type: 'contact_struggling_students',
          title: 'Reach Out to At-Risk Students',
          description: `${atRiskStudents} students showing signs of struggling`,
          actionText: 'View Students',
          href: '/teacher/students?filter=at-risk',
          priority: atRiskStudents > 5 ? 'high' : 'medium',
          count: atRiskStudents,
          estimatedTime: atRiskStudents * 10, // 10 minutes per student
          urgent: atRiskStudents > 8,
        });
      }

      // Check for upcoming deadlines
      const upcomingDeadlines = await this.assessmentRepository
        .createQueryBuilder('assessment')
        .where('assessment.teacherId = :teacherId', { teacherId })
        .andWhere('assessment.availableUntil > NOW()')
        .andWhere('assessment.availableUntil <= DATE_ADD(NOW(), INTERVAL 3 DAY)')
        .getCount();

      if (upcomingDeadlines > 0) {
        actions.push({
          id: 'action-review-deadlines',
          type: 'review_deadlines',
          title: 'Review Upcoming Deadlines',
          description: `${upcomingDeadlines} assessments due within 3 days`,
          actionText: 'Review Assessments',
          href: '/teacher/assessments',
          priority: 'medium',
          count: upcomingDeadlines,
          estimatedTime: 15,
          urgent: false,
        });
      }

      // Check for courses with low engagement
      const lowEngagementCourses = await this.courseRepository
        .createQueryBuilder('course')
        .leftJoin('course.enrollments', 'enrollment')
        .where('course.teacherId = :teacherId', { teacherId })
        .andWhere('course.status = :status', { status: 'published' })
        .groupBy('course.id')
        .having('AVG(enrollment.progressPercentage) < :threshold OR COUNT(enrollment.id) = 0', {
          threshold: 25,
        })
        .getCount();

      if (lowEngagementCourses > 0) {
        actions.push({
          id: 'action-boost-engagement',
          type: 'boost_engagement',
          title: 'Boost Course Engagement',
          description: `${lowEngagementCourses} courses need attention to improve engagement`,
          actionText: 'View Analytics',
          href: '/teacher/analytics',
          priority: 'low',
          count: lowEngagementCourses,
          estimatedTime: 20,
          urgent: false,
        });
      }

      // Sort by priority and urgency
      actions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (a.urgent && !b.urgent) return -1;
        if (!a.urgent && b.urgent) return 1;
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      return actions;
    } catch (error) {
      this.logger.error(`Error getting quick actions: ${error.message}`);
      return [];
    }
  }

  async getAIInsights(
    teacherId: string,
    courseId?: string,
    type?: string,
    limit?: number,
  ): Promise<TeachingInsight[]> {
    this.logger.log(`Getting AI insights for teacher: ${teacherId}`);

    // Mock data for now
    const insights: TeachingInsight[] = [
      {
        id: 'insight-1',
        type: 'class_performance',
        title: 'Class Performance Analysis',
        description: 'Students are struggling with neural network concepts',
        insights: [
          'Average quiz scores dropped 15% in Week 4',
          'Video engagement decreased during deep learning module',
          'Forum questions increased 200% on backpropagation topics',
        ],
        recommendations: [
          {
            action: 'Create supplementary video on backpropagation',
            priority: 'high',
            expectedImpact: 'Improve understanding by 25%',
            implementation: 'Record 15-minute explanation video with visual diagrams',
          },
        ],
        confidence: 0.85,
        dataSource: ['assessment_scores', 'video_analytics', 'forum_activity'],
        generatedAt: new Date().toISOString(),
        courseId: courseId || 'course-1',
      },
    ];

    return insights.slice(0, limit);
  }

  async getAtRiskStudents(
    teacherId: string,
    courseId?: string,
    riskLevel?: string,
    limit: number = 10,
  ): Promise<AtRiskStudent[]> {
    this.logger.log(`Getting at-risk students for teacher: ${teacherId}`);

    try {
      // Get teacher's courses
      let courseQuery = this.courseRepository
        .createQueryBuilder('course')
        .where('course.teacherId = :teacherId', { teacherId });

      if (courseId) {
        courseQuery = courseQuery.andWhere('course.id = :courseId', { courseId });
      }

      const courses = await courseQuery.getMany();
      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return [];
      }

      // Get enrollments for these courses
      const enrollments = await this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoinAndSelect('enrollment.student', 'student')
        .innerJoinAndSelect('enrollment.course', 'course')
        .where('enrollment.courseId IN (:...courseIds)', { courseIds })
        .andWhere('enrollment.status IN (:...statuses)', { statuses: ['enrolled', 'in_progress'] })
        .getMany();

      const atRiskStudents: AtRiskStudent[] = [];

      for (const enrollment of enrollments) {
        const student = enrollment.student;
        const course = enrollment.course;

        // Calculate risk factors
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Check recent activity
        const recentActivities = await this.learningActivityRepository
          .createQueryBuilder('activity')
          .where('activity.studentId = :studentId', { studentId: student.id })
          .andWhere('activity.courseId = :courseId', { courseId: course.id })
          .andWhere('activity.timestamp >= :oneWeekAgo', { oneWeekAgo })
          .getCount();

        // Check assessment performance
        const recentAssessments = await this.assessmentAttemptRepository
          .createQueryBuilder('attempt')
          .innerJoin('attempt.assessment', 'assessment')
          .where('assessment.courseId = :courseId', { courseId: course.id })
          .andWhere('attempt.studentId = :studentId', { studentId: student.id })
          .andWhere('attempt.completedAt >= :twoWeeksAgo', { twoWeeksAgo })
          .orderBy('attempt.completedAt', 'DESC')
          .limit(5)
          .getMany();

        // Calculate risk score and factors
        let riskScore = 0;
        const riskFactors: any = [];

        // Factor 1: Low recent activity
        if (recentActivities === 0) {
          riskScore += 30;
          riskFactors.push({
            factor: 'No Recent Activity',
            severity: 'high' as const,
            description: 'No learning activity in the past week',
          });
        } else if (recentActivities < 3) {
          riskScore += 15;
          riskFactors.push({
            factor: 'Low Activity',
            severity: 'medium' as const,
            description: 'Limited learning activity in the past week',
          });
        }

        // Factor 2: Low progress
        if (enrollment.progressPercentage < 20) {
          riskScore += 25;
          riskFactors.push({
            factor: 'Very Low Progress',
            severity: 'high' as const,
            description: `Only ${enrollment.progressPercentage}% course completion`,
          });
        } else if (enrollment.progressPercentage < 50) {
          riskScore += 15;
          riskFactors.push({
            factor: 'Below Average Progress',
            severity: 'medium' as const,
            description: `${enrollment.progressPercentage}% course completion is below expected`,
          });
        }

        // Factor 3: Poor assessment performance
        if (recentAssessments.length > 0) {
          const avgScore =
            recentAssessments.reduce((sum, a) => sum + (a.score || 0), 0) /
            recentAssessments.length;
          const failedAssessments = recentAssessments.filter(a => (a.score || 0) < 60).length;

          if (avgScore < 50) {
            riskScore += 25;
            riskFactors.push({
              factor: 'Poor Assessment Performance',
              severity: 'high' as const,
              description: `Average assessment score: ${Math.round(avgScore)}%`,
            });
          } else if (avgScore < 70) {
            riskScore += 15;
            riskFactors.push({
              factor: 'Below Average Assessment Performance',
              severity: 'medium' as const,
              description: `Average assessment score: ${Math.round(avgScore)}%`,
            });
          }

          if (failedAssessments >= 2) {
            riskScore += 20;
            riskFactors.push({
              factor: 'Multiple Failed Assessments',
              severity: 'high' as const,
              description: `Failed ${failedAssessments} recent assessments`,
            });
          }
        }

        // Factor 4: Time since last activity
        const lastActivity = await this.learningActivityRepository
          .createQueryBuilder('activity')
          .where('activity.studentId = :studentId', { studentId: student.id })
          .andWhere('activity.courseId = :courseId', { courseId: course.id })
          .orderBy('activity.timestamp', 'DESC')
          .getOne();

        const daysSinceLastActivity = lastActivity
          ? Math.floor(
              (now.getTime() - new Date(lastActivity.timestamp).getTime()) / (24 * 60 * 60 * 1000),
            )
          : 30;

        if (daysSinceLastActivity > 14) {
          riskScore += 30;
          riskFactors.push({
            factor: 'Extended Inactivity',
            severity: 'high' as const,
            description: `No activity for ${daysSinceLastActivity} days`,
          });
        } else if (daysSinceLastActivity > 7) {
          riskScore += 15;
          riskFactors.push({
            factor: 'Recent Inactivity',
            severity: 'medium' as const,
            description: `No activity for ${daysSinceLastActivity} days`,
          });
        }

        // Determine risk level
        let studentRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (riskScore >= 70) studentRiskLevel = 'critical';
        else if (riskScore >= 50) studentRiskLevel = 'high';
        else if (riskScore >= 30) studentRiskLevel = 'medium';

        // Filter by risk level if specified
        if (riskLevel && studentRiskLevel !== riskLevel) {
          continue;
        }

        // Only include students with some risk
        if (riskScore < 20) {
          continue;
        }

        // Generate recommended actions
        const recommendedActions: any = [];

        if (studentRiskLevel === 'critical') {
          recommendedActions.push({
            action: 'Immediate intervention required',
            priority: 'immediate' as const,
            description: 'Contact student urgently about course status',
            estimatedImpact: 'Critical - may prevent course failure',
          });
        } else if (studentRiskLevel === 'high') {
          recommendedActions.push({
            action: 'Schedule 1-on-1 meeting',
            priority: 'high' as const,
            description: 'Discuss challenges and provide personalized support',
            estimatedImpact: 'High - direct intervention often resolves issues',
          });
        } else {
          recommendedActions.push({
            action: 'Send encouraging message',
            priority: 'medium' as const,
            description: 'Provide motivation and check if help is needed',
            estimatedImpact: 'Medium - early intervention can prevent issues',
          });
        }

        // Determine issue areas
        const issueAreas: any = [];
        if (recentActivities === 0) issueAreas.push('attendance');
        if (enrollment.progressPercentage < 50) issueAreas.push('progress');
        if (recentAssessments.some(a => (a.score || 0) < 60)) issueAreas.push('assessments');
        if (recentActivities < 3) issueAreas.push('participation');

        atRiskStudents.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          email: student.email,
          riskLevel: studentRiskLevel,
          riskScore,
          riskFactors,
          coursesAffected: [
            {
              courseId: course.id,
              courseName: course.title,
              progressPercentage: enrollment.progressPercentage,
              lastActivity: lastActivity ? lastActivity.timestamp.toISOString() : null,
              issueAreas,
            },
          ],
          recommendedActions,
          lastContactDate: null, // This would need to be tracked in a separate system
          interventionHistory: [], // This would need to be tracked in a separate system
        });
      }

      // Sort by risk score (highest first) and apply limit
      return atRiskStudents.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
    } catch (error) {
      this.logger.error(`Error getting at-risk students: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getGradingQueue(
    teacherId: string,
    courseId?: string,
    type?: string,
    priority?: string,
    limit?: number,
  ): Promise<GradingQueue[]> {
    this.logger.log(`Getting grading queue for teacher: ${teacherId}`);

    try {
      let query = this.assessmentAttemptRepository
        .createQueryBuilder('attempt')
        .innerJoinAndSelect('attempt.assessment', 'assessment')
        .innerJoinAndSelect('attempt.student', 'student')
        .leftJoinAndSelect('assessment.course', 'course')
        .where('assessment.teacherId = :teacherId', { teacherId })
        .andWhere('attempt.status = :status', { status: 'submitted' })
        .andWhere('attempt.score IS NULL');

      // Apply filters
      if (courseId) {
        query = query.andWhere('assessment.courseId = :courseId', { courseId });
      }

      if (type) {
        query = query.andWhere('assessment.assessmentType = :type', { type });
      }

      query = query.orderBy('attempt.submittedAt', 'ASC');

      if (limit) {
        query = query.limit(limit);
      }

      const submissions = await query.getMany();

      const gradingQueue: GradingQueue[] = submissions.map(submission => {
        const isOverdue = submission.assessment.availableUntil
          ? new Date() > submission.assessment.availableUntil
          : false;

        let calculatedPriority: 'high' | 'medium' | 'low' = 'medium';

        if (isOverdue || submission.assessment.isMandatory) {
          calculatedPriority = 'high';
        } else if (submission.assessment.availableUntil) {
          const timeUntilDue = submission.assessment.availableUntil.getTime() - Date.now();
          const daysUntilDue = timeUntilDue / (1000 * 60 * 60 * 24);

          if (daysUntilDue <= 1) {
            calculatedPriority = 'high';
          } else if (daysUntilDue <= 3) {
            calculatedPriority = 'medium';
          } else {
            calculatedPriority = 'low';
          }
        }

        return {
          id: submission.id,
          type: submission.assessment.assessmentType,
          title: submission.assessment.title,
          courseName: submission.assessment.course?.title || 'Unknown Course',
          courseId: submission.assessment.courseId || '',
          studentName:
            `${submission.student.firstName || 'Student'} ${submission.student.lastName || ''}`.trim(),
          studentId: submission.studentId,
          submittedAt: submission.submittedAt?.toISOString() || submission.updatedAt.toISOString(),
          dueDate: submission.assessment.availableUntil?.toISOString() || null,
          isOverdue,
          priority: calculatedPriority,
          estimatedGradingTime: submission.assessment.questionsCount
            ? submission.assessment.questionsCount * 2
            : 15, // 2 min per question
          submissionType: 'text', // Default for now
          hasAIPreGrade: false, // TODO: Implement AI grading
          aiConfidence: null,
        };
      });

      // Apply priority filter if specified
      const filteredQueue = priority
        ? gradingQueue.filter(item => item.priority === priority)
        : gradingQueue;

      return filteredQueue;
    } catch (error) {
      this.logger.error(`Error getting grading queue: ${error.message}`);
      return [];
    }
  }

  async getStudentOverview(
    teacherId: string,
    courseId?: string,
    status?: string,
    limit?: number,
    offset?: number,
  ): Promise<StudentOverview[]> {
    this.logger.log(`Getting student overview for teacher: ${teacherId}`);

    try {
      let enrollmentQuery = this.enrollmentRepository
        .createQueryBuilder('enrollment')
        .innerJoinAndSelect('enrollment.student', 'student')
        .innerJoinAndSelect('enrollment.course', 'course')
        .where('course.teacherId = :teacherId', { teacherId });

      // Apply course filter
      if (courseId) {
        enrollmentQuery = enrollmentQuery.andWhere('enrollment.courseId = :courseId', { courseId });
      }

      // Apply status filter
      if (status === 'at_risk') {
        enrollmentQuery = enrollmentQuery.andWhere('enrollment.progressPercentage < :threshold', {
          threshold: 30,
        });
      } else if (status === 'excelling') {
        enrollmentQuery = enrollmentQuery.andWhere('enrollment.progressPercentage >= :threshold', {
          threshold: 80,
        });
      } else if (status === 'active') {
        enrollmentQuery = enrollmentQuery.andWhere('enrollment.status IN (:...statuses)', {
          statuses: ['enrolled', 'in_progress'],
        });
      }

      const enrollments = await enrollmentQuery
        .orderBy('enrollment.lastAccessedAt', 'DESC')
        .offset(offset || 0)
        .limit(limit || 20)
        .getMany();

      // Group enrollments by student
      const studentEnrollmentMap = new Map<string, any[]>();

      for (const enrollment of enrollments) {
        const studentId = enrollment.studentId;
        if (!studentEnrollmentMap.has(studentId)) {
          studentEnrollmentMap.set(studentId, []);
        }
        studentEnrollmentMap.get(studentId)!.push(enrollment);
      }

      const studentOverviews: StudentOverview[] = [];

      for (const [studentId, studentEnrollments] of studentEnrollmentMap) {
        const firstEnrollment = studentEnrollments[0];
        const student = firstEnrollment.student;

        // Get all enrollments for this student (not just teacher's courses)
        const allStudentEnrollments = await this.enrollmentRepository.find({
          where: { studentId },
          relations: ['course'],
        });

        // Calculate overall progress and scores
        const totalEnrollments = allStudentEnrollments.length;
        const overallProgress =
          totalEnrollments > 0
            ? allStudentEnrollments.reduce((sum, e) => sum + Number(e.progressPercentage), 0) /
              totalEnrollments
            : 0;

        // Get assessment scores for this student from teacher's assessments
        const studentAssessmentAttempts = await this.assessmentAttemptRepository
          .createQueryBuilder('attempt')
          .innerJoin('attempt.assessment', 'assessment')
          .where('attempt.studentId = :studentId', { studentId })
          .andWhere('assessment.teacherId = :teacherId', { teacherId })
          .andWhere('attempt.score IS NOT NULL')
          .getMany();

        const averageScore =
          studentAssessmentAttempts.length > 0
            ? studentAssessmentAttempts.reduce((sum, attempt) => sum + Number(attempt.score), 0) /
              studentAssessmentAttempts.length
            : 0;

        // Determine status based on progress and activity
        let studentStatus: 'active' | 'at_risk' | 'excelling' | 'inactive' = 'active';

        if (overallProgress < 30) {
          studentStatus = 'at_risk';
        } else if (overallProgress >= 80) {
          studentStatus = 'excelling';
        } else {
          // Check last activity
          const lastActivity = Math.max(
            ...studentEnrollments.map(e =>
              new Date(e.lastAccessedAt || e.enrollmentDate).getTime(),
            ),
          );
          const daysSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);

          if (daysSinceActivity > 14) {
            studentStatus = 'inactive';
          }
        }

        // Build courses data for teacher's courses
        const coursesData = studentEnrollments.map(enrollment => ({
          courseId: enrollment.courseId,
          courseName: enrollment.course.title,
          progress: Number(enrollment.progressPercentage),
          score: averageScore, // Simplified for now
          lastAccessed: (enrollment.lastAccessedAt || enrollment.enrollmentDate).toISOString(),
        }));

        // Determine risk factors
        const riskFactors: string[] = [];
        if (overallProgress < 30) riskFactors.push('Low progress');
        if (averageScore < 60) riskFactors.push('Low scores');

        const daysSinceLastActivity = Math.min(
          ...studentEnrollments.map(
            e =>
              (Date.now() - new Date(e.lastAccessedAt || e.enrollmentDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        if (daysSinceLastActivity > 7) riskFactors.push('Low engagement');

        // TODO: Calculate achievements from database
        const achievements = Math.floor(Math.random() * 10); // Placeholder

        studentOverviews.push({
          studentId: student.id,
          studentName: `${student.firstName || 'Student'} ${student.lastName || ''}`.trim(),
          email: student.email,
          avatar: student.avatarUrl,
          enrolledCourses: totalEnrollments,
          overallProgress: Math.round(overallProgress * 100) / 100,
          averageScore: Math.round(averageScore * 100) / 100,
          lastActivity: new Date(
            Math.max(
              ...studentEnrollments.map(e =>
                new Date(e.lastAccessedAt || e.enrollmentDate).getTime(),
              ),
            ),
          ).toISOString(),
          status: studentStatus,
          coursesData,
          achievements,
          riskFactors,
        });
      }

      return studentOverviews;
    } catch (error) {
      this.logger.error(`Error getting student overview: ${error.message}`);
      return [];
    }
  }

  async getDetailedStudentInfo(teacherId: string, studentId: string): Promise<StudentOverview> {
    this.logger.log(
      `Getting detailed student info for teacher: ${teacherId}, student: ${studentId}`,
    );

    // Mock detailed student data - replace with real database queries
    const detailedStudent: StudentOverview = {
      studentId: studentId,
      studentName: 'Nguyễn Văn An',
      email: 'nguyen.van.an@email.com',
      avatar: undefined,
      enrolledCourses: 3,
      overallProgress: 78,
      averageScore: 85,
      lastActivity: '2024-03-20T10:30:00Z',
      status: 'active',
      coursesData: [
        {
          courseId: 'course-1',
          courseName: 'Machine Learning Fundamentals',
          progress: 85,
          score: 88,
          lastAccessed: '2024-03-20T10:30:00Z',
        },
        {
          courseId: 'course-2',
          courseName: 'Advanced Python Programming',
          progress: 100,
          score: 92,
          lastAccessed: '2024-03-15T14:20:00Z',
        },
        {
          courseId: 'course-3',
          courseName: 'Data Science Bootcamp',
          progress: 15,
          score: 75,
          lastAccessed: '2024-03-05T08:15:00Z',
        },
      ],
      achievements: 5,
      riskFactors: [],
    };

    return detailedStudent;
  }

  async contactStudent(
    teacherId: string,
    contactDto: {
      studentId: string;
      message: string;
      subject: string;
      courseId?: string;
    },
  ): Promise<void> {
    this.logger.log(`Teacher ${teacherId} contacting student: ${contactDto.studentId}`);

    // Implementation for contacting student
    // This would typically send an email or create a notification
  }

  async generateInsights(
    teacherId: string,
    generateDto: {
      courseId?: string;
      analysisType?: string[];
    },
  ): Promise<TeachingInsight[]> {
    this.logger.log(`Generating insights for teacher: ${teacherId}`);

    // Implementation for generating AI insights
    // This would call AI services to analyze teaching data
    return [];
  }
}

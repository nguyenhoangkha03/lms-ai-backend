import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CourseService } from '../services/course.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { UserType } from '@/common/enums/user.enums';

@ApiTags('Student Dashboard')
@Controller('student')
export class StudentController {
  constructor(private readonly courseService: CourseService) {}

  @Get('dashboard/stats')
  @Authorize({
    roles: [UserType.STUDENT],
  })
  @ApiOperation({
    summary: 'Get student dashboard statistics',
    description: 'Lấy thống kê dashboard cho student',
  })
  @ApiResponse({
    status: 200,
    description: 'Student statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Statistics retrieved successfully' },
        stats: {
          type: 'object',
          properties: {
            activeCourses: { type: 'number', example: 5 },
            completedCourses: { type: 'number', example: 3 },
            totalStudyTime: { type: 'number', example: 24.5 },
            averageProgress: { type: 'number', example: 78 },
            achievements: { type: 'number', example: 12 },
            currentStreak: { type: 'number', example: 7 },
            level: { type: 'number', example: 12 },
            xp: { type: 'number', example: 850 },
            nextLevelXp: { type: 'number', example: 1000 },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getStudentStats(@CurrentUser() user: User) {
    try {
      // Get user's enrollments
      const enrollments = await this.courseService.getUserEnrollments(user.id);
      
      const activeCourses = enrollments.filter(e => e.status === 'active').length;
      const completedCourses = enrollments.filter(e => e.status === 'completed').length;
      
      // Calculate average progress
      const totalProgress = enrollments.reduce((sum, e) => sum + (Number(e.progressPercentage) || 0), 0);
      const averageProgress = enrollments.length > 0 ? Math.round(totalProgress / enrollments.length) : 0;
      
      // Debug logs
      console.log('🔍 Enrollments:', enrollments.length);
      console.log('📊 Progress values:', enrollments.map(e => ({ id: e.id, progress: e.progressPercentage })));
      console.log('📈 Total Progress:', totalProgress);
      console.log('🎯 Average Progress:', averageProgress);
      
      // Calculate total study time from enrollments (convert seconds to hours)
      const totalTimeInSeconds = enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0);
      const totalStudyTime = Math.round((totalTimeInSeconds / 3600) * 10) / 10; // Hours with 1 decimal place
      
      // Calculate real achievements data
      const achievementsData = await this.courseService.getUserAchievements(user.id);
      const achievements = achievementsData?.achievements?.length || 0;
      
      // Calculate streak from enrollment activity
      const currentStreak = await this.courseService.calculateUserStreak(user.id);
      
      // Calculate level based on total study time and completions
      const totalStudyHours = Math.floor(totalTimeInSeconds / 3600);
      const level = Math.max(1, Math.floor((totalStudyHours + completedCourses * 10) / 10) + 1);
      const xp = (totalStudyHours * 50) + (completedCourses * 100) + (achievements * 25);
      const nextLevelXp = level * 100;

      return {
        success: true,
        message: 'Statistics retrieved successfully',
        stats: {
          activeCourses,
          completedCourses,
          totalStudyTime,
          averageProgress,
          achievements,
          currentStreak,
          level,
          xp,
          nextLevelXp,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('dashboard/courses')
  @Authorize({
    roles: [UserType.STUDENT],
  })
  @ApiOperation({
    summary: 'Get student courses for dashboard',
    description: 'Lấy danh sách khóa học đang học cho dashboard',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit number of courses', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Student courses retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Courses retrieved successfully' },
        courses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string', example: 'React Advanced Concepts' },
              description: { type: 'string' },
              thumbnail: { type: 'string' },
              progress: { type: 'number', example: 75 },
              status: { type: 'string', enum: ['active', 'completed', 'paused'] },
              enrolledAt: { type: 'string', format: 'date-time' },
              lastAccessedAt: { type: 'string', format: 'date-time' },
              instructor: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getStudentCourses(
    @CurrentUser() user: User,
    @Query('limit') limit: number = 5,
  ) {
    try {
      const enrollments = await this.courseService.getUserEnrollments(user.id, {
        status: 'active',
        limit,
      });

      const courses = enrollments.map(enrollment => ({
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        thumbnail: enrollment.course.thumbnailUrl,
        progress: enrollment.progressPercentage || 0,
        status: enrollment.status,
        enrolledAt: enrollment.enrollmentDate,
        lastAccessedAt: enrollment.lastAccessedAt,
        instructor: {
          id: enrollment.course.teacher?.id || '',
          name: enrollment.course.teacher?.displayName || 
                enrollment.course.teacher?.firstName + ' ' + enrollment.course.teacher?.lastName || 
                'Unknown',
          avatar: enrollment.course.teacher?.avatarUrl || '',
        },
      }));

      return {
        success: true,
        message: 'Courses retrieved successfully',
        courses,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('dashboard/activity')
  @Authorize({
    roles: [UserType.STUDENT],
  })
  @ApiOperation({
    summary: 'Get student recent activity',
    description: 'Lấy hoạt động gần đây của student',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit number of activities', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Student activity retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Activity retrieved successfully' },
        activities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['lesson_completed', 'badge_earned', 'ai_chat', 'course_enrolled'] },
              title: { type: 'string', example: 'Completed lesson: React Hooks' },
              description: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              metadata: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getStudentActivity(
    @CurrentUser() user: User,
    @Query('limit') limit: number = 10,
  ) {
    try {
      // For now, return mock data
      // In a real implementation, this would query activity/audit logs
      const mockActivities = [
        {
          id: '1',
          type: 'lesson_completed',
          title: 'Completed lesson: React Hooks',
          description: 'Great job! You\'ve mastered React Hooks.',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          metadata: { courseId: 'some-uuid', lessonId: 'some-uuid' },
        },
        {
          id: '2',
          type: 'badge_earned',
          title: 'Earned badge: JavaScript Master',
          description: 'You\'ve completed all JavaScript fundamentals.',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          metadata: { badgeId: 'js-master' },
        },
        {
          id: '3',
          type: 'ai_chat',
          title: 'Asked AI tutor about async programming',
          description: 'Got help understanding Promise chains.',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          metadata: { sessionId: 'chat-uuid' },
        },
      ];

      return {
        success: true,
        message: 'Activity retrieved successfully',
        activities: mockActivities.slice(0, limit),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('dashboard/achievements')
  @Authorize({
    roles: [UserType.STUDENT],
  })
  @ApiOperation({
    summary: 'Get student achievements',
    description: 'Lấy thành tựu và badges của student',
  })
  @ApiResponse({
    status: 200,
    description: 'Student achievements retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Achievements retrieved successfully' },
        achievements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string', example: 'Fast Learner' },
              description: { type: 'string', example: 'Completed 3 lessons in one day' },
              icon: { type: 'string', example: '🚀' },
              earnedAt: { type: 'string', format: 'date-time' },
              rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'] },
            },
          },
        },
        progress: {
          type: 'object',
          properties: {
            currentLevel: { type: 'number', example: 12 },
            currentXp: { type: 'number', example: 850 },
            nextLevelXp: { type: 'number', example: 1000 },
            progressPercentage: { type: 'number', example: 85 },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getStudentAchievements(@CurrentUser() user: User) {
    try {
      // Mock achievements data
      const mockAchievements = [
        {
          id: '1',
          name: 'Fast Learner',
          description: 'Completed 3 lessons in one day',
          icon: '🚀',
          earnedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          rarity: 'rare',
        },
        {
          id: '2',
          name: 'Code Master',
          description: 'Solved 50 coding challenges',
          icon: '💎',
          earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          rarity: 'epic',
        },
        {
          id: '3',
          name: 'Streak Warrior',
          description: '7 days learning streak',
          icon: '🔥',
          earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          rarity: 'common',
        },
      ];

      const progress = {
        currentLevel: 12,
        currentXp: 850,
        nextLevelXp: 1000,
        progressPercentage: Math.round((850 / 1000) * 100),
      };

      return {
        success: true,
        message: 'Achievements retrieved successfully',
        achievements: mockAchievements,
        progress,
      };
    } catch (error) {
      throw error;
    }
  }
}
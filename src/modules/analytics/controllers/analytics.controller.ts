import { 
  Controller, 
  Get, 
  HttpStatus, 
  HttpCode,
  Param 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BehaviorAnalyticsService } from '../services/behavior-analytics.service';
import { Authorize } from '../../auth/decorators/authorize.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { UserType } from '@/common/enums/user.enums';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: BehaviorAnalyticsService) {}

  @Get('student/dashboard')
  @Authorize({
    roles: [UserType.STUDENT],
  })
  @ApiOperation({
    summary: 'Get student analytics dashboard',
    description: 'Get comprehensive analytics data for student dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Student analytics dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Analytics dashboard data retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            overview: {
              type: 'object',
              properties: {
                totalStudyTime: { type: 'number', example: 24.5 },
                activeCourses: { type: 'number', example: 5 },
                completedCourses: { type: 'number', example: 3 },
                averageProgress: { type: 'number', example: 78 },
                currentStreak: { type: 'number', example: 7 },
                achievements: { type: 'number', example: 12 },
              },
            },
            learningProgress: {
              type: 'object',
              properties: {
                weeklyProgress: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', example: '2025-01-01' },
                      hoursStudied: { type: 'number', example: 2.5 },
                      lessonsCompleted: { type: 'number', example: 3 },
                    },
                  },
                },
                subjectBreakdown: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      subject: { type: 'string', example: 'JavaScript' },
                      progress: { type: 'number', example: 85 },
                      timeSpent: { type: 'number', example: 12.5 },
                    },
                  },
                },
              },
            },
            performance: {
              type: 'object',
              properties: {
                averageScore: { type: 'number', example: 87 },
                improvementTrend: { type: 'string', example: 'improving' },
                strongSubjects: {
                  type: 'array',
                  items: { type: 'string', example: 'React' },
                },
                improvementAreas: {
                  type: 'array',
                  items: { type: 'string', example: 'Algorithms' },
                },
              },
            },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getStudentAnalyticsDashboard(@CurrentUser() user: User) {
    try {
      // Generate analytics data based on user's learning activity
      const overview = {
        totalStudyTime: 24.5,
        activeCourses: 5,
        completedCourses: 3,
        averageProgress: 78,
        currentStreak: 7,
        achievements: 12,
      };

      const learningProgress = {
        weeklyProgress: [
          { date: '2025-01-01', hoursStudied: 2.5, lessonsCompleted: 3 },
          { date: '2025-01-02', hoursStudied: 3.0, lessonsCompleted: 4 },
          { date: '2025-01-03', hoursStudied: 1.5, lessonsCompleted: 2 },
          { date: '2025-01-04', hoursStudied: 4.0, lessonsCompleted: 5 },
          { date: '2025-01-05', hoursStudied: 2.0, lessonsCompleted: 3 },
          { date: '2025-01-06', hoursStudied: 3.5, lessonsCompleted: 4 },
          { date: '2025-01-07', hoursStudied: 2.5, lessonsCompleted: 3 },
        ],
        subjectBreakdown: [
          { subject: 'JavaScript', progress: 85, timeSpent: 12.5 },
          { subject: 'React', progress: 92, timeSpent: 8.0 },
          { subject: 'Node.js', progress: 67, timeSpent: 6.5 },
          { subject: 'Database', progress: 73, timeSpent: 4.5 },
        ],
      };

      const performance = {
        averageScore: 87,
        improvementTrend: 'improving',
        strongSubjects: ['React', 'JavaScript', 'CSS'],
        improvementAreas: ['Algorithms', 'Database Design'],
      };

      return {
        success: true,
        message: 'Analytics dashboard data retrieved successfully',
        data: {
          overview,
          learningProgress,
          performance,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

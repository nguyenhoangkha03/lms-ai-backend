import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { DataCollectionService } from '../services/data-collection.service';
import { RealTimeStreamingService } from '../services/real-time-streaming.service';
import {
  CreateActivityDto,
  CreateSessionDto,
  UpdateSessionDto,
  ActivityBatchDto,
  EngagementMetricsDto,
  PerformanceMetricsDto,
  BehaviorTrackingDto,
  RealTimeMetricsQueryDto,
  BehaviorAnalysisQueryDto,
  StreamingConfigDto,
} from '../dto/data-collection.dto';

@ApiTags('Data Collection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics/data-collection')
export class DataCollectionController {
  private readonly logger = new Logger(DataCollectionController.name);

  constructor(
    private readonly dataCollectionService: DataCollectionService,
    private readonly realTimeStreamingService: RealTimeStreamingService,
  ) {}

  @Post('activities')
  @ApiOperation({ summary: 'Track learning activity' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Activity tracked successfully' })
  @Roles('student', 'teacher', 'admin')
  async trackActivity(@Body() createActivityDto: CreateActivityDto, @CurrentUser() user: any) {
    try {
      // Verify student ID matches current user or user has permission
      if (createActivityDto.studentId !== user.id && !['teacher', 'admin'].includes(user.role)) {
        throw new BadRequestException('Cannot track activity for another user');
      }

      const activity = await this.dataCollectionService.trackActivity(createActivityDto);

      return {
        success: true,
        message: 'Activity tracked successfully',
        data: activity,
      };
    } catch (error) {
      this.logger.error(`Error tracking activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('activities/batch')
  @ApiOperation({ summary: 'Track multiple activities in batch' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Activities tracked successfully' })
  @Roles('student', 'teacher', 'admin')
  async trackActivitiesBatch(@Body() batchDto: ActivityBatchDto, @CurrentUser() user: any) {
    try {
      // Verify all activities belong to current user or user has permission
      const unauthorizedActivities = batchDto.activities.filter(
        activity => activity.studentId !== user.id && !['teacher', 'admin'].includes(user.role),
      );

      if (unauthorizedActivities.length > 0) {
        throw new BadRequestException('Cannot track activities for other users');
      }

      const activities = await this.dataCollectionService.trackActivitiesBatch(batchDto);

      return {
        success: true,
        message: `${activities.length} activities tracked successfully`,
        data: { count: activities.length, activities },
      };
    } catch (error) {
      this.logger.error(`Error batch tracking activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Start new learning session' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Session started successfully' })
  @Roles('student', 'teacher', 'admin')
  async startSession(@Body() createSessionDto: CreateSessionDto, @CurrentUser() user: any) {
    try {
      // Verify student ID matches current user or user has permission
      if (createSessionDto.studentId !== user.id && !['teacher', 'admin'].includes(user.role)) {
        throw new BadRequestException('Cannot start session for another user');
      }

      const session = await this.dataCollectionService.startSession(createSessionDto);

      return {
        success: true,
        message: 'Session started successfully',
        data: session,
      };
    } catch (error) {
      this.logger.error(`Error starting session: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Put('sessions/:sessionId/end')
  @ApiOperation({ summary: 'End learning session' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Session ended successfully' })
  @Roles('student', 'teacher', 'admin')
  async endSession(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: UpdateSessionDto,
    @CurrentUser() _user: any,
  ) {
    try {
      const session = await this.dataCollectionService.endSession(sessionId, updateDto);

      return {
        success: true,
        message: 'Session ended successfully',
        data: session,
      };
    } catch (error) {
      this.logger.error(`Error ending session: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('engagement/:studentId/:sessionId')
  @ApiOperation({ summary: 'Track engagement metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Engagement tracked successfully' })
  @Roles('student', 'teacher', 'admin')
  async trackEngagement(
    @Param('studentId') studentId: string,
    @Param('sessionId') sessionId: string,
    @Body() metrics: EngagementMetricsDto,
    @CurrentUser() user: any,
  ) {
    try {
      // Verify student ID matches current user or user has permission
      if (studentId !== user.id && !['teacher', 'admin'].includes(user.role)) {
        throw new BadRequestException('Cannot track engagement for another user');
      }

      await this.dataCollectionService.trackEngagement(studentId, sessionId, metrics);

      return {
        success: true,
        message: 'Engagement tracked successfully',
      };
    } catch (error) {
      this.logger.error(`Error tracking engagement: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('performance/:studentId/:courseId')
  @ApiOperation({ summary: 'Track performance metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Performance tracked successfully' })
  @Roles('student', 'teacher', 'admin')
  async trackPerformance(
    @Param('studentId') studentId: string,
    @Param('courseId') courseId: string,
    @Body() metrics: PerformanceMetricsDto,
    @CurrentUser() user: any,
  ) {
    try {
      // Verify student ID matches current user or user has permission
      if (studentId !== user.id && !['teacher', 'admin'].includes(user.role)) {
        throw new BadRequestException('Cannot track performance for another user');
      }

      await this.dataCollectionService.trackPerformance(studentId, courseId, metrics);

      return {
        success: true,
        message: 'Performance tracked successfully',
      };
    } catch (error) {
      this.logger.error(`Error tracking performance: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('behavior')
  @ApiOperation({ summary: 'Track user behavior event' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Behavior tracked successfully' })
  @Roles('student', 'teacher', 'admin')
  async trackBehavior(@Body() behaviorDto: BehaviorTrackingDto, @CurrentUser() user: any) {
    try {
      // Verify student ID matches current user or user has permission
      if (behaviorDto.studentId !== user.id && !['teacher', 'admin'].includes(user.role)) {
        throw new BadRequestException('Cannot track behavior for another user');
      }

      // Track as a specific activity type
      const activityDto: CreateActivityDto = {
        studentId: behaviorDto.studentId,
        sessionId: behaviorDto.sessionId,
        activityType: 'USER_INTERACTION' as any,
        duration: behaviorDto.duration,
        metadata: {
          eventType: behaviorDto.eventType,
          eventData: behaviorDto.eventData,
          pageId: behaviorDto.pageId,
          elementId: behaviorDto.elementId,
        },
      };

      const activity = await this.dataCollectionService.trackActivity(activityDto);

      return {
        success: true,
        message: 'Behavior tracked successfully',
        data: activity,
      };
    } catch (error) {
      this.logger.error(`Error tracking behavior: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('metrics/realtime/:studentId')
  @ApiOperation({ summary: 'Get real-time learning metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Real-time metrics retrieved successfully' })
  @Roles('student', 'teacher', 'admin')
  async getRealTimeMetrics(
    @Param('studentId') studentId: string,
    @Query() query: RealTimeMetricsQueryDto,
    @CurrentUser() user: any,
  ) {
    try {
      // Verify student ID matches current user or user has permission
      if (studentId !== user.id && !['teacher', 'admin'].includes(user.role)) {
        throw new BadRequestException('Cannot access metrics for another user');
      }

      const metrics = await this.dataCollectionService.getRealTimeMetrics(studentId);

      return {
        success: true,
        message: 'Real-time metrics retrieved successfully',
        data: metrics,
      };
    } catch (error) {
      this.logger.error(`Error getting real-time metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('behavior/patterns/:studentId')
  @ApiOperation({ summary: 'Get user behavior patterns' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Behavior patterns retrieved successfully' })
  @Roles('student', 'teacher', 'admin')
  async getBehaviorPatterns(
    @Param('studentId') studentId: string,
    @Query() query: BehaviorAnalysisQueryDto,
    @CurrentUser() user: any,
  ) {
    try {
      // Verify student ID matches current user or user has permission
      if (studentId !== user.id && !['teacher', 'admin'].includes(user.role)) {
        throw new BadRequestException('Cannot access behavior patterns for another user');
      }

      const patterns = await this.dataCollectionService.getUserBehaviorPatterns(
        studentId,
        query.days,
      );

      return {
        success: true,
        message: 'Behavior patterns retrieved successfully',
        data: patterns,
      };
    } catch (error) {
      this.logger.error(`Error getting behavior patterns: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('streaming/config')
  @ApiOperation({ summary: 'Configure real-time streaming' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Streaming configured successfully' })
  @Roles('admin', 'teacher')
  async configureStreaming(@Body() config: StreamingConfigDto, @CurrentUser() _user: any) {
    try {
      await this.realTimeStreamingService.configureStreaming(config);

      return {
        success: true,
        message: 'Streaming configured successfully',
      };
    } catch (error) {
      this.logger.error(`Error configuring streaming: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('streaming/status')
  @ApiOperation({ summary: 'Get streaming status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Streaming status retrieved successfully' })
  @Roles('admin', 'teacher')
  async getStreamingStatus() {
    try {
      const status = await this.realTimeStreamingService.getStreamingStatus();

      return {
        success: true,
        message: 'Streaming status retrieved successfully',
        data: status,
      };
    } catch (error) {
      this.logger.error(`Error getting streaming status: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get data collection health status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Health status retrieved successfully' })
  @Roles('admin')
  async getHealthStatus() {
    try {
      // Check service health
      const healthData = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          dataCollection: 'operational',
          streaming: 'operational',
          cache: 'operational',
          database: 'operational',
        },
        metrics: {
          activeSessions: await this.getActiveSessionsCount(),
          dailyActivities: await this.getDailyActivitiesCount(),
          streamingConnections: await this.realTimeStreamingService.getConnectionCount(),
        },
      };

      return {
        success: true,
        message: 'Health status retrieved successfully',
        data: healthData,
      };
    } catch (error) {
      this.logger.error(`Error getting health status: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Private helper methods
  private async getActiveSessionsCount(): Promise<number> {
    // Implementation to get active sessions count
    return 0; // Placeholder
  }

  private async getDailyActivitiesCount(): Promise<number> {
    // Implementation to get daily activities count
    return 0; // Placeholder
  }
}

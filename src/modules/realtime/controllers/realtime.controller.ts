import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserPayload } from '@/common/interfaces/user-payload.interface';
import { RealtimeEventService } from '../services/realtime-event.service';
import { UserPresenceService } from '../services/user-presence.service';
import { ActivityFeedService } from '../services/activity-feed.service';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import {
  CreateEventDto,
  UpdatePresenceDto,
  CreateActivityDto,
  SendLiveUpdateDto,
  TrackProgressDto,
  PaginationDto,
  EventFilters,
  ActivityFilters,
  RealtimeEventResponseDto,
  UserPresenceResponseDto,
  ActivityFeedResponseDto,
  LiveActivityStatsDto,
} from '../dto/realtime.dto';

@ApiTags('Real-time Updates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtimeEventService: RealtimeEventService,
    private readonly userPresenceService: UserPresenceService,
    private readonly activityFeedService: ActivityFeedService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  // Real-time Events
  @Post('events')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a real-time event' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event created successfully',
    type: RealtimeEventResponseDto,
  })
  async createEvent(@Body() createEventDto: CreateEventDto, @CurrentUser() user: UserPayload) {
    const event = await this.realtimeEventService.createEvent({
      ...createEventDto,
      triggeredBy: user.sub,
    });

    return {
      success: true,
      message: 'Real-time event created successfully',
      data: event,
    };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get real-time events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Events retrieved successfully',
    type: [RealtimeEventResponseDto],
  })
  async getEvents(
    @Query() pagination: PaginationDto,
    @Query() filters: EventFilters,
    @CurrentUser() user: UserPayload,
  ) {
    const events = await this.realtimeEventService.getUserEvents(user.sub, {
      limit: pagination.limit,
      offset: (pagination.page! - 1) * pagination.limit!,
      eventTypes: filters.eventTypes,
      since: filters.since,
    });

    return {
      success: true,
      message: 'Real-time events retrieved successfully',
      data: events,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: events.length,
      },
    };
  }

  @Post('events/:id/broadcast')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Manually broadcast an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event broadcasted successfully',
  })
  async broadcastEvent(@Param('id', ParseUUIDPipe) id: string) {
    await this.realtimeEventService.broadcastEvent(id);

    return {
      success: true,
      message: 'Event broadcasted successfully',
    };
  }

  @Delete('events/:id')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Cancel/deactivate an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event cancelled successfully',
  })
  async cancelEvent(@Param('id', ParseUUIDPipe) id: string) {
    await this.realtimeEventService.cancelEvent(id);

    return {
      success: true,
      message: 'Event cancelled successfully',
    };
  }

  // User Presence
  @Get('presence/me')
  @ApiOperation({ summary: 'Get current user presence' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User presence retrieved successfully',
    type: UserPresenceResponseDto,
  })
  async getMyPresence(@CurrentUser() user: UserPayload) {
    const presence = await this.userPresenceService.getUserPresence(user.sub);

    return {
      success: true,
      message: 'User presence retrieved successfully',
      data: presence,
    };
  }

  @Put('presence/me')
  @ApiOperation({ summary: 'Update current user presence' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presence updated successfully',
    type: UserPresenceResponseDto,
  })
  async updateMyPresence(
    @Body() updatePresenceDto: UpdatePresenceDto,
    @CurrentUser() user: UserPayload,
  ) {
    const presence = await this.userPresenceService.updatePresence(user.sub, updatePresenceDto);

    return {
      success: true,
      message: 'Presence updated successfully',
      data: presence,
    };
  }

  @Get('presence/online')
  @ApiOperation({ summary: 'Get online users' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter by course ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Online users retrieved successfully',
    type: [UserPresenceResponseDto],
  })
  async getOnlineUsers(
    @Query('courseId') courseId?: string,
    @Query('limit') limit?: number,
    @CurrentUser() user?: UserPayload,
  ) {
    const onlineUsers = await this.userPresenceService.getOnlineUsers({
      courseId,
      limit,
      excludeUserId: user?.sub,
    });

    return {
      success: true,
      message: 'Online users retrieved successfully',
      data: onlineUsers,
      meta: {
        count: onlineUsers.length,
      },
    };
  }

  @Get('presence/statistics')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get presence statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presence statistics retrieved successfully',
  })
  async getPresenceStatistics() {
    const statistics = await this.userPresenceService.getPresenceStatistics();

    return {
      success: true,
      message: 'Presence statistics retrieved successfully',
      data: statistics,
    };
  }

  // Activity Feed
  @Post('activity')
  @ApiOperation({ summary: 'Create an activity feed entry' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Activity created successfully',
    type: ActivityFeedResponseDto,
  })
  async createActivity(
    @Body() createActivityDto: CreateActivityDto,
    @CurrentUser() user: UserPayload,
  ) {
    const activity = await this.activityFeedService.createActivity({
      ...createActivityDto,
      userId: user.sub,
    });

    return {
      success: true,
      message: 'Activity created successfully',
      data: activity,
    };
  }

  @Get('activity/feed')
  @ApiOperation({ summary: 'Get user activity feed' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity feed retrieved successfully',
    type: [ActivityFeedResponseDto],
  })
  async getActivityFeed(
    @Query() pagination: PaginationDto,
    @Query() filters: ActivityFilters,
    @CurrentUser() user: UserPayload,
  ) {
    const { activities, total } = await this.activityFeedService.getUserFeed(user.sub, {
      limit: pagination.limit,
      offset: (pagination.page! - 1) * pagination.limit!,
      filters,
    });

    return {
      success: true,
      message: 'Activity feed retrieved successfully',
      data: activities,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit!),
      },
    };
  }

  @Get('activity/course/:courseId')
  @ApiOperation({ summary: 'Get course activity feed' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course activity feed retrieved successfully',
    type: [ActivityFeedResponseDto],
  })
  async getCourseActivityFeed(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() pagination: PaginationDto,
    @Query() filters: ActivityFilters,
  ) {
    const { activities, total } = await this.activityFeedService.getCourseFeed(courseId, {
      limit: pagination.limit,
      offset: (pagination.page! - 1) * pagination.limit!,
      filters,
    });

    return {
      success: true,
      message: 'Course activity feed retrieved successfully',
      data: activities,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit!),
      },
    };
  }

  @Post('activity/:id/like')
  @ApiOperation({ summary: 'Like an activity' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity liked successfully',
  })
  async likeActivity(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    const activity = await this.activityFeedService.likeActivity(id, user.sub);

    return {
      success: true,
      message: 'Activity liked successfully',
      data: activity,
    };
  }

  @Delete('activity/:id/like')
  @ApiOperation({ summary: 'Unlike an activity' })
  @ApiParam({ name: 'id', description: 'Activity ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity unliked successfully',
  })
  async unlikeActivity(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: UserPayload) {
    const activity = await this.activityFeedService.unlikeActivity(id, user.sub);

    return {
      success: true,
      message: 'Activity unliked successfully',
      data: activity,
    };
  }

  @Get('activity/trending')
  @ApiOperation({ summary: 'Get trending activities' })
  @ApiQuery({ name: 'timeframe', enum: ['day', 'week', 'month'], required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trending activities retrieved successfully',
    type: [ActivityFeedResponseDto],
  })
  async getTrendingActivities(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'week',
    @Query('courseId') courseId?: string,
    @Query('limit') limit: number = 10,
  ) {
    const activities = await this.activityFeedService.getTrendingActivities({
      timeframe,
      courseId,
      limit,
    });

    return {
      success: true,
      message: 'Trending activities retrieved successfully',
      data: activities,
    };
  }

  // Live Updates
  @Post('live-update')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Send a live update' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live update sent successfully',
  })
  async sendLiveUpdate(
    @Body() sendLiveUpdateDto: SendLiveUpdateDto,
    @CurrentUser() user: UserPayload,
  ) {
    const event = await this.realtimeEventService.createEvent({
      ...sendLiveUpdateDto,
      triggeredBy: user.sub,
    });

    return {
      success: true,
      message: 'Live update sent successfully',
      data: { eventId: event.id },
    };
  }

  @Post('progress/track')
  @ApiOperation({ summary: 'Track learning progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress tracked successfully',
  })
  async trackProgress(
    @Body() trackProgressDto: TrackProgressDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Update user presence with progress
    await this.userPresenceService.updateActivity(user.sub, {
      activityType: 'lesson_progress',
      courseId: trackProgressDto.courseId,
      lessonId: trackProgressDto.lessonId,
      progress: trackProgressDto.progress,
      metadata: trackProgressDto.metadata,
    });

    // Create activity if significant progress
    if (trackProgressDto.progress > 0 && trackProgressDto.progress % 25 === 0) {
      await this.activityFeedService.createActivity({
        userId: user.sub,
        activityType: 'lesson_completed' as any,
        title: `Made ${trackProgressDto.progress}% progress`,
        courseId: trackProgressDto.courseId,
        lessonId: trackProgressDto.lessonId,
        activityData: {
          percentage: trackProgressDto.progress,
          timeTaken: trackProgressDto.timeSpent,
        },
      });
    }

    return {
      success: true,
      message: 'Progress tracked successfully',
    };
  }

  // Dashboard Stats
  @Get('stats/live')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get live activity statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live statistics retrieved successfully',
    type: LiveActivityStatsDto,
  })
  async getLiveStats() {
    const [presenceStats, recentActivities] = await Promise.all([
      this.userPresenceService.getPresenceStatistics(),
      this.activityFeedService.getUserFeed('', { limit: 10 }),
    ]);

    const stats: LiveActivityStatsDto = {
      totalOnlineUsers: presenceStats.totalOnline,
      activeInLessons: presenceStats.onlineByActivity?.in_lesson || 0,
      takingQuizzes: presenceStats.onlineByActivity?.taking_quiz || 0,
      inVideoSessions: presenceStats.onlineByActivity?.in_video_call || 0,
      recentActivities: recentActivities.activities as any,
      popularCourses: [], // Would be implemented with course analytics
    };

    return {
      success: true,
      message: 'Live statistics retrieved successfully',
      data: stats,
    };
  }

  @Get('analytics/events')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get event analytics' })
  @ApiQuery({ name: 'startDate', description: 'Start date for analytics' })
  @ApiQuery({ name: 'endDate', description: 'End date for analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event analytics retrieved successfully',
  })
  async getEventAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query() filters: EventFilters,
  ) {
    const analytics = await this.realtimeEventService.getEventAnalytics(
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      {
        eventTypes: filters.eventTypes,
      },
    );

    return {
      success: true,
      message: 'Event analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get('analytics/activities')
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Get activity analytics' })
  @ApiQuery({ name: 'startDate', description: 'Start date for analytics' })
  @ApiQuery({ name: 'endDate', description: 'End date for analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity analytics retrieved successfully',
  })
  async getActivityAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query() filters: ActivityFilters,
  ) {
    const analytics = await this.activityFeedService.getActivityAnalytics(
      {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      {
        userId: filters.userId,
        courseId: filters.courseId,
        activityTypes: filters.activityTypes,
      },
    );

    return {
      success: true,
      message: 'Activity analytics retrieved successfully',
      data: analytics,
    };
  }
}

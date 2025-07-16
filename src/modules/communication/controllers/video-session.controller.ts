import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VideoSessionService } from '../services/video-session.service';
import { BreakoutRoomService } from '../services/breakout-room.service';
import { AttendanceTrackingService } from '../services/attendance-tracking.service';
import {
  CreateVideoSessionDto,
  UpdateVideoSessionDto,
  JoinSessionDto,
  CreateBreakoutRoomsDto,
} from '../dto/video-session.dto';

@ApiTags('Video Sessions')
@ApiBearerAuth()
@Controller('video/sessions')
@UseGuards(JwtAuthGuard)
export class VideoSessionController {
  constructor(
    private readonly videoSessionService: VideoSessionService,
    private readonly breakoutRoomService: BreakoutRoomService,
    private readonly attendanceService: AttendanceTrackingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new video session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(@Body() createSessionDto: CreateVideoSessionDto, @Request() req) {
    const session = await this.videoSessionService.createSession({
      ...createSessionDto,
      hostId: req.user.id,
    });

    return {
      success: true,
      data: { session },
    };
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get session details' })
  @ApiResponse({ status: 200, description: 'Session details retrieved successfully' })
  async getSession(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() _req) {
    const session = await this.videoSessionService.getSessionById(sessionId);

    return {
      success: true,
      data: { session },
    };
  }

  @Put(':sessionId')
  @ApiOperation({ summary: 'Update session details' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async updateSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() updateSessionDto: UpdateVideoSessionDto,
    @Request() _req,
  ) {
    const session = await this.videoSessionService.updateSession(sessionId, updateSessionDto);

    return {
      success: true,
      data: { session },
    };
  }

  @Post(':sessionId/start')
  @ApiOperation({ summary: 'Start a video session' })
  @ApiResponse({ status: 200, description: 'Session started successfully' })
  async startSession(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() req) {
    const session = await this.videoSessionService.startSession(sessionId, req.user.id);

    return {
      success: true,
      data: { session },
    };
  }

  @Post(':sessionId/end')
  @ApiOperation({ summary: 'End a video session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  async endSession(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() req) {
    const session = await this.videoSessionService.endSession(sessionId, req.user.id);

    return {
      success: true,
      data: { session },
    };
  }

  @Post(':sessionId/join')
  @ApiOperation({ summary: 'Join a video session' })
  @ApiResponse({ status: 200, description: 'Joined session successfully' })
  async joinSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() joinDto: JoinSessionDto,
    @Request() req,
  ) {
    const result = await this.videoSessionService.joinSession(sessionId, {
      ...joinDto,
      userId: req.user.id,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post(':sessionId/leave')
  @ApiOperation({ summary: 'Leave a video session' })
  @ApiResponse({ status: 200, description: 'Left session successfully' })
  async leaveSession(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() req) {
    await this.videoSessionService.leaveSession(sessionId, req.user.id);

    return {
      success: true,
      message: 'Left session successfully',
    };
  }

  @Get(':sessionId/participants')
  @ApiOperation({ summary: 'Get session participants' })
  @ApiResponse({ status: 200, description: 'Participants retrieved successfully' })
  async getParticipants(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('includeInactive') includeInactive: boolean = false,
    @Request() _req,
  ) {
    const participants = await this.videoSessionService.getSessionParticipants(
      sessionId,
      includeInactive,
    );

    return {
      success: true,
      data: { participants },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getUserSessions(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.videoSessionService.getUserSessions(
      req.user.id,
      status as any,
      limit,
      offset,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming sessions' })
  @ApiResponse({ status: 200, description: 'Upcoming sessions retrieved successfully' })
  async getUpcomingSessions(@Query('limit') limit: number = 10, @Request() req) {
    const sessions = await this.videoSessionService.getUpcomingSessions(req.user.id, limit);

    return {
      success: true,
      data: { sessions },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search sessions' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  async searchSessions(
    @Request() _req,
    @Query('query') query: string,
    @Query('hostId') hostId?: string,
    @Query('courseId') courseId?: string,
    @Query('sessionType') sessionType?: string,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    const filters = {
      hostId,
      courseId,
      sessionType: sessionType as any,
      status: status as any,
      provider: provider as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const result = await this.videoSessionService.searchSessions(query, filters, limit, offset);

    return {
      success: true,
      data: result,
    };
  }

  @Post(':sessionId/breakout-rooms')
  @ApiOperation({ summary: 'Create breakout rooms' })
  @ApiResponse({ status: 201, description: 'Breakout rooms created successfully' })
  async createBreakoutRooms(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() createRoomsDto: CreateBreakoutRoomsDto,
    @Request() _req,
  ) {
    await this.breakoutRoomService.createBreakoutRooms(
      sessionId,
      createRoomsDto.rooms,
      createRoomsDto.autoAssign,
    );

    return {
      success: true,
      message: 'Breakout rooms created successfully',
    };
  }

  @Get(':sessionId/breakout-rooms')
  @ApiOperation({ summary: 'Get breakout rooms' })
  @ApiResponse({ status: 200, description: 'Breakout rooms retrieved successfully' })
  async getBreakoutRooms(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() _req) {
    const rooms = await this.breakoutRoomService.getBreakoutRooms(sessionId);

    return {
      success: true,
      data: { rooms },
    };
  }

  @Post(':sessionId/breakout-rooms/:roomId/assign')
  @ApiOperation({ summary: 'Assign participant to breakout room' })
  @ApiResponse({ status: 200, description: 'Participant assigned successfully' })
  async assignToBreakoutRoom(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('roomId') roomId: string,
    @Body('userId') userId: string,
    @Request() _req,
  ) {
    await this.breakoutRoomService.assignParticipantToRoom(sessionId, userId, roomId);

    return {
      success: true,
      message: 'Participant assigned to breakout room successfully',
    };
  }

  @Delete(':sessionId/breakout-rooms')
  @ApiOperation({ summary: 'Close breakout rooms' })
  @ApiResponse({ status: 200, description: 'Breakout rooms closed successfully' })
  async closeBreakoutRooms(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() _req) {
    await this.breakoutRoomService.closeBreakoutRooms(sessionId);

    return {
      success: true,
      message: 'Breakout rooms closed successfully',
    };
  }

  // Attendance endpoints
  @Get(':sessionId/attendance')
  @ApiOperation({ summary: 'Get session attendance' })
  @ApiResponse({ status: 200, description: 'Attendance retrieved successfully' })
  async getAttendance(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() _req) {
    const attendance = await this.attendanceService.getSessionAttendance(sessionId);
    const stats = await this.attendanceService.getAttendanceStats(sessionId);

    return {
      success: true,
      data: { attendance, stats },
    };
  }

  @Get(':sessionId/attendance/export')
  @ApiOperation({ summary: 'Export session attendance' })
  @ApiResponse({ status: 200, description: 'Attendance exported successfully' })
  async exportAttendance(@Param('sessionId', ParseUUIDPipe) sessionId: string, @Request() _req) {
    const exportData = await this.attendanceService.exportAttendance(sessionId);

    return {
      success: true,
      data: { export: exportData },
    };
  }
}

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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserType } from '@/common/enums/user.enums';
import { TeacherLiveSessionsRealService } from '../services/teacher-live-sessions-real.service';
import { WinstonService } from '@/logger/winston.service';

@ApiTags('Teacher Live Sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.TEACHER)
@Controller('teacher/live-sessions')
export class TeacherLiveSessionsController {
  constructor(
    private readonly teacherLiveSessionsService: TeacherLiveSessionsRealService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(TeacherLiveSessionsController.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all live sessions for teacher' })
  @ApiQuery({ name: 'status', required: false, enum: ['scheduled', 'live', 'completed', 'cancelled'] })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async getLiveSessions(
    @CurrentUser('id') teacherId: string,
    @Query('status') status?: string,
    @Query('courseId') courseId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting live sessions for teacher: ${teacherId}`);

    const sessions = await this.teacherLiveSessionsService.getLiveSessions(teacherId, status);

    return {
      success: true,
      message: 'Live sessions retrieved successfully',
      data: sessions,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get live session statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getSessionStatistics(
    @CurrentUser('id') teacherId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting session statistics for teacher: ${teacherId}`);

    const statistics = await this.teacherLiveSessionsService.getSessionStatistics(teacherId);

    return {
      success: true,
      message: 'Session statistics retrieved successfully',
      data: statistics,
    };
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get live session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  async getSessionById(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting session ${sessionId} for teacher: ${teacherId}`);

    const session = await this.teacherLiveSessionsService.getSessionById(teacherId, sessionId);

    return {
      success: true,
      message: 'Live session retrieved successfully',
      data: session,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new live session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(
    @CurrentUser('id') teacherId: string,
    @Body() createSessionDto: {
      title: string;
      description: string;
      courseId: string;
      scheduledAt: string;
      duration: number;
      maxParticipants?: number;
      isRecorded?: boolean;
      materials?: any[];
      settings?: {
        allowChat?: boolean;
        allowMicrophone?: boolean;
        allowCamera?: boolean;
        allowScreenShare?: boolean;
        recordSession?: boolean;
        requireApproval?: boolean;
      };
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Creating live session for teacher: ${teacherId}`);

    const session = await this.teacherLiveSessionsService.createSession(
      teacherId,
      createSessionDto
    );

    return {
      success: true,
      message: 'Live session created successfully',
      data: session,
    };
  }

  @Put(':sessionId')
  @ApiOperation({ summary: 'Update live session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async updateSession(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
    @Body() updateSessionDto: {
      title?: string;
      description?: string;
      scheduledAt?: string;
      duration?: number;
      maxParticipants?: number;
      isRecorded?: boolean;
      materials?: any[];
      settings?: any;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Updating session ${sessionId} for teacher: ${teacherId}`);

    const session = await this.teacherLiveSessionsService.updateSession(
      teacherId,
      sessionId,
      updateSessionDto
    );

    return {
      success: true,
      message: 'Live session updated successfully',
      data: session,
    };
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Delete live session' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async deleteSession(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Deleting session ${sessionId} for teacher: ${teacherId}`);

    await this.teacherLiveSessionsService.deleteSession(teacherId, sessionId);

    return {
      success: true,
      message: 'Live session deleted successfully',
    };
  }

  @Post(':sessionId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start live session' })
  @ApiResponse({ status: 200, description: 'Session started successfully' })
  async startSession(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { meetingUrl: string };
  }> {
    this.logger.log(`Starting session ${sessionId} for teacher: ${teacherId}`);

    const result = await this.teacherLiveSessionsService.startSession(teacherId, sessionId);

    return {
      success: true,
      message: 'Live session started successfully',
      data: result,
    };
  }

  @Post(':sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End live session' })
  @ApiResponse({ status: 200, description: 'Session ended successfully' })
  async endSession(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { recordingUrl?: string };
  }> {
    this.logger.log(`Ending session ${sessionId} for teacher: ${teacherId}`);

    const result = await this.teacherLiveSessionsService.endSession(teacherId, sessionId);

    return {
      success: true,
      message: 'Live session ended successfully',
      data: result,
    };
  }

  @Get(':sessionId/attendance')
  @ApiOperation({ summary: 'Get session attendance' })
  @ApiResponse({ status: 200, description: 'Attendance retrieved successfully' })
  async getSessionAttendance(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Getting attendance for session ${sessionId}, teacher: ${teacherId}`);

    const attendance = await this.teacherLiveSessionsService.getSessionAttendance(
      teacherId,
      sessionId
    );

    return {
      success: true,
      message: 'Session attendance retrieved successfully',
      data: attendance,
    };
  }

  @Post(':sessionId/chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send chat message in live session' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  async sendChatMessage(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
    @Body() messageDto: {
      message: string;
      type?: 'announcement' | 'question' | 'response';
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Sending chat message in session ${sessionId}, teacher: ${teacherId}`);

    const chatMessage = await this.teacherLiveSessionsService.sendChatMessage(
      teacherId,
      sessionId,
      messageDto
    );

    return {
      success: true,
      message: 'Chat message sent successfully',
      data: chatMessage,
    };
  }

  @Post(':sessionId/polls')
  @ApiOperation({ summary: 'Create poll in live session' })
  @ApiResponse({ status: 201, description: 'Poll created successfully' })
  async createPoll(
    @CurrentUser('id') teacherId: string,
    @Param('sessionId') sessionId: string,
    @Body() pollDto: {
      question: string;
      options: string[];
      type?: 'multiple_choice' | 'single_choice' | 'open_text';
      duration?: number;
    },
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    this.logger.log(`Creating poll in session ${sessionId}, teacher: ${teacherId}`);

    const poll = await this.teacherLiveSessionsService.createPoll(
      teacherId,
      sessionId,
      pollDto
    );

    return {
      success: true,
      message: 'Poll created successfully',
      data: poll,
    };
  }
}
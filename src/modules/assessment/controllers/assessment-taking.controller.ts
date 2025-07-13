import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Authorize } from '@/modules/auth/decorators/authorize.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { AssessmentTakingService } from '../services/assessment-taking.service';
import {
  StartAssessmentDto,
  SubmitAnswerDto,
  SecurityEventDto,
  UpdateProgressDto,
  SessionHeartbeatDto,
  PauseSessionDto,
  ResumeSessionDto,
} from '../dto/assessment-taking.dto';

@ApiTags('Assessment Taking')
@ApiBearerAuth()
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentTakingController {
  constructor(private readonly takingService: AssessmentTakingService) {}

  // ================================
  // SESSION MANAGEMENT
  // ================================

  @Post(':id/start')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Start assessment session' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 201, description: 'Assessment session started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or assessment not available' })
  @ApiResponse({ status: 403, description: 'Assessment not accessible or attempts exceeded' })
  async startAssessment(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @Body() startData: StartAssessmentDto,
    @CurrentUser() user: User,
  ) {
    const session = await this.takingService.startAssessment(assessmentId, user, startData);
    return {
      message: 'Assessment session started successfully',
      data: session,
    };
  }

  @Get('sessions/:sessionToken')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Get current session status' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Session status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionStatus(@Param('sessionToken') sessionToken: string, @CurrentUser() user: User) {
    const session = await this.takingService.getSessionStatus(sessionToken, user);
    return {
      message: 'Session status retrieved successfully',
      data: session,
    };
  }

  @Post('sessions/:sessionToken/submit')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Submit final assessment' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Assessment submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid submission or session not active' })
  async submitAssessment(@Param('sessionToken') sessionToken: string, @CurrentUser() user: User) {
    const result = await this.takingService.submitAssessment(sessionToken, user);
    return {
      message: 'Assessment submitted successfully',
      data: result,
    };
  }

  // ================================
  // ANSWER MANAGEMENT
  // ================================

  @Post('sessions/:sessionToken/answers')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Submit answer for a question' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Answer submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid answer or session not active' })
  async submitAnswer(
    @Param('sessionToken') sessionToken: string,
    @Body() answerData: SubmitAnswerDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.takingService.submitAnswer(sessionToken, answerData, user);
    return {
      message: 'Answer submitted successfully',
      data: result,
    };
  }

  // ================================
  // PROGRESS TRACKING
  // ================================

  @Patch('sessions/:sessionToken/progress')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Update session progress' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Progress updated successfully' })
  async updateProgress(
    @Param('sessionToken') sessionToken: string,
    @Body() progressData: UpdateProgressDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.takingService.updateProgress(sessionToken, progressData, user);
    return {
      message: 'Progress updated successfully',
      data: result,
    };
  }

  @Post('sessions/:sessionToken/heartbeat')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Session heartbeat for connectivity monitoring' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Heartbeat acknowledged' })
  async heartbeat(
    @Param('sessionToken') sessionToken: string,
    @Body() heartbeatData: SessionHeartbeatDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.takingService.heartbeat(sessionToken, heartbeatData, user);
    return {
      message: 'Heartbeat acknowledged',
      data: result,
    };
  }

  // ================================
  // SESSION CONTROL
  // ================================

  @Post('sessions/:sessionToken/pause')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Pause assessment session' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  @ApiResponse({ status: 403, description: 'Pausing not allowed for this assessment' })
  async pauseSession(
    @Param('sessionToken') sessionToken: string,
    @Body() pauseData: PauseSessionDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.takingService.pauseSession(sessionToken, pauseData, user);
    return {
      message: 'Session paused successfully',
      data: result,
    };
  }

  @Post('sessions/:sessionToken/resume')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Resume assessment session' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  @ApiResponse({ status: 400, description: 'Session not paused or expired' })
  async resumeSession(
    @Param('sessionToken') sessionToken: string,
    @Body() resumeData: ResumeSessionDto,
    @CurrentUser() user: User,
  ) {
    const session = await this.takingService.resumeSession(sessionToken, resumeData, user);
    return {
      message: 'Session resumed successfully',
      data: session,
    };
  }

  // ================================
  // SECURITY AND MONITORING
  // ================================

  @Post('sessions/:sessionToken/security-events')
  @Authorize({ permissions: ['take:assessment'] })
  @ApiOperation({ summary: 'Report security event' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Security event reported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid security event data' })
  async reportSecurityEvent(
    @Param('sessionToken') sessionToken: string,
    @Body() eventData: SecurityEventDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.takingService.reportSecurityEvent(sessionToken, eventData, user);
    return {
      message: 'Security event reported successfully',
      data: result,
    };
  }

  @Get('sessions/:sessionId/analytics')
  @Authorize({ permissions: ['view:assessment', 'view:statistics'] })
  @ApiOperation({ summary: 'Get session analytics for monitoring' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session analytics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getSessionAnalytics(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: User,
  ) {
    const analytics = await this.takingService.getSessionAnalytics(sessionId, user);
    return {
      message: 'Session analytics retrieved successfully',
      data: analytics,
    };
  }
}

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
import { UserType } from '@/common/enums/user.enums';
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  // STUDENT ACCESS ENDPOINTS
  // ================================

  @Get(':id/attempts')
  @Authorize({ roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN] })
  @ApiOperation({ summary: 'Get assessment attempts for current user' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Assessment attempts retrieved successfully' })
  async getAssessmentAttempts(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @CurrentUser() user: User,
  ) {
    const attempts = await this.takingService.getAssessmentAttempts(assessmentId, user);
    return {
      message: 'Assessment attempts retrieved successfully',
      data: attempts,
    };
  }

  @Get('course/:courseId')
  @Authorize({ roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN] })
  @ApiOperation({ summary: 'Get assessments for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course assessments retrieved successfully' })
  async getCourseAssessments(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: User,
  ) {
    const assessments = await this.takingService.getCourseAssessments(courseId, user);
    return {
      message: 'Course assessments retrieved successfully',
      data: assessments,
    };
  }

  @Get('lesson/:lessonId')
  @Authorize({ roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN] })
  @ApiOperation({ summary: 'Get assessments for a lesson' })
  @ApiParam({ name: 'lessonId', description: 'Lesson ID' })
  @ApiResponse({ status: 200, description: 'Lesson assessments retrieved successfully' })
  async getLessonAssessments(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: User,
  ) {
    const assessments = await this.takingService.getLessonAssessments(lessonId, user);
    return {
      message: 'Lesson assessments retrieved successfully',
      data: assessments,
    };
  }

  @Get(':id/availability')
  @Authorize({ roles: [UserType.STUDENT, UserType.TEACHER, UserType.ADMIN] })
  @ApiOperation({ summary: 'Check assessment availability for current user' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiResponse({ status: 200, description: 'Assessment availability checked successfully' })
  async checkAssessmentAvailability(
    @Param('id', ParseUUIDPipe) assessmentId: string,
    @CurrentUser() user: User,
  ) {
    const availability = await this.takingService.checkAssessmentAvailability(assessmentId, user);
    return {
      message: 'Assessment availability checked successfully',
      data: availability,
    };
  }

  // ================================
  // PROGRESS TRACKING
  // ================================

  @Patch('sessions/:sessionToken/progress')
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
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

  @Get('sessions/:sessionToken/analytics')
  @Authorize({
    roles: [UserType.STUDENT, UserType.ADMIN, UserType.TEACHER],
  })
  @ApiOperation({ summary: 'Get session analytics for monitoring' })
  @ApiParam({ name: 'sessionToken', description: 'Session Token' })
  @ApiResponse({ status: 200, description: 'Session analytics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getSessionAnalytics(
    @Param('sessionToken') sessionToken: string,
    @CurrentUser() user: User,
  ) {
    // Convert sessionToken to sessionId for service
    const session = await this.takingService.getSessionByToken(sessionToken, user.id);
    const analytics = await this.takingService.getSessionAnalytics(session.id, user);
    return {
      message: 'Session analytics retrieved successfully',
      data: analytics,
    };
  }
}

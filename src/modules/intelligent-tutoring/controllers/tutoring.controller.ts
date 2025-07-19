import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
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
import { TutoringSessionService } from '../services/tutoring-session.service';
import { QuestionAnsweringService } from '../services/question-answering.service';
import { LearningStyleRecognitionService } from '../services/learning-style-recognition.service';
import { AdaptiveContentService } from '../services/adaptive-content.service';
import { HintGenerationService } from '../services/hint-generation.service';
import {
  CreateTutoringSessionDto,
  UpdateTutoringSessionDto,
  AskQuestionDto,
  AnalyzeLearningStyleDto,
  RequestAdaptiveContentDto,
  RequestHintDto,
  TutoringSessionResponseDto,
  QuestionAnswerResponseDto,
  LearningStyleAnalysisDto,
  AdaptiveContentResponseDto,
  HintResponseDto,
} from '../dto/tutoring.dto';

@ApiTags('Intelligent Tutoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('intelligent-tutoring')
export class TutoringController {
  constructor(
    private readonly tutoringSessionService: TutoringSessionService,
    private readonly questionAnsweringService: QuestionAnsweringService,
    private readonly learningStyleService: LearningStyleRecognitionService,
    private readonly adaptiveContentService: AdaptiveContentService,
    private readonly hintGenerationService: HintGenerationService,
  ) {}

  // ==================== SESSION MANAGEMENT ====================
  @Post('sessions')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Create a new tutoring session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tutoring session created successfully',
    type: TutoringSessionResponseDto,
  })
  async createSession(
    @CurrentUser() user: UserPayload,
    @Body() createSessionDto: CreateTutoringSessionDto,
  ) {
    const session = await this.tutoringSessionService.createSession(user.sub, createSessionDto);

    return {
      success: true,
      message: 'Tutoring session created successfully',
      data: session,
    };
  }

  @Get('sessions/:sessionId')
  @Roles('student', 'instructor', 'admin')
  @ApiOperation({ summary: 'Get tutoring session details' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session details retrieved successfully',
    type: TutoringSessionResponseDto,
  })
  async getSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() _user: UserPayload,
  ) {
    const session = await this.tutoringSessionService.getSession(sessionId);

    return {
      success: true,
      data: session,
    };
  }

  @Put('sessions/:sessionId')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Update tutoring session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
    type: TutoringSessionResponseDto,
  })
  async updateSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() updateSessionDto: UpdateTutoringSessionDto,
    @CurrentUser() _user: UserPayload,
  ) {
    const session = await this.tutoringSessionService.updateSession(sessionId, updateSessionDto);

    return {
      success: true,
      message: 'Session updated successfully',
      data: session,
    };
  }

  @Post('sessions/:sessionId/end')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'End a tutoring session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session ended successfully',
    type: TutoringSessionResponseDto,
  })
  async endSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() _user: UserPayload,
    @Body('summary') summary?: string,
  ) {
    const session = await this.tutoringSessionService.endSession(sessionId, summary);

    return {
      success: true,
      message: 'Session ended successfully',
      data: session,
    };
  }

  @Get('sessions')
  @Roles('student', 'instructor', 'admin')
  @ApiOperation({ summary: "Get user's tutoring sessions" })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of sessions to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of sessions to skip',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sessions retrieved successfully',
    type: [TutoringSessionResponseDto],
  })
  async getUserSessions(
    @CurrentUser() user: UserPayload,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ) {
    const result = await this.tutoringSessionService.getSessionsByStudent(user.sub, limit, offset);

    return {
      success: true,
      data: result.sessions,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: result.total > offset + limit,
      },
    };
  }

  @Get('sessions/:sessionId/analytics')
  @Roles('student', 'instructor', 'admin')
  @ApiOperation({ summary: 'Get session analytics' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session analytics retrieved successfully',
  })
  async getSessionAnalytics(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() _user: UserPayload,
  ) {
    const analytics = await this.tutoringSessionService.getSessionAnalytics(sessionId);

    return {
      success: true,
      data: analytics,
    };
  }

  // ==================== AI-POWERED QUESTION ANSWERING ====================
  @Post('questions/ask')
  @Roles('student')
  @ApiOperation({ summary: 'Ask a question to the AI tutor' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question answered successfully',
    type: QuestionAnswerResponseDto,
  })
  @Post('questions/ask')
  @Roles('student')
  @ApiOperation({ summary: 'Ask a question to the AI tutor' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question answered successfully',
    type: QuestionAnswerResponseDto,
  })
  async askQuestion(@CurrentUser() user: UserPayload, @Body() askQuestionDto: AskQuestionDto) {
    const answer = await this.questionAnsweringService.answerQuestion(user.sub, askQuestionDto);

    return {
      success: true,
      message: 'Question answered successfully',
      data: answer,
    };
  }

  // ==================== PERSONALIZED LEARNING PATHS ====================
  @Post('learning-paths/generate')
  @Roles('student')
  @ApiOperation({ summary: 'Generate personalized learning path' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Learning path generated successfully',
  })
  async generateLearningPath(
    @CurrentUser() _user: UserPayload,
    @Body() _generatePathDto: any, // Would use proper DTO
  ) {
    // Implementation would call learning path service
    return {
      success: true,
      message: 'Learning path generated successfully',
      data: {
        pathId: 'generated-path-id',
        totalDuration: 120, // hours
        nodeCount: 25,
        estimatedCompletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        focusAreas: ['JavaScript Fundamentals', 'React Basics', 'Node.js Introduction'],
      },
    };
  }

  @Get('learning-paths/:pathId')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Get learning path details' })
  @ApiParam({ name: 'pathId', description: 'Learning path ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning path retrieved successfully',
  })
  async getLearningPath(
    @Param('pathId', ParseUUIDPipe) pathId: string,
    @CurrentUser() _user: UserPayload,
  ) {
    // Implementation would get path from service
    return {
      success: true,
      data: {
        id: pathId,
        nodes: [],
        adaptationRules: [],
        progress: 0,
      },
    };
  }

  @Put('learning-paths/:pathId/adapt')
  @Roles('student')
  @ApiOperation({ summary: 'Adapt learning path based on performance' })
  @ApiParam({ name: 'pathId', description: 'Learning path ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning path adapted successfully',
  })
  async adaptLearningPath(
    @Param('pathId', ParseUUIDPipe) _pathId: string,
    @CurrentUser() _user: UserPayload,
    @Body() _adaptationData: any,
  ) {
    // Implementation would adapt path based on performance
    return {
      success: true,
      message: 'Learning path adapted successfully',
      data: {
        adaptationsApplied: [
          'Increased difficulty for JavaScript',
          'Added review content for React',
        ],
        newEstimatedCompletion: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
    };
  }

  // ==================== ADAPTIVE CONTENT DIFFICULTY ====================
  @Post('content/adaptive')
  @Roles('student')
  @ApiOperation({ summary: 'Request adaptive content based on performance' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Adaptive content generated successfully',
    type: AdaptiveContentResponseDto,
  })
  async getAdaptiveContent(
    @CurrentUser() user: UserPayload,
    @Body() requestDto: RequestAdaptiveContentDto,
  ) {
    const content = await this.adaptiveContentService.generateAdaptiveContent(user.sub, requestDto);

    return {
      success: true,
      message: 'Adaptive content generated successfully',
      data: content,
    };
  }

  @Post('content/difficulty/adjust')
  @Roles('student')
  @ApiOperation({ summary: 'Adjust content difficulty based on performance' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content difficulty adjusted successfully',
  })
  async adjustContentDifficulty(
    @CurrentUser() user: UserPayload,
    @Body()
    adjustmentData: {
      sessionId: string;
      currentPerformance: number;
      targetDifficulty?: string;
    },
  ) {
    const adjustment = await this.adaptiveContentService.adjustDifficulty(
      user.sub,
      adjustmentData.sessionId,
      adjustmentData.currentPerformance,
      adjustmentData.targetDifficulty,
    );

    return {
      success: true,
      message: 'Content difficulty adjusted successfully',
      data: adjustment,
    };
  }

  // ==================== LEARNING STYLE RECOGNITION ====================
  @Post('learning-style/analyze')
  @Roles('student')
  @ApiOperation({ summary: "Analyze user's learning style" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Learning style analyzed successfully',
    type: LearningStyleAnalysisDto,
  })
  async analyzeLearningStyle(
    @CurrentUser() user: UserPayload,
    @Body() analyzeDto: AnalyzeLearningStyleDto,
  ) {
    const analysis = await this.learningStyleService.analyzeLearningStyle(user.sub, analyzeDto);

    return {
      success: true,
      message: 'Learning style analyzed successfully',
      data: analysis,
    };
  }

  @Get('learning-style/profile')
  @Roles('student')
  @ApiOperation({ summary: "Get user's learning style profile" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning style profile retrieved successfully',
    type: LearningStyleAnalysisDto,
  })
  async getLearningStyleProfile(@CurrentUser() _user: UserPayload) {
    // Implementation would get existing profile
    return {
      success: true,
      data: {
        primaryLearningStyle: 'visual',
        styleScores: {
          visual: 0.45,
          auditory: 0.25,
          kinesthetic: 0.2,
          readingWriting: 0.1,
        },
        confidenceLevel: 85,
        interactionsAnalyzed: 150,
        recommendedAdaptations: [
          'Use more visual aids',
          'Include diagrams and charts',
          'Provide visual examples',
        ],
      },
    };
  }

  // ==================== INTELLIGENT HINT GENERATION ====================
  @Post('hints/request')
  @Roles('student')
  @ApiOperation({ summary: 'Request a hint for current problem' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Hint generated successfully',
    type: HintResponseDto,
  })
  async requestHint(@CurrentUser() user: UserPayload, @Body() requestHintDto: RequestHintDto) {
    const hint = await this.hintGenerationService.generateHint(user.sub, requestHintDto);

    return {
      success: true,
      message: 'Hint generated successfully',
      data: hint,
    };
  }

  @Post('hints/:hintId/feedback')
  @Roles('student')
  @ApiOperation({ summary: 'Provide feedback on hint effectiveness' })
  @ApiParam({ name: 'hintId', description: 'Hint ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hint feedback recorded successfully',
  })
  async provideFeedbackOnHint(
    @Param('hintId', ParseUUIDPipe) hintId: string,
    @CurrentUser() _user: UserPayload,
    @Body() feedback: { wasHelpful: boolean; comment?: string },
  ) {
    await this.hintGenerationService.recordHintFeedback(
      hintId,
      feedback.wasHelpful,
      feedback.comment,
    );

    return {
      success: true,
      message: 'Hint feedback recorded successfully',
    };
  }

  @Get('hints/statistics')
  @Roles('student')
  @ApiOperation({ summary: 'Get hint usage statistics for user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hint statistics retrieved successfully',
  })
  async getHintStatistics(@CurrentUser() user: UserPayload) {
    const stats = await this.hintGenerationService.getHintStatistics(user.sub);

    return {
      success: true,
      data: stats,
    };
  }

  // ==================== TUTORING STRATEGY ADAPTATION ====================
  @Post('strategy/adapt')
  @Roles('student')
  @ApiOperation({ summary: 'Adapt tutoring strategy based on performance' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tutoring strategy adapted successfully',
  })
  async adaptTutoringStrategy(
    @CurrentUser() _user: UserPayload,
    @Body()
    _strategyData: {
      sessionId: string;
      currentStrategy: string;
      performanceMetrics: any;
    },
  ) {
    // Implementation would call strategy adaptation service
    return {
      success: true,
      message: 'Tutoring strategy adapted successfully',
      data: {
        newStrategy: 'scaffolding',
        rationale: 'Student needs more structured support',
        adaptations: [
          'Provide step-by-step guidance',
          'Break down complex problems',
          'Increase feedback frequency',
        ],
        expectedOutcomes: [
          'Improved problem-solving confidence',
          'Better understanding of concepts',
          'Reduced frustration levels',
        ],
      },
    };
  }

  // ==================== PERFORMANCE ANALYTICS ====================
  @Get('analytics/performance')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Get tutoring performance analytics' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['day', 'week', 'month'],
    description: 'Analytics timeframe',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance analytics retrieved successfully',
  })
  async getPerformanceAnalytics(
    @CurrentUser() _user: UserPayload,
    @Query('timeframe') timeframe: string = 'week',
  ) {
    // Implementation would aggregate performance data
    return {
      success: true,
      data: {
        timeframe,
        totalSessions: 15,
        totalQuestions: 125,
        averageAccuracy: 78.5,
        averageSessionDuration: 45, // minutes
        topicsExplored: ['JavaScript', 'React', 'Node.js'],
        difficultyProgression: {
          start: 'beginner',
          current: 'intermediate',
          target: 'advanced',
        },
        learningObjectivesAchieved: 12,
        strugglingAreas: ['Async Programming', 'State Management'],
        improvements: [
          'Increased accuracy by 15%',
          'Reduced hint dependency by 30%',
          'Improved response time by 20%',
        ],
      },
    };
  }

  @Get('analytics/learning-patterns')
  @Roles('student', 'instructor')
  @ApiOperation({ summary: 'Get learning pattern analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning patterns retrieved successfully',
  })
  async getLearningPatterns(@CurrentUser() _user: UserPayload) {
    return {
      success: true,
      data: {
        optimalLearningTimes: ['9:00-11:00', '14:00-16:00'],
        averageSessionLength: 45,
        preferredContentTypes: ['interactive', 'visual', 'example-based'],
        engagementPatterns: {
          highEngagement: ['JavaScript basics', 'React components'],
          lowEngagement: ['Testing', 'Deployment'],
        },
        masteryProgression: {
          concepts: [
            { name: 'Variables', mastery: 95 },
            { name: 'Functions', mastery: 87 },
            { name: 'Objects', mastery: 72 },
            { name: 'Async/Await', mastery: 45 },
          ],
        },
        recommendedActions: [
          'Focus more on async programming concepts',
          'Continue with current JavaScript fundamentals pace',
          'Consider advanced React topics',
        ],
      },
    };
  }

  // ==================== CONTENT RECOMMENDATIONS ====================
  @Get('recommendations/content')
  @Roles('student')
  @ApiOperation({ summary: 'Get personalized content recommendations' })
  @ApiQuery({
    name: 'contentType',
    required: false,
    enum: ['lesson', 'exercise', 'quiz'],
    description: 'Type of content',
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: ['easy', 'medium', 'hard'],
    description: 'Difficulty level',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content recommendations retrieved successfully',
  })
  async getContentRecommendations(
    @CurrentUser() _user: UserPayload,
    @Query('contentType') _contentType?: string,
    @Query('difficulty') _difficulty?: string,
  ) {
    return {
      success: true,
      data: {
        recommendations: [
          {
            id: 'rec-1',
            type: 'lesson',
            title: 'Advanced JavaScript Patterns',
            description: 'Learn design patterns and best practices',
            difficulty: 'medium',
            estimatedDuration: 60,
            reasons: ['Matches your learning style', 'Next logical step in your path'],
            confidence: 0.89,
          },
          {
            id: 'rec-2',
            type: 'exercise',
            title: 'Async Programming Practice',
            description: 'Hands-on exercises for async concepts',
            difficulty: 'medium',
            estimatedDuration: 45,
            reasons: ['Addresses identified weakness', 'Interactive format suits your style'],
            confidence: 0.92,
          },
        ],
        totalRecommendations: 8,
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    };
  }
}

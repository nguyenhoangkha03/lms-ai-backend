import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { CacheService } from '@/cache/cache.service';
import { AuditLogService } from '@/modules/system/services/audit-log.service';
import { AssessmentSession, SessionStatus } from '../entities/assessment-session.entity';
import { Assessment } from '../entities/assessment.entity';
import { AssessmentAttempt } from '../entities/assessment-attempt.entity';
import { Question } from '../entities/question.entity';
import { User } from '@/modules/user/entities/user.entity';
import { AssessmentService } from './assessment.service';
import { AssessmentRandomizationService } from './assessment-randomization.service';
import {
  StartAssessmentDto,
  SubmitAnswerDto,
  SecurityEventDto,
  UpdateProgressDto,
  SessionHeartbeatDto,
  PauseSessionDto,
  ResumeSessionDto,
  AssessmentSessionResponse,
} from '../dto/assessment-taking.dto';
import { AttemptStatus, GradingStatus } from '@/common/enums/assessment.enums';
import { randomBytes } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';

@Injectable()
export class AssessmentTakingService {
  constructor(
    @InjectRepository(AssessmentSession)
    private readonly sessionRepository: Repository<AssessmentSession>,
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepository: Repository<AssessmentAttempt>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    private readonly assessmentService: AssessmentService,
    private readonly randomizationService: AssessmentRandomizationService,
    private readonly logger: WinstonService,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(AssessmentTakingService.name);
  }

  async startAssessment(
    assessmentId: string,
    student: User,
    startData: StartAssessmentDto,
  ): Promise<AssessmentSessionResponse> {
    this.logger.log(`Starting assessment ${assessmentId} for student ${student.id}`);

    const assessment = await this.assessmentService.getAssessmentById(assessmentId, student, true);

    this.validateAssessmentAvailability(assessment);

    await this.validateAttemptLimits(assessment, student);

    await this.terminateExistingSessions(assessmentId, student.id);

    const attempt = await this.createAssessmentAttempt(assessment, student);

    const assessmentInstance = this.randomizationService.generateAssessmentInstance(
      assessment,
      assessment.questions || [],
      student.id,
    );

    const antiCheatResult = assessment.antiCheatSettingsJson?.enabled
      ? this.randomizationService.applyAntiCheatMeasures(
          assessment,
          assessmentInstance.questions,
          student.id,
        )
      : { questions: assessmentInstance.questions, antiCheatData: {} };

    const timeLimit = antiCheatResult.antiCheatData.timeLimit || assessment.timeLimit;
    const expiresAt = timeLimit
      ? new Date(Date.now() + timeLimit * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = this.sessionRepository.create({
      sessionToken: this.generateSessionToken(),
      studentId: student.id,
      assessmentId: assessment.id,
      attemptId: attempt.id,
      status: SessionStatus.ACTIVE,
      startedAt: new Date(),
      expiresAt,
      totalQuestions: antiCheatResult.questions.length,
      autoSaveInterval: assessment.settingsJson?.autoSaveInterval || 30,
      sessionConfig: JSON.stringify({
        randomizeQuestions: assessment.randomizeQuestions,
        randomizeAnswers: assessment.randomizeAnswers,
        showTimer: assessment.settingsJson?.showTimer ?? true,
        allowQuestionNavigation: assessment.settingsJson?.allowQuestionNavigation ?? true,
        requireAllAnswers: assessment.settingsJson?.requireAllAnswers ?? false,
        ...antiCheatResult.antiCheatData,
      }),
      questionsOrder: JSON.stringify(antiCheatResult.questions.map(q => q.id)),
      browserInfo: startData.browserInfo ? JSON.stringify(startData.browserInfo) : null,
      screenResolution: startData.screenResolution,
      networkQuality: startData.networkQuality,
      metadata: startData.metadata ? JSON.stringify(startData.metadata) : null,
      createdBy: student.id,
      updatedBy: student.id,
    } as AssessmentSession);

    const savedSession = await this.sessionRepository.save(session);

    await this.cacheSession(savedSession);

    await this.auditLogService.createAuditLog({
      userId: student.id,
      action: AuditAction.START_ASSESSMENT,
      entityType: 'AssessmentSession',
      entityId: savedSession.id,
      description: `Started assessment: ${assessment.title}`,
      metadata: { assessmentId, attemptId: attempt.id },
    });

    this.eventEmitter.emit('assessment.session.started', {
      sessionId: savedSession.id,
      studentId: student.id,
      assessmentId,
      timestamp: new Date(),
    });

    return this.buildSessionResponse(savedSession, assessment, antiCheatResult.questions);
  }

  async getSessionStatus(sessionToken: string, student: User): Promise<AssessmentSessionResponse> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (session.isExpired) {
      await this.expireSession(session);
      throw new BadRequestException('Assessment session has expired');
    }

    await this.updateLastActivity(session);

    const assessment = await this.assessmentRepository.findOne({
      where: { id: session.assessmentId },
      relations: ['questions'],
    });

    const questions = this.getSessionQuestions(session, assessment!.questions || []);

    return this.buildSessionResponse(session, assessment!, questions);
  }

  async submitAnswer(
    sessionToken: string,
    answerData: SubmitAnswerDto,
    student: User,
  ): Promise<{ success: boolean; autoSaved: boolean; timeRemaining: number }> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }

    if (session.isExpired) {
      await this.expireSession(session);
      throw new BadRequestException('Assessment session has expired');
    }

    const currentAnswers = session.currentAnswersJson;
    const previousAnswer = currentAnswers[answerData.questionId];

    currentAnswers[answerData.questionId] = {
      answer: answerData.answer,
      timeSpent: answerData.timeSpent || 0,
      submittedAt: new Date().toISOString(),
      isFinal: answerData.isFinal || false,
      metadata: answerData.metadata || {},
    };

    const questionsAnswered = Object.keys(currentAnswers).length;

    await this.sessionRepository.update(session.id, {
      currentAnswers: JSON.stringify(currentAnswers),
      questionsAnswered,
      lastActivityAt: new Date(),
      lastAutoSaveAt: new Date(),
      updatedBy: student.id,
    });

    await this.cacheSession({ ...session, currentAnswers: JSON.stringify(currentAnswers) });

    await this.auditLogService.createAuditLog({
      userId: student.id,
      action: AuditAction.SUBMIT_ANSWER,
      entityType: 'AssessmentSession',
      entityId: session.id,
      description: `Submitted answer for question ${answerData.questionId}`,
      changes: [
        {
          field: 'currentAnswers',
          oldValue: previousAnswer,
          newValue: currentAnswers[answerData.questionId],
        },
      ],
    });

    this.eventEmitter.emit('assessment.answer.submitted', {
      sessionId: session.id,
      studentId: student.id,
      questionId: answerData.questionId,
      questionsAnswered,
      totalQuestions: session.totalQuestions,
      timestamp: new Date(),
    });

    return {
      success: true,
      autoSaved: true,
      timeRemaining: session.remainingTimeInSeconds,
    };
  }

  async submitAssessment(
    sessionToken: string,
    student: User,
  ): Promise<{ attemptId: string; score?: number; passed?: boolean }> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }

    const assessment = await this.assessmentRepository.findOne({
      where: { id: session.assessmentId },
    });

    if (assessment?.settingsJson?.requireAllAnswers) {
      const currentAnswers = session.currentAnswersJson;
      if (Object.keys(currentAnswers).length < session.totalQuestions) {
        throw new BadRequestException('All questions must be answered before submission');
      }
    }

    await this.sessionRepository.update(session.id, {
      status: SessionStatus.COMPLETED,
      endedAt: new Date(),
      updatedBy: student.id,
    });

    const finalAnswers = session.currentAnswersJson;
    const timeTaken = session.durationInSeconds;

    await this.attemptRepository.update(session.attemptId!, {
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      answers: JSON.stringify(finalAnswers),
      timeTaken,
      updatedBy: student.id,
    });

    await this.clearSessionCache(sessionToken);

    await this.auditLogService.createAuditLog({
      userId: student.id,
      action: AuditAction.SUBMIT_ASSESSMENT,
      entityType: 'AssessmentSession',
      entityId: session.id,
      description: `Submitted assessment: ${assessment?.title}`,
      metadata: { timeTaken, questionsAnswered: Object.keys(finalAnswers).length },
    });

    this.eventEmitter.emit('assessment.session.completed', {
      sessionId: session.id,
      studentId: student.id,
      assessmentId: session.assessmentId,
      attemptId: session.attemptId,
      timeTaken,
      timestamp: new Date(),
    });

    let result: any = { attemptId: session.attemptId! };

    if (assessment?.gradingMethod === 'automatic') {
      result = await this.triggerAutoGrading(session.attemptId!, finalAnswers);
    }

    return result;
  }

  async reportSecurityEvent(
    sessionToken: string,
    eventData: SecurityEventDto,
    student: User,
  ): Promise<{ acknowledged: boolean; warningIssued: boolean; sessionTerminated: boolean }> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }

    const securityEvents = session.securityEventsJson;
    securityEvents.push({
      ...eventData,
      recordedAt: new Date().toISOString(),
    });

    const violationCount = session.securityViolationsCount + 1;

    const assessment = await this.assessmentRepository.findOne({
      where: { id: session.assessmentId },
    });

    const antiCheatSettings = assessment?.antiCheatSettingsJson || {};
    const maxViolations = antiCheatSettings.maxSecurityViolations || 5;
    const shouldTerminate = violationCount >= maxViolations;

    const updateData: any = {
      securityEvents: JSON.stringify(securityEvents),
      securityViolationsCount: violationCount,
      lastActivityAt: new Date(),
      updatedBy: student.id,
    };

    if (shouldTerminate) {
      updateData.status = SessionStatus.TERMINATED;
      updateData.endedAt = new Date();
      updateData.isFlagged = true;
      updateData.flagReason = `Too many security violations (${violationCount})`;
    }

    await this.sessionRepository.update(session.id, updateData);

    await this.auditLogService.createAuditLog({
      userId: student.id,
      action: AuditAction.SECURITY_EVENT,
      entityType: 'AssessmentSession',
      entityId: session.id,
      description: `Security event: ${eventData.eventType}`,
      metadata: { ...eventData, violationCount, shouldTerminate },
      level: shouldTerminate ? AuditLevel.CRITICAL : AuditLevel.WARNING,
    });

    this.eventEmitter.emit('assessment.security.violation', {
      sessionId: session.id,
      studentId: student.id,
      assessmentId: session.assessmentId,
      eventType: eventData.eventType,
      violationCount,
      shouldTerminate,
      timestamp: new Date(),
    });

    return {
      acknowledged: true,
      warningIssued: violationCount > 1,
      sessionTerminated: shouldTerminate,
    };
  }

  async updateProgress(
    sessionToken: string,
    progressData: UpdateProgressDto,
    student: User,
  ): Promise<{ success: boolean; timeRemaining: number }> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }

    await this.sessionRepository.update(session.id, {
      currentQuestionIndex: progressData.currentQuestionIndex,
      questionsAnswered: progressData.questionsAnswered || session.questionsAnswered,
      lastActivityAt: new Date(),
      updatedBy: student.id,
    });

    await this.cacheSession({
      ...session,
      currentQuestionIndex: progressData.currentQuestionIndex,
      lastActivityAt: new Date(),
    });

    return {
      success: true,
      timeRemaining: session.remainingTimeInSeconds,
    };
  }

  async heartbeat(
    sessionToken: string,
    _heartbeatData: SessionHeartbeatDto,
    student: User,
  ): Promise<{ alive: boolean; timeRemaining: number; warnings: any[] }> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (session.isExpired) {
      await this.expireSession(session);
      return { alive: false, timeRemaining: 0, warnings: [] };
    }

    await this.sessionRepository.update(session.id, {
      lastPingAt: new Date(),
      lastActivityAt: new Date(),
      updatedBy: student.id,
    });

    const warnings = await this.checkSessionWarnings(session);

    await this.cacheSession({ ...session, lastPingAt: new Date() });

    return {
      alive: session.isActive,
      timeRemaining: session.remainingTimeInSeconds,
      warnings,
    };
  }
  async pauseSession(
    sessionToken: string,
    pauseData: PauseSessionDto,
    student: User,
  ): Promise<{ success: boolean; pausedAt: Date }> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (!session.isActive) {
      throw new BadRequestException('Session is not active');
    }

    const assessment = await this.assessmentRepository.findOne({
      where: { id: session.assessmentId },
    });

    if (!assessment?.settingsJson?.allowPause) {
      throw new ForbiddenException('Pausing is not allowed for this assessment');
    }

    await this.sessionRepository.update(session.id, {
      status: SessionStatus.PAUSED,
      lastActivityAt: new Date(),
      metadata: JSON.stringify({
        ...session.metadataJson,
        pauseReason: pauseData.reason,
        pausedAt: new Date().toISOString(),
      }),
      updatedBy: student.id,
    });

    await this.auditLogService.createAuditLog({
      userId: student.id,
      action: AuditAction.PAUSE_ASSESSMENT,
      entityType: 'AssessmentSession',
      entityId: session.id,
      description: `Paused assessment session: ${pauseData.reason || 'No reason provided'}`,
    });

    return {
      success: true,
      pausedAt: new Date(),
    };
  }

  async resumeSession(
    sessionToken: string,
    resumeData: ResumeSessionDto,
    student: User,
  ): Promise<AssessmentSessionResponse> {
    const session = await this.getSessionByToken(sessionToken, student.id);

    if (session.status !== SessionStatus.PAUSED) {
      throw new BadRequestException('Session is not paused');
    }

    if (session.isExpired) {
      await this.expireSession(session);
      throw new BadRequestException('Assessment session has expired');
    }

    await this.sessionRepository.update(session.id, {
      status: SessionStatus.ACTIVE,
      lastActivityAt: new Date(),
      browserInfo: resumeData.browserInfo
        ? JSON.stringify(resumeData.browserInfo)
        : session.browserInfo,
      metadata: JSON.stringify({
        ...session.metadataJson,
        resumedAt: new Date().toISOString(),
        ...resumeData.metadata,
      }),
      updatedBy: student.id,
    });

    await this.auditLogService.createAuditLog({
      userId: student.id,
      action: AuditAction.RESUME_ASSESSMENT,
      entityType: 'AssessmentSession',
      entityId: session.id,
      description: 'Resumed assessment session',
    });

    const assessment = await this.assessmentRepository.findOne({
      where: { id: session.assessmentId },
      relations: ['questions'],
    });

    const questions = this.getSessionQuestions(session, assessment!.questions || []);

    return this.buildSessionResponse(session, assessment!, questions);
  }

  async getSessionAnalytics(sessionId: string, user: User): Promise<any> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['student', 'assessment'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (
      session.studentId !== user.id &&
      user.userType !== 'admin' &&
      session.assessment?.teacherId !== user.id
    ) {
      throw new ForbiddenException('Access denied');
    }

    const analytics = {
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        duration: session.durationInSeconds,
        timeRemaining: session.remainingTimeInSeconds,
        progressPercentage: session.progressPercentage,
      },
      progress: {
        currentQuestion: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        questionsAnswered: session.questionsAnswered,
      },
      security: {
        violationsCount: session.securityViolationsCount,
        tabSwitchCount: session.tabSwitchCount,
        connectionInterruptions: session.connectionInterruptions,
        isFlagged: session.isFlagged,
        events: session.securityEventsJson,
      },
      environment: {
        browserInfo: session.browserInfoJson,
        screenResolution: session.screenResolution,
        networkQuality: session.networkQuality,
        isFullscreen: session.isFullscreen,
      },
      activity: {
        lastActivityAt: session.lastActivityAt,
        lastPingAt: session.lastPingAt,
        lastAutoSaveAt: session.lastAutoSaveAt,
      },
    };

    return analytics;
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================
  private async validateAssessmentAvailability(assessment: Assessment): Promise<void> {
    if (!assessment.isAvailable) {
      throw new ForbiddenException('Assessment is not currently available');
    }

    if (assessment.status !== 'published') {
      throw new ForbiddenException('Assessment is not published');
    }
  }

  private async validateAttemptLimits(assessment: Assessment, student: User): Promise<void> {
    const existingAttempts = await this.attemptRepository.count({
      where: {
        assessmentId: assessment.id,
        studentId: student.id,
      },
    });

    if (existingAttempts >= assessment.maxAttempts) {
      throw new ForbiddenException('Maximum attempts exceeded');
    }
  }

  private async terminateExistingSessions(assessmentId: string, studentId: string): Promise<void> {
    await this.sessionRepository.update(
      {
        assessmentId,
        studentId,
        status: SessionStatus.ACTIVE,
      },
      {
        status: SessionStatus.TERMINATED,
        endedAt: new Date(),
      },
    );
  }

  private async createAssessmentAttempt(
    assessment: Assessment,
    student: User,
  ): Promise<AssessmentAttempt> {
    const attemptNumber =
      (await this.attemptRepository.count({
        where: { assessmentId: assessment.id, studentId: student.id },
      })) + 1;

    const attempt = this.attemptRepository.create({
      studentId: student.id,
      assessmentId: assessment.id,
      attemptNumber,
      startedAt: new Date(),
      status: AttemptStatus.IN_PROGRESS,
      gradingStatus: GradingStatus.PENDING,
      maxScore: assessment.totalPoints,
      createdBy: student.id,
      updatedBy: student.id,
    });

    return this.attemptRepository.save(attempt);
  }

  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async getSessionByToken(
    sessionToken: string,
    studentId: string,
  ): Promise<AssessmentSession> {
    const cacheKey = `session:${sessionToken}`;
    let session = await this.cacheService.get<AssessmentSession>(cacheKey);

    if (!session) {
      session = await this.sessionRepository.findOne({
        where: { sessionToken, studentId },
        relations: ['assessment'],
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      await this.cacheSession(session);
    }

    return session;
  }

  private async cacheSession(session: any): Promise<void> {
    const cacheKey = `session:${session.sessionToken}`;
    await this.cacheService.set(cacheKey, session, 3600); // 1 hour cache
  }

  private async clearSessionCache(sessionToken: string): Promise<void> {
    const cacheKey = `session:${sessionToken}`;
    await this.cacheService.del(cacheKey);
  }

  private getSessionQuestions(session: AssessmentSession, allQuestions: Question[]): Question[] {
    const questionsOrder = session.questionsOrderJson;
    if (!questionsOrder.length) return allQuestions;

    return questionsOrder
      .map((questionId: string) => allQuestions.find(q => q.id === questionId))
      .filter(Boolean);
  }

  private buildSessionResponse(
    session: AssessmentSession,
    assessment: Assessment,
    questions: Question[],
  ): AssessmentSessionResponse {
    const config = session.sessionConfigJson;
    const currentAnswers = session.currentAnswersJson;

    return {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        timeLimit: assessment.timeLimit,
        totalPoints: assessment.totalPoints,
        showResults: assessment.showResults,
        showCorrectAnswers: assessment.showCorrectAnswers,
      },
      questions: questions.map((q, index) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        options: q.optionsJson,
        points: q.points,
        hint: q.hint,
        timeLimit: q.timeLimit,
        order: index,
        answered: !!currentAnswers[q.id],
        currentAnswer: currentAnswers[q.id]?.answer,
      })),
      config: {
        allowQuestionNavigation: config.allowQuestionNavigation,
        showTimer: config.showTimer,
        autoSaveInterval: session.autoSaveInterval,
        requireAllAnswers: config.requireAllAnswers,
      },
      timeRemaining: session.remainingTimeInSeconds,
      progress: {
        currentQuestion: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        questionsAnswered: session.questionsAnswered,
        progressPercentage: session.progressPercentage,
      },
      security: {
        lockBrowser: config.lockBrowser || false,
        disableCopyPaste: config.disableCopyPaste || false,
        requireFullscreen: config.requireFullscreen || false,
        monitorTabSwitching: config.monitorTabSwitching || false,
        maxTabSwitches: config.maxTabSwitches || 3,
      },
    };
  }

  private async updateLastActivity(session: AssessmentSession): Promise<void> {
    await this.sessionRepository.update(session.id, {
      lastActivityAt: new Date(),
    });

    await this.cacheSession({ ...session, lastActivityAt: new Date() });
  }

  private async expireSession(session: AssessmentSession): Promise<void> {
    await this.sessionRepository.update(session.id, {
      status: SessionStatus.EXPIRED,
      endedAt: new Date(),
    });

    if (session.attemptId && Object.keys(session.currentAnswersJson).length > 0) {
      await this.attemptRepository.update(session.attemptId, {
        status: AttemptStatus.TIMED_OUT,
        submittedAt: new Date(),
        answers: session.currentAnswers,
        timeTaken: session.durationInSeconds,
      });
    }

    await this.clearSessionCache(session.sessionToken);
  }

  private async checkSessionWarnings(session: AssessmentSession): Promise<any[]> {
    const warnings: any[] = [];
    const timeRemaining = session.remainingTimeInSeconds;

    if (timeRemaining <= 300 && timeRemaining > 60) {
      warnings.push({
        type: 'time_warning',
        message: 'You have 5 minutes remaining',
        severity: 2,
        autoDismiss: 10,
      });
    } else if (timeRemaining <= 60 && timeRemaining > 0) {
      warnings.push({
        type: 'time_critical',
        message: 'You have 1 minute remaining',
        severity: 4,
        autoDismiss: 15,
      });
    }

    if (session.tabSwitchCount >= 2) {
      warnings.push({
        type: 'security_warning',
        message: `You have switched tabs ${session.tabSwitchCount} times. Excessive tab switching may result in session termination.`,
        severity: 3,
      });
    }

    if (session.connectionInterruptions > 0) {
      warnings.push({
        type: 'connection_warning',
        message: 'Network interruptions detected. Please ensure stable internet connection.',
        severity: 2,
      });
    }

    return warnings;
  }

  private async triggerAutoGrading(attemptId: string, _answers: any): Promise<any> {
    // This will be implemented in the next grading module
    // For now, return basic response
    return {
      attemptId,
      message: 'Assessment submitted successfully. Grading in progress.',
    };
  }
}

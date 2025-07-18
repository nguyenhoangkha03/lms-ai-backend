import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { AssessmentSession } from '../entities/assessment-session.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Assessment } from '../entities/assessment.entity';
import { NotificationPriority, NotificationType } from '@/common/enums/notification.enums';

@Injectable()
export class AssessmentSessionListener {
  constructor(
    @InjectRepository(AssessmentSession)
    private readonly _sessionRepository: Repository<AssessmentSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
    private readonly notificationService: NotificationService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(AssessmentSessionListener.name);
  }

  @OnEvent('assessment.session.started')
  async handleSessionStarted(payload: any) {
    const { sessionId, studentId, assessmentId } = payload;

    try {
      const assessment = await this.assessmentRepository.findOne({
        where: { id: assessmentId },
        relations: ['teacher'],
      });

      if (!assessment || !assessment.teacher) return;

      await this.notificationService.create({
        userId: assessment.teacher.id,
        title: 'Assessment Started',
        message: `A student has started the assessment: ${assessment.title}`,
        type: NotificationType.ASSESSMENT_STARTED,
        data: {
          sessionId,
          studentId,
          assessmentId,
          assessmentTitle: assessment.title,
        },
      });

      this.logger.log(`Session started notification sent for session ${sessionId}`);
    } catch (error) {
      this.logger.error('Error handling session started event:', error);
    }
  }

  @OnEvent('assessment.session.completed')
  async handleSessionCompleted(payload: any) {
    const { sessionId, studentId, assessmentId, attemptId, timeTaken } = payload;

    try {
      const [student, assessment] = await Promise.all([
        this.userRepository.findOne({ where: { id: studentId } }),
        this.assessmentRepository.findOne({
          where: { id: assessmentId },
          relations: ['teacher'],
        }),
      ]);

      if (!student || !assessment) return;

      await this.notificationService.create({
        userId: studentId,
        title: 'Assessment Completed',
        message: `You have successfully completed: ${assessment.title}`,
        type: NotificationType.ASSESSMENT_COMPLETED,
        data: {
          assessmentId,
          assessmentTitle: assessment.title,
          attemptId,
          timeTaken,
        },
      });

      if (assessment.teacher) {
        await this.notificationService.create({
          userId: assessment.teacher.id,
          title: 'Assessment Submission',
          message: `${student.firstName} ${student.lastName} has completed: ${assessment.title}`,
          type: NotificationType.ASSESSMENT_SUBMITTED,
          data: {
            sessionId,
            studentId,
            studentName: `${student.firstName} ${student.lastName}`,
            assessmentId,
            assessmentTitle: assessment.title,
            attemptId,
            timeTaken,
          },
        });
      }

      this.logger.log(`Session completed notifications sent for session ${sessionId}`);
    } catch (error) {
      this.logger.error('Error handling session completed event:', error);
    }
  }

  @OnEvent('assessment.security.violation')
  async handleSecurityViolation(payload: any) {
    const { sessionId, studentId, assessmentId, eventType, violationCount, shouldTerminate } =
      payload;

    try {
      const [student, assessment] = await Promise.all([
        this.userRepository.findOne({ where: { id: studentId } }),
        this.assessmentRepository.findOne({
          where: { id: assessmentId },
          relations: ['teacher'],
        }),
      ]);

      if (!student || !assessment || !assessment.teacher) return;

      await this.notificationService.create({
        userId: assessment.teacher.id,
        title: 'Security Violation Detected',
        message: `Security violation (${eventType}) detected for ${student.firstName} ${student.lastName} in assessment: ${assessment.title}`,
        type: NotificationType.SECURITY_VIOLATION,
        priority: shouldTerminate ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
        data: {
          sessionId,
          studentId,
          studentName: `${student.firstName} ${student.lastName}`,
          assessmentId,
          assessmentTitle: assessment.title,
          eventType,
          violationCount,
          shouldTerminate,
        },
      });

      if (shouldTerminate) {
        await this.notificationService.create({
          userId: studentId,
          title: 'Assessment Session Terminated',
          message: `Your assessment session has been terminated due to security violations.`,
          type: NotificationType.ASSESSMENT_TERMINATED,
          priority: NotificationPriority.HIGH,
          data: {
            assessmentId,
            assessmentTitle: assessment.title,
            reason: 'Security violations',
          },
        });
      }

      this.logger.warn(
        `Security violation notification sent for session ${sessionId}: ${eventType}`,
      );
    } catch (error) {
      this.logger.error('Error handling security violation event:', error);
    }
  }

  @OnEvent('assessment.time.warning')
  async handleTimeWarning(payload: any) {
    const { sessionId, studentId, assessmentId, remainingMinutes, warningType } = payload;

    try {
      const assessment = await this.assessmentRepository.findOne({
        where: { id: assessmentId },
      });

      if (!assessment) return;

      const title = warningType === 'critical' ? 'Time Almost Up!' : 'Time Warning';
      const message = `You have ${remainingMinutes} minute(s) remaining in your assessment: ${assessment.title}`;

      await this.notificationService.create({
        userId: studentId,
        title,
        message,
        type: NotificationType.TIME_WARNING,
        priority:
          warningType === 'critical' ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
        data: {
          sessionId,
          assessmentId,
          assessmentTitle: assessment.title,
          remainingMinutes,
          warningType,
        },
      });

      this.logger.log(
        `Time warning sent for session ${sessionId}: ${remainingMinutes} minutes remaining`,
      );
    } catch (error) {
      this.logger.error('Error handling time warning event:', error);
    }
  }

  @OnEvent('assessment.session.expired')
  async handleSessionExpired(payload: any) {
    const { sessionId, studentId, assessmentId, autoSubmitted } = payload;

    try {
      const assessment = await this.assessmentRepository.findOne({
        where: { id: assessmentId },
      });

      if (!assessment) return;

      const message = autoSubmitted
        ? `Your assessment session has expired and been automatically submitted: ${assessment.title}`
        : `Your assessment session has expired: ${assessment.title}`;

      await this.notificationService.create({
        userId: studentId,
        title: 'Assessment Session Expired',
        message,
        type: NotificationType.SESSION_EXPIRED,
        priority: NotificationPriority.HIGH,
        data: {
          sessionId,
          assessmentId,
          assessmentTitle: assessment.title,
          autoSubmitted,
        },
      });

      this.logger.log(
        `Session expired notification sent for session ${sessionId}, autoSubmitted: ${autoSubmitted}`,
      );
    } catch (error) {
      this.logger.error('Error handling session expired event:', error);
    }
  }
}

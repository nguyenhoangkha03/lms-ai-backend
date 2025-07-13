import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WinstonService } from '@/logger/winston.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssessmentSession, SessionStatus } from '../entities/assessment-session.entity';
import { AssessmentAttempt } from '../entities/assessment-attempt.entity';
import { AttemptStatus } from '@/common/enums/assessment.enums';

@Injectable()
export class TimeManagementService {
  constructor(
    @InjectRepository(AssessmentSession)
    private readonly sessionRepository: Repository<AssessmentSession>,
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepository: Repository<AssessmentAttempt>,
    private readonly logger: WinstonService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(TimeManagementService.name);
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkTimeWarnings(): Promise<void> {
    try {
      const now = new Date();
      const warningTime = new Date(now.getTime() + 5 * 60 * 1000);

      const sessionsNearExpiry = await this.sessionRepository
        .createQueryBuilder('session')
        .where('session.status = :status', { status: SessionStatus.ACTIVE })
        .andWhere('session.expiresAt <= :warningTime', { warningTime })
        .andWhere('session.expiresAt > :now', { now })
        .getMany();

      for (const session of sessionsNearExpiry) {
        const remainingMinutes = Math.ceil(
          (session.expiresAt.getTime() - now.getTime()) / (1000 * 60),
        );

        this.eventEmitter.emit('assessment.time.warning', {
          sessionId: session.id,
          studentId: session.studentId,
          assessmentId: session.assessmentId,
          remainingMinutes,
          warningType: remainingMinutes <= 1 ? 'critical' : 'warning',
          timestamp: now,
        });

        this.logger.debug(
          `Time warning sent for session ${session.id}: ${remainingMinutes} minutes remaining`,
        );
      }
    } catch (error) {
      this.logger.error('Error checking time warnings:', error);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdueSessions(): Promise<void> {
    try {
      const now = new Date();

      const expiredSessions = await this.sessionRepository
        .createQueryBuilder('session')
        .where('session.status IN (:...statuses)', {
          statuses: [SessionStatus.ACTIVE, SessionStatus.PAUSED],
        })
        .andWhere('session.expiresAt <= :now', { now })
        .getMany();

      for (const session of expiredSessions) {
        await this.expireSession(session);
      }

      if (expiredSessions.length > 0) {
        this.logger.log(`Expired ${expiredSessions.length} overdue sessions`);
      }
    } catch (error) {
      this.logger.error('Error expiring overdue sessions:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldSessions(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.sessionRepository
        .createQueryBuilder()
        .delete()
        .where('status IN (:...statuses)', {
          statuses: [SessionStatus.COMPLETED, SessionStatus.EXPIRED, SessionStatus.TERMINATED],
        })
        .andWhere('endedAt <= :thirtyDaysAgo', { thirtyDaysAgo })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old sessions`);
    } catch (error) {
      this.logger.error('Error cleaning up old sessions:', error);
    }
  }

  async getRemainingTime(
    sessionId: string,
  ): Promise<{ remainingSeconds: number; isExpired: boolean }> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const now = new Date();
    const remainingMs = session.expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const isExpired = remainingMs <= 0;

    return { remainingSeconds, isExpired };
  }

  async extendSessionTime(
    sessionId: string,
    additionalMinutes: number,
    reason: string,
    authorizedBy: string,
  ): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const newExpiresAt = new Date(session.expiresAt.getTime() + additionalMinutes * 60 * 1000);

    await this.sessionRepository.update(sessionId, {
      expiresAt: newExpiresAt,
      metadata: JSON.stringify({
        ...session.metadataJson,
        timeExtensions: [
          ...(session.metadataJson.timeExtensions || []),
          {
            additionalMinutes,
            reason,
            authorizedBy,
            extendedAt: new Date().toISOString(),
          },
        ],
      }),
    });

    this.logger.log(
      `Extended session ${sessionId} by ${additionalMinutes} minutes. Reason: ${reason}`,
    );
  }

  private async expireSession(session: AssessmentSession): Promise<void> {
    try {
      await this.sessionRepository.update(session.id, {
        status: SessionStatus.EXPIRED,
        endedAt: new Date(),
      });

      if (session.attemptId && session.currentAnswers) {
        const currentAnswers = session.currentAnswersJson;
        if (Object.keys(currentAnswers).length > 0) {
          await this.attemptRepository.update(session.attemptId, {
            status: AttemptStatus.TIMED_OUT,
            submittedAt: new Date(),
            answers: session.currentAnswers,
            timeTaken: session.durationInSeconds,
          });

          this.logger.log(`Auto-submitted attempt ${session.attemptId} due to timeout`);
        }
      }

      this.eventEmitter.emit('assessment.session.expired', {
        sessionId: session.id,
        studentId: session.studentId,
        assessmentId: session.assessmentId,
        attemptId: session.attemptId,
        autoSubmitted: !!session.currentAnswers,
        timestamp: new Date(),
      });

      this.logger.log(`Expired session ${session.id} for student ${session.studentId}`);
    } catch (error) {
      this.logger.error(`Error expiring session ${session.id}:`, error);
    }
  }
}

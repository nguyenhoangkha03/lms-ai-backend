import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutoringSession } from '../entities/tutoring-session.entity';
import { TutoringInteraction } from '../entities/tutoring-interaction.entity';
import { LearningStyleProfile } from '../entities/learning-style-profile.entity';
import { CacheService } from '@/cache/cache.service';
import { CreateTutoringSessionDto, UpdateTutoringSessionDto } from '../dto/tutoring.dto';
import { SessionStatus } from '@/common/enums/tutoring.enums';

@Injectable()
export class TutoringSessionService {
  private readonly logger = new Logger(TutoringSessionService.name);

  constructor(
    @InjectRepository(TutoringSession)
    private readonly sessionRepository: Repository<TutoringSession>,
    @InjectRepository(TutoringInteraction)
    private readonly interactionRepository: Repository<TutoringInteraction>,
    @InjectRepository(LearningStyleProfile)
    private readonly learningStyleRepository: Repository<LearningStyleProfile>,
    private readonly cacheService: CacheService,
  ) {}

  async createSession(
    studentId: string,
    createSessionDto: CreateTutoringSessionDto,
  ): Promise<TutoringSession> {
    try {
      this.logger.log(`Creating tutoring session for student: ${studentId}`);

      // Get student's learning style profile if exists
      const learningProfile = await this.learningStyleRepository.findOne({
        where: { userId: studentId },
      });

      const session = this.sessionRepository.create({
        studentId,
        ...createSessionDto,
        adaptiveSettings: {
          difficultyAdjustmentFactor: 0.1,
          hintThreshold: 3,
          masteryThreshold: 0.8,
          strugglingThreshold: 0.6,
        },
        performanceMetrics: {
          averageResponseTime: 0,
          accuracyRate: 0,
          conceptMastery: {},
          engagementScore: 0,
        },
        detectedLearningStyle: learningProfile?.primaryLearningStyle,
      });

      const savedSession = await this.sessionRepository.save(session);

      // Cache session for quick access
      await this.cacheService.set(
        `tutoring_session:${savedSession.id}`,
        savedSession,
        3600, // 1 hour
      );

      this.logger.log(`Tutoring session created: ${savedSession.id}`);
      return savedSession;
    } catch (error) {
      this.logger.error(`Failed to create tutoring session: ${error.message}`);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<TutoringSession> {
    try {
      // Try cache first
      const cached = await this.cacheService.get<TutoringSession>(`tutoring_session:${sessionId}`);
      if (cached) {
        return cached;
      }

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['student', 'course', 'lesson', 'interactions'],
      });

      if (!session) {
        throw new NotFoundException(`Tutoring session not found: ${sessionId}`);
      }

      // Cache for future requests
      await this.cacheService.set(`tutoring_session:${sessionId}`, session, 3600);

      return session;
    } catch (error) {
      this.logger.error(`Failed to get tutoring session: ${error.message}`);
      throw error;
    }
  }

  async updateSession(
    sessionId: string,
    updateSessionDto: UpdateTutoringSessionDto,
  ): Promise<TutoringSession> {
    try {
      const session = await this.getSession(sessionId);

      Object.assign(session, updateSessionDto);

      if (updateSessionDto.status === SessionStatus.COMPLETED && !session.endedAt) {
        session.endedAt = new Date();
        session.totalDuration = Math.floor(
          (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
        );
      }

      const updatedSession = await this.sessionRepository.save(session);

      // Update cache
      await this.cacheService.set(`tutoring_session:${sessionId}`, updatedSession, 3600);

      this.logger.log(`Tutoring session updated: ${sessionId}`);
      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to update tutoring session: ${error.message}`);
      throw error;
    }
  }

  async getActiveSession(studentId: string): Promise<TutoringSession | null> {
    try {
      const session = await this.sessionRepository.findOne({
        where: {
          studentId,
          status: SessionStatus.ACTIVE,
        },
        relations: ['course', 'lesson'],
        order: { startedAt: 'DESC' },
      });

      return session;
    } catch (error) {
      this.logger.error(`Failed to get active session: ${error.message}`);
      throw error;
    }
  }

  async getSessionsByStudent(
    studentId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<{ sessions: TutoringSession[]; total: number }> {
    try {
      const [sessions, total] = await this.sessionRepository.findAndCount({
        where: { studentId },
        relations: ['course', 'lesson'],
        order: { startedAt: 'DESC' },
        take: limit,
        skip: offset,
      });

      return { sessions, total };
    } catch (error) {
      this.logger.error(`Failed to get sessions by student: ${error.message}`);
      throw error;
    }
  }

  async updateSessionMetrics(
    sessionId: string,
    metrics: {
      averageResponseTime?: number;
      accuracyRate?: number;
      conceptMastery?: Record<string, number>;
      engagementScore?: number;
    },
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);

      session.performanceMetrics = {
        ...session.performanceMetrics,
        ...metrics,
      };

      await this.sessionRepository.save(session);

      // Update cache
      await this.cacheService.set(`tutoring_session:${sessionId}`, session, 3600);

      this.logger.log(`Session metrics updated: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to update session metrics: ${error.message}`);
      throw error;
    }
  }

  async endSession(sessionId: string, summary?: string): Promise<TutoringSession> {
    try {
      const session = await this.getSession(sessionId);

      if (session.status === SessionStatus.COMPLETED) {
        throw new BadRequestException('Session is already completed');
      }

      session.status = SessionStatus.COMPLETED;
      session.endedAt = new Date();
      session.totalDuration = Math.floor(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
      );

      if (summary) {
        session.sessionSummary = summary;
      }

      const updatedSession = await this.sessionRepository.save(session);

      // Update cache
      await this.cacheService.set(`tutoring_session:${sessionId}`, updatedSession, 3600);

      this.logger.log(`Session ended: ${sessionId}`);
      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to end session: ${error.message}`);
      throw error;
    }
  }

  async getSessionAnalytics(sessionId: string): Promise<{
    totalInteractions: number;
    averageResponseTime: number;
    hintsUsed: number;
    topicsExplored: string[];
    difficultyProgression: string[];
    learningObjectivesAchieved: string[];
  }> {
    try {
      const _session = await this.getSession(sessionId);

      const interactions = await this.interactionRepository.find({
        where: { sessionId },
        order: { createdAt: 'ASC' },
      });

      const totalInteractions = interactions.length;
      const averageResponseTime =
        interactions.reduce((sum, i) => sum + i.responseTime, 0) / totalInteractions || 0;
      const hintsUsed = interactions.filter(i => i.hintLevel > 0).length;

      const topicsExplored = [
        ...new Set(interactions.map(i => i.topicCovered).filter(Boolean)),
      ] as string[];

      const difficultyProgression = interactions
        .map(i => i.difficultyLevel)
        .filter(Boolean) as string[];

      // Mock learning objectives - would be calculated based on actual interaction content
      const learningObjectivesAchieved = topicsExplored.map(topic => `Master ${topic} concepts`);

      return {
        totalInteractions,
        averageResponseTime,
        hintsUsed,
        topicsExplored,
        difficultyProgression,
        learningObjectivesAchieved,
      };
    } catch (error) {
      this.logger.error(`Failed to get session analytics: ${error.message}`);
      throw error;
    }
  }
}

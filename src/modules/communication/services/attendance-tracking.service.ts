import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoParticipant } from '../entities/video-participant.entity';
import { VideoSession } from '../entities/video-session.entity';
import { CacheService } from '@/cache/cache.service';

export interface AttendanceRecord {
  userId: string;
  sessionId: string;
  joinTime: Date;
  leaveTime?: Date;
  duration: number;
  isPresent: boolean;
}

@Injectable()
export class AttendanceTrackingService {
  private readonly logger = new Logger(AttendanceTrackingService.name);
  private readonly activeTracking = new Map<string, Map<string, Date>>(); // sessionId -> userId -> joinTime

  constructor(
    @InjectRepository(VideoParticipant)
    private readonly participantRepository: Repository<VideoParticipant>,
    @InjectRepository(VideoSession)
    private readonly sessionRepository: Repository<VideoSession>,
    private readonly cacheService: CacheService,
  ) {}

  async startTracking(sessionId: string): Promise<void> {
    this.activeTracking.set(sessionId, new Map());

    this.logger.debug(`Started attendance tracking for session: ${sessionId}`);
  }

  async endTracking(sessionId: string): Promise<void> {
    const sessionTracking = this.activeTracking.get(sessionId);

    if (sessionTracking) {
      // Process final attendance records
      for (const [userId, _joinTime] of sessionTracking.entries()) {
        await this.recordLeave(sessionId, userId);
      }

      this.activeTracking.delete(sessionId);
    }

    this.logger.debug(`Ended attendance tracking for session: ${sessionId}`);
  }

  async recordJoin(sessionId: string, userId: string): Promise<void> {
    const sessionTracking = this.activeTracking.get(sessionId);

    if (sessionTracking) {
      sessionTracking.set(userId, new Date());
    }

    // Update participant join time in database
    await this.participantRepository.update({ sessionId, userId }, { joinedAt: new Date() });

    this.logger.debug(`Recorded join for user ${userId} in session ${sessionId}`);
  }

  async recordLeave(sessionId: string, userId: string): Promise<void> {
    const sessionTracking = this.activeTracking.get(sessionId);
    let joinTime: Date | undefined;

    if (sessionTracking) {
      joinTime = sessionTracking.get(userId);
      sessionTracking.delete(userId);
    }

    const leaveTime = new Date();
    const duration = joinTime ? Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000) : 0;

    // Update participant leave time and duration in database
    await this.participantRepository.update(
      { sessionId, userId },
      {
        leftAt: leaveTime,
        duration,
      },
    );

    this.logger.debug(
      `Recorded leave for user ${userId} in session ${sessionId}, duration: ${duration}s`,
    );
  }

  async getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const participants = await this.participantRepository.find({
      where: { sessionId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return participants.map(participant => ({
      userId: participant.userId,
      sessionId: participant.sessionId,
      joinTime: participant.joinedAt,
      leaveTime: participant.leftAt,
      duration: participant.duration || 0,
      isPresent: !!participant.joinedAt,
    }));
  }

  async getUserAttendanceHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AttendanceRecord[]> {
    const queryBuilder = this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.session', 'session')
      .where('participant.userId = :userId', { userId })
      .andWhere('participant.joinedAt IS NOT NULL')
      .orderBy('session.scheduledStart', 'DESC');

    if (startDate) {
      queryBuilder.andWhere('session.scheduledStart >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('session.scheduledStart <= :endDate', { endDate });
    }

    const participants = await queryBuilder.getMany();

    return participants.map(participant => ({
      userId: participant.userId,
      sessionId: participant.sessionId,
      joinTime: participant.joinedAt,
      leaveTime: participant.leftAt,
      duration: participant.duration || 0,
      isPresent: true,
    }));
  }

  async getAttendanceStats(sessionId: string): Promise<{
    totalParticipants: number;
    attendedParticipants: number;
    averageDuration: number;
    attendanceRate: number;
  }> {
    const cacheKey = `attendance_stats:${sessionId}`;

    const cached = await this.cacheService.get<{
      totalParticipants: number;
      attendedParticipants: number;
      averageDuration: number;
      attendanceRate: number;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    const participants = await this.participantRepository.find({
      where: { sessionId },
    });

    const totalParticipants = participants.length;
    const attendedParticipants = participants.filter(p => p.joinedAt).length;
    const totalDuration = participants
      .filter(p => p.duration)
      .reduce((sum, p) => sum + p.duration!, 0);

    const averageDuration = attendedParticipants > 0 ? totalDuration / attendedParticipants : 0;
    const attendanceRate =
      totalParticipants > 0 ? (attendedParticipants / totalParticipants) * 100 : 0;

    const stats = {
      totalParticipants,
      attendedParticipants,
      averageDuration,
      attendanceRate,
    };

    await this.cacheService.set(cacheKey, stats, 3600);

    return stats;
  }

  async exportAttendance(sessionId: string): Promise<any[]> {
    const attendance = await this.getSessionAttendance(sessionId);

    return attendance.map(record => ({
      'User ID': record.userId,
      'Join Time': record.joinTime?.toISOString(),
      'Leave Time': record.leaveTime?.toISOString(),
      'Duration (minutes)': Math.round(record.duration / 60),
      Present: record.isPresent ? 'Yes' : 'No',
    }));
  }
}

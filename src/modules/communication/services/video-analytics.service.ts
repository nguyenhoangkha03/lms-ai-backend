import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { VideoSession } from '../entities/video-session.entity';
import { VideoParticipant } from '../entities/video-participant.entity';
import { AttendanceTrackingService } from './attendance-tracking.service';
import { CacheService } from '@/cache/cache.service';
import { VideoSessionType, VideoSessionStatus } from '@/common/enums/communication.enums';

interface SessionAnalytics {
  sessionId: string;
  title: string;
  duration: number;
  totalParticipants: number;
  attendedParticipants: number;
  averageAttendanceDuration: number;
  attendanceRate: number;
  engagementScore: number;
  participantInteractions: {
    chatMessages: number;
    pollResponses: number;
    handRaises: number;
    screenShares: number;
  };
  technicalIssues: {
    connectionIssues: number;
    audioIssues: number;
    videoIssues: number;
  };
  qualityMetrics: {
    averageAudioQuality: number;
    averageVideoQuality: number;
    averageNetworkLatency: number;
  };
}

interface UserEngagementMetrics {
  userId: string;
  totalSessions: number;
  totalDuration: number;
  averageDuration: number;
  attendanceRate: number;
  engagementScore: number;
  participationMetrics: {
    chatMessages: number;
    pollResponses: number;
    handRaises: number;
    screenShareTime: number;
    speakingTime: number;
  };
}

@Injectable()
export class VideoAnalyticsService {
  private readonly logger = new Logger(VideoAnalyticsService.name);

  constructor(
    @InjectRepository(VideoSession)
    private readonly sessionRepository: Repository<VideoSession>,
    @InjectRepository(VideoParticipant)
    private readonly participantRepository: Repository<VideoParticipant>,
    private readonly attendanceService: AttendanceTrackingService,
    private readonly cacheService: CacheService,
  ) {}

  async getSessionAnalytics(sessionId: string): Promise<SessionAnalytics> {
    const cacheKey = `session_analytics:${sessionId}`;

    const cached = await this.cacheService.get<SessionAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['participants'],
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const participants = await this.participantRepository.find({
      where: { sessionId },
    });

    // Calculate session duration
    const duration =
      session.actualStart && session.actualEnd
        ? Math.floor((session.actualEnd.getTime() - session.actualStart.getTime()) / 1000)
        : 0;

    // Calculate attendance metrics
    const totalParticipants = participants.length;
    const attendedParticipants = participants.filter(p => p.joinedAt).length;
    const totalAttendanceDuration = participants
      .filter(p => p.duration)
      .reduce((sum, p) => sum + p.duration!, 0);

    const averageAttendanceDuration =
      attendedParticipants > 0 ? totalAttendanceDuration / attendedParticipants : 0;

    const attendanceRate =
      totalParticipants > 0 ? (attendedParticipants / totalParticipants) * 100 : 0;

    // Calculate engagement metrics
    const participantInteractions = {
      chatMessages: participants.reduce(
        (sum, p) => sum + (p.engagementMetrics?.chatMessagesSent || 0),
        0,
      ),
      pollResponses: participants.reduce(
        (sum, p) => sum + (p.engagementMetrics?.pollsAnswered || 0),
        0,
      ),
      handRaises: participants.reduce(
        (sum, p) => sum + (p.engagementMetrics?.handRaisedCount || 0),
        0,
      ),
      screenShares: participants.filter(p => p.engagementMetrics!.screenShareDuration! > 0).length,
    };

    const engagementScore = this.calculateEngagementScore(participants);

    // Calculate technical issues
    const technicalIssues = {
      connectionIssues: participants.filter(p =>
        p.technicalIssues?.some(issue => issue.issue.includes('connection')),
      ).length,
      audioIssues: participants.filter(p =>
        p.technicalIssues?.some(issue => issue.issue.includes('audio')),
      ).length,
      videoIssues: participants.filter(p =>
        p.technicalIssues?.some(issue => issue.issue.includes('video')),
      ).length,
    };

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(participants);

    const analytics: SessionAnalytics = {
      sessionId,
      title: session.title,
      duration,
      totalParticipants,
      attendedParticipants,
      averageAttendanceDuration,
      attendanceRate,
      engagementScore,
      participantInteractions,
      technicalIssues,
      qualityMetrics,
    };

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, analytics, 3600);

    return analytics;
  }

  async getUserEngagementMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserEngagementMetrics> {
    const queryBuilder = this.participantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.session', 'session')
      .where('participant.userId = :userId', { userId })
      .andWhere('participant.joinedAt IS NOT NULL');

    if (startDate) {
      queryBuilder.andWhere('session.scheduledStart >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('session.scheduledStart <= :endDate', { endDate });
    }

    const participations = await queryBuilder.getMany();

    const totalSessions = participations.length;
    const totalDuration = participations.reduce((sum, p) => sum + (p.duration || 0), 0);
    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Calculate attendance rate (sessions attended vs total invited)
    const allInvitations = await this.participantRepository.count({
      where: { userId },
    });
    const attendanceRate = allInvitations > 0 ? (totalSessions / allInvitations) * 100 : 0;

    // Calculate participation metrics
    const participationMetrics = {
      chatMessages: participations.reduce(
        (sum, p) => sum + (p.engagementMetrics?.chatMessagesSent || 0),
        0,
      ),
      pollResponses: participations.reduce(
        (sum, p) => sum + (p.engagementMetrics?.pollsAnswered || 0),
        0,
      ),
      handRaises: participations.reduce(
        (sum, p) => sum + (p.engagementMetrics?.handRaisedCount || 0),
        0,
      ),
      screenShareTime: participations.reduce(
        (sum, p) => sum + (p.engagementMetrics?.screenShareDuration || 0),
        0,
      ),
      speakingTime: participations.reduce(
        (sum, p) => sum + (p.engagementMetrics?.speakingTime || 0),
        0,
      ),
    };

    const engagementScore = this.calculateUserEngagementScore(participations);

    return {
      userId,
      totalSessions,
      totalDuration,
      averageDuration,
      attendanceRate,
      engagementScore,
      participationMetrics,
    };
  }

  async getCourseAnalytics(
    courseId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalSessions: number;
    totalDuration: number;
    averageAttendance: number;
    engagementTrend: number[];
    participantGrowth: number[];
  }> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.courseId = :courseId', { courseId })
      .andWhere('session.status = :status', { status: VideoSessionStatus.COMPLETED });

    if (startDate) {
      queryBuilder.andWhere('session.scheduledStart >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('session.scheduledStart <= :endDate', { endDate });
    }

    const sessions = await queryBuilder.getMany();

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, s) => {
      if (s.actualStart && s.actualEnd) {
        return sum + Math.floor((s.actualEnd.getTime() - s.actualStart.getTime()) / 1000);
      }
      return sum;
    }, 0);

    // Calculate average attendance across all sessions
    const attendanceData = await Promise.all(
      sessions.map(session => this.attendanceService.getAttendanceStats(session.id)),
    );

    const averageAttendance =
      attendanceData.length > 0
        ? attendanceData.reduce((sum, data) => sum + data.attendanceRate, 0) / attendanceData.length
        : 0;

    // Calculate engagement trend (simplified - by week)
    const engagementTrend = await this.calculateEngagementTrend(sessions);

    // Calculate participant growth
    const participantGrowth = await this.calculateParticipantGrowth(sessions);

    return {
      totalSessions,
      totalDuration,
      averageAttendance,
      engagementTrend,
      participantGrowth,
    };
  }

  async getSystemwideAnalytics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalSessions: number;
    totalParticipants: number;
    totalDuration: number;
    averageSessionDuration: number;
    popularSessionTypes: { type: VideoSessionType; count: number }[];
    providerUsage: { provider: string; count: number }[];
    dailyStats: { date: string; sessions: number; participants: number }[];
  }> {
    const sessions = await this.sessionRepository.find({
      where: {
        scheduledStart: Between(startDate, endDate),
        status: VideoSessionStatus.COMPLETED,
      },
      relations: ['participants'],
    });

    const totalSessions = sessions.length;
    const totalParticipants = sessions.reduce((sum, s) => sum + s.totalParticipants, 0);
    const totalDuration = sessions.reduce((sum, s) => {
      if (s.actualStart && s.actualEnd) {
        return sum + Math.floor((s.actualEnd.getTime() - s.actualStart.getTime()) / 1000);
      }
      return sum;
    }, 0);

    const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Calculate popular session types
    const sessionTypeCount = new Map<VideoSessionType, number>();
    sessions.forEach(session => {
      const count = sessionTypeCount.get(session.sessionType) || 0;
      sessionTypeCount.set(session.sessionType, count + 1);
    });

    const popularSessionTypes = Array.from(sessionTypeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate provider usage
    const providerCount = new Map<string, number>();
    sessions.forEach(session => {
      const count = providerCount.get(session.provider) || 0;
      providerCount.set(session.provider, count + 1);
    });

    const providerUsage = Array.from(providerCount.entries())
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate daily stats
    const dailyStats = this.calculateDailyStats(sessions, startDate, endDate);

    return {
      totalSessions,
      totalParticipants,
      totalDuration,
      averageSessionDuration,
      popularSessionTypes,
      providerUsage,
      dailyStats,
    };
  }

  private calculateEngagementScore(participants: VideoParticipant[]): number {
    if (participants.length === 0) return 0;

    let totalScore = 0;
    let validParticipants = 0;

    participants.forEach(participant => {
      if (!participant.engagementMetrics) return;

      const metrics = participant.engagementMetrics;
      let score = 0;

      // Weight different engagement activities
      score += (metrics.chatMessagesSent || 0) * 2;
      score += (metrics.pollsAnswered || 0) * 3;
      score += (metrics.handRaisedCount || 0) * 5;
      score += Math.min((metrics.screenShareDuration || 0) / 60, 10); // Max 10 points for screen share
      score += Math.min((metrics.speakingTime || 0) / 60, 15); // Max 15 points for speaking

      // Normalize by participation time
      const participationMinutes = (participant.duration || 0) / 60;
      if (participationMinutes > 0) {
        score = score / participationMinutes;
        totalScore += Math.min(score, 10); // Cap at 10 for outliers
        validParticipants++;
      }
    });

    return validParticipants > 0 ? totalScore / validParticipants : 0;
  }

  private calculateUserEngagementScore(participations: VideoParticipant[]): number {
    if (participations.length === 0) return 0;

    let totalScore = 0;
    participations.forEach(participation => {
      if (!participation.engagementMetrics) return;

      const metrics = participation.engagementMetrics;
      let score = 0;

      score += (metrics.chatMessagesSent || 0) * 0.5;
      score += (metrics.pollsAnswered || 0) * 1;
      score += (metrics.handRaisedCount || 0) * 2;
      score += (metrics.participationRate || 0) * 3;

      totalScore += Math.min(score, 10);
    });

    return totalScore / participations.length;
  }

  private calculateQualityMetrics(participants: VideoParticipant[]): {
    averageAudioQuality: number;
    averageVideoQuality: number;
    averageNetworkLatency: number;
  } {
    const validParticipants = participants.filter(p => p.connectionQuality);

    if (validParticipants.length === 0) {
      return {
        averageAudioQuality: 0,
        averageVideoQuality: 0,
        averageNetworkLatency: 0,
      };
    }

    const audioQuality =
      validParticipants.reduce((sum, p) => sum + (p.connectionQuality?.audioQuality || 0), 0) /
      validParticipants.length;

    const videoQuality =
      validParticipants.reduce((sum, p) => sum + (p.connectionQuality?.videoQuality || 0), 0) /
      validParticipants.length;

    const networkLatency =
      validParticipants.reduce((sum, p) => sum + (p.connectionQuality?.networkLatency || 0), 0) /
      validParticipants.length;

    return {
      averageAudioQuality: audioQuality,
      averageVideoQuality: videoQuality,
      averageNetworkLatency: networkLatency,
    };
  }

  private async calculateEngagementTrend(sessions: VideoSession[]): Promise<number[]> {
    // Simplified engagement trend calculation
    // Group sessions by week and calculate average engagement
    const weeklyEngagement: number[] = [];

    // This would need more sophisticated implementation
    for (let i = 0; i < Math.min(sessions.length, 12); i++) {
      const session = sessions[i];
      const analytics = await this.getSessionAnalytics(session.id);
      weeklyEngagement.push(analytics.engagementScore);
    }

    return weeklyEngagement;
  }

  private async calculateParticipantGrowth(sessions: VideoSession[]): Promise<number[]> {
    // Calculate participant growth over time
    const growth: number[] = [];

    sessions.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());

    let cumulativeParticipants = 0;
    sessions.forEach(session => {
      cumulativeParticipants += session.totalParticipants;
      growth.push(cumulativeParticipants);
    });

    return growth;
  }

  private calculateDailyStats(
    sessions: VideoSession[],
    startDate: Date,
    endDate: Date,
  ): { date: string; sessions: number; participants: number }[] {
    const dailyStats: { date: string; sessions: number; participants: number }[] = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      const daysSessions = sessions.filter(session => {
        const sessionDate = session.scheduledStart.toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      const sessionCount = daysSessions.length;
      const participantCount = daysSessions.reduce((sum, s) => sum + s.totalParticipants, 0);

      dailyStats.push({
        date: dateStr,
        sessions: sessionCount,
        participants: participantCount,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyStats;
  }
}

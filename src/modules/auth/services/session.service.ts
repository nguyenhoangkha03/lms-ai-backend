import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService as CustomCacheService } from '@/cache/cache.service';
import { randomBytes } from 'crypto';
import { add } from 'date-fns';
import { WinstonLoggerService } from '@/logger/winston-logger.service';
import { ActiveSession, SessionData, SessionStatistics } from '../interfaces/session.interface';

@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly BLACKLIST_PREFIX = 'blacklist:';
  private readonly SESSION_STATS_PREFIX = 'session_stats:';

  constructor(
    private readonly cacheService: CustomCacheService,
    private readonly configService: ConfigService,
    private readonly logger: WinstonLoggerService,
  ) {
    this.logger.setContext(SessionService.name);
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    userType: 'student' | 'teacher' | 'admin',
    userDetails: {
      email: string;
      username: string;
      roles: string[];
      permissions: string[];
    },
    deviceInfo: SessionData['deviceInfo'],
    loginMethod: SessionData['loginMethod'] = 'local',
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = add(now, {
      seconds: this.configService.get<number>('auth.sessionMaxAge', 3600),
    });

    const sessionData: SessionData = {
      userId,
      userType,
      email: userDetails.email,
      username: userDetails.username,
      roles: userDetails.roles,
      permissions: userDetails.permissions,
      deviceInfo,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      isActive: true,
      loginMethod,
    };

    // Store session data
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const sessionTtl = this.configService.get<number>('auth.sessionMaxAge', 3600);

    await this.cacheService.set(sessionKey, JSON.stringify(sessionData), sessionTtl);

    // Add to user's active sessions
    await this.addToUserSessions(userId, sessionId, deviceInfo);

    // Update session statistics
    await this.updateSessionStats(userId, 'created', loginMethod, deviceInfo);

    // Enforce max sessions per user
    await this.enforceMaxSessionsPerUser(userId);

    this.logger.log(`Session created for user ${userId}: ${sessionId}`);
    return sessionId;
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const cachedData = await this.cacheService.get(sessionKey);

    if (!cachedData) {
      return null;
    }

    const sessionData: SessionData = JSON.parse(cachedData as string);

    // Check if session is still valid
    if (!sessionData.isActive || new Date() > sessionData.expiresAt) {
      await this.destroySession(sessionId);
      return null;
    }

    return sessionData;
  }

  /**
   * Update session last access time
   */
  async touchSession(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);

    if (!sessionData) {
      return;
    }

    sessionData.lastAccessedAt = new Date();

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const sessionTtl = this.configService.get<number>('auth.sessionMaxAge', 3600);

    await this.cacheService.set(sessionKey, JSON.stringify(sessionData), sessionTtl);
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    const sessionData = await this.getSession(sessionId);

    if (sessionData) {
      // Remove from user's active sessions
      await this.removeFromUserSessions(sessionData.userId, sessionId);

      // Update statistics
      await this.updateSessionStats(
        sessionData.userId,
        'destroyed',
        sessionData.loginMethod,
        sessionData.deviceInfo,
      );
    }

    // Add to blacklist temporarily
    const blacklistKey = `${this.BLACKLIST_PREFIX}${sessionId}`;
    await this.cacheService.set(blacklistKey, 'true', 3600); // 1 hour

    // Remove session data
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    await this.cacheService.del(sessionKey);

    this.logger.log(`Session destroyed: ${sessionId}`);
  }

  /**
   * Destroy all sessions for user
   */
  async destroyAllUserSessions(userId: string, excludeSessionId?: string): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const userSessionsData = await this.cacheService.get(userSessionsKey);

    if (!userSessionsData) {
      return;
    }

    const userSessions: ActiveSession[] = JSON.parse(userSessionsData as string);

    for (const session of userSessions) {
      if (excludeSessionId && session.sessionId === excludeSessionId) {
        continue;
      }

      await this.destroySession(session.sessionId);
    }

    this.logger.log(`All sessions destroyed for user: ${userId}`);
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId: string): Promise<ActiveSession[]> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const userSessionsData = await this.cacheService.get(userSessionsKey);

    if (!userSessionsData) {
      return [];
    }

    const sessions: ActiveSession[] = JSON.parse(userSessionsData as string);

    // Filter out expired sessions
    const validSessions: ActiveSession[] = [];

    for (const session of sessions) {
      const sessionData = await this.getSession(session.sessionId);
      if (sessionData) {
        validSessions.push(session);
      }
    }

    // Update the cache with valid sessions only
    if (validSessions.length !== sessions.length) {
      await this.cacheService.set(
        userSessionsKey,
        JSON.stringify(validSessions),
        7 * 24 * 60 * 60, // 7 days
      );
    }

    return validSessions;
  }

  /**
   * Check if session is blacklisted
   */
  async isSessionBlacklisted(sessionId: string): Promise<boolean> {
    const blacklistKey = `${this.BLACKLIST_PREFIX}${sessionId}`;
    const isBlacklisted = await this.cacheService.get(blacklistKey);
    return !!isBlacklisted;
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, extensionSeconds: number = 3600): Promise<void> {
    const sessionData = await this.getSession(sessionId);

    if (!sessionData) {
      throw new UnauthorizedException('Session not found');
    }

    sessionData.expiresAt = add(new Date(), { seconds: extensionSeconds });

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    await this.cacheService.set(sessionKey, JSON.stringify(sessionData), extensionSeconds);

    this.logger.log(`Session extended: ${sessionId}`);
  }

  /**
   * Get session statistics for user
   */
  async getUserSessionStats(userId: string): Promise<SessionStatistics> {
    const statsKey = `${this.SESSION_STATS_PREFIX}${userId}`;
    const statsData = await this.cacheService.get(statsKey);

    if (!statsData) {
      return {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        deviceBreakdown: {},
        loginMethodBreakdown: {},
      };
    }

    return JSON.parse(statsData as string);
  }

  /**
   * Validate session and return user data
   */
  async validateSession(sessionId: string): Promise<{
    userId: string;
    userType: string;
    email: string;
    username: string;
    roles: string[];
    permissions: string[];
  } | null> {
    if (await this.isSessionBlacklisted(sessionId)) {
      return null;
    }

    const sessionData = await this.getSession(sessionId);

    if (!sessionData) {
      return null;
    }

    // Update last access time
    await this.touchSession(sessionId);

    return {
      userId: sessionData.userId,
      userType: sessionData.userType,
      email: sessionData.email,
      username: sessionData.username,
      roles: sessionData.roles,
      permissions: sessionData.permissions,
    };
  }

  /**
   * Clean up expired sessions (scheduled job)
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleanedCount = 0;

    // This is a simplified version - in production, you'd want to iterate through
    // user sessions and check for expired ones
    const pattern = `${this.SESSION_PREFIX}*`;
    const keys = await this.cacheService.getKeys(pattern);

    for (const key of keys) {
      const sessionData = await this.cacheService.get(key);
      if (sessionData) {
        const session: SessionData = JSON.parse(sessionData as string);
        if (new Date() > session.expiresAt || !session.isActive) {
          const sessionId = key.replace(this.SESSION_PREFIX, '');
          await this.destroySession(sessionId);
          cleanedCount++;
        }
      }
    }

    this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
    return cleanedCount;
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomHex = randomBytes(32).toString('hex');
    return `${timestamp}-${randomHex}`;
  }

  /**
   * Add session to user's active sessions
   */
  private async addToUserSessions(
    userId: string,
    sessionId: string,
    deviceInfo: SessionData['deviceInfo'],
  ): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const existingSessions = await this.getUserSessions(userId);

    const newSession: ActiveSession = {
      sessionId,
      deviceInfo,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };

    const updatedSessions = [...existingSessions, newSession];

    await this.cacheService.set(
      userSessionsKey,
      JSON.stringify(updatedSessions),
      7 * 24 * 60 * 60, // 7 days
    );
  }

  /**
   * Remove session from user's active sessions
   */
  private async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const existingSessions = await this.getUserSessions(userId);

    const filteredSessions = existingSessions.filter(s => s.sessionId !== sessionId);

    if (filteredSessions.length === 0) {
      await this.cacheService.del(userSessionsKey);
    } else {
      await this.cacheService.set(
        userSessionsKey,
        JSON.stringify(filteredSessions),
        7 * 24 * 60 * 60, // 7 days
      );
    }
  }

  /**
   * Enforce maximum sessions per user
   */
  private async enforceMaxSessionsPerUser(userId: string): Promise<void> {
    const maxSessions = this.configService.get<number>('auth.maxSessionsPerUser', 5);
    const userSessions = await this.getUserSessions(userId);

    if (userSessions.length > maxSessions) {
      // Sort by creation date and remove oldest sessions
      const sortedSessions = userSessions.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      const sessionsToRemove = sortedSessions.slice(0, userSessions.length - maxSessions);

      for (const session of sessionsToRemove) {
        await this.destroySession(session.sessionId);
      }

      this.logger.log(
        `Enforced max sessions limit for user ${userId}: removed ${sessionsToRemove.length} old sessions`,
      );
    }
  }

  /**
   * Update session statistics
   */
  private async updateSessionStats(
    userId: string,
    action: 'created' | 'destroyed',
    loginMethod: SessionData['loginMethod'],
    deviceInfo: SessionData['deviceInfo'],
  ): Promise<void> {
    const statsKey = `${this.SESSION_STATS_PREFIX}${userId}`;
    const existingStats = await this.getUserSessionStats(userId);

    if (action === 'created') {
      existingStats.totalSessions++;
      existingStats.activeSessions++;
      existingStats.loginMethodBreakdown[loginMethod] =
        (existingStats.loginMethodBreakdown[loginMethod] || 0) + 1;
      existingStats.deviceBreakdown[deviceInfo.device] =
        (existingStats.deviceBreakdown[deviceInfo.device] || 0) + 1;
    } else {
      existingStats.activeSessions = Math.max(0, existingStats.activeSessions - 1);
      existingStats.expiredSessions++;
    }

    await this.cacheService.set(
      statsKey,
      JSON.stringify(existingStats),
      30 * 24 * 60 * 60, // 30 days
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumUserReputation } from '../entities/forum-user-reputation.entity';
import { ForumReputationHistory } from '../entities/forum-reputation-history.entity';
import { ForumUserBadge } from '../entities/forum-user-badge.entity';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';
import { FORUM_CONSTANTS } from '@/common/constants/forum.constants';
import { ForumBadgeType } from '@/common/enums/forum.enums';

@Injectable()
export class ForumReputationService {
  constructor(
    @InjectRepository(ForumUserReputation)
    private readonly reputationRepository: Repository<ForumUserReputation>,
    @InjectRepository(ForumReputationHistory)
    private readonly historyRepository: Repository<ForumReputationHistory>,
    @InjectRepository(ForumUserBadge)
    private readonly badgeRepository: Repository<ForumUserBadge>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {}

  async awardPoints(
    userId: string,
    reason: string,
    points: number,
    relatedPostId?: string,
    relatedUserId?: string,
    multiplier = 1.0,
  ): Promise<void> {
    try {
      // Check daily limits
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayPoints = await this.historyRepository.sum('points', {
        userId,
        createdAt: new Date(today),
      });

      if (todayPoints && todayPoints >= FORUM_CONSTANTS.REPUTATION.DAILY_LIMIT) {
        this.logger.warn(`User reached daily reputation limit, {
          ${userId},
          ${todayPoints},
          limit: ${FORUM_CONSTANTS.REPUTATION.DAILY_LIMIT},
        }`);
        return;
      }

      const finalPoints = Math.round(points * multiplier);

      // Get or create user reputation
      let userReputation = await this.reputationRepository.findOne({
        where: { userId },
      });

      if (!userReputation) {
        userReputation = this.reputationRepository.create({
          userId,
          score: FORUM_CONSTANTS.REPUTATION.DEFAULT_SCORE,
          createdBy: userId,
          updatedBy: userId,
        });
      }

      // Update reputation
      userReputation.score += finalPoints;
      userReputation.updatedBy = userId;

      // Update daily stats
      const currentDate = new Date().toISOString().split('T')[0];
      if (userReputation.lastActivityDate?.toISOString().split('T')[0] !== currentDate) {
        userReputation.todayPoints = finalPoints;
        userReputation.lastActivityDate = new Date();
      } else {
        userReputation.todayPoints += finalPoints;
      }

      await this.reputationRepository.save(userReputation);

      // Create history entry
      const historyEntry = this.historyRepository.create({
        userId,
        points: finalPoints,
        reason,
        relatedPostId,
        relatedUserId,
        multiplier,
        createdBy: userId,
        updatedBy: userId,
      });

      await this.historyRepository.save(historyEntry);

      // Check for badge eligibility
      await this.checkBadgeEligibility(userId, reason, finalPoints);

      // Update user rank
      await this.updateUserRank(userId);

      // Clear cache
      await this.cacheService.del(`forum:reputation:${userId}`);
      await this.cacheService.del('forum:reputation:leaderboard:*');

      this.logger.log(`Forum reputation awarded {
        ${userId}
        points: ${finalPoints}
        ${reason}
        ${relatedPostId}
        ${relatedUserId}
        ${multiplier},
      }`);
    } catch (error) {
      this.logger.error(`Failed to award forum reputation, error, {
        ${userId},
        ${reason},
        ${points},
        ${relatedPostId},
        ${relatedUserId},
        ${multiplier},
      }`);
      throw error;
    }
  }

  async getUserReputation(userId: string): Promise<ForumUserReputation> {
    const cacheKey = `forum:reputation:${userId}`;
    let reputation = await this.cacheService.get<ForumUserReputation>(cacheKey);

    if (!reputation) {
      reputation = await this.reputationRepository.findOne({
        where: { userId },
      });

      if (!reputation) {
        // Create default reputation
        reputation = this.reputationRepository.create({
          userId,
          score: FORUM_CONSTANTS.REPUTATION.DEFAULT_SCORE,
          createdBy: userId,
          updatedBy: userId,
        });

        reputation = await this.reputationRepository.save(reputation);
      }

      await this.cacheService.set(cacheKey, reputation, 300);
    }

    return reputation;
  }

  async getReputationHistory(userId: string, limit = 50): Promise<ForumReputationHistory[]> {
    return this.historyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['relatedPost', 'relatedUser'],
    });
  }

  async getLeaderboard(limit = 100): Promise<ForumUserReputation[]> {
    const cacheKey = `forum:reputation:leaderboard:${limit}`;
    let leaderboard = await this.cacheService.get<ForumUserReputation[]>(cacheKey);

    if (!leaderboard) {
      leaderboard = await this.reputationRepository.find({
        order: { score: 'DESC' },
        take: limit,
        relations: ['user'],
      });

      await this.cacheService.set(cacheKey, leaderboard, 600); // 10 minutes
    }

    return leaderboard;
  }

  async getUserBadges(userId: string): Promise<ForumUserBadge[]> {
    return this.badgeRepository.find({
      where: { userId },
      order: { earnedAt: 'DESC' },
    });
  }

  private async checkBadgeEligibility(
    userId: string,
    reason: string,
    _points: number,
  ): Promise<void> {
    const reputation = await this.getUserReputation(userId);

    // Check for various badge conditions
    const badges: Partial<ForumUserBadge>[] = [];

    // First post badge
    if (reason === 'post_created' && reputation.totalPosts === 1) {
      badges.push({
        badgeId: 'first_post',
        name: 'First Post',
        description: 'Made your first post',
        badgeType: ForumBadgeType.PARTICIPATION,
        points: 10,
      });
    }

    // Good question badge (upvoted question)
    if (reason === 'post_upvoted' && reputation.totalUpvotes >= 25) {
      badges.push({
        badgeId: 'good_question',
        name: 'Good Question',
        description: 'Question score of 25 or more',
        badgeType: ForumBadgeType.QUALITY,
        points: 25,
      });
    }

    // Expert contributor badge
    if (reputation.score >= 500) {
      badges.push({
        badgeId: 'expert_contributor',
        name: 'Expert Contributor',
        description: 'Reached 500 reputation points',
        badgeType: ForumBadgeType.EXPERTISE,
        points: 500,
      });
    }

    // Award badges
    for (const badge of badges) {
      const existingBadge = await this.badgeRepository.findOne({
        where: { userId, badgeId: badge.badgeId },
      });

      if (!existingBadge) {
        const userBadge = this.badgeRepository.create({
          userId,
          ...badge,
          earnedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        });

        await this.badgeRepository.save(userBadge);

        this.logger.log(`Forum badge earned, {
          ${userId},
          badgeId: ${badge.badgeId},
          badgeName: ${badge.name},
        }`);
      }
    }
  }

  private async updateUserRank(userId: string): Promise<void> {
    const userReputation = await this.getUserReputation(userId);

    // Get user's rank based on reputation score
    const rank = await this.reputationRepository
      .createQueryBuilder('reputation')
      .where('reputation.score > :score', { score: userReputation.score })
      .getCount();

    userReputation.rank = rank + 1;
    await this.reputationRepository.save(userReputation);
  }
}

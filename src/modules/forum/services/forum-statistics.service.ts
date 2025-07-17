import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ForumThread } from '../entities/forum-thread.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumCategory } from '../entities/forum-category.entity';
import { ForumTag } from '../entities/forum-tag.entity';
import { ForumUserReputation } from '../entities/forum-user-reputation.entity';
import { ForumStatisticsQueryDto } from '../dto/forum-statistics.dto';
import { ForumStatisticsResponseDto } from '../dto/forum-responses.dto';
import { CacheService } from '@/cache/cache.service';

@Injectable()
export class ForumStatisticsService {
  constructor(
    @InjectRepository(ForumThread)
    private readonly threadRepository: Repository<ForumThread>,
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    @InjectRepository(ForumCategory)
    private readonly categoryRepository: Repository<ForumCategory>,
    @InjectRepository(ForumTag)
    private readonly tagRepository: Repository<ForumTag>,
    @InjectRepository(ForumUserReputation)
    private readonly reputationRepository: Repository<ForumUserReputation>,
    private readonly cacheService: CacheService,
  ) {}

  async getStatistics(queryDto: ForumStatisticsQueryDto): Promise<ForumStatisticsResponseDto> {
    const cacheKey = `forum:statistics:${JSON.stringify(queryDto)}`;
    let statistics = await this.cacheService.get<ForumStatisticsResponseDto>(cacheKey);

    if (!statistics) {
      // Get basic counts
      const [totalThreads, totalPosts, totalCategories] = await Promise.all([
        this.threadRepository.count(),
        this.postRepository.count(),
        this.categoryRepository.count({ where: { isActive: true } }),
      ]);

      // Get today's counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [threadsToday, postsToday] = await Promise.all([
        this.threadRepository.count({
          where: { createdAt: MoreThanOrEqual(today) },
        }),
        this.postRepository.count({
          where: { createdAt: MoreThanOrEqual(today) },
        }),
      ]);

      // Get top contributors
      const topContributors = await this.reputationRepository.find({
        take: 10,
        order: { score: 'DESC' },
        relations: ['user'],
      });

      // Get popular tags
      const popularTags = await this.tagRepository.find({
        take: 20,
        order: { usageCount: 'DESC' },
        where: { isActive: true },
      });

      // Get category statistics
      const categoryStats = await this.categoryRepository
        .createQueryBuilder('category')
        .select([
          'category.id as categoryId',
          'category.name as name',
          'category.threadCount as threadCount',
          'category.postCount as postCount',
          'category.lastActivityAt as lastActivity',
        ])
        .where('category.isActive = :isActive', { isActive: true })
        .orderBy('category.threadCount', 'DESC')
        .getRawMany();

      statistics = {
        totalPosts,
        totalThreads,
        totalUsers: topContributors.length, // This should come from user count
        totalCategories,
        postsToday,
        threadsToday,
        activeUsers: 0, // This would require tracking active sessions
        topContributors: topContributors.map(tc => ({
          userId: tc.userId,
          username: tc.user?.username || 'Unknown',
          postCount: tc.totalPosts,
          reputation: tc.score,
        })),
        popularTags: popularTags.map(tag => ({
          name: tag.name,
          count: tag.usageCount,
        })),
        categoryStats: categoryStats.map(cs => ({
          categoryId: cs.categoryId,
          name: cs.name,
          threadCount: cs.threadCount,
          postCount: cs.postCount,
          lastActivity: cs.lastActivity,
        })),
      };

      await this.cacheService.set(cacheKey, statistics, 600); // 10 minutes
    }

    return statistics;
  }
}

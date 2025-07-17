import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumThread } from '../entities/forum-thread.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumCategory } from '../entities/forum-category.entity';
import { ForumTag } from '../entities/forum-tag.entity';
import { ForumSearchDto } from '../dto/forum-search.dto';
import { ForumSearchResponseDto } from '../dto/forum-responses.dto';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';
import { ForumSearchType, ForumSortBy } from '@/common/enums/forum.enums';

@Injectable()
export class ForumSearchService {
  constructor(
    @InjectRepository(ForumThread)
    private readonly threadRepository: Repository<ForumThread>,
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    @InjectRepository(ForumCategory)
    private readonly categoryRepository: Repository<ForumCategory>,
    @InjectRepository(ForumTag)
    private readonly tagRepository: Repository<ForumTag>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {}

  async search(searchDto: ForumSearchDto): Promise<ForumSearchResponseDto> {
    const {
      query,
      type = ForumSearchType.POSTS,
      categoryIds: _,
      tags: __,
      authorId: ___,
      startDate: ____,
      endDate: _____,
      hasAcceptedAnswer: ______,
      minVotes: _______,
      maxVotes: ________,
      status: _________,
      postType: __________,
      sortBy: ___________ = ForumSortBy.RELEVANCE,
      page = 1,
      limit = 20,
    } = searchDto;

    const skip = (page - 1) * limit;
    const cacheKey = `forum:search:${JSON.stringify(searchDto)}`;

    let result = await this.cacheService.get<ForumSearchResponseDto>(cacheKey);

    if (!result) {
      switch (type) {
        case ForumSearchType.THREADS:
          result = await this.searchThreads(searchDto, skip, limit);
          break;
        case ForumSearchType.POSTS:
          result = await this.searchPosts(searchDto, skip, limit);
          break;
        case ForumSearchType.USERS:
          result = await this.searchUsers(searchDto, skip, limit);
          break;
        case ForumSearchType.CATEGORIES:
          result = await this.searchCategories(searchDto, skip, limit);
          break;
        case ForumSearchType.TAGS:
          result = await this.searchTags(searchDto, skip, limit);
          break;
        default:
          result = await this.searchPosts(searchDto, skip, limit);
      }

      // Add suggestions if no results found
      if (result.total === 0 && query) {
        result.suggestions = await this.getSuggestions(query);
      }

      await this.cacheService.set(cacheKey, result, 300); // 5 minutes
    }

    return result;
  }

  async getSuggestions(query: string): Promise<string[]> {
    try {
      // Get similar thread titles
      const similarThreads = await this.threadRepository
        .createQueryBuilder('thread')
        .select('thread.title')
        .where('thread.title ILIKE :query', { query: `%${query}%` })
        .limit(5)
        .getMany();

      // Get similar tags
      const similarTags = await this.tagRepository
        .createQueryBuilder('tag')
        .select('tag.name')
        .where('tag.name ILIKE :query', { query: `%${query}%` })
        .limit(5)
        .getMany();

      const suggestions = [...similarThreads.map(t => t.title), ...similarTags.map(t => t.name)];

      return [...new Set(suggestions)].slice(0, 10);
    } catch (error) {
      this.logger.error('Failed to get search suggestions', error);
      return [];
    }
  }

  private async searchThreads(
    searchDto: ForumSearchDto,
    skip: number,
    limit: number,
  ): Promise<ForumSearchResponseDto> {
    const { query, categoryIds, tags, authorId, startDate, endDate, hasAcceptedAnswer, sortBy } =
      searchDto;

    const queryBuilder = this.threadRepository
      .createQueryBuilder('thread')
      .leftJoinAndSelect('thread.author', 'author')
      .leftJoinAndSelect('thread.category', 'category')
      .leftJoinAndSelect('thread.threadTags', 'threadTags')
      .leftJoinAndSelect('threadTags.tag', 'tag')
      .where('thread.deletedAt IS NULL');

    if (query) {
      queryBuilder.andWhere('(thread.title ILIKE :query OR thread.summary ILIKE :query)', {
        query: `%${query}%`,
      });
    }

    if (categoryIds && categoryIds.length > 0) {
      queryBuilder.andWhere('thread.categoryId IN (:...categoryIds)', { categoryIds });
    }

    if (authorId) {
      queryBuilder.andWhere('thread.authorId = :authorId', { authorId });
    }

    if (startDate) {
      queryBuilder.andWhere('thread.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('thread.createdAt <= :endDate', { endDate });
    }

    if (hasAcceptedAnswer !== undefined) {
      if (hasAcceptedAnswer) {
        queryBuilder.andWhere('thread.acceptedAnswerId IS NOT NULL');
      } else {
        queryBuilder.andWhere('thread.acceptedAnswerId IS NULL');
      }
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('tag.name IN (:...tags)', { tags });
    }

    // Apply sorting
    this.applySorting(queryBuilder, sortBy!, 'thread');

    const [threads, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
      results: threads,
    };
  }

  private async searchPosts(
    searchDto: ForumSearchDto,
    skip: number,
    limit: number,
  ): Promise<ForumSearchResponseDto> {
    const { query, categoryIds, authorId, startDate, endDate, sortBy } = searchDto;

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.thread', 'thread')
      .leftJoinAndSelect('thread.category', 'category')
      .where('post.deletedAt IS NULL');

    if (query) {
      queryBuilder.andWhere('post.content ILIKE :query', { query: `%${query}%` });
    }

    if (categoryIds && categoryIds.length > 0) {
      queryBuilder.andWhere('thread.categoryId IN (:...categoryIds)', { categoryIds });
    }

    if (authorId) {
      queryBuilder.andWhere('post.authorId = :authorId', { authorId });
    }

    if (startDate) {
      queryBuilder.andWhere('post.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('post.createdAt <= :endDate', { endDate });
    }

    // Apply sorting
    this.applySorting(queryBuilder, sortBy!, 'post');

    const [posts, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
      results: posts,
    };
  }

  private async searchUsers(
    searchDto: ForumSearchDto,
    skip: number,
    limit: number,
  ): Promise<ForumSearchResponseDto> {
    // This would search for forum users based on their activity
    // Implementation would depend on your user management system
    return {
      total: 0,
      page: 1,
      limit,
      totalPages: 0,
      results: [],
    };
  }

  private async searchCategories(
    searchDto: ForumSearchDto,
    skip: number,
    limit: number,
  ): Promise<ForumSearchResponseDto> {
    const { query } = searchDto;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true });

    if (query) {
      queryBuilder.andWhere('(category.name ILIKE :query OR category.description ILIKE :query)', {
        query: `%${query}%`,
      });
    }

    queryBuilder.orderBy('category.threadCount', 'DESC');

    const [categories, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
      results: categories,
    };
  }

  private async searchTags(
    searchDto: ForumSearchDto,
    skip: number,
    limit: number,
  ): Promise<ForumSearchResponseDto> {
    const { query } = searchDto;

    const queryBuilder = this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.isActive = :isActive', { isActive: true });

    if (query) {
      queryBuilder.andWhere('tag.name ILIKE :query', { query: `%${query}%` });
    }

    queryBuilder.orderBy('tag.usageCount', 'DESC');

    const [tags, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      total,
      page: Math.floor(skip / limit) + 1,
      limit,
      totalPages: Math.ceil(total / limit),
      results: tags,
    };
  }

  private applySorting(queryBuilder: any, sortBy: ForumSortBy, alias: string): void {
    switch (sortBy) {
      case ForumSortBy.NEWEST:
        queryBuilder.orderBy(`${alias}.createdAt`, 'DESC');
        break;
      case ForumSortBy.OLDEST:
        queryBuilder.orderBy(`${alias}.createdAt`, 'ASC');
        break;
      case ForumSortBy.MOST_REPLIES:
        if (alias === 'thread') {
          queryBuilder.orderBy(`${alias}.replyCount`, 'DESC');
        }
        break;
      case ForumSortBy.MOST_VOTES:
        queryBuilder.orderBy(`${alias}.score`, 'DESC');
        break;
      case ForumSortBy.MOST_VIEWS:
        if (alias === 'thread') {
          queryBuilder.orderBy(`${alias}.viewCount`, 'DESC');
        }
        break;
      case ForumSortBy.LAST_ACTIVITY:
        if (alias === 'thread') {
          queryBuilder.orderBy(`${alias}.lastActivityAt`, 'DESC');
        } else {
          queryBuilder.orderBy(`${alias}.updatedAt`, 'DESC');
        }
        break;
      case ForumSortBy.RELEVANCE:
      default:
        queryBuilder.orderBy(`${alias}.score`, 'DESC').addOrderBy(`${alias}.createdAt`, 'DESC');
        break;
    }
  }
}

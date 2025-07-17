import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Not } from 'typeorm';
import { ForumThread } from '../entities/forum-thread.entity';
import { ForumPost } from '../entities/forum-post.entity';
import { CreateForumThreadDto, UpdateForumThreadDto } from '../dto/forum-thread.dto';
import { ForumCategoryService } from './forum-category.service';
import { ForumPostService } from './forum-post.service';
import { ForumTagService } from './forum-tag.service';
import { ForumReputationService } from './forum-reputation.service';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';
import { slugify } from '@/common/utils/string.utils';
import { ForumThreadStatus, ForumPostType } from '@/common/enums/forum.enums';

@Injectable()
export class ForumThreadService {
  constructor(
    @InjectRepository(ForumThread)
    private readonly threadRepository: Repository<ForumThread>,
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    private readonly categoryService: ForumCategoryService,
    private readonly postService: ForumPostService,
    private readonly tagService: ForumTagService,
    private readonly reputationService: ForumReputationService,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {}

  async create(createDto: CreateForumThreadDto, userId: string): Promise<ForumThread> {
    try {
      // Validate category exists
      const category = await this.categoryService.findById(createDto.categoryId);

      if (!category.isActive) {
        throw new BadRequestException('Cannot create thread in inactive category');
      }

      // Generate unique slug
      const baseSlug = slugify(createDto.title);
      const slug = await this.generateUniqueSlug(baseSlug);

      // Create thread
      const thread = this.threadRepository.create({
        title: createDto.title,
        slug,
        summary: createDto.summary,
        authorId: userId,
        categoryId: createDto.categoryId,
        type: createDto.type || ForumPostType.THREAD,
        metadata: createDto.metadata,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedThread = await this.threadRepository.save(thread);

      // Create first post
      const _firstPost = await this.postService.create(
        {
          content: createDto.content,
          threadId: savedThread.id,
          type: createDto.type || ForumPostType.THREAD,
        },
        userId,
      );

      // Update category stats
      await this.categoryService.updateStats(createDto.categoryId, 1, 1);

      // Handle tags
      if (createDto.tags && createDto.tags.length > 0) {
        await this.tagService.attachTagsToThread(savedThread.id, createDto.tags, userId);
      }

      // Award reputation for creating thread
      await this.reputationService.awardPoints(userId, 'thread_created', 5, savedThread.id);

      // Clear cache
      await this.cacheService.del('forum:threads:*');
      await this.cacheService.del(`forum:category:${createDto.categoryId}:threads:*`);

      this.logger.log(`Forum thread created, {
        threadId: ${savedThread.id},
        title: ${savedThread.title},
        ${userId},
        categoryId: ${createDto.categoryId},
      }`);

      return savedThread;
    } catch (error) {
      this.logger.error(`Failed to create forum thread, error, {
        ${createDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async findAll(
    options: {
      categoryId?: string;
      page?: number;
      limit?: number;
      status?: ForumThreadStatus;
      featured?: boolean;
    } = {},
  ): Promise<{
    threads: ForumThread[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { categoryId, page = 1, limit = 20, status, featured } = options;
    const skip = (page - 1) * limit;

    const cacheKey = `forum:threads:${JSON.stringify(options)}`;
    let result = await this.cacheService.get<{
      threads: ForumThread[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);

    if (!result) {
      const queryBuilder = this.threadRepository
        .createQueryBuilder('thread')
        .leftJoinAndSelect('thread.author', 'author')
        .leftJoinAndSelect('thread.category', 'category')
        .leftJoinAndSelect('thread.threadTags', 'threadTags')
        .leftJoinAndSelect('threadTags.tag', 'tag')
        .where('thread.deletedAt IS NULL');

      if (categoryId) {
        queryBuilder.andWhere('thread.categoryId = :categoryId', { categoryId });
      }

      if (status) {
        queryBuilder.andWhere('thread.status = :status', { status });
      }

      if (featured !== undefined) {
        queryBuilder.andWhere('thread.isFeatured = :featured', { featured });
      }

      // Order by pinned, then by last activity
      queryBuilder.orderBy('thread.isPinned', 'DESC').addOrderBy('thread.lastActivityAt', 'DESC');

      const [threads, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      result = {
        threads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      await this.cacheService.set(cacheKey, result, 180); // 3 minutes
    }

    return result;
  }

  async findById(id: string, userId?: string): Promise<ForumThread> {
    const cacheKey = `forum:thread:${id}`;
    let thread = await this.cacheService.get<ForumThread>(cacheKey);

    if (!thread) {
      thread = await this.threadRepository.findOne({
        where: { id },
        relations: [
          'author',
          'category',
          'threadTags',
          'threadTags.tag',
          'posts',
          'posts.author',
          'posts.votes',
        ],
      });

      if (!thread) {
        throw new NotFoundException('Thread not found');
      }

      await this.cacheService.set(cacheKey, thread, 300);
    }

    // Increment view count (async, don't await)
    // Increment view count (async, don't await)
    this.incrementViewCount(id, userId);

    return thread;
  }

  async findBySlug(slug: string, userId?: string): Promise<ForumThread> {
    const cacheKey = `forum:thread:slug:${slug}`;
    let thread = await this.cacheService.get<ForumThread>(cacheKey);

    if (!thread) {
      thread = await this.threadRepository.findOne({
        where: { slug },
        relations: [
          'author',
          'category',
          'threadTags',
          'threadTags.tag',
          'posts',
          'posts.author',
          'posts.votes',
        ],
      });

      if (!thread) {
        throw new NotFoundException('Thread not found');
      }

      await this.cacheService.set(cacheKey, thread, 300);
    }

    // Increment view count (async, don't await)
    this.incrementViewCount(thread.id, userId);

    return thread;
  }

  async update(id: string, updateDto: UpdateForumThreadDto, userId: string): Promise<ForumThread> {
    try {
      const thread = await this.findById(id);

      // Check permissions
      if (
        thread.authorId !== userId &&
        !(await this.hasModeratorPermission(userId, thread.categoryId))
      ) {
        throw new ForbiddenException('Insufficient permissions to update thread');
      }

      // Check if thread is locked
      if (thread.isLocked && !(await this.hasModeratorPermission(userId, thread.categoryId))) {
        throw new ForbiddenException('Cannot update locked thread');
      }

      // Update slug if title changed
      if (updateDto.title && updateDto.title !== thread.title) {
        const baseSlug = slugify(updateDto.title);
        const newSlug = await this.generateUniqueSlug(baseSlug, id);
        updateDto['slug'] = newSlug;
      }

      Object.assign(thread, updateDto, { updatedBy: userId });
      const updatedThread = await this.threadRepository.save(thread);

      // Handle tags update
      if (updateDto.tags) {
        await this.tagService.updateThreadTags(id, updateDto.tags, userId);
      }

      // Clear cache
      await this.cacheService.del('forum:threads:*');
      await this.cacheService.del(`forum:thread:${id}`);
      if (thread.slug) {
        await this.cacheService.del(`forum:thread:slug:${thread.slug}`);
      }

      this.logger.log(`Forum thread updated, {
        threadId: ${id},
        ${userId},
        changes: ${updateDto},
      }`);

      return updatedThread;
    } catch (error) {
      this.logger.error(`Failed to update forum thread, error, {
        ${id},
        ${updateDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const thread = await this.findById(id);

      // Check permissions
      if (
        thread.authorId !== userId &&
        !(await this.hasModeratorPermission(userId, thread.categoryId))
      ) {
        throw new ForbiddenException('Insufficient permissions to delete thread');
      }

      // Soft delete thread and all posts
      await this.threadRepository.softDelete(id);
      await this.postRepository.softDelete({ threadId: id });

      // Update category stats
      await this.categoryService.updateStats(thread.categoryId, -1, -thread.replyCount - 1);

      // Clear cache
      await this.cacheService.del('forum:threads:*');
      await this.cacheService.del(`forum:thread:${id}`);
      if (thread.slug) {
        await this.cacheService.del(`forum:thread:slug:${thread.slug}`);
      }

      this.logger.log(`Forum thread deleted, {
        threadId: ${id},
        ${userId},
      }`);
    } catch (error) {
      this.logger.error(`Failed to delete forum thread, error, {
        ${id},
        ${userId},
      }`);
      throw error;
    }
  }

  async lock(id: string, userId: string, reason?: string): Promise<void> {
    const thread = await this.findById(id);

    if (!(await this.hasModeratorPermission(userId, thread.categoryId))) {
      throw new ForbiddenException('Insufficient permissions to lock thread');
    }

    thread.isLocked = true;
    thread.lockedAt = new Date();
    thread.lockedBy = userId;
    thread.lockReason = reason;
    thread.updatedBy = userId;

    await this.threadRepository.save(thread);

    // Clear cache
    await this.cacheService.del(`forum:thread:${id}`);
    if (thread.slug) {
      await this.cacheService.del(`forum:thread:slug:${thread.slug}`);
    }

    this.logger.log(`Forum thread locked, {
      threadId: ${id},
      ${userId},
      ${reason},
    }`);
  }

  async unlock(id: string, userId: string): Promise<void> {
    const thread = await this.findById(id);

    if (!(await this.hasModeratorPermission(userId, thread.categoryId))) {
      throw new ForbiddenException('Insufficient permissions to unlock thread');
    }

    thread.isLocked = false;
    thread.lockedAt = null;
    thread.lockedBy = null;
    thread.lockReason = null;
    thread.updatedBy = userId;

    await this.threadRepository.save(thread);

    // Clear cache
    await this.cacheService.del(`forum:thread:${id}`);
    if (thread.slug) {
      await this.cacheService.del(`forum:thread:slug:${thread.slug}`);
    }

    this.logger.log(`Forum thread unlocked, {
      threadId: ${id},
      ${userId},
    }`);
  }

  async pin(id: string, userId: string): Promise<void> {
    const thread = await this.findById(id);

    if (!(await this.hasModeratorPermission(userId, thread.categoryId))) {
      throw new ForbiddenException('Insufficient permissions to pin thread');
    }

    thread.isPinned = true;
    thread.updatedBy = userId;

    await this.threadRepository.save(thread);

    // Clear cache
    await this.cacheService.del('forum:threads:*');
    await this.cacheService.del(`forum:thread:${id}`);

    this.logger.log(`Forum thread pinned, {
      threadId: ${id},
      ${userId},
    }`);
  }

  async unpin(id: string, userId: string): Promise<void> {
    const thread = await this.findById(id);

    if (!(await this.hasModeratorPermission(userId, thread.categoryId))) {
      throw new ForbiddenException('Insufficient permissions to unpin thread');
    }

    thread.isPinned = false;
    thread.updatedBy = userId;

    await this.threadRepository.save(thread);

    // Clear cache
    await this.cacheService.del('forum:threads:*');
    await this.cacheService.del(`forum:thread:${id}`);

    this.logger.log(`Forum thread unpinned, {
      threadId: ${id},
      ${userId},
    }`);
  }

  async markAsResolved(id: string, userId: string, acceptedAnswerId?: string): Promise<void> {
    const thread = await this.findById(id);

    // Check permissions (author or moderator)
    if (
      thread.authorId !== userId &&
      !(await this.hasModeratorPermission(userId, thread.categoryId))
    ) {
      throw new ForbiddenException('Insufficient permissions to resolve thread');
    }

    thread.isResolved = true;
    thread.acceptedAnswerId = acceptedAnswerId;
    thread.updatedBy = userId;

    await this.threadRepository.save(thread);

    // Award reputation for accepted answer
    if (acceptedAnswerId) {
      const acceptedPost = await this.postRepository.findOne({
        where: { id: acceptedAnswerId },
      });

      if (acceptedPost) {
        await this.reputationService.awardPoints(
          acceptedPost.authorId,
          'answer_accepted',
          15,
          acceptedAnswerId,
          userId,
        );

        // Mark post as accepted
        await this.postService.markAsAccepted(acceptedAnswerId, userId);
      }
    }

    // Clear cache
    await this.cacheService.del(`forum:thread:${id}`);
    if (thread.slug) {
      await this.cacheService.del(`forum:thread:slug:${thread.slug}`);
    }

    this.logger.log(`Forum thread resolved, {
      threadId: ${id},
      ${userId},
      ${acceptedAnswerId},
    }`);
  }

  async updateStats(threadId: string, replyCountDelta = 0, voteCountDelta = 0): Promise<void> {
    const updateData: any = {
      lastActivityAt: new Date(),
    };

    if (replyCountDelta !== 0) {
      updateData.replyCount = () => `replyCount + ${replyCountDelta}`;
    }

    if (voteCountDelta > 0) {
      updateData.upvoteCount = () => `upvoteCount + ${voteCountDelta}`;
      updateData.score = () => `score + ${voteCountDelta}`;
    } else if (voteCountDelta < 0) {
      updateData.downvoteCount = () => `downvoteCount + ${Math.abs(voteCountDelta)}`;
      updateData.score = () => `score + ${voteCountDelta}`;
    }

    await this.threadRepository.update(threadId, updateData);

    // Clear cache
    await this.cacheService.del(`forum:thread:${threadId}`);
  }

  private async incrementViewCount(threadId: string, userId?: string): Promise<void> {
    // Only increment if user is logged in and hasn't viewed recently
    if (userId) {
      const viewKey = `forum:thread:${threadId}:view:${userId}`;
      const hasViewed = await this.cacheService.get(viewKey);

      if (!hasViewed) {
        await this.threadRepository.increment({ id: threadId }, 'viewCount', 1);
        await this.cacheService.set(viewKey, true, 3600); // 1 hour
      }
    } else {
      // For anonymous users, always increment
      await this.threadRepository.increment({ id: threadId }, 'viewCount', 1);
    }
  }

  private async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const whereCondition: FindOptionsWhere<ForumThread> = { slug };
      if (excludeId) {
        whereCondition.id = Not(excludeId);
      }

      const existingThread = await this.threadRepository.findOne({
        where: whereCondition,
      });

      if (!existingThread) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  private async hasModeratorPermission(_userId: string, _categoryId: string): Promise<boolean> {
    // This would check if user has moderator permissions
    // Implementation depends on your permission system
    // For now, return false as placeholder
    return false;
  }
}

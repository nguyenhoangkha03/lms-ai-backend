import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumThread } from '../entities/forum-thread.entity';
import { CreateForumPostDto, UpdateForumPostDto } from '../dto/forum-post.dto';
import { ForumReputationService } from './forum-reputation.service';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';
import { ForumPostStatus, ForumPostType } from '@/common/enums/forum.enums';

@Injectable()
export class ForumPostService {
  constructor(
    @InjectRepository(ForumPost)
    private readonly postRepository: Repository<ForumPost>,
    @InjectRepository(ForumThread)
    private readonly threadRepository: Repository<ForumThread>,
    private readonly reputationService: ForumReputationService,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {}

  async create(createDto: CreateForumPostDto, userId: string): Promise<ForumPost> {
    try {
      // Validate thread exists and is not locked
      const thread = await this.threadRepository.findOne({
        where: { id: createDto.threadId },
      });

      if (!thread) {
        throw new NotFoundException('Thread not found');
      }

      if (thread.isLocked) {
        throw new BadRequestException('Cannot post in locked thread');
      }

      // Create post
      const post = this.postRepository.create({
        ...createDto,
        authorId: userId,
        contentHtml: this.convertToHtml(createDto.content),
        type: createDto.type || ForumPostType.REPLY,
        status: ForumPostStatus.PUBLISHED,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedPost = await this.postRepository.save(post);

      // Update thread stats
      await this.updateThreadStats(createDto.threadId);

      // Award reputation for posting
      await this.reputationService.awardPoints(userId, 'post_created', 2, savedPost.id);

      // Clear cache
      await this.cacheService.del(`forum:thread:${createDto.threadId}:posts:*`);
      await this.cacheService.del(`forum:thread:${createDto.threadId}`);

      this.logger.log(`Forum post created: , {
        postId: ${savedPost.id},
        threadId: ${createDto.threadId},
        ${userId},
      }`);

      return savedPost;
    } catch (error) {
      this.logger.error(`Failed to create forum post, error, {
        ${createDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async findByThread(
    threadId: string,
    options: {
      page?: number;
      limit?: number;
      parentId?: string;
    } = {},
  ): Promise<{
    posts: ForumPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, parentId } = options;
    const skip = (page - 1) * limit;

    const cacheKey = `forum:thread:${threadId}:posts:${JSON.stringify(options)}`;
    let result = await this.cacheService.get<{
      posts: ForumPost[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);

    if (!result) {
      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.votes', 'votes')
        .leftJoinAndSelect('post.attachments', 'attachments')
        .where('post.threadId = :threadId', { threadId })
        .andWhere('post.deletedAt IS NULL');

      if (parentId) {
        queryBuilder.andWhere('post.parentId = :parentId', { parentId });
      } else {
        queryBuilder.andWhere('post.parentId IS NULL');
      }

      queryBuilder
        .orderBy('post.isAccepted', 'DESC')
        .addOrderBy('post.score', 'DESC')
        .addOrderBy('post.createdAt', 'ASC');

      const [posts, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

      result = {
        posts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      await this.cacheService.set(cacheKey, result, 300);
    }

    return result;
  }

  async findById(id: string): Promise<ForumPost> {
    const cacheKey = `forum:post:${id}`;
    let post = await this.cacheService.get<ForumPost>(cacheKey);

    if (!post) {
      post = await this.postRepository.findOne({
        where: { id },
        relations: ['author', 'thread', 'votes', 'attachments', 'replies'],
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      await this.cacheService.set(cacheKey, post, 300);
    }

    return post;
  }

  async update(id: string, updateDto: UpdateForumPostDto, userId: string): Promise<ForumPost> {
    try {
      const post = await this.findById(id);

      // Check permissions
      if (post.authorId !== userId && !(await this.hasModeratorPermission(userId))) {
        throw new ForbiddenException('Insufficient permissions to update post');
      }

      // Check if thread is locked
      if (post.thread?.isLocked && !(await this.hasModeratorPermission(userId))) {
        throw new ForbiddenException('Cannot update post in locked thread');
      }

      // Update post
      Object.assign(post, updateDto, {
        contentHtml: updateDto.content ? this.convertToHtml(updateDto.content) : post.contentHtml,
        isEdited: true,
        editedAt: new Date(),
        editedBy: userId,
        updatedBy: userId,
      });

      const updatedPost = await this.postRepository.save(post);

      // Clear cache
      await this.cacheService.del(`forum:post:${id}`);
      await this.cacheService.del(`forum:thread:${post.threadId}:posts:*`);

      this.logger.log(`Forum post updated, {
        postId: ${id},
        ${userId},
        changes: ${updateDto},
      }`);

      return updatedPost;
    } catch (error) {
      this.logger.error(`Failed to update forum post, error, {
        ${id},
        ${updateDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const post = await this.findById(id);

      // Check permissions
      if (post.authorId !== userId && !(await this.hasModeratorPermission(userId))) {
        throw new ForbiddenException('Insufficient permissions to delete post');
      }

      await this.postRepository.softDelete(id);

      // Update thread stats
      await this.updateThreadStats(post.threadId, -1);

      // Clear cache
      await this.cacheService.del(`forum:post:${id}`);
      await this.cacheService.del(`forum:thread:${post.threadId}:posts:*`);

      this.logger.log(`Forum post deleted, {
        postId: ${id},
        ${userId},
      }`);
    } catch (error) {
      this.logger.error(`Failed to delete forum post, error, {
        ${id},
        ${userId},
      }`);
      throw error;
    }
  }

  async markAsAccepted(id: string, userId: string): Promise<void> {
    const post = await this.findById(id);

    // Check permissions (thread author or moderator)
    if (post.thread?.authorId !== userId && !(await this.hasModeratorPermission(userId))) {
      throw new ForbiddenException('Insufficient permissions to accept answer');
    }

    // Remove accepted status from other posts in thread
    await this.postRepository.update(
      { threadId: post.threadId, isAccepted: true },
      { isAccepted: false },
    );

    // Mark this post as accepted
    post.isAccepted = true;
    post.updatedBy = userId;

    await this.postRepository.save(post);

    // Clear cache
    await this.cacheService.del(`forum:post:${id}`);
    await this.cacheService.del(`forum:thread:${post.threadId}:posts:*`);

    this.logger.log(`Forum post marked as accepted, {
      postId: ${id},
      ${userId},
    }`);
  }

  private async updateThreadStats(threadId: string, replyCountDelta = 1): Promise<void> {
    const lastPost = await this.postRepository.findOne({
      where: { threadId },
      order: { createdAt: 'DESC' },
    });

    await this.threadRepository.update(threadId, {
      replyCount: () => `replyCount + ${replyCountDelta}`,
      lastActivityAt: new Date(),
      lastPostId: lastPost?.id,
      lastPostUserId: lastPost?.authorId,
    });
  }

  private convertToHtml(content: string): string {
    // Simple markdown-to-HTML converter
    // You might want to use a proper markdown library here
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private async hasModeratorPermission(_userId: string): Promise<boolean> {
    // This would check if user has moderator permissions
    // Implementation depends on your permission system
    return false; // Placeholder
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForumTag } from '../entities/forum-tag.entity';
import { ForumThreadTag } from '../entities/forum-thread-tag.entity';
import { CreateForumTagDto, UpdateForumTagDto } from '../dto/forum-tag.dto';
import { CacheService } from '@/cache/cache.service';
import { WinstonService } from '@/logger/winston.service';
import { slugify } from '@/common/utils/string.utils';

@Injectable()
export class ForumTagService {
  constructor(
    @InjectRepository(ForumTag)
    private readonly tagRepository: Repository<ForumTag>,
    @InjectRepository(ForumThreadTag)
    private readonly threadTagRepository: Repository<ForumThreadTag>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {}

  async create(createDto: CreateForumTagDto, userId: string): Promise<ForumTag> {
    try {
      const slug = slugify(createDto.name);

      // Check if tag already exists
      const existingTag = await this.tagRepository.findOne({
        where: [{ name: createDto.name }, { slug }],
      });

      if (existingTag) {
        throw new BadRequestException('Tag with this name already exists');
      }

      const tag = this.tagRepository.create({
        ...createDto,
        slug,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedTag = await this.tagRepository.save(tag);

      // Clear cache
      await this.cacheService.del('forum:tags:*');

      this.logger.log(`Forum tag created, {
        tagId: ${savedTag.id},
        name: ${savedTag.name},
        ${userId},
      }`);

      return savedTag;
    } catch (error) {
      this.logger.error(`Failed to create forum tag, error, {
        ${createDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<ForumTag[]> {
    const cacheKey = `forum:tags:all:${includeInactive}`;
    let tags = await this.cacheService.get<ForumTag[]>(cacheKey);

    if (!tags) {
      const queryBuilder = this.tagRepository
        .createQueryBuilder('tag')
        .orderBy('tag.usageCount', 'DESC')
        .addOrderBy('tag.name', 'ASC');

      if (!includeInactive) {
        queryBuilder.where('tag.isActive = :isActive', { isActive: true });
      }

      tags = await queryBuilder.getMany();
      await this.cacheService.set(cacheKey, tags, 300);
    }

    return tags;
  }

  async findById(id: string): Promise<ForumTag> {
    const cacheKey = `forum:tag:${id}`;
    let tag = await this.cacheService.get<ForumTag>(cacheKey);

    if (!tag) {
      tag = await this.tagRepository.findOne({
        where: { id },
      });

      if (!tag) {
        throw new NotFoundException('Tag not found');
      }

      await this.cacheService.set(cacheKey, tag, 300);
    }

    return tag;
  }

  async findByName(name: string): Promise<ForumTag> {
    const tag = await this.tagRepository.findOne({
      where: { name },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async findPopularTags(limit = 20): Promise<ForumTag[]> {
    const cacheKey = `forum:tags:popular:${limit}`;
    let tags = await this.cacheService.get<ForumTag[]>(cacheKey);

    if (!tags) {
      tags = await this.tagRepository.find({
        where: { isActive: true },
        order: { usageCount: 'DESC' },
        take: limit,
      });

      await this.cacheService.set(cacheKey, tags, 600); // 10 minutes
    }

    return tags;
  }

  async update(id: string, updateDto: UpdateForumTagDto, userId: string): Promise<ForumTag> {
    try {
      const tag = await this.findById(id);

      // Check name uniqueness if changed
      if (updateDto.name && updateDto.name !== tag.name) {
        const existingTag = await this.tagRepository.findOne({
          where: { name: updateDto.name },
        });

        if (existingTag) {
          throw new BadRequestException('Tag with this name already exists');
        }

        // Update slug if name changed
        updateDto.slug = slugify(updateDto.name);
      }

      Object.assign(tag, updateDto, { updatedBy: userId });
      const updatedTag = await this.tagRepository.save(tag);

      // Clear cache
      await this.cacheService.del('forum:tags:*');
      await this.cacheService.del(`forum:tag:${id}`);

      this.logger.log(`Forum tag updated, {
        tagId: ${id},
        ${userId},
        changes: ${updateDto},
      }`);

      return updatedTag;
    } catch (error) {
      this.logger.error(`Failed to update forum tag, error, {
        ${id},
        ${updateDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const _tag = await this.findById(id);

      // Check if tag is being used
      const usageCount = await this.threadTagRepository.count({
        where: { tagId: id },
      });

      if (usageCount > 0) {
        throw new BadRequestException('Cannot delete tag that is being used');
      }

      await this.tagRepository.softDelete(id);

      // Clear cache
      await this.cacheService.del('forum:tags:*');
      await this.cacheService.del(`forum:tag:${id}`);

      this.logger.log(`Forum tag deleted, {
        tagId: ${id},
        ${userId},
      }`);
    } catch (error) {
      this.logger.error(`}Failed to delete forum tag, error, {
        ${id},
        ${userId},
      }`);
      throw error;
    }
  }

  async attachTagsToThread(threadId: string, tagNames: string[], userId: string): Promise<void> {
    try {
      // Remove existing tags
      await this.threadTagRepository.delete({ threadId });

      // Process each tag
      for (const tagName of tagNames) {
        let tag = await this.tagRepository.findOne({
          where: { name: tagName },
        });

        // Create tag if it doesn't exist
        if (!tag) {
          tag = await this.create({ name: tagName }, userId);
        }

        // Attach tag to thread
        const threadTag = this.threadTagRepository.create({
          threadId,
          tagId: tag.id,
          addedBy: userId,
          createdBy: userId,
          updatedBy: userId,
        });

        await this.threadTagRepository.save(threadTag);

        // Update tag usage count
        await this.tagRepository.increment({ id: tag.id }, 'usageCount', 1);
      }

      // Clear cache
      await this.cacheService.del('forum:tags:*');
    } catch (error) {
      this.logger.error(`Failed to attach tags to thread, error, {
        ${threadId},
        ${tagNames},
        ${userId},
      }`);
      throw error;
    }
  }

  async updateThreadTags(threadId: string, tagNames: string[], userId: string): Promise<void> {
    try {
      // Get current tags
      const currentThreadTags = await this.threadTagRepository.find({
        where: { threadId },
        relations: ['tag'],
      });

      const currentTagNames = currentThreadTags.map(tt => tt.tag.name);

      // Find tags to remove
      const tagsToRemove = currentThreadTags.filter(tt => !tagNames.includes(tt.tag.name));

      // Find tags to add
      const tagsToAdd = tagNames.filter(name => !currentTagNames.includes(name));

      // Remove tags
      for (const threadTag of tagsToRemove) {
        await this.threadTagRepository.remove(threadTag);
        await this.tagRepository.decrement({ id: threadTag.tagId }, 'usageCount', 1);
      }

      // Add new tags
      for (const tagName of tagsToAdd) {
        let tag = await this.tagRepository.findOne({
          where: { name: tagName },
        });

        // Create tag if it doesn't exist
        if (!tag) {
          tag = await this.create({ name: tagName }, userId);
        }

        // Attach tag to thread
        const threadTag = this.threadTagRepository.create({
          threadId,
          tagId: tag.id,
          addedBy: userId,
          createdBy: userId,
          updatedBy: userId,
        });

        await this.threadTagRepository.save(threadTag);

        // Update tag usage count
        await this.tagRepository.increment({ id: tag.id }, 'usageCount', 1);
      }

      // Clear cache
      await this.cacheService.del('forum:tags:*');
    } catch (error) {
      this.logger.error(`Failed to update thread tags, error, {
        ${threadId},
        ${tagNames},
        ${userId},
      }`);
      throw error;
    }
  }

  async getThreadTags(threadId: string): Promise<ForumTag[]> {
    const threadTags = await this.threadTagRepository.find({
      where: { threadId },
      relations: ['tag'],
    });

    return threadTags.map(tt => tt.tag);
  }

  async searchTags(query: string, limit = 10): Promise<ForumTag[]> {
    return this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.name ILIKE :query', { query: `%${query}%` })
      .andWhere('tag.isActive = :isActive', { isActive: true })
      .orderBy('tag.usageCount', 'DESC')
      .take(limit)
      .getMany();
  }
}

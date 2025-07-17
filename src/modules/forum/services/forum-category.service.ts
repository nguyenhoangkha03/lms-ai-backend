import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ForumCategory } from '../entities/forum-category.entity';
import { CreateForumCategoryDto, UpdateForumCategoryDto } from '../dto/forum-category.dto';
import { CacheService } from '@/cache/cache.service';
import { slugify } from '@/common/utils/string.utils';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class ForumCategoryService {
  constructor(
    @InjectRepository(ForumCategory)
    private readonly categoryRepository: Repository<ForumCategory>,
    private readonly cacheService: CacheService,
    private readonly logger: WinstonService,
  ) {}

  async create(createDto: CreateForumCategoryDto, userId: string): Promise<ForumCategory> {
    try {
      // Check if slug exists
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: createDto.slug },
      });

      if (existingCategory) {
        throw new BadRequestException('Category with this slug already exists');
      }

      // Validate parent category if provided
      if (createDto.parentId) {
        const parentCategory = await this.categoryRepository.findOne({
          where: { id: createDto.parentId },
        });

        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }
      }

      const category = this.categoryRepository.create({
        ...createDto,
        slug: createDto.slug || slugify(createDto.name),
        createdBy: userId,
        updatedBy: userId,
      });

      const savedCategory = await this.categoryRepository.save(category);

      // Clear cache
      await this.cacheService.del('forum:categories:*');

      this.logger.log(`Forum category created, {
        categoryId: ${savedCategory.id},
        name: ${savedCategory.name},
        ${userId},
      }`);

      return savedCategory;
    } catch (error) {
      this.logger.error(`Failed to create forum category', error, {
        ${createDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async findAll(includeInactive = false): Promise<ForumCategory[]> {
    const cacheKey = `forum:categories:all:${includeInactive}`;

    let categories = await this.cacheService.get<ForumCategory[]>(cacheKey);

    if (!categories) {
      const queryBuilder = this.categoryRepository
        .createQueryBuilder('category')
        .leftJoinAndSelect('category.parent', 'parent')
        .leftJoinAndSelect('category.children', 'children')
        .orderBy('category.orderIndex', 'ASC')
        .addOrderBy('category.name', 'ASC');

      if (!includeInactive) {
        queryBuilder.where('category.isActive = :isActive', { isActive: true });
      }

      categories = await queryBuilder.getMany();

      await this.cacheService.set(cacheKey, categories, 300); // 5 minutes
    }

    return categories;
  }

  async findById(id: string): Promise<ForumCategory> {
    const cacheKey = `forum:category:${id}`;

    let category = await this.cacheService.get<ForumCategory>(cacheKey);

    if (!category) {
      category = await this.categoryRepository.findOne({
        where: { id },
        relations: ['parent', 'children'],
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      await this.cacheService.set(cacheKey, category, 300);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<ForumCategory> {
    const cacheKey = `forum:category:slug:${slug}`;

    let category = await this.cacheService.get<ForumCategory>(cacheKey);

    if (!category) {
      category = await this.categoryRepository.findOne({
        where: { slug },
        relations: ['parent', 'children'],
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      await this.cacheService.set(cacheKey, category, 300);
    }

    return category;
  }

  async update(
    id: string,
    updateDto: UpdateForumCategoryDto,
    userId: string,
  ): Promise<ForumCategory> {
    try {
      const category = await this.findById(id);

      // Check slug uniqueness if changed
      if (updateDto.slug && updateDto.slug !== category.slug) {
        const existingCategory = await this.categoryRepository.findOne({
          where: { slug: updateDto.slug },
        });

        if (existingCategory) {
          throw new BadRequestException('Category with this slug already exists');
        }
      }

      // Validate parent category if changed
      if (updateDto.parentId && updateDto.parentId !== category.parentId) {
        const parentCategory = await this.categoryRepository.findOne({
          where: { id: updateDto.parentId },
        });

        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }

        // Prevent circular references
        if (await this.isCircularReference(id, updateDto.parentId)) {
          throw new BadRequestException('Cannot set parent category (circular reference)');
        }
      }

      Object.assign(category, updateDto, { updatedBy: userId });
      const updatedCategory = await this.categoryRepository.save(category);

      // Clear cache
      await this.cacheService.del('forum:categories:*');
      await this.cacheService.del(`forum:category:${id}`);
      if (category.slug) {
        await this.cacheService.del(`forum:category:slug:${category.slug}`);
      }

      this.logger.log(`Forum category updated, {
        categoryId: ${id},
        ${userId},
        changes: ${updateDto},
      }`);

      return updatedCategory;
    } catch (error) {
      this.logger.error(`Failed to update forum category, error, {
        ${id},
        ${updateDto},
        ${userId},
      }`);
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const category = await this.findById(id);

      // Check if category has threads
      if (category.threadCount > 0) {
        throw new BadRequestException('Cannot delete category with threads');
      }

      // Check if category has children
      const childrenCount = await this.categoryRepository.count({
        where: { parentId: id },
      });

      if (childrenCount > 0) {
        throw new BadRequestException('Cannot delete category with subcategories');
      }

      await this.categoryRepository.softDelete(id);

      // Clear cache
      await this.cacheService.del('forum:categories:*');
      await this.cacheService.del(`forum:category:${id}`);
      if (category.slug) {
        await this.cacheService.del(`forum:category:slug:${category.slug}`);
      }

      this.logger.log(`Forum category deleted, {
        categoryId: ${id},
        ${userId},
      }`);
    } catch (error) {
      this.logger.error(`Failed to delete forum category, error, {
        ${id},
        ${userId},
      }`);
      throw error;
    }
  }

  async getHierarchy(): Promise<ForumCategory[]> {
    const cacheKey = 'forum:categories:hierarchy';

    let hierarchy = await this.cacheService.get<ForumCategory[]>(cacheKey);

    if (!hierarchy) {
      hierarchy = await this.categoryRepository.find({
        where: { parentId: IsNull(), isActive: true },
        relations: ['children'],
        order: { orderIndex: 'ASC', name: 'ASC' },
      });

      await this.cacheService.set(cacheKey, hierarchy, 300);
    }

    return hierarchy;
  }

  async updateStats(categoryId: string, threadCountDelta = 0, postCountDelta = 0): Promise<void> {
    await this.categoryRepository.update(categoryId, {
      threadCount: () => `threadCount + ${threadCountDelta}`,
      postCount: () => `postCount + ${postCountDelta}`,
      lastActivityAt: new Date(),
    });

    // Clear cache
    await this.cacheService.del('forum:categories:*');
    await this.cacheService.del(`forum:category:${categoryId}`);
  }

  private async isCircularReference(categoryId: string, parentId: string): Promise<boolean> {
    if (categoryId === parentId) {
      return true;
    }

    const parent = await this.categoryRepository.findOne({
      where: { id: parentId },
    });

    if (!parent || !parent.parentId) {
      return false;
    }

    return this.isCircularReference(categoryId, parent.parentId);
  }
}

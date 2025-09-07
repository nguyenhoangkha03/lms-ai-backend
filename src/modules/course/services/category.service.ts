import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { CacheService } from '@/cache/cache.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';
import { WinstonService } from '@/logger/winston.service';

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  color?: string;
  orderIndex?: number;
  isActive?: boolean;
  showInMenu?: boolean;
  isFeatured?: boolean;
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  color?: string;
  orderIndex?: number;
  isActive?: boolean;
  showInMenu?: boolean;
  isFeatured?: boolean;
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CategoryQueryDto {
  parentId?: string;
  level?: number;
  isActive?: boolean;
  showInMenu?: boolean;
  isFeatured?: boolean;
  search?: string;
  includeChildren?: boolean;
  includeCourses?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class CategoryService {
  private readonly CACHE_TTL = 3600;

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Category)
    private readonly categoryTreeRepository: TreeRepository<Category>,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CategoryService.name);
  }

  async create(createCategoryDto: CreateCategoryDto, userId: string): Promise<Category> {
    const existingCategory = await this.categoryRepository.findOne({
      where: { slug: createCategoryDto.slug },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this slug already exists');
    }

    let parent: Category | null = null;
    if (createCategoryDto.parentId) {
      parent = await this.categoryRepository.findOne({
        where: { id: createCategoryDto.parentId, isActive: true },
      });

      if (!parent) {
        throw new BadRequestException('Invalid parent category ID');
      }
    }

    const categoryData: Partial<Category> = {
      ...createCategoryDto,
      level: parent ? parent.level + 1 : 0,
    };

    if (parent) {
      categoryData.parent = parent;
    }

    const category = this.categoryRepository.create(categoryData);

    const savedCategory = await this.categoryRepository.save(category);

    await this.clearCategoryCache();

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Category',
      entityId: savedCategory.id,
      description: `Category created: ${savedCategory.name}`,
      level: AuditLevel.INFO,
      metadata: {
        categoryName: savedCategory.name,
        categorySlug: savedCategory.slug,
        parentId: createCategoryDto.parentId,
      },
    });

    this.logger.log(`Category created: ${savedCategory.name} by user ${userId}`);
    return savedCategory;
  }

  async findAll(queryDto: CategoryQueryDto): Promise<any> {
    const cacheKey = `categories:${JSON.stringify(queryDto)}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (queryDto.parentId) {
      queryBuilder.andWhere('category.parentId = :parentId', { parentId: queryDto.parentId });
    } else if (queryDto.parentId === null) {
      queryBuilder.andWhere('category.parentId IS NULL');
    }

    if (queryDto.level !== undefined) {
      queryBuilder.andWhere('category.level = :level', { level: queryDto.level });
    }

    if (queryDto.isActive !== undefined) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive: queryDto.isActive });
    }

    if (queryDto.showInMenu !== undefined) {
      queryBuilder.andWhere('category.showInMenu = :showInMenu', {
        showInMenu: queryDto.showInMenu,
      });
    }

    if (queryDto.isFeatured !== undefined) {
      queryBuilder.andWhere('category.isFeatured = :isFeatured', {
        isFeatured: queryDto.isFeatured,
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere('(category.name LIKE :search OR category.description LIKE :search)', {
        search: `%${queryDto.search}%`,
      });
    }

    if (queryDto.includeChildren) {
      queryBuilder.leftJoinAndSelect('category.children', 'children');
    }

    if (queryDto.includeCourses) {
      queryBuilder.leftJoinAndSelect('category.courses', 'courses');
    }

    const sortField = queryDto.sortBy || 'orderIndex';
    const sortOrder = queryDto.sortOrder || 'ASC';
    queryBuilder.orderBy(`category.${sortField}`, sortOrder);

    if (queryDto.page && queryDto.limit) {
      const skip = (queryDto.page - 1) * queryDto.limit;
      queryBuilder.skip(skip).take(queryDto.limit);

      const [categories, total] = await queryBuilder.getManyAndCount();
      const result = {
        data: categories,
        meta: {
          page: queryDto.page,
          limit: queryDto.limit,
          total,
          totalPages: Math.ceil(total / queryDto.limit),
        },
      };

      await this.cacheService.set(cacheKey, result, this.CACHE_TTL);
      return result;
    }

    const categories = await queryBuilder.getMany();
    await this.cacheService.set(cacheKey, categories, this.CACHE_TTL);
    return categories;
  }

  async findById(id: string, includeChildren = false, includeCourses = false): Promise<Category> {
    const cacheKey = `category:${id}:${includeChildren}:${includeCourses}`;
    const cached = await this.cacheService.get<Category>(cacheKey);
    if (cached) return cached;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id });

    if (includeChildren) {
      queryBuilder.leftJoinAndSelect('category.children', 'children');
    }

    if (includeCourses) {
      queryBuilder.leftJoinAndSelect('category.courses', 'courses');
    }

    const category = await queryBuilder.getOne();
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.cacheService.set(cacheKey, category, this.CACHE_TTL);
    return category;
  }

  async getRootCategories(): Promise<Category[]> {
    const cacheKey = 'categories:root';
    const cached = await this.cacheService.get<Category[]>(cacheKey);
    if (cached) return cached;

    const rootCategories = await this.categoryRepository.find({
      where: { 
        level: 0, 
        isActive: true,
        showInMenu: true 
      },
      order: { orderIndex: 'ASC' },
      select: ['id', 'name', 'slug', 'description', 'iconUrl', 'color', 'courseCount']
    });

    await this.cacheService.set(cacheKey, rootCategories, this.CACHE_TTL);
    return rootCategories;
  }

  async getTree(): Promise<Category[]> {
    const cacheKey = 'categories:tree';
    const cached = await this.cacheService.get<Category[]>(cacheKey);
    if (cached) return cached;

    const tree = await this.categoryTreeRepository.findTrees();
    await this.cacheService.set(cacheKey, tree, this.CACHE_TTL);
    return tree;
  }

  async getFeaturedCategories(): Promise<Category[]> {
    const cacheKey = 'categories:featured';
    const cached = await this.cacheService.get<Category[]>(cacheKey);
    if (cached) return cached;

    const categories = await this.categoryRepository.find({
      where: { isFeatured: true, isActive: true },
      order: { orderIndex: 'ASC' },
    });

    await this.cacheService.set(cacheKey, categories, this.CACHE_TTL);
    return categories;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<Category> {
    const category = await this.findById(id);

    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    if (updateCategoryDto.parentId && updateCategoryDto.parentId !== category.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parent = await this.categoryRepository.findOne({
        where: { id: updateCategoryDto.parentId, isActive: true },
      });

      if (!parent) {
        throw new BadRequestException('Invalid parent category ID');
      }

      const ancestors = await this.categoryTreeRepository.findAncestors(parent);
      if (ancestors.some(ancestor => ancestor.id === id)) {
        throw new BadRequestException('Cannot create circular reference');
      }

      updateCategoryDto['level'] = parent.level + 1;
    }

    const oldValues = {
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      isActive: category.isActive,
    };

    Object.assign(category, updateCategoryDto);
    const updatedCategory = await this.categoryRepository.save(category);

    await this.clearCategoryCache();

    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    for (const [key, newValue] of Object.entries(updateCategoryDto)) {
      if (oldValues[key] !== newValue) {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue,
        });
      }
    }

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Category',
      entityId: id,
      description: `Category updated: ${updatedCategory.name}`,
      level: AuditLevel.INFO,
      changes,
      metadata: {
        categoryName: updatedCategory.name,
        updatedFields: Object.keys(updateCategoryDto),
      },
    });

    this.logger.log(`Category updated: ${updatedCategory.name} by user ${userId}`);
    return updatedCategory;
  }

  async remove(id: string, userId: string): Promise<void> {
    const category = await this.findById(id, true, true);

    if (category.courseCount > 0) {
      throw new BadRequestException('Cannot delete category with courses. Move courses first.');
    }

    if (category.children && category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Delete subcategories first.',
      );
    }

    await this.categoryRepository.remove(category);

    await this.clearCategoryCache();

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.DELETE,
      entityType: 'Category',
      entityId: id,
      description: `Category deleted: ${category.name}`,
      level: AuditLevel.WARNING,
      metadata: {
        categoryName: category.name,
        categorySlug: category.slug,
      },
    });

    this.logger.warn(`Category deleted: ${category.name} by user ${userId}`);
  }

  async getCategoryTree(): Promise<Category[]> {
    return this.getTree();
  }

  async reorder(
    id: string,
    newParentId: string | null,
    orderIndex: number,
    userId: string,
  ): Promise<Category> {
    const category = await this.findById(id);

    let parent: Category | null = null;
    if (newParentId) {
      parent = await this.categoryRepository.findOne({
        where: { id: newParentId, isActive: true },
      });

      if (!parent) {
        throw new BadRequestException('Invalid parent category ID');
      }

      if (parent.id === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      // Check for circular references
      const ancestors = await this.categoryTreeRepository.findAncestors(parent);
      if (ancestors.some(ancestor => ancestor.id === id)) {
        throw new BadRequestException('Cannot create circular reference');
      }
    }

    // Update category hierarchy
    category.parentId = newParentId || null;
    category.orderIndex = orderIndex;
    category.level = parent ? parent.level + 1 : 0;

    const updatedCategory = await this.categoryRepository.save(category);

    await this.clearCategoryCache();

    await this.auditLogService.createAuditLog({
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Category',
      entityId: id,
      description: `Category reordered: ${category.name}`,
      level: AuditLevel.INFO,
      metadata: {
        categoryName: category.name,
        newParentId,
        orderIndex,
        newLevel: category.level,
      },
    });

    this.logger.log(`Category reordered: ${category.name} by user ${userId}`);
    return updatedCategory;
  }

  async getCategoryStats(id: string): Promise<{
    totalCourses: number;
    activeCourses: number;
    totalEnrollments: number;
    subcategories: number;
  }> {
    const cacheKey = `category:${id}:stats`;
    const cached = await this.cacheService.get<{
      totalCourses: number;
      activeCourses: number;
      totalEnrollments: number;
      subcategories: number;
    }>(cacheKey);
    if (cached) return cached;

    const category = await this.findById(id);

    // Get course statistics
    const courseQuery = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.courses', 'course')
      .leftJoin('course.enrollments', 'enrollment')
      .where('category.id = :id', { id })
      .select([
        'COUNT(course.id) as totalCourses',
        'COUNT(CASE WHEN course.status = :published THEN 1 END) as activeCourses',
        'COUNT(enrollment.id) as totalEnrollments',
      ])
      .setParameter('published', 'published')
      .getRawOne();

    // Get subcategories count
    const subcategoriesCount = await this.categoryRepository.count({
      where: { parentId: id },
    });

    const stats = {
      totalCourses: parseInt((await courseQuery).totalCourses) || 0,
      activeCourses: parseInt((await courseQuery).activeCourses) || 0,
      totalEnrollments: parseInt((await courseQuery).totalEnrollments) || 0,
      subcategories: subcategoriesCount,
    };

    await this.cacheService.set(cacheKey, stats, this.CACHE_TTL);
    return stats;
  }

  /**
   * Rebuilds course counts for all categories
   * This includes courses from descendant categories for parent categories
   */
  async rebuildAllCourseCounts(): Promise<void> {
    this.logger.log('Starting to rebuild course counts for all categories');
    
    const allCategories = await this.categoryRepository.find({
      select: ['id', 'name'],
      order: { level: 'ASC' }, // Process from root to leaves
    });

    for (const category of allCategories) {
      await this.updateCategoryCourseCount(category.id);
    }

    await this.clearCategoryCache();
    this.logger.log(`Rebuilt course counts for ${allCategories.length} categories`);
  }

  private async updateCategoryCourseCount(categoryId: string): Promise<void> {
    // Get all descendant categories (including the category itself)
    const descendantCategories = await this.getCategoryDescendants(categoryId);
    const allCategoryIds = [categoryId, ...descendantCategories.map(cat => cat.id)];

    // Count published courses in the category and all its descendants
    const count = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.courses', 'course')
      .where('category.id IN (:...categoryIds)', { categoryIds: allCategoryIds })
      .andWhere('course.status = :status', { status: 'published' })
      .getCount();

    await this.categoryRepository.update(categoryId, { courseCount: count });
    this.logger.debug(`Updated course count for category ${categoryId}: ${count} courses`);
  }

  private async getCategoryDescendants(categoryId: string): Promise<Category[]> {
    try {
      const directChildren = await this.categoryRepository.find({
        where: { parentId: categoryId },
      });

      let allDescendants: Category[] = [...directChildren];

      for (const child of directChildren) {
        const grandChildren = await this.getCategoryDescendants(child.id);
        allDescendants = allDescendants.concat(grandChildren);
      }

      return allDescendants;
    } catch (error) {
      this.logger.error(`Error getting category descendants: ${error.message}`);
      return [];
    }
  }

  private async clearCategoryCache(): Promise<void> {
    const patterns = ['categories:*', 'category:*'];

    for (const pattern of patterns) {
      await this.cacheService.del(pattern);
    }
  }
}

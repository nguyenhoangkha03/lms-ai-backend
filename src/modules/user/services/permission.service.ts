import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { PermissionResource, PermissionAction } from '@/common/enums/user.enums';
import { CacheService } from '@/cache/cache.service';

export class CreatePermissionDto {
  name: string;
  description?: string;
  resource: PermissionResource;
  action: PermissionAction;
  conditions?: string;
  category?: string;
  priority?: number;
  isSystemPermission?: boolean;
  isActive?: boolean;
}

export class UpdatePermissionDto {
  name?: string;
  description?: string;
  resource?: PermissionResource;
  action?: PermissionAction;
  conditions?: string;
  category?: string;
  priority?: number;
  isSystemPermission?: boolean;
  isActive?: boolean;
}

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const existingPermission = await this.permissionRepository.findOne({
      where: {
        resource: createPermissionDto.resource,
        action: createPermissionDto.action,
      },
    });

    if (existingPermission) {
      throw new ConflictException('Permission with this resource and action already exists');
    }

    const permission = this.permissionRepository.create(createPermissionDto);
    const savedPermission = await this.permissionRepository.save(permission);

    await this.clearPermissionCache();
    this.logger.log(`Permission created: ${savedPermission.fullName}`);

    return savedPermission;
  }

  async findAll(): Promise<Permission[]> {
    const cacheKey = 'permissions:all';
    const cached = await this.cacheService.get<Permission[]>(cacheKey);
    if (cached) return cached;

    const permissions = await this.permissionRepository.find({
      order: { category: 'ASC', priority: 'DESC', name: 'ASC' },
    });

    await this.cacheService.set(cacheKey, permissions, 3600);
    return permissions;
  }

  async findByCategory(category: string): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { category },
      order: { priority: 'DESC', name: 'ASC' },
    });
  }

  async findByResource(resource: PermissionResource): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { resource },
      order: { action: 'ASC' },
    });
  }

  async findById(id: string): Promise<Permission> {
    const cacheKey = `permission:${id}`;
    const cached = await this.cacheService.get<Permission>(cacheKey);
    if (cached) return cached;

    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['roles', 'users'],
    });

    if (!permission) {
      throw new ConflictException('Permission not found');
    }

    await this.cacheService.set(cacheKey, permission, 3600);
    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.findById(id);

    if (permission.isSystemPermission && updatePermissionDto.isSystemPermission === false) {
      throw new ConflictException('Cannot modify system permission');
    }

    // Check for unique constraint if resource/action is being updated
    if (updatePermissionDto.resource || updatePermissionDto.action) {
      const resource = updatePermissionDto.resource || permission.resource;
      const action = updatePermissionDto.action || permission.action;

      const existingPermission = await this.permissionRepository.findOne({
        where: { resource, action },
      });

      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException('Permission with this resource and action already exists');
      }
    }

    const updatedPermission = await this.permissionRepository.save({
      ...permission,
      ...updatePermissionDto,
    });

    await this.clearPermissionCache();
    this.logger.log(`Permission updated: ${updatedPermission.fullName}`);

    return updatedPermission;
  }

  async remove(id: string): Promise<Permission> {
    const permission = await this.findById(id);

    if (permission.isSystemPermission) {
      throw new ConflictException('Cannot delete system permission');
    }

    await this.permissionRepository.remove(permission);
    await this.clearPermissionCache();

    this.logger.log(`Permission deleted: ${permission.fullName}`);
    return permission;
  }

  async getAvailableResources(): Promise<string[]> {
    return Object.values(PermissionResource);
  }

  async getAvailableActions(): Promise<string[]> {
    return Object.values(PermissionAction);
  }

  async getAvailableCategories(): Promise<string[]> {
    const cacheKey = 'permission:categories';
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) return cached;

    const permissions = await this.findAll();
    const categories = [
      ...new Set(
        permissions
          .map(p => p.category)
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      ),
    ];
    
    // Fallback categories nếu chưa có permissions nào
    if (categories.length === 0) {
      const defaultCategories = [
        'User Management',
        'Course Management',
        'Security',
        'Analytics',
        'System',
        'Content Management'
      ];
      await this.cacheService.set(cacheKey, defaultCategories, 3600);
      return defaultCategories;
    }
    
    const sorted = categories.sort();
    await this.cacheService.set(cacheKey, sorted, 3600);
    return sorted;
  }

  private async clearPermissionCache(): Promise<void> {
    await this.cacheService.del('permissions:*');
  }
}

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

  private async clearPermissionCache(): Promise<void> {
    await this.cacheService.del('permissions:*');
  }
}

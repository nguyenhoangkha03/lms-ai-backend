import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CacheService } from '@/cache/cache.service';

export class CreateRoleDto {
  name: string;
  description?: string;
  displayName?: string;
  level?: number;
  color?: string;
  icon?: string;
  permissionIds?: string[];
}

export class UpdateRoleDto {
  name?: string;
  description?: string;
  displayName?: string;
  level?: number;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({ where: { name: createRoleDto.name } });
    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    const role = this.roleRepository.create(createRoleDto);

    if (createRoleDto.permissionIds) {
      const permissions = await this.permissionRepository.findBy({
        id: In(createRoleDto.permissionIds),
      });
      role.permissions = permissions;
    }

    const savedRole = await this.roleRepository.save(role);
    await this.clearRoleCache();

    this.logger.log(`Role created: ${savedRole.name}`);
    return savedRole;
  }

  async findAll(): Promise<Role[]> {
    const cacheKey = 'roles:all';
    const cached = await this.cacheService.get<Role[]>(cacheKey);
    if (cached) return cached;

    const roles = await this.roleRepository.find({
      relations: ['permissions'],
      order: { level: 'ASC', name: 'ASC' },
    });

    await this.cacheService.set(cacheKey, roles, 3600);
    return roles;
  }

  async findById(id: string): Promise<Role> {
    const cacheKey = `role:${id}`;
    const cached = await this.cacheService.get<Role>(cacheKey);
    if (cached) return cached;

    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    await this.cacheService.set(cacheKey, role, 3600);
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name },
      });
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    Object.assign(role, updateRoleDto);
    const updatedRole = await this.roleRepository.save(role);

    await this.clearRoleCache();
    this.logger.log(`Role updated: ${updatedRole.name}`);

    return updatedRole;
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findById(roleId);
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });

    if (permissions.length !== permissionIds.length) {
      throw new NotFoundException('Some permissions not found');
    }

    role.permissions = permissions;
    const updatedRole = await this.roleRepository.save(role);

    await this.clearRoleCache();
    return updatedRole;
  }

  async removePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.findById(roleId);

    role.permissions =
      role.permissions?.filter(permission => !permissionIds.includes(permission.id)) || [];

    const updatedRole = await this.roleRepository.save(role);
    await this.clearRoleCache();

    return updatedRole;
  }

  async delete(id: string): Promise<void> {
    const role = await this.findById(id);

    if (role.isSystemRole) {
      throw new BadRequestException('Cannot delete system role');
    }

    await this.roleRepository.remove(role);
    await this.clearRoleCache();

    this.logger.log(`Role deleted: ${role.name}`);
  }

  private async clearRoleCache(): Promise<void> {
    await this.cacheService.del('roles:*');
    await this.cacheService.del('role:*');
  }
}

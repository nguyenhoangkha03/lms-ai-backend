import { Entity, Column, ManyToMany, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { PermissionAction, PermissionResource } from '@/common/enums/user.enums';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('permissions')
@Unique(['resource', 'action'])
@Index(['resource'])
@Index(['action'])
@Index(['isSystemPermission'])
export class Permission extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Permission name',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Permission description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: PermissionResource,
    comment: 'Resource this permission applies to',
  })
  resource: PermissionResource;

  @Column({
    type: 'enum',
    enum: PermissionAction,
    comment: 'Action this permission allows',
  })
  action: PermissionAction;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Additional conditions or constraints',
  })
  conditions?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is a system-defined permission',
  })
  isSystemPermission: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this permission is active',
  })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Permission category or group',
  })
  category?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Permission priority level',
  })
  priority: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Permission-specific settings',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional permission metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToMany(() => User, user => user.permissions)
  users?: User[];

  @ManyToMany(() => Role, role => role.permissions)
  roles?: Role[];

  // Virtual properties
  get fullName(): string {
    return `${this.action}:${this.resource}`;
  }

  get isAdminPermission(): boolean {
    return (
      this.resource === PermissionResource.ALL ||
      this.action === PermissionAction.MANAGE ||
      this.name.toLowerCase().includes('admin')
    );
  }

  get displayText(): string {
    return this.description || this.name;
  }
}

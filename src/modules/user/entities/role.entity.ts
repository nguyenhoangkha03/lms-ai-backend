import { Entity, Column, ManyToMany, JoinTable, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity('roles')
@Index(['isSystemRole'])
@Index(['isActive'])
export class Role extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: 'Role name',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Role description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Role display name',
  })
  displayName?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is a system-defined role',
  })
  isSystemRole: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this role is active',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Role hierarchy level (0 = highest)',
  })
  level: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Role color for UI display',
  })
  color?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Role icon identifier',
  })
  icon?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Role-specific settings and configurations',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional role metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToMany(() => User, user => user.roles)
  users?: User[];

  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions?: Permission[];

  // Virtual properties
  get isAdminRole(): boolean {
    return this.name.toLowerCase().includes('admin') || this.level === 0;
  }

  get displayText(): string {
    return this.displayName || this.name;
  }
}

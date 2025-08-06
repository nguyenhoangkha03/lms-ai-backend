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
    comment:
      'Tên định danh duy nhất của vai trò mở rộng của cột loại người dùng. Ví dụ: admin, teacher, student, ',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mô tả',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Tên hiển thị',
  })
  displayName?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) đánh dấu đây là vai trò cốt lõi của hệ thống, không thể bị xóa bởi admin',
  })
  isSystemRole: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cho biết vai trò này có đang được sử dụng hay không',
  })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment:
      'Một số nguyên để xác định thứ bậc của vai trò. Ví dụ: 0: admin, 1: teacher, 2: student, ...',
  })
  level: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Mã màu để hiển thị vai trò trên giao diện người dùng',
  })
  color?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Tên hoặc mã của một biểu tượng (icon) đại diện cho vai trò',
  })
  icon?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các cấu hình đặc thù dành riêng cho vai trò này',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
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

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
    comment: 'Tên định danh của quyền dùng trong code',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên hiển thị của quyền',
  })
  displayName?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mô tả rõ ràng, dễ hiểu về ý nghĩa của quyền này',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: PermissionResource,
    comment:
      'Đối tượng mà quyền này tác động đến, ví dụ: user (người dùng), course (khóa học), system (hệ thống).',
  })
  resource: PermissionResource;

  @Column({
    type: 'enum',
    enum: PermissionAction,
    comment:
      'Hành động cụ thể được phép thực hiện trên tài nguyên, ví dụ: create (tạo), read (xem), update (cập nhật), delete (xóa).',
  })
  action: PermissionAction;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Các điều kiện bổ sung (nếu có) để quyền có hiệu lực',
  })
  conditions?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) đánh dấu đây là quyền cốt lõi, không thể bị xóa bởi admin.',
  })
  isSystemPermission: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cho biết quyền này có đang được áp dụng hay không',
  })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Giúp nhóm các quyền lại với nhau trong giao diện quản lý của Admin',
  })
  category?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Mức độ ưu tiên của quyền, hữu ích khi xử lý các xung đột quyền',
  })
  priority: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các cấu hình đặc thù dành riêng cho quyền này',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin mở rộng khác.',
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

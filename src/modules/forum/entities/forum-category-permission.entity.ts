import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ForumPermission } from '@/common/enums/forum.enums';
import { ForumCategory } from './forum-category.entity';
import { Role } from '../../user/entities/role.entity';

@Entity('forum_category_permissions')
@Index(['categoryId', 'roleId'], { unique: true })
@Index(['categoryId'])
@Index(['roleId'])
export class ForumCategoryPermission extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Category ID',
  })
  categoryId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Role ID',
  })
  roleId: string;

  @Column({
    type: 'enum',
    enum: ForumPermission,
    comment: 'Permission type',
  })
  permission: ForumPermission;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Is permission granted',
  })
  isGranted: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Permission metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => ForumCategory, category => category.permissions)
  @JoinColumn({ name: 'categoryId' })
  category: ForumCategory;

  @ManyToOne(() => Role, role => role.id)
  @JoinColumn({ name: 'roleId' })
  role: Role;
}

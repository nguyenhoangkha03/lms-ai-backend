import { Entity, Column, Index, Tree, TreeParent, TreeChildren, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Course } from './course.entity';

@Entity('categories')
@Tree('materialized-path')
@Index(['parentId'])
@Index(['isActive', 'orderIndex'])
@Index(['level'])
export class Category extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Category name',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'URL-friendly slug',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Category description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Category icon URL or identifier',
  })
  iconUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Category cover image URL',
  })
  coverUrl?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Category color theme',
  })
  color?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Display order within parent category',
  })
  orderIndex: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Hierarchy level (0 = root)',
  })
  level: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Category active status',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Show in navigation menu',
  })
  showInMenu: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Featured category status',
  })
  isFeatured: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of courses in this category',
  })
  courseCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'SEO metadata',
  })
  seoMeta?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Category settings and preferences',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional category metadata',
  })
  metadata?: Record<string, any>;

  // Tree relationships
  @TreeParent()
  parent?: Category;

  @TreeChildren()
  children?: Category[];

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Parent category ID',
  })
  parentId?: string;

  // Course relationships
  @OneToMany(() => Course, course => course.category)
  courses?: Course[];

  // Virtual properties
  get fullPath(): string {
    // This will be computed based on materialized path
    return this.slug;
  }

  get hasChildren(): boolean {
    // return this.children && this.children.length > 0;
    return !!this.children?.length;
  }

  get isRoot(): boolean {
    return this.level === 0 && !this.parentId;
  }

  get breadcrumb(): string[] {
    // Will be implemented to return full category path
    return [this.name];
  }
}

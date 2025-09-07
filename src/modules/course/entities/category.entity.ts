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
    comment: 'Tên hiển thị của danh mục',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment:
      'Tên phiên bản rút gọn, không dấu, dùng để tạo đường dẫn URL thân thiện với SEO (ví dụ: lap-trinh-web).',
  })
  slug: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả danh mục',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL biểu tượng danh mục',
  })
  iconUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL ảnh bìa danh mục',
  })
  coverUrl?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Mã màu chủ đạo của danh mục để hiển thị trên giao diện.',
  })
  color?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số nguyên xác định vị trí của danh mục khi hiển thị trong danh sách.',
  })
  orderIndex: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Cấp bậc của danh mục trong cây phân cấp (0 là cấp cao nhất).',
  })
  level: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Trạng thái hoạt động của danh mục',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment:
      'Cờ (true/false) quyết định danh mục có xuất hiện trên thanh điều hướng chính hay không',
  })
  showInMenu: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) để đánh dấu đây là một danh mục nổi bật, có thể được ưu tiên hiển thị ở trang chủ',
  })
  isFeatured: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng khóa học',
  })
  courseCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Metadata cho SEO',
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
    comment: 'Cài đặt bổ sung',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
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
    comment:
      'Khóa ngoại tự tham chiếu đến id của chính bảng này, dùng để tạo cấu trúc cây danh mục. Nếu là NULL, đây là danh mục gốc',
  })
  parentId?: string | null;

  // Course relationships
  @OneToMany(() => Course, course => course.category)
  courses?: Course[];

  // Virtual properties
  get fullPath(): string {
    return this.slug;
  }

  get hasChildren(): boolean {
    return !!this.children?.length;
  }

  get isRoot(): boolean {
    return this.level === 0 && !this.parentId;
  }

  get breadcrumb(): string[] {
    return [this.name];
  }
}

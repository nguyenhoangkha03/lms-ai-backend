import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from './course.entity';

@Entity('cart')
@Unique(['userId', 'courseId']) // Prevent duplicate course in same cart
export class Cart extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID của user sở hữu giỏ hàng',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID của khóa học trong giỏ hàng',
  })
  courseId: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Giá khóa học tại thời điểm thêm vào giỏ hàng',
  })
  priceAtAdd: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Mã tiền tệ',
  })
  currency: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Ngày thêm vào giỏ hàng',
  })
  addedAt: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Metadata bổ sung (discount, coupon, etc.)',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.cartItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Course, course => course.cartItems)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  // Computed properties
  get isValidPrice(): boolean {
    return this.course && Number(this.priceAtAdd) === Number(this.course.price);
  }

  get originalPrice(): number {
    return this.course ? Number(this.course.originalPrice) : 0;
  }

  get hasDiscount(): boolean {
    return !!(
      this.course &&
      this.course.originalPrice &&
      Number(this.course.originalPrice) > Number(this.course.price)
    );
  }

  get discountAmount(): number {
    if (!this.hasDiscount || !this.course.originalPrice) return 0;
    return Number(this.course.originalPrice) - Number(this.course.price);
  }

  get discountPercent(): number {
    if (!this.hasDiscount || !this.course.originalPrice) return 0;
    return Math.round(
      ((Number(this.course.originalPrice) - Number(this.course.price)) /
        Number(this.course.originalPrice)) *
        100,
    );
  }
}

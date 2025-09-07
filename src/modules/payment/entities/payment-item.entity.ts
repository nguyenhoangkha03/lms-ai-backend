import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Payment } from './payment.entity';
import { Course } from '../../course/entities/course.entity';

@Entity('payment_items')
export class PaymentItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  paymentId: string;

  @Column()
  courseId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount?: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  courseTitle?: string;

  @Column({ type: 'text', nullable: true })
  courseThumbnail?: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Payment, (payment) => payment.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  // Computed properties
  get hasDiscount(): boolean {
    return !!(this.originalPrice && this.originalPrice > this.price);
  }

  get discountPercent(): number {
    if (!this.hasDiscount || !this.originalPrice) return 0;
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
}
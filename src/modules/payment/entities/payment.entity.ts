import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { PaymentItem } from './payment-item.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PENDING_VERIFICATION = 'pending_verification', // For manual MoMo verification
}

export enum PaymentMethod {
  MOMO = 'momo',
  STRIPE = 'stripe',
}

@Entity('payments')
export class Payment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  orderCode: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalAmount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  couponCode: string;

  @Column({ nullable: true })
  gatewayTransactionId: string;

  @Column({ nullable: true })
  gatewayOrderCode: string;

  @Column({ type: 'text', nullable: true })
  gatewayResponse: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  expiredAt: Date;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => PaymentItem, (item) => item.payment, { cascade: true })
  items: PaymentItem[];

  // Computed properties
  get isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  get isPending(): boolean {
    return this.status === PaymentStatus.PENDING;
  }

  get isFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  get isExpired(): boolean {
    return this.expiredAt && new Date() > this.expiredAt;
  }
}
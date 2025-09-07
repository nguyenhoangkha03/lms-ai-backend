import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  metadata?: any;
}

export class PaymentItemDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class ProcessPaymentDto extends CreatePaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  items: PaymentItemDto[];
}

export class PaymentCallbackDto {
  @IsString()
  @IsNotEmpty()
  orderCode: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  response?: any;
}

export class PaymentQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  orderCode?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}

export class PaymentResponseDto {
  id: string;
  orderCode: string;
  paymentMethod: PaymentMethod;
  status: string;
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
  currency: string;
  description?: string;
  createdAt: Date;
  paidAt?: Date;
  items: PaymentItemResponseDto[];
}

export class PaymentItemResponseDto {
  id: string;
  courseId: string;
  courseTitle?: string;
  courseThumbnail?: string;
  price: number;
  originalPrice?: number;
  discountAmount?: number;
  currency: string;
  hasDiscount: boolean;
  discountPercent: number;
}

export class CreatePaymentUrlDto {
  paymentUrl: string;
  orderCode: string;
  paymentId: string;
  expiredAt: Date;
}

export class PaymentStatsDto {
  totalPayments: number;
  completedPayments: number;
  totalRevenue: number;
  pendingAmount: number;
  currency: string;
}
import { IsString, IsUUID, IsOptional, IsDecimal, IsObject, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Course } from '../entities/course.entity';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID của khóa học cần thêm vào giỏ hàng',
    example: 'uuid-string',
  })
  @IsString()
  @IsUUID()
  courseId: string;

  @ApiPropertyOptional({
    description: 'Metadata bổ sung (coupon code, special offers, etc.)',
    example: { couponCode: 'DISCOUNT10', source: 'course_detail' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RemoveFromCartDto {
  @ApiProperty({
    description: 'ID của khóa học cần xóa khỏi giỏ hàng',
    example: 'uuid-string',
  })
  @IsString()
  @IsUUID()
  courseId: string;
}

export class CartQueryDto {
  @ApiPropertyOptional({
    description: 'Bao gồm thông tin chi tiết khóa học',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeCourseDetails?: boolean = true;

  @ApiPropertyOptional({
    description: 'Bao gồm thông tin giảng viên',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeTeacher?: boolean = false;

  @ApiPropertyOptional({
    description: 'Bao gồm thống kê giỏ hàng',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeStats?: boolean = true;
}

export class BulkCartOperationDto {
  @ApiProperty({
    description: 'Danh sách ID khóa học',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  courseIds: string[];

  @ApiPropertyOptional({
    description: 'Metadata cho toàn bộ operation',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Response DTOs
export class CartItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ type: 'number', format: 'decimal' })
  priceAtAdd: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  addedAt: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  course?: Course; // Will be populated based on includeCourseDetails

  @ApiPropertyOptional()
  isValidPrice?: boolean;

  @ApiPropertyOptional()
  hasDiscount?: boolean;

  @ApiPropertyOptional()
  discountAmount?: number;

  @ApiPropertyOptional()
  discountPercent?: number;
}

export class CartStatsDto {
  @ApiProperty()
  totalItems: number;

  @ApiProperty({ type: 'number', format: 'decimal' })
  totalValue: number;

  @ApiProperty({ type: 'number', format: 'decimal' })
  totalDiscount: number;

  @ApiProperty({ type: 'number', format: 'decimal' })
  finalPrice: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  hasInvalidItems: boolean;

  @ApiProperty()
  invalidItemsCount: number;
}

export class CartResponseDto {
  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiPropertyOptional()
  stats?: CartStatsDto;

  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  message?: string;
}

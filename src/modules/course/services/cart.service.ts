import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';
import { Course } from '../entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { Enrollment } from '../entities/enrollment.entity';
import {
  AddToCartDto,
  CartQueryDto,
  BulkCartOperationDto,
  CartResponseDto,
  CartItemResponseDto,
  CartStatsDto,
} from '../dto/cart.dto';
import { CourseStatus } from '@/common/enums/course.enums';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async getCartByUserId(userId: string, queryDto: CartQueryDto = {}): Promise<CartResponseDto> {
    const { includeCourseDetails = true, includeTeacher = false, includeStats = true } = queryDto;

    // Build query relations
    const relations: any[] = [];
    relations.push('course');
    relations.push('course.teacher');
    relations.push('course.category');

    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations,
      order: { addedAt: 'DESC' },
    });

    const items: CartItemResponseDto[] = cartItems.map(item => ({
      id: item.id,
      courseId: item.courseId,
      userId: item.userId,
      priceAtAdd: item.priceAtAdd,
      currency: item.currency,
      addedAt: item.addedAt,
      metadata: item.metadata,
      course: item.course,
      isValidPrice: item.isValidPrice,
      hasDiscount: item.hasDiscount,
      discountAmount: item.discountAmount,
      discountPercent: item.discountPercent,
    }));

    const response: CartResponseDto = {
      items,
      success: true,
      stats: this.calculateCartStats(cartItems),
    };

    return response;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartItemResponseDto> {
    const { courseId, metadata } = addToCartDto;

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate course exists and is published
    const course = await this.courseRepository.findOne({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
      },
      relations: ['teacher', 'category'],
    });

    if (!course) {
      throw new NotFoundException('Course not found or not published');
    }

    // Check if course is free
    if (course.isFree) {
      throw new BadRequestException('Free courses cannot be added to cart');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId: userId, courseId },
    });

    if (existingEnrollment) {
      throw new ConflictException('User is already enrolled in this course');
    }

    // Check if course is already in cart
    const existingCartItem = await this.cartRepository.findOne({
      where: { userId, courseId },
    });

    if (existingCartItem) {
      throw new ConflictException('Course is already in cart');
    }

    // Check enrollment limit
    if (course.enrollmentLimit && course.totalEnrollments >= course.enrollmentLimit) {
      throw new BadRequestException('Course enrollment limit reached');
    }

    // Create cart item
    const cartItem = this.cartRepository.create({
      userId,
      courseId,
      priceAtAdd: course.price,
      currency: course.currency,
      addedAt: new Date(),
      metadata,
    });

    const savedCartItem = await this.cartRepository.save(cartItem);

    // Return with course details
    const cartItemWithCourse = await this.cartRepository.findOne({
      where: { id: savedCartItem.id },
      relations: ['course', 'course.teacher', 'course.category'],
    });

    if (!cartItemWithCourse) {
      throw new NotFoundException('Cart item not found');
    }

    return {
      id: cartItemWithCourse.id,
      courseId: cartItemWithCourse.courseId,
      userId: cartItemWithCourse.userId,
      priceAtAdd: cartItemWithCourse.priceAtAdd,
      currency: cartItemWithCourse.currency,
      addedAt: cartItemWithCourse.addedAt,
      metadata: cartItemWithCourse.metadata,
      course: this.transformCourseData(cartItemWithCourse.course),
      isValidPrice: cartItemWithCourse.isValidPrice,
      hasDiscount: cartItemWithCourse.hasDiscount,
      discountAmount: cartItemWithCourse.discountAmount,
      discountPercent: cartItemWithCourse.discountPercent,
    };
  }

  async removeFromCart(
    userId: string,
    courseId: string,
  ): Promise<{ success: boolean; message: string }> {
    const cartItem = await this.cartRepository.findOne({
      where: { userId, courseId },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.cartRepository.remove(cartItem);

    return {
      success: true,
      message: 'Item removed from cart successfully',
    };
  }

  async clearCart(userId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.cartRepository.delete({ userId });

    return {
      success: true,
      message: `${result.affected || 0} items removed from cart`,
    };
  }

  async bulkAddToCart(
    userId: string,
    bulkDto: BulkCartOperationDto,
  ): Promise<{ success: boolean; added: number; failed: string[] }> {
    const { courseIds, metadata } = bulkDto;
    const failed: string[] = [];
    let added = 0;

    for (const courseId of courseIds) {
      try {
        await this.addToCart(userId, { courseId, metadata });
        added++;
      } catch (error) {
        failed.push(`${courseId}: ${error.message}`);
      }
    }

    return {
      success: true,
      added,
      failed,
    };
  }

  async bulkRemoveFromCart(
    userId: string,
    bulkDto: BulkCartOperationDto,
  ): Promise<{ success: boolean; removed: number; failed: string[] }> {
    const { courseIds } = bulkDto;
    const failed: string[] = [];
    let removed = 0;

    for (const courseId of courseIds) {
      try {
        await this.removeFromCart(userId, courseId);
        removed++;
      } catch (error) {
        failed.push(`${courseId}: ${error.message}`);
      }
    }

    return {
      success: true,
      removed,
      failed,
    };
  }

  async getCartItemCount(userId: string): Promise<number> {
    return this.cartRepository.count({ where: { userId } });
  }

  async isInCart(userId: string, courseId: string): Promise<boolean> {
    const count = await this.cartRepository.count({
      where: { userId, courseId },
    });
    return count > 0;
  }

  // Helper methods
  private transformCourseData(course: Course): any {
    if (!course) return null;

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      thumbnailUrl: course.thumbnailUrl,
      price: course.price,
      originalPrice: course.originalPrice,
      currency: course.currency,
      isFree: course.isFree,
      level: course.level,
      durationHours: course.durationHours,
      durationMinutes: course.durationMinutes,
      totalEnrollments: course.totalEnrollments,
      rating: course.rating,
      totalRatings: course.totalRatings,
      hasCertificate: course.hasCertificate,
      lifetimeAccess: course.lifetimeAccess,
      teacher: course.teacher
        ? {
            id: course.teacher.id,
            displayName: course.teacher.displayName || course.teacher.displayName,
            avatarUrl: course.teacher.avatarUrl || course.teacher.avatarUrl,
          }
        : null,
      category: course.category
        ? {
            id: course.category.id,
            name: course.category.name,
            slug: course.category.slug,
          }
        : null,
    };
  }

  private calculateCartStats(cartItems: Cart[]): CartStatsDto {
    const totalItems = cartItems.length;
    let totalValue = 0;
    let totalDiscount = 0;
    let invalidItemsCount = 0;

    for (const item of cartItems) {
      totalValue += Number(item.originalPrice);

      if (item.hasDiscount) {
        totalDiscount += Number(item.discountAmount);
      }

      if (!item.isValidPrice) {
        invalidItemsCount++;
      }
    }

    const finalPrice = Number(totalValue) - Number(totalDiscount);

    return {
      totalItems,
      totalValue,
      totalDiscount,
      finalPrice,
      currency: cartItems[0]?.currency || 'USD',
      hasInvalidItems: invalidItemsCount > 0,
      invalidItemsCount,
    };
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { PaymentItem } from '../entities/payment-item.entity';
import { Cart } from '../../course/entities/cart.entity';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { Enrollment } from '../../course/entities/enrollment.entity';
import {
  CreatePaymentDto,
  ProcessPaymentDto,
  PaymentCallbackDto,
  PaymentQueryDto,
  PaymentResponseDto,
  CreatePaymentUrlDto,
  PaymentStatsDto,
} from '../dto/payment.dto';
import { MomoService } from './momo.service';
import { StripeService } from './stripe.service';
import { EnrollmentStatus } from '@/common/enums/course.enums';
import { CreateEnrollmentDto } from '@/modules/course/dto/enrollments/create-enrollment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentItem)
    private readonly paymentItemRepository: Repository<PaymentItem>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly momoService: MomoService,
    private readonly stripeService: StripeService,
  ) {}

  async createPaymentFromCart(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentUrlDto> {
    // Get cart items
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ['course'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate all courses are still available
    for (const cartItem of cartItems) {
      if (!cartItem.course) {
        throw new NotFoundException(`Course not found for cart item ${cartItem.id}`);
      }

      // Check if user is already enrolled
      const existingEnrollment = await this.enrollmentRepository.findOne({
        where: { studentId: userId, courseId: cartItem.courseId },
      });

      if (existingEnrollment) {
        throw new ConflictException(`Already enrolled in course: ${cartItem.course.title}`);
      }
    }

    const orderCode = this.generateOrderCode();

    // Calculate totals
    let totalAmount = 0;
    let discountAmount = 0;

    for (const cartItem of cartItems) {
      totalAmount += cartItem.originalPrice;
      if (cartItem.hasDiscount) {
        discountAmount += cartItem.discountAmount;
      }
    }

    const finalAmount = totalAmount - discountAmount;

    // Debug logging for Stripe minimum amount
    console.log('Payment calculation:', {
      totalAmount,
      discountAmount,
      finalAmount,
      currency: cartItems[0].currency,
      cartItemPrices: cartItems.map(item => ({
        courseId: item.courseId,
        priceAtAdd: item.priceAtAdd,
        originalPrice: item.course?.originalPrice,
        hasDiscount: item.hasDiscount,
      })),
    });

    return await this.paymentRepository.manager.transaction(async manager => {
      // Create payment
      const payment = manager.create(Payment, {
        userId,
        orderCode,
        paymentMethod: createPaymentDto.paymentMethod,
        status: PaymentStatus.PENDING,
        totalAmount,
        discountAmount,
        finalAmount,
        currency: cartItems[0].currency,
        couponCode: createPaymentDto.couponCode,
        description: createPaymentDto.description || `Payment for ${cartItems.length} courses`,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        metadata: createPaymentDto.metadata,
      });

      const savedPayment = await manager.save(Payment, payment);

      // Create payment items
      const paymentItems = cartItems.map(cartItem => {
        const paymentItem = new PaymentItem();
        paymentItem.paymentId = savedPayment.id;
        paymentItem.courseId = cartItem.courseId;
        paymentItem.price = cartItem.priceAtAdd;
        paymentItem.originalPrice = cartItem.course.originalPrice || undefined;
        paymentItem.discountAmount = cartItem.hasDiscount ? cartItem.discountAmount : undefined;
        paymentItem.currency = cartItem.currency;
        paymentItem.courseTitle = cartItem.course.title || undefined;
        paymentItem.courseThumbnail = cartItem.course.thumbnailUrl || undefined;
        return paymentItem;
      });

      await manager.save(PaymentItem, paymentItems);

      // Generate payment URL based on method
      const paymentUrl = await this.generatePaymentUrl(
        savedPayment,
        createPaymentDto.paymentMethod,
      );

      return {
        paymentUrl,
        orderCode,
        paymentId: savedPayment.id,
        expiredAt: savedPayment.expiredAt,
      };
    });
  }

  async processPayment(
    userId: string,
    processPaymentDto: ProcessPaymentDto,
  ): Promise<CreatePaymentUrlDto> {
    const orderCode = this.generateOrderCode();

    // Validate courses exist
    const courseIds = processPaymentDto.items.map(item => item.courseId);
    const courses = await this.courseRepository.findByIds(courseIds);

    if (courses.length !== courseIds.length) {
      throw new NotFoundException('Some courses not found');
    }

    // Check if user is already enrolled in any course
    for (const courseId of courseIds) {
      const existingEnrollment = await this.enrollmentRepository.findOne({
        where: { studentId: userId, courseId },
      });

      if (existingEnrollment) {
        const course = courses.find(c => c.id === courseId);
        throw new ConflictException(`Already enrolled in course: ${course?.title}`);
      }
    }

    // Calculate totals
    const totalAmount = processPaymentDto.items.reduce((sum, item) => sum + item.price, 0);
    const discountAmount = processPaymentDto.items.reduce(
      (sum, item) => sum + (item.originalPrice ? item.originalPrice - item.price : 0),
      0,
    );
    const finalAmount = totalAmount - discountAmount;

    return await this.paymentRepository.manager.transaction(async manager => {
      // Create payment
      const payment = manager.create(Payment, {
        userId,
        orderCode,
        paymentMethod: processPaymentDto.paymentMethod,
        status: PaymentStatus.PENDING,
        totalAmount,
        discountAmount,
        finalAmount,
        currency: processPaymentDto.items[0]?.currency || 'USD',
        couponCode: processPaymentDto.couponCode,
        description:
          processPaymentDto.description || `Payment for ${processPaymentDto.items.length} courses`,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        metadata: processPaymentDto.metadata,
      });

      const savedPayment = await manager.save(Payment, payment);

      // Create payment items
      const paymentItems = processPaymentDto.items.map(item => {
        const course = courses.find(c => c.id === item.courseId);
        const paymentItem = new PaymentItem();
        paymentItem.paymentId = savedPayment.id;
        paymentItem.courseId = item.courseId;
        paymentItem.price = item.price;
        paymentItem.originalPrice = item.originalPrice || undefined;
        paymentItem.discountAmount = item.originalPrice
          ? item.originalPrice - item.price
          : undefined;
        paymentItem.currency = item.currency || 'USD';
        paymentItem.courseTitle = course?.title || undefined;
        paymentItem.courseThumbnail = course?.thumbnailUrl || undefined;
        return paymentItem;
      });

      await manager.save(PaymentItem, paymentItems);

      // Generate payment URL based on method
      const paymentUrl = await this.generatePaymentUrl(
        savedPayment,
        processPaymentDto.paymentMethod,
      );

      return {
        paymentUrl,
        orderCode,
        paymentId: savedPayment.id,
        expiredAt: savedPayment.expiredAt,
      };
    });
  }

  async handlePaymentCallback(
    callbackDto: PaymentCallbackDto,
    paymentMethod: PaymentMethod,
  ): Promise<{ success: boolean; message: string }> {
    console.log('🔄 handlePaymentCallback called:', { callbackDto, paymentMethod });
    
    const payment = await this.paymentRepository.findOne({
      where: { orderCode: callbackDto.orderCode },
      relations: ['items', 'items.course'],
    });

    console.log('💰 Found payment:', payment ? `${payment.id} - ${payment.status}` : 'NOT FOUND');

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify callback with gateway
    let isValid = false;

    try {
      console.log('🔐 Verifying payment with gateway...');
      switch (paymentMethod) {
        case PaymentMethod.MOMO:
          isValid = await this.momoService.verifyCallback(callbackDto);
          break;
        case PaymentMethod.STRIPE:
          isValid = await this.stripeService.verifyCallback(callbackDto);
          break;
        default:
          throw new BadRequestException('Unsupported payment method');
      }
      console.log('✅ Payment verification result:', isValid);
    } catch (error) {
      console.error('❌ Payment verification error:', error);
      isValid = false;
    }

    if (!isValid) {
      console.log('❌ Payment verification failed - updating to FAILED status');
      await this.updatePaymentStatus(
        payment.id,
        PaymentStatus.FAILED,
        'Invalid payment callback',
        callbackDto,
      );
      return { success: false, message: 'Payment verification failed' };
    }

    // Update payment status to completed
    console.log('✅ Payment verified - updating to COMPLETED status');
    await this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, undefined, callbackDto);

    // Enroll user in courses and clear cart
    console.log('🎓 Enrolling user in courses...');
    await this.enrollUserInCourses(payment.userId, payment.items);
    
    console.log('🛒 Clearing user cart...');
    await this.clearUserCart(payment.userId);

    console.log('🎉 Payment processing completed successfully!');
    return { success: true, message: 'Payment completed successfully' };
  }

  async getPaymentById(paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['items', 'items.course'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.transformPaymentResponse(payment);
  }

  async getUserPayments(
    userId: string,
    queryDto: PaymentQueryDto,
  ): Promise<{ payments: PaymentResponseDto[]; total: number }> {
    const { page = 1, limit = 20, status, paymentMethod, startDate, endDate } = queryDto;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.items', 'items')
      .leftJoinAndSelect('items.course', 'course')
      .where('payment.userId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (paymentMethod) {
      queryBuilder.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod });
    }

    if (startDate) {
      queryBuilder.andWhere('payment.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('payment.createdAt <= :endDate', { endDate });
    }

    queryBuilder
      .orderBy('payment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [payments, total] = await queryBuilder.getManyAndCount();

    return {
      payments: payments.map(payment => this.transformPaymentResponse(payment)),
      total,
    };
  }

  // Helper methods
  private async generatePaymentUrl(
    payment: Payment,
    paymentMethod: PaymentMethod,
  ): Promise<string> {
    switch (paymentMethod) {
      case PaymentMethod.MOMO:
        return this.momoService.createPaymentUrl(payment);
      case PaymentMethod.STRIPE:
        return this.stripeService.createPaymentUrl(payment);
      default:
        throw new BadRequestException('Unsupported payment method');
    }
  }

  // Add method to get payment by order code (needed for Stripe QR)
  async getPaymentByOrderCode(orderCode: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderCode },
      relations: ['items'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  // Add method to create QR code payment
  async createQRPayment(
    paymentId: string,
    paymentMethod: PaymentMethod,
  ): Promise<{ qrCodeUrl: string; paymentUrl: string }> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['items'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    switch (paymentMethod) {
      case PaymentMethod.MOMO:
        // MoMo automatically includes QR in payment URL
        const momoUrl = await this.momoService.createPaymentUrl(payment);
        return {
          qrCodeUrl: momoUrl,
          paymentUrl: momoUrl,
        };
      case PaymentMethod.STRIPE:
        return this.stripeService.createQRCodePayment(payment);
      default:
        throw new BadRequestException('QR payment not supported for this method');
    }
  }

  private generateOrderCode(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `LMS${timestamp}${random}`;
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    failureReason?: string,
    gatewayResponse?: any,
  ): Promise<void> {
    const updateData: any = {
      status,
      gatewayResponse: gatewayResponse ? JSON.stringify(gatewayResponse) : undefined,
    };

    if (status === PaymentStatus.COMPLETED) {
      updateData.paidAt = new Date();
    }

    if (failureReason) {
      updateData.failureReason = failureReason;
    }

    if (gatewayResponse?.transactionId) {
      updateData.gatewayTransactionId = gatewayResponse.transactionId;
    }

    await this.paymentRepository.update(paymentId, updateData);
  }

  private async enrollUserInCourses(userId: string, paymentItems: PaymentItem[]): Promise<void> {
    const newEnrollments: CreateEnrollmentDto[] = [];

    for (const item of paymentItems) {
      // Check if user is already enrolled
      const existingEnrollment = await this.enrollmentRepository.findOne({
        where: { studentId: userId, courseId: item.courseId },
      });

      if (!existingEnrollment) {
        newEnrollments.push({
          studentId: userId,
          courseId: item.courseId,
          enrollmentDate: new Date(),
          status: EnrollmentStatus.ACTIVE,
          progressPercentage: 0,
          paymentStatus: PaymentStatus.PENDING as any,
          paymentAmount: item.price,
          paymentCurrency: item.currency,
        });
      } else {
        console.log(`User ${userId} already enrolled in course ${item.courseId} - skipping`);
      }
    }

    if (newEnrollments.length > 0) {
      await this.enrollmentRepository.save(newEnrollments);
      console.log(`Enrolled user ${userId} in ${newEnrollments.length} new courses`);
    }
  }

  private async clearUserCart(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
  }

  private transformPaymentResponse(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      orderCode: payment.orderCode,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      totalAmount: payment.totalAmount,
      discountAmount: payment.discountAmount,
      finalAmount: payment.finalAmount,
      currency: payment.currency,
      description: payment.description,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      items:
        payment.items?.map(item => ({
          id: item.id,
          courseId: item.courseId,
          courseTitle: item.courseTitle,
          courseThumbnail: item.courseThumbnail,
          price: item.price,
          originalPrice: item.originalPrice,
          discountAmount: item.discountAmount,
          currency: item.currency,
          hasDiscount: item.hasDiscount,
          discountPercent: item.discountPercent,
        })) || [],
    };
  }
}

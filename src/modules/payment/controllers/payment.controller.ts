import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { MomoService } from '../services/momo.service';
import { StripeService } from '../services/stripe.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreatePaymentDto,
  ProcessPaymentDto,
  PaymentCallbackDto,
  PaymentQueryDto,
  CreatePaymentUrlDto,
  PaymentResponseDto,
} from '../dto/payment.dto';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly momoService: MomoService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('create-from-cart')
  @UseGuards(JwtAuthGuard)
  async createPaymentFromCart(
    @Request() req,
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentUrlDto> {
    return this.paymentService.createPaymentFromCart(req.user.id, createPaymentDto);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  async processPayment(
    @Request() req,
    @Body() processPaymentDto: ProcessPaymentDto,
  ): Promise<CreatePaymentUrlDto> {
    return this.paymentService.processPayment(req.user.id, processPaymentDto);
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  async getUserPayments(
    @Request() req,
    @Query() queryDto: PaymentQueryDto,
  ): Promise<{ payments: PaymentResponseDto[]; total: number }> {
    return this.paymentService.getUserPayments(req.user.id, queryDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentById(@Param('id') paymentId: string): Promise<PaymentResponseDto> {
    return this.paymentService.getPaymentById(paymentId);
  }

  @Get('order/:orderCode')
  @UseGuards(JwtAuthGuard)
  async getPaymentByOrderCode(@Param('orderCode') orderCode: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentService.getPaymentByOrderCode(orderCode);
    return this.paymentService.getPaymentById(payment.id);
  }

  // Stripe webhooks and callbacks
  @Post('stripe/webhook')
  async stripeWebhook(@Request() req) {
    try {
      const signature = req.headers['stripe-signature'];
      const event = await this.stripeService.verifyWebhook(req.body, signature);
      
      const result = await this.stripeService.handleWebhookEvent(event);
      
      if (result.orderCode) {
        const callbackDto: PaymentCallbackDto = {
          orderCode: result.orderCode,
          transactionId: event.id,
          status: result.status,
          response: event.data,
        };

        await this.paymentService.handlePaymentCallback(
          callbackDto,
          PaymentMethod.STRIPE,
        );
      }

      return { received: true };
    } catch (error) {
      console.error('Stripe webhook error:', error);
      return { success: false, message: error.message };
    }
  }

  @Get('stripe/success')
  async stripeSuccess(@Query() query: any, @Res() res: Response) {
    try {
      console.log('🔵 Stripe Success Handler Called:', query);
      const sessionId = query.session_id;
      const orderCode = query.orderCode;
      
      if (sessionId) {
        console.log('🔍 Getting payment status from Stripe...');
        const paymentStatus = await this.stripeService.getPaymentStatus(sessionId);
        console.log('💳 Payment Status from Stripe:', paymentStatus);
        
        const callbackDto: PaymentCallbackDto = {
          orderCode: orderCode || paymentStatus.metadata?.orderCode,
          transactionId: sessionId,
          status: paymentStatus.status,
          response: paymentStatus,
        };

        console.log('📞 Calling handlePaymentCallback with:', callbackDto);
        const result = await this.paymentService.handlePaymentCallback(
          callbackDto,
          PaymentMethod.STRIPE,
        );
        console.log('✅ Payment callback result:', result);

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        
        if (result.success) {
          console.log('🎉 Redirecting to success page');
          return res.redirect(`${baseUrl}/student/payment/success?orderCode=${callbackDto.orderCode}`);
        } else {
          console.log('❌ Redirecting to failed page');
          return res.redirect(`${baseUrl}/student/payment/failed?orderCode=${callbackDto.orderCode}`);
        }
      }
      
      throw new BadRequestException('Missing session_id');
    } catch (error) {
      console.error('Stripe success handler error:', error);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${baseUrl}/student/payment/failed`);
    }
  }

  @Get('stripe/cancel')
  async stripeCancel(@Query() query: any, @Res() res: Response) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const orderCode = query.orderCode;
    return res.redirect(`${baseUrl}/student/payment/failed?orderCode=${orderCode}`);
  }

  @Post('stripe/create-qr/:orderCode')
  async createStripeQR(@Param('orderCode') orderCode: string) {
    try {
      // Find payment by orderCode
      const payment = await this.paymentService.getPaymentByOrderCode(orderCode);
      const qrResult = await this.stripeService.createQRCodePayment(payment);
      return qrResult;
    } catch (error) {
      throw new BadRequestException('Failed to create Stripe QR payment');
    }
  }

  // MoMo callbacks
  @Post('momo/callback')
  async momoCallback(@Body() callbackDto: PaymentCallbackDto) {
    try {
      const result = await this.paymentService.handlePaymentCallback(
        callbackDto,
        PaymentMethod.MOMO,
      );
      return result;
    } catch (error) {
      console.error('MoMo callback error:', error);
      return { success: false, message: error.message };
    }
  }

  @Post('momo/ipn')
  async momoIPN(@Body() ipnData: any) {
    try {
      const isValid = await this.momoService.verifyIPN(ipnData);
      
      if (isValid) {
        const callbackDto: PaymentCallbackDto = {
          orderCode: ipnData.orderId,
          transactionId: ipnData.transId,
          status: ipnData.resultCode?.toString(),
          response: ipnData,
        };

        await this.paymentService.handlePaymentCallback(
          callbackDto,
          PaymentMethod.MOMO,
        );
      }

      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error) {
      console.error('MoMo IPN error:', error);
      return { RspCode: '01', Message: 'Confirm Failed' };
    }
  }

  @Get('momo/return')
  async momoReturn(@Query() query: any, @Res() res: Response) {
    try {
      const callbackDto: PaymentCallbackDto = {
        orderCode: query.orderId,
        transactionId: query.transId,
        status: query.resultCode,
        response: query,
      };

      const result = await this.paymentService.handlePaymentCallback(
        callbackDto,
        PaymentMethod.MOMO,
      );

      // Redirect to success/failure page
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (result.success) {
        return res.redirect(`${baseUrl}/student/payment/success?orderCode=${callbackDto.orderCode}`);
      } else {
        return res.redirect(`${baseUrl}/student/payment/failed?orderCode=${callbackDto.orderCode}`);
      }
    } catch (error) {
      console.error('MoMo return error:', error);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${baseUrl}/student/payment/failed`);
    }
  }

  @Post('momo/query/:orderCode')
  async momoQuery(@Param('orderCode') orderCode: string) {
    try {
      return await this.momoService.queryPayment(orderCode);
    } catch (error) {
      throw new BadRequestException('Failed to query MoMo payment');
    }
  }

  // MoMo Personal Payment Endpoints
  @Get('momo/instructions/:orderCode')
  async getMoMoInstructions(@Param('orderCode') orderCode: string) {
    try {
      const payment = await this.paymentService.getPaymentByOrderCode(orderCode);
      const instructions = this.momoService.getPaymentInstructions(payment);
      
      return {
        success: true,
        payment: {
          orderCode: payment.orderCode,
          amount: payment.finalAmount,
          currency: payment.currency,
          status: payment.status,
        },
        instructions,
      };
    } catch (error) {
      throw new BadRequestException('Failed to get MoMo payment instructions');
    }
  }

  @Post('momo/verify/:orderCode')
  @UseGuards(JwtAuthGuard) // Only admin can verify payments
  async verifyMoMoPayment(
    @Param('orderCode') orderCode: string,
    @Body() verifyDto: { transactionCode: string },
    @Request() req,
  ) {
    try {
      const verification = await this.momoService.verifyManualPayment(
        orderCode,
        verifyDto.transactionCode,
        req.user.id,
      );

      if (verification.verified) {
        // Update payment status
        const callbackDto: PaymentCallbackDto = {
          orderCode,
          transactionId: verifyDto.transactionCode,
          status: 'success',
          response: {
            ...verification.details,
            manualVerification: true,
          },
        };

        const result = await this.paymentService.handlePaymentCallback(
          callbackDto,
          PaymentMethod.MOMO,
        );

        return {
          success: true,
          message: 'Payment verified and processed successfully',
          result,
        };
      } else {
        return {
          success: false,
          message: 'Payment verification failed',
        };
      }
    } catch (error) {
      throw new BadRequestException('Failed to verify MoMo payment');
    }
  }

  @Post('momo/mark-paid/:orderCode')
  @UseGuards(JwtAuthGuard)
  async markMoMoPaid(@Param('orderCode') orderCode: string, @Request() req) {
    try {
      // This endpoint allows user to mark payment as "sent"
      // Admin will verify manually later
      const payment = await this.paymentService.getPaymentByOrderCode(orderCode);
      
      // Update payment with pending verification status
      // In a real app, you might want to add a separate status for this
      await this.paymentService['updatePaymentStatus'](
        payment.id,
        PaymentStatus.PENDING_VERIFICATION,
        'User marked as paid - awaiting admin verification',
        { markedPaidBy: req.user.id, markedPaidAt: new Date() }
      );

      return {
        success: true,
        message: 'Payment marked as sent. Please wait for admin verification.',
        orderCode,
      };
    } catch (error) {
      throw new BadRequestException('Failed to mark payment as paid');
    }
  }
}
import {
  Controller,
  Post,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { StripeService } from '../services/stripe.service';
import { PaymentCallbackDto } from '../dto/payment.dto';
import { PaymentMethod } from '../entities/payment.entity';

@ApiTags('Stripe Webhooks')
@Controller('stripe')
export class StripeWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
    try {
      console.log('Stripe webhook received');

      if (!signature) {
        throw new BadRequestException('Missing Stripe signature');
      }

      // QUAN TRỌNG: Luôn ưu tiên rawBody
      const payload = (req as any).rawBody || req.body;

      console.log(`Payload source: ${(req as any).rawBody ? 'rawBody' : 'req.body'}`);
      console.log(`Payload type: ${typeof payload}`);
      console.log(`Is Buffer: ${Buffer.isBuffer(payload)}`);
      console.log(`Length: ${payload?.length || 'N/A'}`);

      // Xử lý payload
      let payloadString: string;

      if (Buffer.isBuffer(payload)) {
        payloadString = payload.toString('utf8');
        console.log('SUCCESS: Using Buffer payload');
      } else if (typeof payload === 'string') {
        payloadString = payload;
        console.log('Using string payload');
      } else {
        // Last resort - có thể không work với signature verification
        payloadString = JSON.stringify(payload);
        console.log('FALLBACK: Using JSON stringify');
      }

      // Verify webhook
      const event = await this.stripeService.verifyWebhook(payloadString, signature);

      console.log(`Processing webhook: ${event.type} (ID: ${event.id})`);

      // Handle webhook...
      const result = await this.stripeService.handleWebhookEvent(event);

      console.log('Webhook result:', {
        orderCode: result.orderCode,
        status: result.status,
        shouldProcess: result.orderCode && result.status !== 'unhandled'
      });

      if (result.orderCode && result.status !== 'unhandled') {
        const callbackDto = {
          orderCode: result.orderCode,
          transactionId: event.id,
          status: result.status,
          response: event.data,
        };

        console.log('Processing payment callback:', callbackDto);
        
        try {
          const callbackResult = await this.paymentService.handlePaymentCallback(callbackDto, PaymentMethod.STRIPE);
          console.log('Payment callback result:', callbackResult);
        } catch (callbackError) {
          console.error('Payment callback failed:', callbackError);
        }
      } else {
        console.log('Skipping payment callback - no orderCode or unhandled event');
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }

  // @Post('webhook')
  // @HttpCode(HttpStatus.OK)
  // @ApiExcludeEndpoint()
  //   async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
  //     try {
  //       console.log('🔔 Stripe webhook received');

  //       if (!signature) {
  //         console.error('❌ Missing Stripe signature');
  //         throw new BadRequestException('Missing Stripe signature');
  //       }

  //       // Kiểm tra req.body
  //       const payload = req.body;

  //       console.log(`📦 Payload type: ${typeof payload}`);
  //       console.log(`📦 Is Buffer: ${Buffer.isBuffer(payload)}`);
  //       //   console.log(`📦 Payload length: ${payload?.length || 'N/A'}`);

  //       // Xử lý payload tùy theo format
  //       let payloadString: string;

  //       if (Buffer.isBuffer(payload)) {
  //         // Trường hợp lý tưởng: express.raw() đã parse thành Buffer
  //         payloadString = payload.toString('utf8');
  //         console.log('✅ Using Buffer payload');
  //       } else if (typeof payload === 'string') {
  //         // Trường hợp fallback: payload là string
  //         payloadString = payload;
  //         console.log('✅ Using string payload');
  //       } else if (typeof payload === 'object' && payload !== null) {
  //         // Trường hợp JSON object - convert về string
  //         payloadString = JSON.stringify(payload);
  //         console.log('✅ Using JSON object payload (converted to string)');
  //       } else {
  //         console.error(`❌ Invalid payload format: ${typeof payload}`);
  //         throw new BadRequestException(`Invalid payload format: ${typeof payload}`);
  //       }

  //       console.log(`📝 Payload string length: ${payloadString.length}`);
  //       console.log(`🔐 Signature present: ${signature.substring(0, 20)}...`);

  //       // Verify webhook với Stripe
  //       let event;
  //       if (process.env.NODE_ENV === 'development') {
  //         // Development: Skip signature verification
  //         console.warn('⚠️  Development mode: Skipping signature verification');
  //         try {
  //           event = JSON.parse(payloadString);
  //         } catch (parseError) {
  //           console.error('❌ Failed to parse webhook payload:', parseError);
  //           throw new BadRequestException('Invalid JSON payload');
  //         }
  //       } else {
  //         // Production: Verify signature
  //         try {
  //           event = await this.stripeService.verifyWebhook(payloadString, signature);
  //           console.log('✅ Webhook signature verified');
  //         } catch (signatureError) {
  //           console.error('❌ Signature verification failed:', signatureError.message);
  //           throw new BadRequestException('Signature verification failed');
  //         }
  //       }

  //       console.log(`🎉 Processing webhook event: ${event.type} (ID: ${event.id})`);

  //       // Handle webhook event
  //       const result = await this.stripeService.handleWebhookEvent(event);

  //       if (result.orderCode && result.status !== 'unhandled') {
  //         console.log(`💳 Processing payment for order: ${result.orderCode}`);

  //         const callbackDto: PaymentCallbackDto = {
  //           orderCode: result.orderCode,
  //           transactionId: event.id,
  //           status: result.status,
  //           response: event.data,
  //         };

  //         await this.paymentService.handlePaymentCallback(callbackDto, PaymentMethod.STRIPE);

  //         console.log(`✅ Payment processed successfully for order: ${result.orderCode}`);
  //       } else {
  //         console.log(`ℹ️  Webhook event ${event.type} - no payment processing needed`);
  //       }

  //       return { received: true };
  //     } catch (error) {
  //       console.error('❌ Stripe webhook error:', error.message);
  //       console.error('Stack:', error.stack);

  //       if (error instanceof BadRequestException) {
  //         throw error;
  //       }

  //       throw new BadRequestException(`Webhook processing failed: ${error.message}`);
  //     }
  //   }
}

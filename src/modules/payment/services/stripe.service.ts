import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment } from '../entities/payment.entity';
import { PaymentCallbackDto } from '../dto/payment.dto';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly successUrl: string;
  private readonly cancelUrl: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
    });

    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')!;
    this.successUrl = this.configService.get<string>('STRIPE_SUCCESS_URL')!;
    this.cancelUrl = this.configService.get<string>('STRIPE_CANCEL_URL')!;
  }

  async createPaymentUrl(payment: Payment): Promise<string> {
    try {
      // Create payment intent for card payments
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.max(1, Math.round(payment.finalAmount * 100)), // Stripe uses cents, min 1
        currency: payment.currency.toLowerCase() || 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderCode: payment.orderCode,
          paymentId: payment.id,
          userId: payment.userId,
        },
        description: payment.description || `Payment for order ${payment.orderCode}`,
      });

      // Create checkout session with QR code support
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card', 'alipay', 'wechat_pay'], // QR code methods
        payment_method_options: {
          wechat_pay: {
            client: 'web',
          },
        },
        payment_intent_data: {
          metadata: {
            orderCode: payment.orderCode,
            paymentId: payment.id,
            userId: payment.userId,
          },
        },
        line_items: [
          {
            price_data: {
              currency: payment.currency.toLowerCase() || 'usd',
              product_data: {
                name: `LMS Course Payment`,
                description: payment.description || `Order ${payment.orderCode}`,
                images: ['https://your-domain.com/logo.png'], // Add your logo
              },
              unit_amount: Math.round(payment.finalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.successUrl}?session_id={CHECKOUT_SESSION_ID}&orderCode=${payment.orderCode}`,
        cancel_url: `${this.cancelUrl}?orderCode=${payment.orderCode}`,
        metadata: {
          orderCode: payment.orderCode,
          paymentId: payment.id,
          userId: payment.userId,
        },
        // Don't use ui_mode: embedded with success_url/cancel_url
        // ui_mode: 'embedded', // Removed - conflicts with success_url
      });

      return session.url!;
    } catch (error) {
      console.error('Stripe payment creation error:', error);
      throw new BadRequestException(`Stripe payment creation failed: ${error.message}`);
    }
  }

  async createQRCodePayment(payment: Payment): Promise<{ qrCodeUrl: string; paymentUrl: string }> {
    try {
      // Create payment intent specifically for QR code payments
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(payment.finalAmount * 100),
        currency: payment.currency.toLowerCase() || 'usd',
        payment_method_types: ['wechat_pay', 'alipay'], // QR code payment methods
        metadata: {
          orderCode: payment.orderCode,
          paymentId: payment.id,
          userId: payment.userId,
        },
        description: payment.description || `Payment for order ${payment.orderCode}`,
      });

      // Create checkout session with QR code focus
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['wechat_pay', 'alipay'],
        payment_method_options: {
          wechat_pay: {
            client: 'web',
          },
        },
        line_items: [
          {
            price_data: {
              currency: payment.currency.toLowerCase() || 'usd',
              product_data: {
                name: `LMS Course Payment`,
                description: payment.description || `Order ${payment.orderCode}`,
              },
              unit_amount: Math.round(payment.finalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.successUrl}?session_id={CHECKOUT_SESSION_ID}&orderCode=${payment.orderCode}`,
        cancel_url: `${this.cancelUrl}?orderCode=${payment.orderCode}`,
        metadata: {
          orderCode: payment.orderCode,
          paymentId: payment.id,
          userId: payment.userId,
        },
      });

      return {
        qrCodeUrl: session.url!, // Stripe automatically generates QR for WeChat Pay/Alipay
        paymentUrl: session.url!,
      };
    } catch (error) {
      console.error('Stripe QR payment creation error:', error);
      throw new BadRequestException(`Stripe QR payment creation failed: ${error.message}`);
    }
  }

  async verifyWebhook(payload: string, signature: string): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  async verifyCallback(callbackDto: PaymentCallbackDto): Promise<boolean> {
    try {
      // For webhook events, we already verified the signature, so trust the callback
      if (callbackDto.transactionId?.startsWith('evt_')) {
        console.log('Webhook event verified through signature - trusting callback');
        return true;
      }

      // For direct callbacks (from success page), verify through session retrieval
      const sessionId = callbackDto.response?.session_id;
      if (!sessionId) {
        console.log('No session_id found for verification');
        return false;
      }

      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session.payment_status === 'paid' && session.metadata?.orderCode === callbackDto.orderCode;
    } catch (error) {
      console.error('Stripe callback verification error:', error);
      return false;
    }
  }

  async getPaymentStatus(sessionId: string): Promise<any> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
      
      return {
        status: session.payment_status,
        paymentIntent: session.payment_intent,
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      };
    } catch (error) {
      console.error('Stripe payment status error:', error);
      throw error;
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined, // Full refund if amount not specified
        reason: reason as Stripe.RefundCreateParams.Reason,
        metadata: {
          refund_reason: reason || 'requested_by_customer',
        },
      });

      return refund;
    } catch (error) {
      console.error('Stripe refund error:', error);
      throw error;
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<{ orderCode?: string; status: string }> {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('✅ Checkout session completed:', session.metadata?.orderCode);
          return {
            orderCode: session.metadata?.orderCode,
            status: 'completed',
          };
        }
        
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('✅ Payment intent succeeded:', paymentIntent.metadata?.orderCode);
          return {
            orderCode: paymentIntent.metadata?.orderCode,
            status: 'completed',
          };
        }
        
        case 'charge.succeeded': {
          const charge = event.data.object as Stripe.Charge;
          console.log('✅ Charge succeeded:', charge.metadata?.orderCode);
          return {
            orderCode: charge.metadata?.orderCode,
            status: 'completed',
          };
        }
        
        case 'payment_intent.created': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('ℹ️ Payment intent created - DEBUG:');
          console.log('  - ID:', paymentIntent.id);
          console.log('  - Amount:', paymentIntent.amount);
          console.log('  - Metadata:', JSON.stringify(paymentIntent.metadata, null, 2));
          console.log('  - OrderCode found:', paymentIntent.metadata?.orderCode);
          return { status: 'unhandled' }; // Skip callback for this event
        }
        
        case 'charge.updated': {
          const charge = event.data.object as Stripe.Charge;
          console.log('ℹ️ Charge updated - DEBUG:');
          console.log('  - ID:', charge.id);
          console.log('  - Status:', charge.status);
          console.log('  - Metadata:', JSON.stringify(charge.metadata, null, 2));
          console.log('  - OrderCode found:', charge.metadata?.orderCode);
          
          // Only process if charge succeeded
          if (charge.status === 'succeeded') {
            return {
              orderCode: charge.metadata?.orderCode,
              status: 'completed',
            };
          }
          return { status: 'unhandled' }; // Skip callback for non-succeeded charges
        }
        
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('❌ Payment failed:', paymentIntent.metadata?.orderCode);
          return {
            orderCode: paymentIntent.metadata?.orderCode,
            status: 'failed',
          };
        }
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { status: 'unhandled' };
      }
    } catch (error) {
      console.error('Stripe webhook handling error:', error);
      throw error;
    }
  }

  // Helper method to create custom QR code for display
  async generateCustomQRCode(paymentUrl: string): Promise<string> {
    // Using qrcode library to generate custom QR code
    const QRCode = require('qrcode');
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      });
      
      return qrCodeDataURL;
    } catch (error) {
      console.error('QR code generation error:', error);
      throw new BadRequestException('Failed to generate QR code');
    }
  }
}
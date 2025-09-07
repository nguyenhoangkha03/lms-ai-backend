import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Payment } from '../entities/payment.entity';
import { PaymentCallbackDto } from '../dto/payment.dto';

@Injectable()
export class MomoService {
  private readonly partnerCode: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string;
  private readonly redirectUrl: string;
  private readonly ipnUrl: string;

  // Personal MoMo account config
  private readonly personalPhone: string;
  private readonly personalName: string;
  private readonly usdToVndRate: number;

  constructor(private readonly configService: ConfigService) {
    // Personal account config (currently used)
    this.personalPhone = this.configService.get<string>('MOMO_PERSONAL_PHONE', '0123456789')!;
    this.personalName = this.configService.get<string>('MOMO_PERSONAL_NAME', 'LMS System')!;
    this.usdToVndRate = this.configService.get<number>('MOMO_USD_TO_VND_RATE', 24000)!;

    // Business API config (kept for future use, currently not used)
    this.partnerCode = this.configService.get<string>('MOMO_PARTNER_CODE', '')!;
    this.accessKey = this.configService.get<string>('MOMO_ACCESS_KEY', '')!;
    this.secretKey = this.configService.get<string>('MOMO_SECRET_KEY', '')!;
    this.endpoint = this.configService.get<string>(
      'MOMO_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/create',
    )!;
    this.redirectUrl = this.configService.get<string>('MOMO_REDIRECT_URL', '')!;
    this.ipnUrl = this.configService.get<string>('MOMO_IPN_URL', '')!;
  }


  async verifyCallback(callbackDto: PaymentCallbackDto): Promise<boolean> {
    // Check if this is a manual verification
    if (callbackDto.response?.manualVerification) {
      // For manual verification, just check the status
      return callbackDto.status === 'success';
    }

    // For business API (not used currently but kept for future)
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = callbackDto.response;

    // Verify signature
    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    return signature === expectedSignature && resultCode === 0;
  }

  async queryPayment(orderCode: string): Promise<any> {
    const requestId = Date.now().toString();
    const orderId = orderCode;
    const lang = 'vi';

    const rawSignature = `accessKey=${this.accessKey}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      requestId,
      orderId,
      signature,
      lang,
    };

    const queryEndpoint = this.configService.get<string>(
      'MOMO_QUERY_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/query',
    );

    try {
      const response = await fetch(queryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      return await response.json();
    } catch (error) {
      console.error('MoMo query error:', error);
      throw error;
    }
  }

  async refundPayment(orderCode: string, amount: number, reason: string): Promise<any> {
    const requestId = Date.now().toString();
    const orderId = orderCode;
    const description = reason;
    const lang = 'vi';

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&description=${description}&orderId=${orderId}&partnerCode=${this.partnerCode}&requestId=${requestId}`;

    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode: this.partnerCode,
      requestId,
      orderId,
      amount,
      description,
      signature,
      lang,
    };

    const refundEndpoint = this.configService.get<string>(
      'MOMO_REFUND_ENDPOINT',
      'https://test-payment.momo.vn/v2/gateway/api/refund',
    );

    try {
      const response = await fetch(refundEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      return await response.json();
    } catch (error) {
      console.error('MoMo refund error:', error);
      throw error;
    }
  }

  async verifyIPN(ipnData: any): Promise<boolean> {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = ipnData;

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawSignature)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Create personal MoMo payment deep link (for personal accounts)
   */
  createPersonalPaymentLink(payment: Payment): {
    deepLink: string;
    qrCode: string;
    manualInfo: {
      phone: string;
      name: string;
      amount: number;
      note: string;
    };
  } {
    // Convert amount to VND if needed (MoMo only supports VND)
    let amount = payment.finalAmount;
    if (payment.currency !== 'VND') {
      // Convert USD to VND using configurable rate
      amount = payment.currency === 'USD' ? amount * this.usdToVndRate : amount;
    }
    amount = Math.round(amount);
    const note = `THANHTOAN_${payment.orderCode}`;
    
    // Create MoMo deep link
    const deepLink = `momo://transfer?phone=${this.personalPhone}&amount=${amount}&note=${encodeURIComponent(note)}`;
    
    // Create QR code data - use phone number format that MoMo can recognize
    // Format: 2|99|{phone}|{name}|{note}|0|0|{amount}||vnd
    const qrData = `2|99|${this.personalPhone}|${this.personalName}|${note}|0|0|${amount}||vnd`;
    
    return {
      deepLink,
      qrCode: qrData,
      manualInfo: {
        phone: this.personalPhone,
        name: this.personalName,
        amount: amount,
        note: note,
      },
    };
  }

  /**
   * Override createPaymentUrl to use personal account instead of business API
   */
  async createPaymentUrl(payment: Payment): Promise<string> {
    // Use personal deep link instead of business API
    const personalPayment = this.createPersonalPaymentLink(payment);
    return personalPayment.deepLink;
  }

  /**
   * Manual verification for personal account payments
   * Admin can use this to verify payment by transaction code
   */
  async verifyManualPayment(
    orderCode: string, 
    transactionCode: string,
    verifiedByAdmin: string
  ): Promise<{ verified: boolean; details?: any }> {
    // In a real implementation, this might check with banking APIs
    // or store manual verifications in database
    console.log(`Manual payment verification:`, {
      orderCode,
      transactionCode,
      verifiedByAdmin,
      timestamp: new Date().toISOString()
    });

    // For demo purposes, accept any transaction code that's not empty
    if (transactionCode && transactionCode.length >= 6) {
      return {
        verified: true,
        details: {
          transactionCode,
          verifiedAt: new Date(),
          verifiedBy: verifiedByAdmin,
          method: 'manual_admin_verification'
        }
      };
    }

    return { verified: false };
  }

  /**
   * Get payment instructions for frontend display
   */
  getPaymentInstructions(payment: Payment): {
    steps: string[];
    manualInfo: any;
    qrInfo: any;
  } {
    const personalPayment = this.createPersonalPaymentLink(payment);
    
    return {
      steps: [
        'Open the MoMo app on your phone',
        'Select "Transfer Money" → "To Phone Number"',
        `Enter phone number: ${this.personalPhone}`,
        `Enter amount: ${personalPayment.manualInfo.amount.toLocaleString()} VND`,
        `Enter note: ${personalPayment.manualInfo.note}`,
        'Confirm the transfer',
        'Return to this page and click "I have transferred the money"'
      ],
      manualInfo: personalPayment.manualInfo,
      qrInfo: {
        data: personalPayment.qrCode,
        description: 'Scan this QR code with MoMo app to auto-fill transfer information, then confirm the transfer.'
      }
    };
  }
}

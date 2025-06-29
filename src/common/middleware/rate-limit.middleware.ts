import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import rateLimit from 'express-rate-limit';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private limiter: any;

  constructor(private readonly configService: ConfigService) {
    this.limiter = rateLimit({
      // Đây là khoảng thời gian để theo dõi số lượng request (tính bằng mili giây).
      windowMs: this.configService.get<number>('security.rateLimit.ttl')! * 1000,
      // Số request tối đa được phép trong windowMs
      max: this.configService.get<number>('security.rateLimit.limit'),
      // Khi một client vượt quá giới hạn, server sẽ trả về đối tượng JSON này cùng với status code 429 Too Many Requests
      message: {
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
      },
      // Khi được bật, response sẽ chứa các header tiêu chuẩn
      standardHeaders: true,
      legacyHeaders: false,
      // Đây là một hàm quyết định xem có nên áp dụng rate limit cho một request cụ thể hay không. Nếu hàm trả về true, request sẽ được bỏ qua.
      skip: req => {
        // Skip rate limiting for health checks
        return req.url === '/health' || req.url === '/api/v1/health';
      },
      // Đây là phần cực kỳ quan trọng, quyết định "ai" đang bị giới hạn.
      keyGenerator: req => {
        // Use IP address or user ID if authenticated
        return req.ip || (req.user as any)?.id || 'anonymous';
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}

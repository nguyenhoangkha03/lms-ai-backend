import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
// import * as rateLimit from 'express-rate-limit';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(SecurityMiddleware.name);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Add security headers
    // Ngăn chặn tấn công "MIME-type sniffing".
    // Nếu server trả về một file .txt nhưng nội dung là JavaScript, và không có bảo vệ đúng, trình duyệt có thể hiểu nhầm và chạy nó như JS → gây XSS (Cross-Site Scripting).
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Ngăn chặn tấn công "Clickjacking".
    // Tạo một trang web giả mạo.
    // Nhúng (embed) một trang web thật (ví dụ: trang của bạn) vào bằng <iframe>.
    // Dùng CSS để che giấu iframe, làm nó trong suốt, rồi đặt lên các nút giả mạo.
    // Người dùng tưởng mình nhấn nút vô hại, nhưng thực chất đang thao tác với trang web thật phía dưới.
    res.setHeader('X-Frame-Options', 'DENY');

    // Bật bộ lọc Cross-Site Scripting (XSS) trên các trình duyệt cũ.
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // Bảo vệ quyền riêng tư của người dùng bằng cách kiểm soát thông tin "referrer" được gửi đi.
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()'); // Kiểm soát quyền truy cập các tính năng của trình duyệt.

    // Remove sensitive headers
    res.removeHeader('X-Powered-By'); // Header này thường tiết lộ "bí mật công nghệ" như X-Powered-By: Express hoặc PHP/8.1
    res.removeHeader('Server'); // header này có thể tiết lộ loại web server bạn dùng (ví dụ: nginx/1.21.0). Xóa nó đi để che giấu thông tin.

    // Log security-related requests
    if (req.url.includes('/auth/') || req.url.includes('/admin/')) {
      this.logger.log(`Security-sensitive request: ${req.method} ${req.url} from ${req.ip}`);
    }

    next();
  }
}

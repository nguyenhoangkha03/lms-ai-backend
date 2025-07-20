import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResponseOptimizationMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Set performance-related headers
    this.setPerformanceHeaders(res);

    // Enable HTTP/2 Server Push hints
    this.setServerPushHints(req, res);

    // Optimize caching headers
    this.setCacheHeaders(req, res);

    // Add response timing
    this.addResponseTiming(req, res);

    next();
  }

  private setPerformanceHeaders(res: Response): void {
    // Enable gzip/br compression
    res.setHeader('Vary', 'Accept-Encoding');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable HSTS
    if (this.configService.get('SSL_ENABLED')) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // DNS prefetch control
    res.setHeader('X-DNS-Prefetch-Control', 'on');
  }

  private setServerPushHints(req: Request, res: Response): void {
    // Add resource hints for critical resources
    const resourceHints = [
      '</api/v1/auth/me>; rel=preload; as=fetch',
      '</static/css/main.css>; rel=preload; as=style',
      '</static/js/main.js>; rel=preload; as=script',
    ];

    res.setHeader('Link', resourceHints.join(', '));
  }

  private setCacheHeaders(req: Request, res: Response): void {
    const path = req.path;

    // Static assets - long cache
    if (path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return;
    }

    // API responses - short cache with revalidation
    if (path.startsWith('/api/')) {
      if (this.isCacheableEndpoint(path)) {
        res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        res.setHeader('ETag', this.generateETag(req));
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
      return;
    }

    // Default - no cache
    res.setHeader('Cache-Control', 'no-cache');
  }

  private addResponseTiming(_req: Request, res: Response): void {
    const startTime = Date.now();

    const originalEnd = res.end;

    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Timestamp', new Date().toISOString());

      // ⬇️ phải trả về giá trị gốc từ originalEnd
      return originalEnd.apply(this, args);
    } as typeof res.end; // ✅ giúp TS hiểu kiểu trả về
  }

  private isCacheableEndpoint(path: string): boolean {
    const cacheablePatterns = [
      /\/api\/v1\/courses\/\w+$/,
      /\/api\/v1\/categories/,
      /\/api\/v1\/users\/\w+\/profile$/,
      /\/api\/v1\/content\/public/,
    ];

    return cacheablePatterns.some(pattern => pattern.test(path));
  }

  private generateETag(req: Request): string {
    // Simple ETag generation based on URL and timestamp
    const content = `${req.path}:${req.query}`;
    return `"${Buffer.from(content).toString('base64').slice(0, 16)}"`;
  }
}

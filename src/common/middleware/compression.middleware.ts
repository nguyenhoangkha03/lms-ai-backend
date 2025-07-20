import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as compression from 'compression';
import { WinstonService } from '@/logger/winston.service';

export interface CompressionOptions {
  threshold?: number;
  level?: number;
  filter?: (req: Request, res: Response) => boolean;
  algorithms?: ('gzip' | 'deflate' | 'br')[];
  cacheCompressed?: boolean;
}

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly compressedCache = new Map<string, Buffer>();
  private readonly options: CompressionOptions;

  constructor(private readonly logger: WinstonService) {
    this.logger.setContext(CompressionMiddleware.name);

    this.options = {
      threshold: 1024, // 1KB minimum
      level: 6, // Balanced compression level
      algorithms: ['br', 'gzip', 'deflate'],
      cacheCompressed: true,
      filter: this.shouldCompress.bind(this),
    };
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip compression for certain routes
    if (this.shouldSkipCompression(req)) {
      return next();
    }

    // Apply dynamic compression based on request
    const compressionLevel = this.getCompressionLevel(req);
    const algorithm = this.selectBestAlgorithm(req);

    // Setup compression middleware
    const compressionMiddleware = compression({
      threshold: this.options.threshold,
      level: compressionLevel,
      filter: this.options.filter,

      // Custom algorithm selection
      algorithm: algorithm,

      // Memory level for deflate
      memLevel: 8,

      // Window size
      windowBits: 15,

      // Chunk size
      chunkSize: 16 * 1024,
    });

    // Apply caching for frequently accessed content
    if (this.options.cacheCompressed) {
      this.applyCachedCompression(req, res, next, compressionMiddleware);
    } else {
      compressionMiddleware(req, res, next);
    }
  }

  private shouldCompress(req: Request, res: Response): boolean {
    // Don't compress if already compressed
    if (res.getHeader('content-encoding')) {
      return false;
    }

    // Check content type
    const contentType = res.getHeader('content-type') as string;
    if (!contentType) return true;

    // Compress text-based content
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml',
    ];

    return compressibleTypes.some(type => contentType.toLowerCase().includes(type));
  }

  private shouldSkipCompression(req: Request): boolean {
    // Skip for WebSocket upgrades
    if (req.headers.upgrade) {
      return true;
    }

    // Skip for real-time endpoints
    const realtimeRoutes = ['/api/v1/realtime', '/socket.io', '/api/v1/stream'];
    return realtimeRoutes.some(route => req.path.startsWith(route));
  }

  private getCompressionLevel(req: Request): number {
    // Adjust compression level based on client and content type
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);

    // Use higher compression for mobile to save bandwidth
    if (isMobile) {
      return 9; // Maximum compression
    }

    // Use lower compression for desktop for speed
    return 6; // Balanced
  }

  private selectBestAlgorithm(req: Request): string {
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // Prefer Brotli for modern browsers
    if (acceptEncoding.includes('br')) {
      return 'br';
    }

    // Fallback to gzip
    if (acceptEncoding.includes('gzip')) {
      return 'gzip';
    }

    // Last resort deflate
    if (acceptEncoding.includes('deflate')) {
      return 'deflate';
    }

    return 'gzip'; // Default
  }

  private applyCachedCompression(
    req: Request,
    res: Response,
    next: NextFunction,
    compressionMiddleware: any,
  ): void {
    // Generate cache key based on URL and compression settings
    const cacheKey = this.generateCompressionCacheKey(req);

    // Check if compressed version exists in cache
    if (this.compressedCache.has(cacheKey)) {
      const compressed = this.compressedCache.get(cacheKey);

      // Set appropriate headers
      res.setHeader('Content-Encoding', this.selectBestAlgorithm(req));
      res.setHeader('Content-Length', compressed!.length);
      res.setHeader('X-Compression-Cache', 'HIT');

      res.end(compressed);
      return;
    }

    // Store original end method
    const originalEnd = res.end;
    const originalWrite = res.write;
    const chunks: Buffer[] = [];

    // Override write method to capture response data
    res.write = function (chunk: any, encoding?: any): boolean {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return originalWrite.call(this, chunk, encoding);
    };

    // Override end method to handle caching
    res.end = function (chunk?: any, encoding?: any): void {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      // Combine all chunks
      const fullResponse = Buffer.concat(chunks);

      // Cache the compressed response if it meets criteria
      if (fullResponse.length >= 1024) {
        // Only cache responses >= 1KB
        const middleware = CompressionMiddleware.prototype;
        middleware.compressedCache.set(cacheKey, fullResponse);

        // Limit cache size (LRU-like behavior)
        if (middleware.compressedCache.size > 1000) {
          const firstKey = middleware.compressedCache.keys().next().value;
          middleware.compressedCache.delete(firstKey);
        }
      }

      res.setHeader('X-Compression-Cache', 'MISS');
      originalEnd.call(this, chunk, encoding);
    }.bind(res);

    compressionMiddleware(req, res, next);
  }

  private generateCompressionCacheKey(req: Request): string {
    const algorithm = this.selectBestAlgorithm(req);
    const level = this.getCompressionLevel(req);
    return `${req.method}:${req.path}:${algorithm}:${level}`;
  }
}

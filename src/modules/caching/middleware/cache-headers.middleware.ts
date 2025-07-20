import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CacheHeadersMiddleware implements NestMiddleware {
  private readonly _logger = new Logger(CacheHeadersMiddleware.name);

  constructor(private readonly _configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Set cache headers based on request type and path
    this.setCacheHeaders(req, res);

    // Add cache control headers
    this.addCacheControlHeaders(req, res);

    // Handle conditional requests
    this.handleConditionalRequests(req, res);

    next();
  }

  private setCacheHeaders(req: Request, res: Response): void {
    const path = req.path;
    const _method = req.method;

    // Static assets get long-term caching
    if (this.isStaticAsset(path)) {
      this.setStaticAssetHeaders(res);
      return;
    }

    // API responses get shorter caching
    if (path.startsWith('/api')) {
      this.setApiCacheHeaders(req, res);
      return;
    }

    // Default caching for other requests
    this.setDefaultCacheHeaders(res);
  }

  private isStaticAsset(path: string): boolean {
    const staticExtensions = [
      '.js',
      '.css',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.ico',
      '.svg',
      '.woff',
      '.woff2',
    ];
    return staticExtensions.some(ext => path.endsWith(ext));
  }

  private setStaticAssetHeaders(res: Response): void {
    const oneYear = 365 * 24 * 60 * 60; // 1 year in seconds

    res.set({
      'Cache-Control': `public, max-age=${oneYear}, immutable`,
      Expires: new Date(Date.now() + oneYear * 1000).toUTCString(),
    });
  }

  private setApiCacheHeaders(req: Request, res: Response): void {
    const method = req.method;

    if (method === 'GET') {
      // GET requests can be cached
      res.set({
        'Cache-Control': 'public, max-age=300, must-revalidate', // 5 minutes
        Vary: 'Accept, Authorization',
      });
    } else {
      // Non-GET requests should not be cached
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
    }
  }

  private setDefaultCacheHeaders(res: Response): void {
    res.set({
      'Cache-Control': 'public, max-age=60', // 1 minute
    });
  }

  private addCacheControlHeaders(req: Request, res: Response): void {
    // Add custom cache control based on user context
    if (req.headers.authorization) {
      // Authenticated requests get private caching
      const cacheControl = res.get('Cache-Control') || '';
      if (!cacheControl.includes('private') && !cacheControl.includes('no-cache')) {
        res.set('Cache-Control', cacheControl.replace('public', 'private'));
      }
    }

    // Add ETag for conditional requests
    const originalSend = res.send;
    res.send = function (body: any) {
      if (body && typeof body === 'string' && !res.get('ETag')) {
        const etag = crypto.createHash('md5').update(body).digest('hex');
        res.set('ETag', `"${etag}"`);
      }
      return originalSend.call(this, body);
    };
  }

  private handleConditionalRequests(req: Request, res: Response): void {
    // Handle If-None-Match header
    const ifNoneMatch = req.headers['if-none-match'];
    const originalSend = res.send;

    res.send = function (body: any) {
      const etag = res.get('ETag');

      if (ifNoneMatch && etag && ifNoneMatch === etag) {
        res.status(304).end();
        return res;
      }

      return originalSend.call(this, body);
    };

    // Handle If-Modified-Since header
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince) {
      const modifiedDate = new Date(ifModifiedSince);
      const lastModified = res.get('Last-Modified');

      if (lastModified && new Date(lastModified) <= modifiedDate) {
        res.status(304).end();
        return;
      }
    }
  }
}

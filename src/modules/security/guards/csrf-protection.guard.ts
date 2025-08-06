import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiSecurityService } from '../services/api-security.service';
import { WinstonService } from '@/logger/winston.service';

export const SKIP_CSRF = 'skipCsrf';

@Injectable()
export class CsrfProtectionGuard implements CanActivate {
  // ✅ Danh sách route được miễn CSRF (whitelist)
  private readonly csrfExemptRoutes = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/resend-verification',
    '/api/v1/auth/refresh',
  ];

  constructor(
    private readonly reflector: Reflector,
    private readonly apiSecurity: ApiSecurityService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CsrfProtectionGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // ✅ Skip CSRF for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // ✅ Check if current route is in exempt list
    if (this.isCsrfExemptRoute(request.path)) {
      this.logger.log(`CSRF check skipped for exempt route: ${request.path}`);
      return true;
    }

    // ✅ Check decorator-based skip
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    // ✅ Skip CSRF for API key requests
    if (this.isApiKeyRequest(request)) {
      return true;
    }

    // ✅ Skip CSRF for development environment (optional)
    if (process.env.NODE_ENV === 'development') {
      this.logger.warn(`CSRF check skipped in development mode for: ${request.path}`);
      return true;
    }

    // ✅ Validate CSRF token for other requests
    const isValid = await this.apiSecurity.validateCsrfToken(request);

    if (!isValid) {
      this.logger.warn(`CSRF protection triggered, {
        ip: ${this.getClientIp(request)},
        path: ${request.path},
        method: ${request.method},
        headers: {
          userAgent: ${request.headers['user-agent']},
          referer: ${request.headers['referer']},
        },
      }`);

      throw new HttpException('CSRF token missing or invalid', HttpStatus.FORBIDDEN);
    }

    return true;
  }

  private isCsrfExemptRoute(path: string): boolean {
    return this.csrfExemptRoutes.some(exemptRoute => {
      // Exact match or starts with for dynamic routes
      return path === exemptRoute || path.startsWith(exemptRoute);
    });
  }

  private isApiKeyRequest(request: any): boolean {
    return (
      request.headers['x-api-key'] ||
      request.headers['authorization']?.startsWith('Bearer ') ||
      request.headers['content-type']?.includes('application/json')
    );
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}

// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   HttpException,
//   HttpStatus,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { ApiSecurityService } from '../services/api-security.service';
// import { WinstonService } from '@/logger/winston.service';

// export const SKIP_CSRF = 'skipCsrf';

// @Injectable()
// export class CsrfProtectionGuard implements CanActivate {
//   constructor(
//     private readonly reflector: Reflector,
//     private readonly apiSecurity: ApiSecurityService,
//     private readonly logger: WinstonService,
//   ) {
//     this.logger.setContext(CsrfProtectionGuard.name);
//   }

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request = context.switchToHttp().getRequest();

//     if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
//       return true;
//     }

//     const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
//       context.getHandler(),
//       context.getClass(),
//     ]);

//     if (skipCsrf) {
//       return true;
//     }

//     if (this.isApiKeyRequest(request)) {
//       return true;
//     }

//     const isValid = await this.apiSecurity.validateCsrfToken(request);

//     if (!isValid) {
//       this.logger.warn(`CSRF protection triggered, {
//         ip: ${this.getClientIp(request)},
//         path: ${request.path},
//         method: ${request.method},
//       }`);

//       throw new HttpException('CSRF token missing or invalid', HttpStatus.FORBIDDEN);
//     }

//     return true;
//   }

//   private isApiKeyRequest(request: any): boolean {
//     return (
//       request.headers['x-api-key'] ||
//       request.headers['authorization']?.startsWith('Bearer ') ||
//       request.headers['content-type']?.includes('application/json')
//     );
//   }

//   private getClientIp(request: any): string {
//     return (
//       request.headers['x-forwarded-for']?.split(',')[0] ||
//       request.connection.remoteAddress ||
//       'unknown'
//     );
//   }
// }

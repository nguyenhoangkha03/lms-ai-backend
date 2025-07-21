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
  constructor(
    private readonly reflector: Reflector,
    private readonly apiSecurity: ApiSecurityService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(CsrfProtectionGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    if (this.isApiKeyRequest(request)) {
      return true;
    }

    const isValid = await this.apiSecurity.validateCsrfToken(request);

    if (!isValid) {
      this.logger.warn(`CSRF protection triggered, {
        ip: ${this.getClientIp(request)},
        path: ${request.path},
        method: ${request.method},
      }`);

      throw new HttpException('CSRF token missing or invalid', HttpStatus.FORBIDDEN);
    }

    return true;
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
      'unknown'
    );
  }
}

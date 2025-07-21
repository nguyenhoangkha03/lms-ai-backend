import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InputValidationService } from '../services/input-validation.service';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class XssProtectionGuard implements CanActivate {
  constructor(
    private readonly inputValidation: InputValidationService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(XssProtectionGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (this.checkHeaders(request.headers)) {
      this.logXssAttempt(request, 'headers');
      throw new HttpException('Malicious headers detected', HttpStatus.BAD_REQUEST);
    }

    if (request.query && this.checkForXss(request.query)) {
      this.logXssAttempt(request, 'query');
      throw new HttpException('Malicious query parameters detected', HttpStatus.BAD_REQUEST);
    }

    if (request.body && this.checkForXss(request.body)) {
      this.logXssAttempt(request, 'body');
      throw new HttpException('Malicious request body detected', HttpStatus.BAD_REQUEST);
    }

    return true;
  }

  private checkHeaders(headers: any): boolean {
    const dangerousHeaders = ['referer', 'user-agent', 'x-forwarded-for'];

    for (const header of dangerousHeaders) {
      const value = headers[header];
      if (value && typeof value === 'string') {
        const result = this.inputValidation.detectXss(value);
        if (result.detected) {
          return true;
        }
      }
    }

    return false;
  }

  private checkForXss(data: any): boolean {
    const flattenedData = this.flattenObject(data);

    for (const value of flattenedData) {
      if (typeof value === 'string') {
        const result = this.inputValidation.detectXss(value);
        if (result.detected) {
          return true;
        }
      }
    }

    return false;
  }

  private flattenObject(obj: any): any[] {
    const flattened: any[] = [];

    if (obj === null || obj === undefined) {
      return flattened;
    }

    if (typeof obj !== 'object') {
      flattened.push(obj);
      return flattened;
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => {
        flattened.push(...this.flattenObject(item));
      });
    } else {
      Object.values(obj).forEach(value => {
        flattened.push(...this.flattenObject(value));
      });
    }

    return flattened;
  }

  private logXssAttempt(request: any, source: string): void {
    this.logger.error(`XSS attempt detected in ${source}, {
      ip: ${this.getClientIp(request)},
      path: ${request.path},
      userAgent: ${request.headers['user-agent']},
      source: ${source},
    }`);
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection.remoteAddress ||
      'unknown'
    );
  }
}

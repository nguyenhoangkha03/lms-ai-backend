import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Sanitize request body
    if (request.body) {
      request.body = this.sanitizeObject(request.body);
    }

    // Sanitize query parameters
    if (request.query) {
      request.query = this.sanitizeObject(request.query);
    }

    return next.handle().pipe(
      map(data => {
        // Sanitize response data if needed
        return this.sanitizeResponse(data);
      }),
    );
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    return value;
  }

  private sanitizeResponse(data: any): any {
    if (data && typeof data === 'object') {
      // Remove sensitive fields from response
      const sensitiveFields = ['password', 'passwordHash', 'refreshToken', 'resetToken'];

      return this.removeSensitiveFields(data, sensitiveFields);
    }

    return data;
  }

  private removeSensitiveFields(obj: any, fields: string[]): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveFields(item, fields));
    }

    if (obj && typeof obj === 'object') {
      const cleaned = { ...obj };

      fields.forEach(field => {
        delete cleaned[field];
      });

      // Recursively clean nested objects
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] && typeof cleaned[key] === 'object') {
          cleaned[key] = this.removeSensitiveFields(cleaned[key], fields);
        }
      });

      return cleaned;
    }

    return obj;
  }
}

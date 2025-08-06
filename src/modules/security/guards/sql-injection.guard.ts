import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InputValidationService } from '../services/input-validation.service';
import { WinstonService } from '@/logger/winston.service';

// Decorator để bỏ qua SQL injection check cho các endpoint cụ thể
export const SKIP_SQL_INJECTION_CHECK = 'skipSqlInjectionCheck';

@Injectable()
export class SqlInjectionGuard implements CanActivate {
  // ✅ Danh sách các route được phép (whitelist)
  private readonly whitelistedRoutes = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/verify-email',
  ];

  // ✅ Danh sách các field được phép chứa ký tự đặc biệt
  private readonly allowedSpecialCharFields = [
    'password',
    'confirmPassword',
    'oldPassword',
    'newPassword',
    'content',
    'description',
    'message',
    'bio',
    'address',
  ];

  constructor(
    private readonly inputValidation: InputValidationService,
    private readonly logger: WinstonService,
    private readonly reflector: Reflector,
  ) {
    this.logger.setContext(SqlInjectionGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // ✅ Check if route is whitelisted
    if (this.isWhitelistedRoute(request.path)) {
      return true;
    }

    // ✅ Check if SQL injection check should be skipped via decorator
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_SQL_INJECTION_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return true;
    }

    const inputSources = [
      { name: 'query', data: request.query },
      { name: 'body', data: request.body },
      { name: 'params', data: request.params },
    ];

    for (const source of inputSources) {
      if (source.data && typeof source.data === 'object') {
        const hasSqlInjection = await this.checkForSqlInjection(
          source.data,
          source.name,
          request.path,
        );

        if (hasSqlInjection) {
          this.logger.error(`SQL injection attempt detected in ${source.name}, {
            ip: ${this.getClientIp(request)},
            path: ${request.path},
            method: ${request.method},
            userAgent: ${request.headers['user-agent']},
            data: ${this.sanitizeLogData(source.data)},
          }`);

          throw new HttpException('Malicious input detected', HttpStatus.BAD_REQUEST);
        }
      }
    }

    return true;
  }

  private isWhitelistedRoute(path: string): boolean {
    return this.whitelistedRoutes.some(route => path === route || path.startsWith(route));
  }

  private async checkForSqlInjection(
    data: any,
    source: string,
    requestPath: string,
  ): Promise<boolean> {
    const flattenedData = this.flattenObject(data);

    for (const { value, fieldName } of flattenedData) {
      if (typeof value === 'string' && value.length > 0) {
        // ✅ Skip check for password fields và các field được phép
        if (this.isAllowedSpecialCharField(fieldName)) {
          continue;
        }

        // ✅ Chỉ check các pattern thực sự nguy hiểm
        const result = this.detectRealSqlInjection(value);
        if (result.detected) {
          this.logger.warn(`Potential SQL injection in field: ${fieldName}, {
            value: ${value.substring(0, 100)},
            patterns: ${result.patterns},
            source: ${source},
            path: ${requestPath},
          }`);
          return true;
        }
      }
    }

    return false;
  }

  private detectRealSqlInjection(value: string): { detected: boolean; patterns: string[] } {
    // ✅ Chỉ check những pattern thực sự nguy hiểm
    const dangerousPatterns = [
      // SQL commands thực sự nguy hiểm
      /\b(DROP|DELETE|TRUNCATE|ALTER|CREATE)\s+(TABLE|DATABASE|INDEX)/gi,

      // Union-based injection
      /\bUNION\s+(ALL\s+)?SELECT\b/gi,

      // Comment-based injection
      /--\s*[\r\n]|\/\*.*?\*\//g,

      // Stacked queries
      /;\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)\b/gi,

      // Admin login bypass
      /\'\s*OR\s+\d+\s*=\s*\d+\s*(--|\/\*|#)/gi,

      // Hex encoding attacks
      /0x[0-9a-f]+/gi,

      // Boolean-based blind injection với suspicious OR conditions
      /\'\s*OR\s+\'\w*\'\s*=\s*\'\w*\'/gi,

      // Sleep/waitfor delay attacks
      /\b(SLEEP|WAITFOR|pg_sleep)\s*\(/gi,
    ];

    const detectedPatterns: string[] = [];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        detectedPatterns.push(pattern.source);
      }
    }

    return {
      detected: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    };
  }

  private isAllowedSpecialCharField(fieldName: string): boolean {
    return this.allowedSpecialCharFields.some(allowed =>
      fieldName.toLowerCase().includes(allowed.toLowerCase()),
    );
  }

  private flattenObject(obj: any, prefix: string = ''): Array<{ value: any; fieldName: string }> {
    const flattened: Array<{ value: any; fieldName: string }> = [];

    if (obj === null || obj === undefined) {
      return flattened;
    }

    if (typeof obj !== 'object') {
      flattened.push({ value: obj, fieldName: prefix });
      return flattened;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        flattened.push(...this.flattenObject(item, `${prefix}[${index}]`));
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        flattened.push(...this.flattenObject(value, fieldName));
      });
    }

    return flattened;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private sanitizeLogData(data: any): any {
    const sanitized = { ...data };

    // ✅ Ẩn thông tin nhạy cảm trong logs
    const sensitiveFields = ['password', 'confirmPassword', 'token', 'secret'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   HttpException,
//   HttpStatus,
// } from '@nestjs/common';
// import { InputValidationService } from '../services/input-validation.service';
// import { WinstonService } from '@/logger/winston.service';

// @Injectable()
// export class SqlInjectionGuard implements CanActivate {
//   constructor(
//     private readonly inputValidation: InputValidationService,
//     private readonly logger: WinstonService,
//   ) {
//     this.logger.setContext(SqlInjectionGuard.name);
//   }

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const request = context.switchToHttp().getRequest();

//     const inputSources = [
//       { name: 'query', data: request.query },
//       { name: 'body', data: request.body },
//       { name: 'params', data: request.params },
//     ];

//     for (const source of inputSources) {
//       if (source.data && typeof source.data === 'object') {
//         const hasSqlInjection = await this.checkForSqlInjection(source.data, source.name);
//         if (hasSqlInjection) {
//           this.logger.error(`SQL injection attempt detected in ${source.name}, {
//             ip: ${this.getClientIp(request)},
//             path: ${request.path},
//             data: ${source.data},
//           }`);

//           throw new HttpException('Malicious input detected', HttpStatus.BAD_REQUEST);
//         }
//       }
//     }

//     return true;
//   }

//   //   private async checkForSqlInjection(data: any, _source: string): Promise<boolean> {
//   //     const flattenedData = this.flattenObject(data);

//   //     for (const value of flattenedData) {
//   //       if (typeof value === 'string') {
//   //         const result = this.inputValidation.detectSqlInjection(value);
//   //         if (result.detected) {
//   //           return true;
//   //         }
//   //       }
//   //     }

//   //     return false;
//   //   }

//   private async checkForSqlInjection(data: any, source: string): Promise<boolean> {
//     const flattenedData = this.flattenObjectWithKeys(data);

//     for (const { key, value } of flattenedData) {
//       // Bỏ qua password và các field tương tự
//       const sensitiveKeys = ['password', 'confirmPassword', 'newPassword', 'currentPassword'];
//       if (sensitiveKeys.includes(key.toLowerCase())) continue;

//       if (typeof value === 'string') {
//         const result = this.inputValidation.detectSqlInjection(value);
//         if (result.detected) {
//           return true;
//         }
//       }
//     }

//     return false;
//   }

//   private flattenObjectWithKeys(obj: any, prefix: string = ''): { key: string; value: any }[] {
//     const flattened: { key: string; value: any }[] = [];

//     if (obj === null || obj === undefined) return flattened;

//     if (typeof obj !== 'object') {
//       flattened.push({ key: prefix || 'unknown', value: obj });
//       return flattened;
//     }

//     if (Array.isArray(obj)) {
//       obj.forEach((item, index) => {
//         flattened.push(...this.flattenObjectWithKeys(item, `${prefix}[${index}]`));
//       });
//     } else {
//       Object.entries(obj).forEach(([key, value]) => {
//         const fullKey = prefix ? `${prefix}.${key}` : key;
//         flattened.push(...this.flattenObjectWithKeys(value, fullKey));
//       });
//     }

//     return flattened;
//   }

//   private flattenObject(obj: any, prefix: string = ''): any[] {
//     const flattened: any[] = [];

//     if (obj === null || obj === undefined) {
//       return flattened;
//     }

//     if (typeof obj !== 'object') {
//       flattened.push(obj);
//       return flattened;
//     }

//     if (Array.isArray(obj)) {
//       obj.forEach((item, index) => {
//         flattened.push(...this.flattenObject(item, `${prefix}[${index}]`));
//       });
//     } else {
//       Object.entries(obj).forEach(([key, value]) => {
//         flattened.push(...this.flattenObject(value, prefix ? `${prefix}.${key}` : key));
//       });
//     }

//     return flattened;
//   }

//   private getClientIp(request: any): string {
//     return (
//       request.headers['x-forwarded-for']?.split(',')[0] ||
//       request.connection.remoteAddress ||
//       'unknown'
//     );
//   }
// }

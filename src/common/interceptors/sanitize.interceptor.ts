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
        // ✅ CHỈ remove sensitive fields, KHÔNG deep clone
        return this.sanitizeResponse(data);
      }),
    );
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    // ✅ Preserve Date objects
    if (obj instanceof Date) {
      return obj;
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
      const sensitiveFields = ['password', 'passwordHash', 'resetToken'];
      return this.removeSensitiveFields(data, sensitiveFields);
    }

    return data;
  }

  // ✅ FIX: Preserve Date objects và các special objects khác
  private removeSensitiveFields(obj: any, fields: string[]): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveFields(item, fields));
    }

    if (obj && typeof obj === 'object') {
      // ✅ QUAN TRỌNG: Preserve Date objects và special objects
      if (obj instanceof Date || obj instanceof RegExp || obj instanceof Error) {
        return obj;
      }

      // ✅ Sử dụng Object.assign thay vì spread để preserve prototype
      const cleaned = Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);

      // Remove sensitive fields
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

// ✅ HOẶC: Sử dụng cách đơn giản hơn - chỉ xử lý plain objects
@Injectable()
export class SanitizeInterceptorSimple implements NestInterceptor {
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
        return this.sanitizeResponse(data);
      }),
    );
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (obj instanceof Date) {
      return obj;
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
      const sensitiveFields = ['password', 'passwordHash', 'resetToken'];
      return this.removeSensitiveFieldsSimple(data, sensitiveFields);
    }

    return data;
  }

  // ✅ CÁCH ĐỞN GIẢN: Chỉ remove fields, không deep clone
  private removeSensitiveFieldsSimple(obj: any, fields: string[]): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveFieldsSimple(item, fields));
    }

    if (obj && typeof obj === 'object') {
      // ✅ Preserve tất cả special objects
      if (
        obj instanceof Date ||
        obj instanceof RegExp ||
        obj instanceof Error ||
        obj.constructor !== Object
      ) {
        return obj;
      }

      // ✅ CHỈ process plain objects
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sensitive fields
        if (fields.includes(key)) {
          continue;
        }

        // Recursively process nested objects
        if (value && typeof value === 'object') {
          result[key] = this.removeSensitiveFieldsSimple(value, fields);
        } else {
          result[key] = value;
        }
      }

      return result;
    }

    return obj;
  }
}

// ✅ CÁCH TỐT NHẤT: Selective Sanitization
@Injectable()
export class SelectiveSanitizeInterceptor implements NestInterceptor {
  private readonly sensitiveFields = ['password', 'passwordHash', 'resetToken', 'accessToken'];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Sanitize input only
    if (request.body) {
      request.body = this.sanitizeInput(request.body);
    }

    if (request.query) {
      request.query = this.sanitizeInput(request.query);
    }

    return next.handle().pipe(
      map(data => {
        // ✅ CHỈ remove sensitive fields từ response, KHÔNG sanitize
        return this.removeSensitiveData(data);
      }),
    );
  }

  // ✅ Chỉ sanitize INPUT (request body, query params)
  private sanitizeInput(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeString(obj);
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeInput(item));
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.sanitizeInput(value);
    }

    return result;
  }

  // ✅ Chỉ remove sensitive fields từ OUTPUT (response)
  private removeSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date || obj.constructor !== Object) {
      return obj; // ✅ Preserve Date và special objects
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeSensitiveData(item));
    }

    // ✅ Shallow copy và remove sensitive fields
    const result = { ...obj };

    this.sensitiveFields.forEach(field => {
      delete result[field];
    });

    // Process nested objects
    Object.keys(result).forEach(key => {
      if (result[key] && typeof result[key] === 'object') {
        result[key] = this.removeSensitiveData(result[key]);
      }
    });

    return result;
  }

  private sanitizeString(value: any): any {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    return value;
  }
}
// import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
// import { Observable } from 'rxjs';
// import { map } from 'rxjs/operators';

// @Injectable()
// export class SanitizeInterceptor implements NestInterceptor {
//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     const request = context.switchToHttp().getRequest();

//     // Sanitize request body
//     if (request.body) {
//       request.body = this.sanitizeObject(request.body);
//     }

//     // Sanitize query parameters
//     if (request.query) {
//       request.query = this.sanitizeObject(request.query);
//     }

//     return next.handle().pipe(
//       map(data => {
//         // Sanitize response data if needed
//         return this.sanitizeResponse(data);
//       }),
//     );
//   }

//   private sanitizeObject(obj: any): any {
//     if (typeof obj !== 'object' || obj === null) {
//       return this.sanitizeValue(obj);
//     }

//     // Don't sanitize Date objects - preserve them
//     if (obj instanceof Date) {
//       return obj;
//     }

//     if (Array.isArray(obj)) {
//       return obj.map(item => this.sanitizeObject(item));
//     }

//     const sanitized = {};
//     for (const [key, value] of Object.entries(obj)) {
//       sanitized[key] = this.sanitizeObject(value);
//     }

//     return sanitized;
//   }

//   private sanitizeValue(value: any): any {
//     if (typeof value === 'string') {
//       // Remove potentially dangerous characters
//       return value
//         .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
//         .replace(/javascript:/gi, '')
//         .replace(/on\w+\s*=/gi, '')
//         .trim();
//     }

//     return value;
//   }

//   private sanitizeResponse(data: any): any {
//     if (data && typeof data === 'object') {
//       // Remove sensitive fields from response
//       const sensitiveFields = ['password', 'passwordHash', 'resetToken'];

//       return this.removeSensitiveFields(data, sensitiveFields);
//     }

//     return data;
//   }

//   private removeSensitiveFields(obj: any, fields: string[]): any {
//     if (Array.isArray(obj)) {
//       return obj.map(item => this.removeSensitiveFields(item, fields));
//     }

//     if (obj && typeof obj === 'object') {
//       const cleaned = { ...obj };

//       fields.forEach(field => {
//         delete cleaned[field];
//       });

//       // Recursively clean nested objects
//       Object.keys(cleaned).forEach(key => {
//         if (cleaned[key] && typeof cleaned[key] === 'object') {
//           cleaned[key] = this.removeSensitiveFields(cleaned[key], fields);
//         }
//       });

//       return cleaned;
//     }

//     return obj;
//   }
// }

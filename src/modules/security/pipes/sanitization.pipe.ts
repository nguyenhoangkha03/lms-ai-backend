import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { InputValidationService } from '../services/input-validation.service';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  constructor(private readonly inputValidation: InputValidationService) {}

  transform(value: any, _metadata: ArgumentMetadata) {
    if (!value || typeof value !== 'object') {
      return value;
    }

    return this.sanitizeObject(value);
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};

      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string') {
          sanitized[key] = this.inputValidation.sanitizeInput(value, 'string');
        } else {
          sanitized[key] = this.sanitizeObject(value);
        }
      });

      return sanitized;
    }

    if (typeof obj === 'string') {
      return this.inputValidation.sanitizeInput(obj, 'string');
    }

    return obj;
  }
}

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
export class SqlInjectionGuard implements CanActivate {
  constructor(
    private readonly inputValidation: InputValidationService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(SqlInjectionGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const inputSources = [
      { name: 'query', data: request.query },
      { name: 'body', data: request.body },
      { name: 'params', data: request.params },
    ];

    for (const source of inputSources) {
      if (source.data && typeof source.data === 'object') {
        const hasSqlInjection = await this.checkForSqlInjection(source.data, source.name);
        if (hasSqlInjection) {
          this.logger.error(`SQL injection attempt detected in ${source.name}, {
            ip: ${this.getClientIp(request)},
            path: ${request.path},
            data: ${source.data},
          }`);

          throw new HttpException('Malicious input detected', HttpStatus.BAD_REQUEST);
        }
      }
    }

    return true;
  }

  private async checkForSqlInjection(data: any, _source: string): Promise<boolean> {
    const flattenedData = this.flattenObject(data);

    for (const value of flattenedData) {
      if (typeof value === 'string') {
        const result = this.inputValidation.detectSqlInjection(value);
        if (result.detected) {
          return true;
        }
      }
    }

    return false;
  }

  private flattenObject(obj: any, prefix: string = ''): any[] {
    const flattened: any[] = [];

    if (obj === null || obj === undefined) {
      return flattened;
    }

    if (typeof obj !== 'object') {
      flattened.push(obj);
      return flattened;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        flattened.push(...this.flattenObject(item, `${prefix}[${index}]`));
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        flattened.push(...this.flattenObject(value, prefix ? `${prefix}.${key}` : key));
      });
    }

    return flattened;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection.remoteAddress ||
      'unknown'
    );
  }
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { SecurityAuditService } from '../services/security-audit.service';
import { WinstonService } from '@/logger/winston.service';

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly securityAudit: SecurityAuditService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(SecurityExceptionFilter.name);
  }

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    if (this.isSecurityException(exception, status)) {
      await this.securityAudit.logSecurityEvent({
        type: 'suspicious',
        severity: this.getSeverityFromStatus(status),
        source: 'SecurityExceptionFilter',
        ip: this.getClientIp(request),
        userAgent: request.headers['user-agent'],
        details: {
          path: request.path,
          method: request.method,
          status,
          message: typeof message === 'string' ? message : JSON.stringify(message),
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      });
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'object' ? message : { message },
    };

    if (process.env.NODE_ENV === 'production') {
      if (status >= 500) {
        errorResponse.message = { message: 'Internal server error' };
      }
    }

    response.status(status).json(errorResponse);
  }

  private isSecurityException(exception: unknown, status: number): boolean {
    const securityStatuses = [400, 401, 403, 422, 429];

    if (securityStatuses.includes(status)) {
      return true;
    }

    const message = exception instanceof Error ? exception.message.toLowerCase() : '';
    const securityKeywords = [
      'malicious',
      'injection',
      'xss',
      'csrf',
      'unauthorized',
      'forbidden',
      'invalid token',
      'security',
      'threat',
    ];

    return securityKeywords.some(keyword => message.includes(keyword));
  }

  private getSeverityFromStatus(status: number): 'low' | 'medium' | 'high' | 'critical' {
    if (status >= 500) return 'critical';
    if (status === 401 || status === 403) return 'high';
    if (status === 400 || status === 422) return 'medium';
    return 'low';
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      'unknown'
    )
      .split(',')[0]
      .trim();
  }
}

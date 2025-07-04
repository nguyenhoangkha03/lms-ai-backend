import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogService } from '../../system/services/audit-log.service';
import { AuditAction, AuditLevel, AuditStatus } from '@/common/enums/system.enums';

@Injectable()
export class SecurityEventInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async response => {
        const processingTime = Date.now() - startTime;
        await this.logSecurityEvent(request, response, processingTime, 'success');
      }),
      catchError(async error => {
        const processingTime = Date.now() - startTime;
        await this.logSecurityEvent(request, null, processingTime, 'error', error);
        throw error;
      }),
    );
  }

  private async logSecurityEvent(
    request: any,
    response: any,
    processingTime: number,
    status: 'success' | 'error',
    error?: any,
  ): Promise<void> {
    // Only log security-relevant endpoints
    const securityEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/logout',
      '/auth/reset-password',
      '/auth/change-password',
      '/users',
      '/roles',
      '/permissions',
    ];

    const isSecurityEndpoint = securityEndpoints.some(endpoint => request.url.includes(endpoint));

    if (!isSecurityEndpoint && status === 'success') {
      return; // Skip non-security endpoints for successful operations
    }

    // Determine audit action based on HTTP method and endpoint
    let auditAction: AuditAction = AuditAction.READ;
    switch (request.method) {
      case 'POST':
        if (request.url.includes('login')) auditAction = AuditAction.LOGIN;
        else if (request.url.includes('logout')) auditAction = AuditAction.LOGOUT;
        else auditAction = AuditAction.CREATE;
        break;
      case 'PUT':
      case 'PATCH':
        auditAction = AuditAction.UPDATE;
        break;
      case 'DELETE':
        auditAction = AuditAction.DELETE;
        break;
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(request, status, error);

    // Determine if this requires review
    const requiresReview =
      riskScore > 70 || (error && error.status >= 400) || request.url.includes('admin');

    await this.auditLogService.createAuditLog({
      userId: request.user?.id,
      sessionId: request.sessionId,
      action: auditAction,
      description: this.generateDescription(request, status, error),
      level: status === 'error' ? AuditLevel.ERROR : AuditLevel.INFO,
      status: status === 'error' ? AuditStatus.ERROR : AuditStatus.SUCCESS,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestUrl: request.url,
      httpMethod: request.method,
      responseCode: response?.statusCode || error?.status,
      processingTime,
      requestData: this.sanitizeRequestData(request),
      responseData: status === 'error' ? undefined : this.sanitizeResponseData(response),
      context: {
        module: 'security',
        feature: 'security_interceptor',
        endpoint: request.url,
        isSecurityEndpoint,
      },
      securityInfo: {
        authMethod: request.headers.authorization ? 'bearer_token' : 'session',
        riskScore,
        deviceFingerprint: this.generateDeviceFingerprint(request),
        threatIndicators: this.detectThreatIndicators(request, error),
      },
      errorDetails: error?.message,
      errorCode: error?.code || error?.name,
      stackTrace: error?.stack,
      tags: this.generateTags(request, status),
      isSensitive: riskScore > 50,
      requiresReview,
    });
  }

  private calculateRiskScore(request: any, status: string, error?: any): number {
    let score = 0;

    // Base risk factors
    if (status === 'error') score += 30;
    if (error?.status === 401) score += 20; // Unauthorized
    if (error?.status === 403) score += 25; // Forbidden
    if (error?.status >= 500) score += 15; // Server errors

    // Endpoint-based risk
    if (request.url.includes('admin')) score += 20;
    if (request.url.includes('login')) score += 10;
    if (request.url.includes('password')) score += 15;

    // IP-based risk (simplified)
    if (this.isPrivateIP(request.ip)) score += 0;
    else score += 10; // External IP

    // User agent risk
    if (!request.headers['user-agent']) score += 20;
    if (request.headers['user-agent']?.includes('bot')) score += 15;

    // Request frequency (would need to implement rate tracking)
    // if (highFrequencyFromIP) score += 25;

    return Math.min(score, 100);
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [/^127\./, /^192\.168\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./];
    return privateRanges.some(range => range.test(ip));
  }

  private generateDescription(request: any, status: string, error?: any): string {
    const method = request.method;
    const path = request.url;
    const user = request.user ? `User ${request.user.id}` : 'Anonymous';

    if (status === 'error') {
      return `${user} attempted ${method} ${path} - Failed: ${error?.message || 'Unknown error'}`;
    }

    return `${user} performed ${method} ${path} - Success`;
  }

  private sanitizeRequestData(request: any): any {
    const { body, params, query, headers } = request;

    // Remove sensitive headers
    const sanitizedHeaders = { ...headers };
    delete sanitizedHeaders.authorization;
    delete sanitizedHeaders.cookie;

    return {
      params,
      query,
      body: this.sanitizeObject(body),
      headers: sanitizedHeaders,
    };
  }

  private sanitizeResponseData(response: any): any {
    if (!response) return null;

    return {
      statusCode: response.statusCode,
      // Don't include response body for security
    };
  }

  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveFields = ['password', 'secret', 'token', 'key'];
    const sanitized = { ...obj };

    for (const [key, value] of Object.entries(sanitized)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      }
    }

    return sanitized;
  }

  private generateDeviceFingerprint(request: any): string {
    const components = [
      request.headers['user-agent'] || '',
      request.headers['accept-language'] || '',
      request.headers['accept-encoding'] || '',
      request.ip,
    ];

    // Simple hash generation (in production, use a proper hash function)
    return Buffer.from(components.join('|')).toString('base64').substring(0, 16);
  }

  private detectThreatIndicators(request: any, error?: any): string[] {
    const indicators: string[] = [];

    // SQL injection patterns
    const sqlPatterns = /('|(\")|;|--|\/\*|\*\/|xp_|sp_)/i;
    const requestString = JSON.stringify(request.body || {}) + request.url;
    if (sqlPatterns.test(requestString)) {
      indicators.push('sql_injection_attempt');
    }

    // XSS patterns
    const xssPatterns = /<script|javascript:|onload=|onerror=/i;
    if (xssPatterns.test(requestString)) {
      indicators.push('xss_attempt');
    }

    // Brute force indicators
    if (error?.status === 401 && request.url.includes('login')) {
      indicators.push('failed_login');
    }

    // Suspicious user agents
    const userAgent = request.headers['user-agent'] || '';
    if (!userAgent || userAgent.length < 10) {
      indicators.push('suspicious_user_agent');
    }

    // Rate limiting violations
    if (error?.status === 429) {
      indicators.push('rate_limit_exceeded');
    }

    return indicators;
  }

  private generateTags(request: any, status: string): string[] {
    const tags = ['security', 'api_access'];

    if (status === 'error') tags.push('error');
    if (request.url.includes('auth')) tags.push('authentication');
    if (request.url.includes('admin')) tags.push('admin_access');
    if (request.user) tags.push('authenticated');
    else tags.push('anonymous');

    return tags;
  }
}

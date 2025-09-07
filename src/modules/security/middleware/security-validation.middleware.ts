import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InputValidationService } from '../services/input-validation.service';
import { ApiSecurityService } from '../services/api-security.service';
import { WinstonService } from '@/logger/winston.service';

@Injectable()
export class SecurityValidationMiddleware implements NestMiddleware {
  constructor(
    private readonly inputValidation: InputValidationService,
    private readonly apiSecurity: ApiSecurityService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(SecurityValidationMiddleware.name);
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip security validation in development if there are dependency issues
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_SECURITY_MIDDLEWARE === 'true') {
      this.logger.warn('Security middleware disabled in development mode');
      return next();
    }

    try {
      this.apiSecurity.applySecurityHeaders(req, res);

      const securityContext = await this.apiSecurity.generateSecurityContext(req);
      (req as any).securityContext = securityContext;

      const ipCheck = await this.apiSecurity.checkIpSecurity(securityContext.clientIp);
      if (!ipCheck.allowed) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      await this.validateRequestStructure(req);

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        // Skip CSRF validation for webhook endpoints
        if (!this.isWebhookEndpoint(req)) {
          const isValid = await this.apiSecurity.validateCsrfToken(req);
          if (!isValid && !this.isApiRequest(req)) {
            throw new HttpException('CSRF token invalid', HttpStatus.FORBIDDEN);
          }
        }
      }

      await this.validateAndSanitizeInputs(req);

      if (securityContext.riskScore > 70) {
        this.logger.warn(`High-risk request detected, {
          ip: ${securityContext.clientIp},
          path: ${req.path},
          riskScore: ${securityContext.riskScore},
          threats: ${securityContext.threats},
        }`);
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Security validation error:', error);
      
      // In development, log the error but don't block the request
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Security validation failed in development - allowing request to proceed');
        return next();
      }
      
      throw new HttpException('Security validation failed', HttpStatus.BAD_REQUEST);
    }
  }

  private async validateRequestStructure(req: Request): Promise<void> {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024;

    if (contentLength > maxSize) {
      throw new HttpException('Request too large', HttpStatus.PAYLOAD_TOO_LARGE);
    }

    this.validateHeaders(req);

    if (this.containsSuspiciousPatterns(req.path)) {
      await this.apiSecurity.recordSecurityFailure(this.extractClientIp(req), 'validation');
      throw new HttpException('Malicious request detected', HttpStatus.BAD_REQUEST);
    }
  }

  private validateHeaders(req: Request): void {
    const suspiciousHeaders = ['x-forwarded-host', 'x-cluster-client-ip'];
    const presentHeaders = suspiciousHeaders.filter(header => req.headers[header]);

    if (presentHeaders.length > 0) {
      this.logger.warn(`Suspicious headers detected, {
        ip: ${this.extractClientIp(req)},
        headers: ${presentHeaders},
      }`);
    }

    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.length < 5) {
      this.logger.warn(`Missing or suspicious User-Agent, {
        ip: ${this.extractClientIp(req)},
        userAgent: ${userAgent},
      }`);
    }
  }

  private async validateAndSanitizeInputs(req: Request): Promise<void> {
    const validationRules = this.getValidationRules(req.path, req.method);

    if (req.query && Object.keys(req.query).length > 0) {
      const queryResult = this.inputValidation.validateBatch(
        req.query,
        validationRules.query || {},
      );

      if (!queryResult.isValid) {
        throw new HttpException(
          `Query validation failed: ${Object.values(queryResult.results)
            .flatMap(r => r.errors)
            .join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (queryResult.threatSummary.length > 0) {
        await this.apiSecurity.recordSecurityFailure(this.extractClientIp(req), 'validation');
        throw new HttpException('Malicious query parameters detected', HttpStatus.BAD_REQUEST);
      }

      req.query = this.applySanitizedValues(req.query, queryResult.results);
    }

    if (req.body && Object.keys(req.body).length > 0) {
      const bodyResult = this.inputValidation.validateBatch(req.body, validationRules.body || {});

      if (!bodyResult.isValid) {
        throw new HttpException(
          `Body validation failed: ${Object.values(bodyResult.results)
            .flatMap(r => r.errors)
            .join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (bodyResult.threatSummary.length > 0) {
        await this.apiSecurity.recordSecurityFailure(this.extractClientIp(req), 'validation');
        throw new HttpException('Malicious request body detected', HttpStatus.BAD_REQUEST);
      }

      req.body = this.applySanitizedValues(req.body, bodyResult.results);
    }
  }

  private getValidationRules(
    path: string,
    _method: string,
  ): {
    query?: Record<string, any>;
    body?: Record<string, any>;
  } {
    const rules: Record<string, any> = {};

    rules.query = {
      page: { type: 'number', min: 1, max: 10000 },
      limit: { type: 'number', min: 1, max: 100 },
      search: { type: 'string', maxLength: 255, sanitize: true },
      sort: { type: 'string', maxLength: 50, pattern: /^[a-zA-Z_]+$/ },
      order: { type: 'string', allowedValues: ['ASC', 'DESC'] },
    };

    if (path.includes('/auth/')) {
      rules.body = {
        email: { type: 'email', required: true, maxLength: 255 },
        password: { type: 'string', required: true, minLength: 8, maxLength: 128 },
        username: { type: 'string', maxLength: 50, pattern: /^[a-zA-Z0-9_]+$/ },
      };
    }

    if (path.includes('/upload')) {
      rules.body = {
        filename: { type: 'file', required: true, maxLength: 255 },
        description: { type: 'string', maxLength: 1000, sanitize: true },
      };
    }

    if (path.includes('/courses/')) {
      rules.body = {
        title: { type: 'string', required: true, maxLength: 200, sanitize: true },
        description: { type: 'html', maxLength: 5000, sanitize: true },
        price: { type: 'number', min: 0, max: 999999 },
      };
    }

    return rules;
  }

  private applySanitizedValues(original: any, results: Record<string, any>): any {
    const sanitized = { ...original };

    Object.entries(results).forEach(([key, result]) => {
      if (result.sanitizedValue !== undefined) {
        sanitized[key] = result.sanitizedValue;
      }
    });

    return sanitized;
  }

  private containsSuspiciousPatterns(path: string): boolean {
    const suspiciousPatterns = [
      /\.\./, // Path traversal
      /%2e%2e/i, // Encoded path traversal
      /[<>'"]/, // XSS characters
      /union.*select/i, // SQL injection
      /script/i, // Script injection
      /eval\(/i, // Code injection
      /exec\(/i, // Command injection
    ];

    return suspiciousPatterns.some(pattern => pattern.test(path));
  }

  private isApiRequest(req: Request): boolean {
    return (
      req.path.startsWith('/api/') ||
      req.headers['content-type']?.includes('application/json') ||
      req.headers['x-api-key'] !== undefined
    );
  }

  private isWebhookEndpoint(req: Request): boolean {
    const webhookPaths = [
      '/api/v1/stripe/webhook',
      '/api/v1/payment/stripe/webhook',
      '/api/v1/payment/momo/callback',
      '/api/v1/payment/momo/ipn',
    ];
    
    return webhookPaths.some(path => req.path === path);
  }

  private extractClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    )
      .split(',')[0]
      .trim();
  }
}

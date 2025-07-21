import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiSecurityService } from '../services/api-security.service';
import { SecurityAuditService } from '../services/security-audit.service';
import { WinstonService } from '@/logger/winston.service';

export const REQUIRE_API_KEY = 'requireApiKey';
export const REQUIRE_SIGNATURE = 'requireSignature';
export const HIGH_SECURITY = 'highSecurity';

@Injectable()
export class ApiSecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiSecurity: ApiSecurityService,
    private readonly securityAudit: SecurityAuditService,
    private readonly logger: WinstonService,
  ) {
    this.logger.setContext(ApiSecurityGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const requireApiKey = this.reflector.getAllAndOverride<boolean>(REQUIRE_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requireSignature = this.reflector.getAllAndOverride<boolean>(REQUIRE_SIGNATURE, [
      context.getHandler(),
      context.getClass(),
    ]);

    const highSecurity = this.reflector.getAllAndOverride<boolean>(HIGH_SECURITY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const clientIp = this.extractClientIp(request);

    try {
      const ipCheck = await this.apiSecurity.checkIpSecurity(clientIp);
      if (!ipCheck.allowed) {
        await this.logSecurityEvent(request, 'IP_BLOCKED', 'high', {
          reason: ipCheck.reason,
          riskLevel: ipCheck.riskLevel,
        });
        throw new HttpException('Access denied from this IP', HttpStatus.FORBIDDEN);
      }

      if (requireApiKey) {
        const apiKey = this.extractApiKey(request);
        if (!apiKey) {
          await this.logSecurityEvent(request, 'MISSING_API_KEY', 'medium', {
            endpoint: request.path,
          });
          throw new HttpException('API key required', HttpStatus.UNAUTHORIZED);
        }

        const keyValidation = await this.apiSecurity.validateApiKey(apiKey, clientIp);
        if (!keyValidation.valid) {
          await this.logSecurityEvent(request, 'INVALID_API_KEY', 'high', {
            apiKey: apiKey.substring(0, 8) + '...',
            reason: keyValidation.reason,
          });
          throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
        }

        (request as any).apiKeyInfo = keyValidation.keyInfo;
      }

      if (requireSignature) {
        const apiSecret = (request as any).apiKeyInfo?.secret;
        if (!apiSecret) {
          await this.logSecurityEvent(request, 'MISSING_API_SECRET', 'high', {
            endpoint: request.path,
          });
          throw new HttpException('API secret not configured', HttpStatus.UNAUTHORIZED);
        }

        const signatureValid = await this.apiSecurity.validateRequestSignature(request, apiSecret);
        if (!signatureValid) {
          await this.logSecurityEvent(request, 'INVALID_SIGNATURE', 'critical', {
            endpoint: request.path,
            method: request.method,
          });
          throw new HttpException('Invalid request signature', HttpStatus.UNAUTHORIZED);
        }
      }

      if (highSecurity) {
        const securityContext = await this.apiSecurity.generateSecurityContext(request);

        if (securityContext.riskScore > 70) {
          await this.logSecurityEvent(request, 'HIGH_RISK_REQUEST', 'critical', {
            riskScore: securityContext.riskScore,
            threats: securityContext.threats,
          });
          throw new HttpException('Request blocked due to security concerns', HttpStatus.FORBIDDEN);
        }

        await this.performAdditionalSecurityChecks(request);
      }

      if (requireApiKey || requireSignature || highSecurity) {
        await this.logSecurityEvent(request, 'API_ACCESS_GRANTED', 'low', {
          apiKey: (request as any).apiKeyInfo?.id,
          endpoint: request.path,
          method: request.method,
        });
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('API security guard error:', error);
      throw new HttpException('Security validation failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async performAdditionalSecurityChecks(request: Request): Promise<void> {
    const userAgent = request.headers['user-agent'];
    if (!userAgent || this.isSuspiciousUserAgent(userAgent)) {
      await this.logSecurityEvent(request, 'SUSPICIOUS_USER_AGENT', 'medium', {
        userAgent,
      });
      throw new HttpException('Suspicious user agent detected', HttpStatus.FORBIDDEN);
    }

    if (this.hasUnusualRequestPattern(request)) {
      await this.logSecurityEvent(request, 'UNUSUAL_REQUEST_PATTERN', 'medium', {
        path: request.path,
        headers: Object.keys(request.headers),
      });
      throw new HttpException('Unusual request pattern detected', HttpStatus.FORBIDDEN);
    }

    const requestCount = await this.getRecentRequestCount(this.extractClientIp(request));
    if (requestCount > 20) {
      await this.logSecurityEvent(request, 'RATE_LIMIT_EXCEEDED', 'high', {
        requestCount,
        timeWindow: '1 minute',
      });
      throw new HttpException(
        'Rate limit exceeded for high security endpoint',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scanner/i,
      /curl/i,
      /wget/i,
      /python/i,
      /script/i,
      /test/i,
    ];

    if (userAgent.length < 10 || userAgent.length > 500) {
      return true;
    }

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private hasUnusualRequestPattern(request: Request): boolean {
    const hasMultipleIpHeaders =
      ['x-forwarded-for', 'x-real-ip', 'x-originating-ip', 'x-cluster-client-ip'].filter(
        header => request.headers[header],
      ).length > 2;

    if (hasMultipleIpHeaders) {
      return true;
    }

    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor && forwardedFor.split(',').length > 5) {
      return true;
    }

    return false;
  }

  private async getRecentRequestCount(_ip: string): Promise<number> {
    return 0;
  }

  private extractClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      'unknown'
    )
      .split(',')[0]
      .trim();
  }

  private extractApiKey(request: Request): string | undefined {
    return (
      (request.headers['x-api-key'] as string) ||
      request.headers['authorization']?.replace('Bearer ', '') ||
      (request.query.api_key as string)
    );
  }

  private async logSecurityEvent(
    request: Request,
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
  ): Promise<void> {
    await this.securityAudit.logSecurityEvent({
      type: 'authorization',
      severity,
      source: 'ApiSecurityGuard',
      userId: (request as any).user?.id,
      sessionId: (request as any).session?.id,
      ip: this.extractClientIp(request),
      userAgent: request.headers['user-agent'],
      details: {
        eventType,
        path: request.path,
        method: request.method,
        ...details,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WinstonService } from '@/logger/winston.service';
import { RedisService } from '@/redis/redis.service';
import * as crypto from 'crypto';

export interface SecurityHeaders {
  'Strict-Transport-Security'?: string;
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options'?: string;
  'X-Frame-Options'?: string;
  'X-XSS-Protection'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'Cross-Origin-Embedder-Policy'?: string;
  'Cross-Origin-Opener-Policy'?: string;
  'Cross-Origin-Resource-Policy'?: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  ipWhitelist?: string[];
  expiresAt?: Date;
  lastUsed?: Date;
}

export interface SecurityContext {
  requestId: string;
  clientIp: string;
  userAgent: string;
  apiKey?: string;
  userId?: string;
  sessionId?: string;
  riskScore: number;
  threats: string[];
}

@Injectable()
export class ApiSecurityService {
  private readonly securityHeaders: SecurityHeaders;
  private readonly bannedIps = new Set<string>();
  private readonly _suspiciousActivities = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: WinstonService,
    private readonly redis: RedisService,
  ) {
    this.logger.setContext(ApiSecurityService.name);
    this.securityHeaders = this.buildSecurityHeaders();
  }

  applySecurityHeaders(req: Request, res: Response): void {
    Object.entries(this.securityHeaders).forEach(([header, value]) => {
      if (value) {
        res.setHeader(header, value);
      }
    });

    this.applyDynamicHeaders(req, res);

    this.applyMonitoringHeaders(req, res);
  }

  async validateApiKey(
    apiKey: string,
    clientIp: string,
  ): Promise<{
    valid: boolean;
    keyInfo?: ApiKeyInfo;
    reason?: string;
  }> {
    try {
      const keyInfo = await this.getApiKeyInfo(apiKey);

      if (!keyInfo) {
        await this.logSecurityEvent('INVALID_API_KEY', {
          apiKey: apiKey.substring(0, 8) + '...',
          clientIp,
        });
        return { valid: false, reason: 'Invalid API key' };
      }

      if (keyInfo.expiresAt && keyInfo.expiresAt < new Date()) {
        return { valid: false, reason: 'API key expired' };
      }
      if (keyInfo.ipWhitelist && keyInfo.ipWhitelist.length > 0) {
        if (!keyInfo.ipWhitelist.includes(clientIp)) {
          await this.logSecurityEvent('API_KEY_IP_VIOLATION', { keyId: keyInfo.id, clientIp });
          return { valid: false, reason: 'IP not whitelisted' };
        }
      }

      await this.updateApiKeyUsage(keyInfo.id);

      return { valid: true, keyInfo };
    } catch (error) {
      this.logger.error('API key validation error:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  async generateSecurityContext(req: Request): Promise<SecurityContext> {
    const requestId = this.generateRequestId();
    const clientIp = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    const context: SecurityContext = {
      requestId,
      clientIp,
      userAgent,
      apiKey: this.extractApiKey(req),
      userId: (req as any).user?.id,
      sessionId: (req as any).session?.id,
      riskScore: 0,
      threats: [],
    };

    context.riskScore = await this.calculateRiskScore(context, req);

    context.threats = await this.detectThreats(context, req);

    return context;
  }

  async validateCsrfToken(req: Request): Promise<boolean> {
    const token = (req.headers['x-csrf-token'] as string) || req.body._csrf;
    const sessionToken = (req as any).session?.csrfToken;

    if (!token || !sessionToken) {
      await this.logSecurityEvent('CSRF_TOKEN_MISSING', {
        path: req.path,
        method: req.method,
        ip: this.extractClientIp(req),
      });
      return false;
    }

    const isValid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));

    if (!isValid) {
      await this.logSecurityEvent('CSRF_TOKEN_INVALID', {
        path: req.path,
        method: req.method,
        ip: this.extractClientIp(req),
      });
    }

    return isValid;
  }

  generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async validateRequestSignature(req: Request, apiSecret: string): Promise<boolean> {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    const body = JSON.stringify(req.body);

    if (!signature || !timestamp) {
      return false;
    }

    const now = Date.now();
    const reqTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - reqTime);

    if (timeDiff > 300000) {
      await this.logSecurityEvent('REQUEST_REPLAY_ATTEMPT', {
        timestamp: reqTime,
        timeDiff,
        ip: this.extractClientIp(req),
      });
      return false;
    }

    const payload = `${req.method}${req.path}${body}${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', apiSecret).update(payload).digest('hex');

    const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    if (!isValid) {
      await this.logSecurityEvent('INVALID_SIGNATURE', {
        path: req.path,
        method: req.method,
        ip: this.extractClientIp(req),
      });
    }

    return isValid;
  }

  async checkIpSecurity(ip: string): Promise<{
    allowed: boolean;
    reason?: string;
    riskLevel: number;
  }> {
    if (this.bannedIps.has(ip)) {
      return { allowed: false, reason: 'IP banned', riskLevel: 100 };
    }

    try {
      const ipData = await this.redis.hgetall(`ip_security:${ip}`);

    if (ipData?.banned === 'true') {
      return { allowed: false, reason: 'IP banned in Redis', riskLevel: 100 };
    }

    const recentFailures = parseInt(ipData?.failures || '0');
    const lastActivity = parseInt(ipData?.lastActivity || '0');
    const now = Date.now();

    let riskLevel = 0;

    if (recentFailures > 10) riskLevel += 50;
    else if (recentFailures > 5) riskLevel += 25;
    else if (recentFailures > 2) riskLevel += 10;
    if (now - lastActivity < 1000) riskLevel += 20;

      const isMalicious = await this.checkMaliciousIpDatabase(ip);
      if (isMalicious) riskLevel += 75;

      return { allowed: riskLevel < 80, riskLevel };
    } catch (error) {
      this.logger.error('Redis IP security check failed:', error);
      // Return safe defaults when Redis is unavailable
      return { allowed: true, reason: 'Redis unavailable', riskLevel: 0 };
    }
  }

  async recordSecurityFailure(ip: string, type: 'auth' | 'validation' | 'abuse'): Promise<void> {
    try {
      const key = `ip_security:${ip}`;
      const failures = await this.redis.hincrby(key, 'failures', 1);
      await this.redis.hset(key, 'lastFailure', Date.now().toString());
      await this.redis.hset(key, 'lastActivity', Date.now().toString());
      await this.redis.expire(key, 3600);

      if (failures >= 20) {
        await this.banIp(ip, '24h', `Too many security failures: ${failures}`);
      } else if (failures >= 10) {
        await this.redis.hset(key, 'banned', 'true');
        await this.redis.expire(key, 1800);
      }

      this.logger.warn(`Security failure recorded for IP ${ip}: ${type} ${failures}`);
    } catch (error) {
      this.logger.error('Failed to record security failure to Redis:', error);
      // Continue without Redis - log to file/memory
      this.logger.warn(`Security failure recorded for IP ${ip}: ${type} (Redis unavailable)`);
    }
  }

  async handleCspReport(report: any, req: Request): Promise<void> {
    const securityEvent = {
      type: 'CSP_VIOLATION',
      ip: this.extractClientIp(req),
      userAgent: req.headers['user-agent'],
      report,
      timestamp: new Date(),
    };

    await this.logSecurityEvent('CSP_VIOLATION', securityEvent);

    if (this.isSuspiciousCspViolation(report)) {
      await this.recordSecurityFailure(securityEvent.ip, 'abuse');
    }
  }

  async generateSecurityReport(timeframe: number = 3600000): Promise<{
    summary: {
      totalRequests: number;
      securityEvents: number;
      blockedRequests: number;
      topThreats: string[];
    };
    ipStatistics: {
      totalIps: number;
      bannedIps: number;
      highRiskIps: string[];
    };
    apiKeyStatistics: {
      totalKeys: number;
      activeKeys: number;
      compromisedKeys: string[];
    };
  }> {
    const now = Date.now();
    const _start = now - timeframe;

    return {
      summary: {
        totalRequests: 0,
        securityEvents: 0,
        blockedRequests: 0,
        topThreats: ['SQL Injection', 'XSS', 'CSRF'],
      },
      ipStatistics: {
        totalIps: 0,
        bannedIps: this.bannedIps.size,
        highRiskIps: [],
      },
      apiKeyStatistics: {
        totalKeys: 0,
        activeKeys: 0,
        compromisedKeys: [],
      },
    };
  }

  private buildSecurityHeaders(): SecurityHeaders {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    return {
      'Strict-Transport-Security': isProduction
        ? 'max-age=31536000; includeSubDomains; preload'
        : undefined,
      'Content-Security-Policy': this.buildCspHeader(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
  }

  private buildCspHeader(): string {
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const apiUrl = this.configService.get('API_URL') || 'http://localhost:3000';

    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${frontendUrl} ${apiUrl}`,
      "img-src 'self' data: https:",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      'upgrade-insecure-requests',
    ].join('; ');
  }

  private applyDynamicHeaders(req: Request, res: Response): void {
    const origin = req.headers.origin;
    const allowedOrigins = this.configService.get<string[]>('app.corsOrigins') || [];

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }

  private applyMonitoringHeaders(req: Request, res: Response): void {
    res.setHeader('X-Request-ID', this.generateRequestId());
    res.setHeader('X-Security-Version', '1.0');
    res.setHeader('X-Rate-Limit-Policy', 'enforced');
  }

  private async calculateRiskScore(context: SecurityContext, req: Request): Promise<number> {
    let score = 0;

    const ipRisk = await this.checkIpSecurity(context.clientIp);
    score += ipRisk.riskLevel * 0.3;

    if (!context.userAgent || context.userAgent.length < 10) {
      score += 20;
    }

    if (req.path.includes('..') || req.path.includes('%2e%2e')) {
      score += 50;
    }
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
    const headerCount = suspiciousHeaders.filter(header => req.headers[header]).length;
    if (headerCount > 1) {
      score += 15;
    }

    return Math.min(100, score);
  }

  private async detectThreats(context: SecurityContext, req: Request): Promise<string[]> {
    const threats: string[] = [];

    const path = req.path.toLowerCase();
    const query = JSON.stringify(req.query).toLowerCase();
    const body = JSON.stringify(req.body).toLowerCase();
    const sqlPatterns = ['union', 'select', 'insert', 'delete', 'drop', 'exec'];
    if (
      sqlPatterns.some(
        pattern => path.includes(pattern) || query.includes(pattern) || body.includes(pattern),
      )
    ) {
      threats.push('Potential SQL injection');
    }

    const xssPatterns = ['<script', 'javascript:', 'onload=', 'onerror='];
    if (xssPatterns.some(pattern => query.includes(pattern) || body.includes(pattern))) {
      threats.push('Potential XSS attack');
    }

    if (path.includes('..') || query.includes('..') || body.includes('..')) {
      threats.push('Path traversal attempt');
    }
    if (path.includes('..') || query.includes('..') || body.includes('..')) {
      threats.push('Path traversal attempt');
    }

    return threats;
  }

  private generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex');
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

  private extractApiKey(req: Request): string | undefined {
    return (req.headers['x-api-key'] as string) || (req.query.api_key as string);
  }

  private async getApiKeyInfo(_apiKey: string): Promise<ApiKeyInfo | null> {
    return null;
  }

  private async updateApiKeyUsage(keyId: string): Promise<void> {
    const key = `api_key:${keyId}`;
    await this.redis.hset(key, 'lastUsed', Date.now().toString());
  }

  private async banIp(ip: string, duration: string, reason: string): Promise<void> {
    this.bannedIps.add(ip);
    await this.redis.set(`banned_ip:${ip}`, reason, this.parseDuration(duration));

    this.logger.warn(`IP banned: ${ip}, { ${duration}, ${reason} }`);
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([hdm])$/);
    if (!match) return 3600;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      case 'm':
        return value * 60;
      default:
        return 3600;
    }
  }

  private async checkMaliciousIpDatabase(_ip: string): Promise<boolean> {
    return false;
  }

  private isSuspiciousCspViolation(report: any): boolean {
    const suspiciousPatterns = ['javascript:', 'data:', 'blob:', 'eval'];
    const violatedDirective = report['violated-directive'] || '';
    const blockedUri = report['blocked-uri'] || '';

    return suspiciousPatterns.some(
      pattern => violatedDirective.includes(pattern) || blockedUri.includes(pattern),
    );
  }

  private async logSecurityEvent(type: string, data: any): Promise<void> {
    const event = {
      type,
      timestamp: new Date(),
      ...data,
    };

    this.logger.warn(`Security event: ${type}`, event);

    await this.redis.lpush('security_events', JSON.stringify(event));
    await this.redis.ltrim('security_events', 0, 10000);
  }
}

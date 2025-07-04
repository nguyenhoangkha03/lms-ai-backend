import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@/cache/cache.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { API_KEY_REQUIRED } from '../decorators/api-key.decorator';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isApiKeyRequired = this.reflector.getAllAndOverride<boolean>(API_KEY_REQUIRED, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isApiKeyRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      await this.logApiKeyAttempt(request, 'missing_key');
      throw new UnauthorizedException('API key is required');
    }

    // Check against valid API keys
    const isValid = await this.validateApiKey(apiKey);

    if (!isValid) {
      await this.logApiKeyAttempt(request, 'invalid_key', apiKey);
      throw new UnauthorizedException('Invalid API key');
    }

    // Rate limiting for API key usage
    const rateLimitKey = `api_key_rate_limit:${apiKey}`;
    const currentUsage = (await this.cacheService.get<number>(rateLimitKey)) || 0;
    const rateLimit = this.configService.get<number>('api.rateLimit', 1000);

    if (currentUsage >= rateLimit) {
      await this.logApiKeyAttempt(request, 'rate_limit_exceeded', apiKey);
      throw new UnauthorizedException('API key rate limit exceeded');
    }

    await this.cacheService.set(rateLimitKey, currentUsage + 1, 3600); // 1 hour window

    // Add API key info to request
    request.apiKey = apiKey;
    request.apiKeyUsage = currentUsage + 1;

    await this.logApiKeyAttempt(request, 'valid_access', apiKey);
    return true;
  }

  private extractApiKey(request: any): string | null {
    // Check header
    const headerKey =
      request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
    if (headerKey) return headerKey;

    // Check query parameter
    return request.query.api_key || null;
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    // Check cached validation first
    const cacheKey = `api_key_valid:${apiKey}`;
    const cached = await this.cacheService.get<boolean>(cacheKey);
    if (cached !== null) return cached;

    // Validate against configured API keys
    const validApiKeys = this.configService.get<string[]>('api.validKeys', []);
    const isValid = validApiKeys.includes(apiKey);

    // Cache result for 5 minutes
    await this.cacheService.set(cacheKey, isValid, 300);
    return isValid;
  }

  private async logApiKeyAttempt(request: any, result: string, apiKey?: string): Promise<void> {
    const description = `API key authentication attempt - ${result}`;
    const maskedApiKey = apiKey ? `${apiKey.substring(0, 8)}...` : 'none';

    await this.auditLogService.createAuditLog({
      sessionId: request.sessionId,
      action: AuditAction.LOGIN,
      description,
      level: result === 'valid_access' ? AuditLevel.INFO : AuditLevel.WARNING,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestUrl: request.url,
      httpMethod: request.method,
      context: {
        module: 'authentication',
        feature: 'api_key_guard',
        apiKeyResult: result,
        maskedApiKey,
      },
      securityInfo: {
        authMethod: 'api_key',
        riskScore: result === 'valid_access' ? 10 : 50,
      },
      tags: ['api_key', 'authentication'],
    });
  }
}

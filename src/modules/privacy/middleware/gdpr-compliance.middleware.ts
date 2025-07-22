import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { ConsentManagementService } from '../services/consent-management.service';
import { PrivacySettingsService } from '../services/privacy-settings.service';
import { ComplianceAuditService } from '../services/compliance-audit.service';
import { User } from '@/modules/user/entities/user.entity';
import { ComplianceStatus } from '../entities/compliance-audit-trail.entity';
import { ConsentType } from '../entities/consent-record.entity';

@Injectable()
export class GdprComplianceMiddleware implements NestMiddleware {
  constructor(
    private configService: ConfigService,
    private consentService: ConsentManagementService,
    private privacySettingsService: PrivacySettingsService,
    private auditService: ComplianceAuditService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const skipPaths = [
      '/health',
      '/metrics',
      '/auth/login',
      '/auth/register',
      '/privacy/consent',
      '/privacy/settings',
    ];

    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const gdprMode = this.configService.get<boolean>('GDPR_COMPLIANCE_MODE', false);
    if (!gdprMode) {
      return next();
    }
    if ((req.user as User)?.id) {
      await this.checkUserCompliance(req, res);
    }

    if (this.shouldLogAccess(req)) {
      await this.logDataAccess(req);
    }

    next();
  }

  private async checkUserCompliance(req: Request, res: Response): Promise<void> {
    const userId = (req.user as User)?.id;

    const requiredConsents = this.getRequiredConsents(req.path);
    for (const consentType of requiredConsents) {
      const hasConsent = await this.consentService.hasValidConsent(
        userId,
        consentType as ConsentType,
      );
      if (!hasConsent) {
        res.set('X-GDPR-Consent-Required', consentType);
      }
    }

    const privacySettings = await this.privacySettingsService.getPrivacySettings(userId);

    req.privacyContext = {
      canTrackActivity: privacySettings.trackLearningActivity,
      canCollectAnalytics: privacySettings.allowAnalytics,
      canShareData: privacySettings.shareActivityData,
      cookiePreferences: privacySettings.cookiePreferences,
    };
  }

  private getRequiredConsents(path: string): string[] {
    const consentMap: Record<string, string[]> = {
      '/analytics': ['analytics'],
      '/marketing': ['marketing'],
      '/courses/recommendations': ['profiling'],
      '/api/tracking': ['analytics', 'profiling'],
    };

    for (const [pathPattern, consents] of Object.entries(consentMap)) {
      if (path.startsWith(pathPattern)) {
        return consents;
      }
    }
    return [];
  }

  private shouldLogAccess(req: Request): boolean {
    const sensitivePatterns = ['/users/', '/student/', '/teacher/', '/analytics', '/reports'];

    return sensitivePatterns.some(pattern => req.path.includes(pattern));
  }

  private async logDataAccess(req: Request): Promise<void> {
    try {
      await this.auditService.logEvent({
        eventType: 'data_access',
        subjectUserId: (req.user as User)?.id,
        performedBy: (req.user as User)?.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        description: `Data access: ${req.method} ${req.path}`,
        eventData: {
          method: req.method,
          path: req.path,
          query: req.query,
          timestamp: new Date(),
        },
        complianceStatus: ComplianceStatus.COMPLIANT,
      });
    } catch (error) {
      console.error('Failed to log data access:', error);
    }
  }
}

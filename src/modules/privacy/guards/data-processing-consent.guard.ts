import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConsentManagementService } from '../services/consent-management.service';
import { ConsentType } from '../entities/consent-record.entity';

export const RequiresConsent = (_consentTypes: ConsentType[]) =>
  Reflector.createDecorator<ConsentType[]>();

@Injectable()
export class DataProcessingConsentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private consentService: ConsentManagementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredConsents = this.reflector.get(RequiresConsent, context.getHandler());

    if (!requiredConsents || requiredConsents.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    for (const consentType of requiredConsents) {
      const hasConsent = await this.consentService.hasValidConsent(userId, consentType);
      if (!hasConsent) {
        throw new ForbiddenException(
          `Consent required for ${consentType}. Please update your privacy preferences.`,
        );
      }
    }

    return true;
  }
}

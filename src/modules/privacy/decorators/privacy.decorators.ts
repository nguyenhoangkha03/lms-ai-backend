import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ConsentType } from '../entities/consent-record.entity';
import { RequiresConsent } from '../guards/data-processing-consent.guard';

export const PrivacyContext = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.privacyContext;
});

export const RequiresDataProcessingConsent = (consentTypes: ConsentType[]) =>
  RequiresConsent(consentTypes);

// Usage example:
// @RequiresDataProcessingConsent([ConsentType.ANALYTICS, ConsentType.PROFILING])
// @UseGuards(DataProcessingConsentGuard)

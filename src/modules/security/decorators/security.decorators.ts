import { SetMetadata } from '@nestjs/common';
import { SKIP_CSRF } from '../guards/csrf-protection.guard';

export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);

export const RequireSignature = () => SetMetadata('requireSignature', true);

export const HighSecurity = () => SetMetadata('highSecurity', true);

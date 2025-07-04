import { SetMetadata } from '@nestjs/common';

export const API_KEY_REQUIRED = 'api_key_required';
export const RequireApiKey = () => SetMetadata(API_KEY_REQUIRED, true);

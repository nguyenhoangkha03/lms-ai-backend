import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OwnerGuard } from '../guards/owner.guard';
import { SetMetadata } from '@nestjs/common';

export const OWNER_KEY = 'owner';

export interface OwnerOptions {
  entityField?: string; // Field name to extract entity ID (default: 'id')
  userField?: string; // Field name in entity that contains user ID (default: 'userId')
  entityType: string; // Entity type name
  allowedRoles?: string[]; // Roles that can bypass owner check
}

export const Owner = (options: OwnerOptions) => SetMetadata(OWNER_KEY, options);

export function OwnerOnly(options: OwnerOptions) {
  return applyDecorators(UseGuards(JwtAuthGuard, OwnerGuard), Owner(options));
}

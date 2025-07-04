import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { EnhancedPermissionsGuard } from '../guards/enhanced-permissions.guard';
import { ResourceGuard } from '../guards/resource.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { Roles } from './roles.decorator';
import { Permissions } from './permissions.decorator';
import { Resource } from './resource.decorator';
import { ResourceDefinition } from '../guards/resource.guard';
import { RateLimit } from './rate-limit.decorator';
import { RateLimitOptions } from '../guards/rate-limit.guard';
import { UserType } from '@/common/enums/user.enums';

export interface AuthorizeOptions {
  roles?: UserType[];
  permissions?: string[];
  resource?: ResourceDefinition;
  rateLimit?: RateLimitOptions;
  requireAuth?: boolean;
  apiResponses?: boolean;
}

export function Authorize(options: AuthorizeOptions = {}) {
  const decorators: (ClassDecorator | MethodDecorator)[] = [];

  // Default to requiring authentication
  if (options.requireAuth !== false) {
    decorators.push(UseGuards(JwtAuthGuard));
  }

  // Add rate limiting if specified
  if (options.rateLimit) {
    decorators.push(RateLimit(options.rateLimit));
    decorators.push(UseGuards(RateLimitGuard));
  }

  // Add role-based authorization
  if (options.roles && options.roles.length > 0) {
    decorators.push(Roles(...options.roles));
    decorators.push(UseGuards(RolesGuard));
  }

  // Add permission-based authorization
  if (options.permissions && options.permissions.length > 0) {
    decorators.push(Permissions(...options.permissions));
    decorators.push(UseGuards(EnhancedPermissionsGuard));
  }

  // Add resource-based authorization
  if (options.resource) {
    decorators.push(Resource(options.resource));
    decorators.push(UseGuards(ResourceGuard));
  }

  // Add API documentation
  if (options.apiResponses !== false) {
    decorators.push(ApiBearerAuth());
    decorators.push(ApiUnauthorizedResponse({ description: 'Unauthorized' }));
    decorators.push(ApiForbiddenResponse({ description: 'Forbidden' }));
  }

  return applyDecorators(...decorators);
}

// Usage examples:
// @Authorize({ roles: [UserType.ADMIN] })
// @Authorize({ permissions: ['read:user', 'update:user'] })
// @Authorize({
//   resource: {
//     resource: PermissionResource.COURSE,
//     action: PermissionAction.UPDATE,
//     allowOwner: true
//   }
// })

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../user/services/user.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { CacheService } from '@/cache/cache.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';
import { Permission } from '@/modules/user/entities/permission.entity';

export interface PermissionCheckContext {
  user: any;
  request: any;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
}

@Injectable()
export class EnhancedPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request; // user này do guard khác chạy ra

    if (!user) {
      await this.logPermissionCheck(request, requiredPermissions, 'no_user');
      throw new ForbiddenException('User not authenticated');
    }

    try {
      const cacheKey = `user_permissions:${user.id}`;
      let userPermissions = await this.cacheService.get<Permission[]>(cacheKey);

      if (!userPermissions) {
        userPermissions = await this.userService.getUserPermissions(user.id);
        await this.cacheService.set(cacheKey, userPermissions, 300);
      }

      // như ['read:user', 'create:user', 'read:post']
      const permissionStrings = userPermissions.map(p => `${p.action}:${p.resource}`);

      const hasPermission = requiredPermissions.some(permission => {
        if (permission.includes('*')) {
          const [action, resource] = permission.split(':');
          if (action === '*') {
            return permissionStrings.some(p => p.endsWith(`:${resource}`));
          }
          if (resource === '*') {
            return permissionStrings.some(p => p.startsWith(`${action}:`));
          }
        }
        return permissionStrings.includes(permission);
      });

      if (!hasPermission) {
        await this.logPermissionCheck(
          request,
          requiredPermissions,
          'access_denied',
          permissionStrings,
        );
        throw new ForbiddenException('Insufficient permissions');
      }

      await this.logPermissionCheck(
        request,
        requiredPermissions,
        'access_granted',
        permissionStrings,
      );
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      await this.logPermissionCheck(request, requiredPermissions, 'error', [], error.message);
      throw new ForbiddenException('Permission check failed');
    }
  }

  private async logPermissionCheck(
    request: any,
    requiredPermissions: string[],
    result: string,
    userPermissions: string[] = [],
    errorMessage?: string,
  ): Promise<void> {
    const description = `Permission check: Required [${requiredPermissions.join(', ')}] - ${result}`;

    await this.auditLogService.createAuditLog({
      userId: request.user?.id,
      sessionId: request.sessionId,
      action: AuditAction.READ,
      description,
      level: result === 'access_denied' ? AuditLevel.WARNING : AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestUrl: request.url,
      httpMethod: request.method,
      context: {
        module: 'authorization',
        feature: 'permissions_guard',
        requiredPermissions,
        userPermissions: result !== 'no_user' ? userPermissions : [],
        authorizationResult: result,
      },
      errorDetails: errorMessage,
      metadata: {
        permissionCheckType: 'enhanced',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

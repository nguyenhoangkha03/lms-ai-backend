import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../../user/services/user.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { CacheService } from '@/cache/cache.service';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';
import { Permission } from '@/modules/user/entities/permission.entity';

interface ExtendedRequest extends Request {
  user?: any;
  permissions?: string[];
  hasPermission?: (permission: string) => boolean;
}

@Injectable()
export class PermissionCheckMiddleware implements NestMiddleware {
  constructor(
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
    private readonly cacheService: CacheService,
  ) {}

  async use(req: ExtendedRequest, res: Response, next: NextFunction) {
    if (req.user) {
      try {
        // Get user permissions and cache them in request
        const cacheKey = `user_permissions:${req.user.id}`;
        let permissions = await this.cacheService.get<Permission[]>(cacheKey);

        if (!permissions) {
          permissions = await this.userService.getUserPermissions(req.user.id);
          await this.cacheService.set(cacheKey, permissions, 300); // 5 minutes
        }

        const permissionStrings = permissions.map(p => `${p.action}:${p.resource}`);
        req.permissions = permissionStrings;

        // Add convenience method to check permissions
        req.hasPermission = (permission: string): boolean => {
          return (
            permissionStrings.includes(permission) ||
            permissionStrings.includes('*:*') ||
            permissionStrings.some(p => {
              const [action, resource] = permission.split(':');
              return p === `*:${resource}` || p === `${action}:*`;
            })
          );
        };
      } catch (error) {
        await this.auditLogService.createAuditLog({
          userId: req.user.id,
          action: AuditAction.READ,
          description: `Permission middleware error: ${error.message}`,
          level: AuditLevel.ERROR,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestUrl: req.url,
          httpMethod: req.method,
          errorDetails: error.message,
          context: {
            module: 'authorization',
            feature: 'permission_middleware',
          },
        });
      }
    }

    next();
  }
}

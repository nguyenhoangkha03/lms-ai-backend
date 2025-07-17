import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForumPermission } from '@/common/enums/forum.enums';

@Injectable()
export class ForumPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<ForumPermission[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has required forum permissions
    const hasPermission = this.checkForumPermissions(user, requiredPermissions);

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient forum permissions');
    }

    return true;
  }

  private checkForumPermissions(_user: any, _requiredPermissions: ForumPermission[]): boolean {
    // Implementation would depend on your permission system
    // This is a placeholder implementation
    return true;
  }
}

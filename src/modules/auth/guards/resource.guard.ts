import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../user/services/user.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { RESOURCE_KEY } from '../decorators/resource.decorator';
import { PermissionAction, PermissionResource } from '@/common/enums/user.enums';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';

export interface ResourceDefinition {
  resource: PermissionResource;
  action: PermissionAction;
  ownerField?: string; // Field to check ownership (e.g., 'userId', 'teacherId')
  allowOwner?: boolean; // Allow resource owner even without permission
  customCheck?: string; // Method name for custom authorization logic
}

@Injectable()
export class ResourceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceDef = this.reflector.getAllAndOverride<ResourceDefinition>(RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resourceDef) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      await this.logAuthorizationAttempt(request, 'no_user', resourceDef);
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Check basic permission
      const hasPermission = await this.userService.hasPermission(
        user.id,
        resourceDef.resource,
        resourceDef.action,
      );

      if (hasPermission) {
        await this.logAuthorizationAttempt(request, 'permission_granted', resourceDef);
        return true;
      }

      // Check ownership if allowed
      if (resourceDef.allowOwner && resourceDef.ownerField) {
        const resourceId = request.params.id || request.params.resourceId;
        if (await this.checkOwnership(user.id, resourceId, resourceDef)) {
          await this.logAuthorizationAttempt(request, 'owner_access', resourceDef);
          return true;
        }
      }

      // Custom authorization check
      if (resourceDef.customCheck) {
        if (await this.performCustomCheck(resourceDef.customCheck, context, user)) {
          await this.logAuthorizationAttempt(request, 'custom_check_passed', resourceDef);
          return true;
        }
      }

      await this.logAuthorizationAttempt(request, 'access_denied', resourceDef);
      throw new ForbiddenException('Insufficient permissions for this resource');
    } catch (error) {
      await this.logAuthorizationAttempt(request, 'error', resourceDef, error.message);
      throw error;
    }
  }

  private async checkOwnership(
    userId: string,
    resourceId: string,
    resourceDef: ResourceDefinition,
  ): Promise<boolean> {
    if (!resourceId) return false;

    try {
      // This would be extended to check different resource types
      switch (resourceDef.resource) {
        case PermissionResource.COURSE:
          return await this.checkCourseOwnership(userId, resourceId);
        case PermissionResource.LESSON:
          return await this.checkLessonOwnership(userId, resourceId);
        case PermissionResource.ASSESSMENT:
          return await this.checkAssessmentOwnership(userId, resourceId);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async checkCourseOwnership(_userId: string, _courseId: string): Promise<boolean> {
    // This would use CourseService to check if user owns the course
    // For now, we'll return false as CourseService isn't implemented yet
    return false;
  }

  private async checkLessonOwnership(_userId: string, _lessonId: string): Promise<boolean> {
    // Similar implementation for lessons
    return false;
  }

  private async checkAssessmentOwnership(_userId: string, _assessmentId: string): Promise<boolean> {
    // Similar implementation for assessments
    return false;
  }

  private async performCustomCheck(
    _checkMethod: string,
    _context: ExecutionContext,
    _user: any,
  ): Promise<boolean> {
    // Custom authorization logic would be implemented here
    // This could call specific methods based on the checkMethod parameter
    return false;
  }

  private async logAuthorizationAttempt(
    request: any,
    result: string,
    resourceDef: ResourceDefinition,
    errorMessage?: string,
  ): Promise<void> {
    const description = `Authorization attempt for ${resourceDef.action}:${resourceDef.resource} - ${result}`;

    await this.auditLogService.createAuditLog({
      userId: request.user?.id,
      sessionId: request.sessionId,
      action: AuditAction.READ, // Using READ for authorization checks
      entityType: resourceDef.resource,
      entityId: request.params.id || request.params.resourceId,
      description,
      level: result === 'access_denied' ? AuditLevel.WARNING : AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestUrl: request.url,
      httpMethod: request.method,
      requestData: {
        params: request.params,
        query: request.query,
      },
      context: {
        module: 'authorization',
        feature: 'resource_guard',
        authorizationResult: result,
      },
      errorDetails: errorMessage,
    });
  }
}

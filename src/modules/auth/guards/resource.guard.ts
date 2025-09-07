import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { UserService } from '../../user/services/user.service';
import { AuditLogService } from '../../system/services/audit-log.service';
import { RESOURCE_KEY } from '../decorators/resource.decorator';
import { PermissionAction, PermissionResource } from '@/common/enums/user.enums';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';
import { Course } from '../../course/entities/course.entity';

export interface ResourceDefinition {
  resource: PermissionResource;
  action: PermissionAction;
  ownerField?: string; // Id của người sở hữu
  allowOwner?: boolean; // Cho phép chủ thực hiện mà không cần kiểm tra quyền
  customCheck?: string; // Kiểm tra tùy chỉnh phức tạp hơn
}

@Injectable()
export class ResourceGuard implements CanActivate {
  private readonly logger = new Logger(ResourceGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
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
    const { user } = request; // user này do guard khác chạy ra

    if (!user) {
      await this.logAuthorizationAttempt(request, 'no_user', resourceDef);
      throw new ForbiddenException('User not authenticated');
    }

    try {
      const hasPermission = await this.userService.hasPermission(
        user.id,
        resourceDef.resource,
        resourceDef.action,
      );

      if (hasPermission) {
        await this.logAuthorizationAttempt(request, 'permission_granted', resourceDef);
        return true;
      }

      if (resourceDef.allowOwner && resourceDef.ownerField) {
        const resourceId = request.params.id || request.params.resourceId;
        if (await this.checkOwnership(user.id, resourceId, resourceDef)) {
          await this.logAuthorizationAttempt(request, 'owner_access', resourceDef);
          return true;
        }
      }

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
      switch (resourceDef.resource) {
        case PermissionResource.COURSE:
          return (await this.checkCourseOwnership(userId, resourceId)) || false;
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

  private async checkCourseOwnership(userId: string, courseId: string): Promise<boolean | null> {
    try {
      const courseRepository = this.dataSource.getRepository(Course);
      const course = await courseRepository.findOne({
        where: { id: courseId },
        select: ['id', 'teacherId'],
      });

      this.logger.debug(
        `Checking course ownership: userId=${userId}, courseId=${courseId}, course.teacherId=${course?.teacherId}`,
      );

      return course && course.teacherId === userId;
    } catch (error) {
      this.logger.error(`Error checking course ownership: ${error.message}`);
      return false;
    }
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
      action: AuditAction.READ,
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

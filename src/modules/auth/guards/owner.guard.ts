import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AuditLogService } from '../../system/services/audit-log.service';
import { OWNER_KEY, OwnerOptions } from '../decorators/owner-only.decorator';
import { AuditAction, AuditLevel } from '@/common/enums/system.enums';

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ownerOptions = this.reflector.getAllAndOverride<OwnerOptions>(OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!ownerOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    try {
      // Check if user has bypassing role
      if (ownerOptions.allowedRoles) {
        const hasBypassRole = ownerOptions.allowedRoles.some(
          role => user.userType === role || user.roles?.includes(role),
        );
        if (hasBypassRole) {
          await this.logOwnershipCheck(request, ownerOptions, 'role_bypass');
          return true;
        }
      }

      // Extract entity ID from request
      const entityIdField = ownerOptions.entityField || 'id';
      const entityId = request.params[entityIdField];

      if (!entityId) {
        await this.logOwnershipCheck(request, ownerOptions, 'no_entity_id');
        throw new ForbiddenException('Entity ID not found');
      }

      // Check ownership
      const isOwner = await this.checkOwnership(
        user.id,
        entityId,
        ownerOptions.entityType,
        ownerOptions.userField || 'userId',
      );

      if (!isOwner) {
        await this.logOwnershipCheck(request, ownerOptions, 'not_owner', entityId);
        throw new ForbiddenException('You can only access your own resources');
      }

      await this.logOwnershipCheck(request, ownerOptions, 'owner_confirmed', entityId);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      await this.logOwnershipCheck(request, ownerOptions, 'error', undefined, error.message);
      throw new ForbiddenException('Ownership verification failed');
    }
  }

  private async checkOwnership(
    userId: string,
    entityId: string,
    entityType: string,
    userField: string,
  ): Promise<boolean | null> {
    try {
      const repository = this.dataSource.getRepository(entityType);
      const entity = await repository.findOne({
        where: { id: entityId },
        select: [userField],
      });

      return entity && entity[userField] === userId;
    } catch {
      return false;
    }
  }

  private async logOwnershipCheck(
    request: any,
    options: OwnerOptions,
    result: string,
    entityId?: string,
    errorMessage?: string,
  ): Promise<void> {
    const description = `Ownership check for ${options.entityType} - ${result}`;

    await this.auditLogService.createAuditLog({
      userId: request.user?.id,
      sessionId: request.sessionId,
      action: AuditAction.READ,
      entityType: options.entityType,
      entityId,
      description,
      level: result === 'not_owner' ? AuditLevel.WARNING : AuditLevel.INFO,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestUrl: request.url,
      httpMethod: request.method,
      context: {
        module: 'authorization',
        feature: 'ownership_guard',
        entityType: options.entityType,
        userField: options.userField,
        ownershipResult: result,
      },
      errorDetails: errorMessage,
    });
  }
}

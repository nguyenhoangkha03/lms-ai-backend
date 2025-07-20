import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const CACHE_BYPASS_METADATA = 'cache_bypass';

export const CacheBypass = (condition?: (request: any) => boolean) => {
  return (target: any, _propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(CACHE_BYPASS_METADATA, condition || (() => true), descriptor.value);
    } else {
      Reflect.defineMetadata(CACHE_BYPASS_METADATA, condition || (() => true), target);
    }
  };
};

@Injectable()
export class CacheBypassGuard implements CanActivate {
  private readonly logger = new Logger(CacheBypassGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const bypassCondition = this.reflector.get<(req: any) => boolean>(
      CACHE_BYPASS_METADATA,
      context.getHandler(),
    );

    if (!bypassCondition) {
      return true; // No bypass condition, allow caching
    }

    const request = context.switchToHttp().getRequest();

    try {
      const shouldBypass = bypassCondition(request);

      if (shouldBypass) {
        // Add bypass flag to request for interceptors
        request._cacheBypass = true;
        this.logger.debug(`Cache bypass activated for ${context.getHandler().name}`);
      }

      return true; // Always allow the request to proceed
    } catch (error) {
      this.logger.error('Cache bypass condition evaluation failed:', error.message);
      return true; // Allow request on error
    }
  }
}

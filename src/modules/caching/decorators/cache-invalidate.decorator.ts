import { SetMetadata } from '@nestjs/common';

export interface CacheInvalidateOptions {
  patterns?: string[];
  tags?: string[];
  keys?: string[];
  condition?: (args: any[]) => boolean;
  async?: boolean;
}

export const CACHE_INVALIDATE_METADATA = 'cache_invalidate';

export const CacheInvalidate = (options: CacheInvalidateOptions) => {
  return SetMetadata(CACHE_INVALIDATE_METADATA, {
    async: true,
    ...options,
  });
};

// Specific invalidation decorators
export const InvalidateUserCache = (userIdParam: string = 'userId') => {
  return CacheInvalidate({
    patterns: [`user:${userIdParam}*`, `api:user:${userIdParam}*`],
    tags: ['user_data'],
  });
};

export const InvalidateCourseCache = (courseIdParam: string = 'courseId') => {
  return CacheInvalidate({
    patterns: [`course:${courseIdParam}*`, `api:course*`],
    tags: ['course_data', 'course_list'],
  });
};

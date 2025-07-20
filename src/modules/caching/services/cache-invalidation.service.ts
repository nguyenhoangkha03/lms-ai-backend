import { Injectable, Logger } from '@nestjs/common';
import { AdvancedCacheService } from './advanced-cache.service';
import { DatabaseCacheService } from './database-cache.service';
import { StaticAssetCacheService } from './static-asset-cache.service';
import { CdnCacheService } from './cdn-cache.service';

export interface InvalidationRule {
  trigger: string;
  patterns: string[];
  tags?: string[];
  delay?: number;
  cascade?: boolean;
}

export interface InvalidationEvent {
  id: string;
  type: string;
  entityId?: string;
  entityType?: string;
  timestamp: Date;
  rules: InvalidationRule[];
}

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);
  private readonly invalidationRules: Map<string, InvalidationRule[]> = new Map();

  constructor(
    private readonly advancedCacheService: AdvancedCacheService,
    private readonly databaseCacheService: DatabaseCacheService,
    private readonly staticAssetCacheService: StaticAssetCacheService,
    private readonly cdnCacheService: CdnCacheService,
  ) {
    this.initializeInvalidationRules();
  }

  // ==================== RULE MANAGEMENT ====================

  registerInvalidationRule(trigger: string, rule: InvalidationRule): void {
    if (!this.invalidationRules.has(trigger)) {
      this.invalidationRules.set(trigger, []);
    }
    this.invalidationRules.get(trigger)!.push(rule);
    this.logger.debug(`Registered invalidation rule for trigger: ${trigger}`);
  }

  // ==================== EVENT-BASED INVALIDATION ====================

  async invalidateOnEvent(event: InvalidationEvent): Promise<void> {
    try {
      this.logger.debug(`Processing invalidation event: ${event.type}`);

      const rules = this.invalidationRules.get(event.type) || [];

      for (const rule of rules) {
        if (rule.delay && rule.delay > 0) {
          // Schedule delayed invalidation
          setTimeout(() => this.executeInvalidationRule(rule, event), rule.delay);
        } else {
          // Execute immediately
          await this.executeInvalidationRule(rule, event);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process invalidation event ${event.type}:`, error.message);
    }
  }

  async invalidateEntity(entityType: string, entityId: string): Promise<void> {
    const event: InvalidationEvent = {
      id: `${entityType}_${entityId}_${Date.now()}`,
      type: `${entityType}_updated`,
      entityType,
      entityId,
      timestamp: new Date(),
      rules: [],
    };

    await this.invalidateOnEvent(event);
  }

  // ==================== SMART INVALIDATION ====================

  async smartInvalidation(context: {
    entityType: string;
    entityId: string;
    changedFields?: string[];
    operation: 'create' | 'update' | 'delete';
  }): Promise<void> {
    try {
      this.logger.debug(`Smart invalidation for ${context.entityType}:${context.entityId}`);

      // Entity-specific invalidation
      await this.databaseCacheService.invalidateEntityCache(context.entityType, context.entityId);

      // Related entities invalidation
      await this.invalidateRelatedEntities(context);

      // Aggregation invalidation
      await this.invalidateAggregations(context);

      // API response invalidation
      await this.invalidateApiResponses(context);
    } catch (error) {
      this.logger.error(`Smart invalidation failed for ${context.entityType}:`, error.message);
    }
  }

  // ==================== BULK INVALIDATION ====================

  async bulkInvalidation(patterns: string[]): Promise<number> {
    let totalInvalidated = 0;

    for (const pattern of patterns) {
      try {
        const count = await this.advancedCacheService.invalidateByPattern(pattern);
        totalInvalidated += count;
      } catch (error) {
        this.logger.warn(`Failed to invalidate pattern ${pattern}:`, error.message);
      }
    }

    this.logger.log(`Bulk invalidation completed: ${totalInvalidated} keys invalidated`);
    return totalInvalidated;
  }

  // ==================== SCHEDULED INVALIDATION ====================

  async scheduleInvalidation(
    patterns: string[],
    scheduledTime: Date,
    options?: { recurring?: boolean; interval?: number },
  ): Promise<void> {
    const delay = scheduledTime.getTime() - Date.now();

    if (delay <= 0) {
      await this.bulkInvalidation(patterns);
      return;
    }

    setTimeout(async () => {
      await this.bulkInvalidation(patterns);

      if (options?.recurring && options?.interval) {
        // Schedule next invalidation
        const nextTime = new Date(Date.now() + options.interval);
        await this.scheduleInvalidation(patterns, nextTime, options);
      }
    }, delay);

    this.logger.debug(
      `Scheduled invalidation for ${patterns.length} patterns at ${scheduledTime.toISOString()}`,
    );
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      try {
        const count = await this.advancedCacheService.invalidateByTags([tag]);
        totalInvalidated += count;
      } catch (error) {
        this.logger.warn(`Failed to invalidate tag ${tag}:`, error.message);
      }
    }

    this.logger.log(`Bulk invalidation completed: ${totalInvalidated} keys invalidated`);
    return totalInvalidated;
  }

  // ==================== PRIVATE METHODS ====================

  private async executeInvalidationRule(
    rule: InvalidationRule,
    event: InvalidationEvent,
  ): Promise<void> {
    try {
      // Invalidate by patterns
      for (const pattern of rule.patterns) {
        const interpolatedPattern = this.interpolatePattern(pattern, event);
        await this.advancedCacheService.invalidateByPattern(interpolatedPattern);
      }

      // Invalidate by tags
      if (rule.tags && rule.tags.length > 0) {
        const interpolatedTags = rule.tags.map(tag => this.interpolatePattern(tag, event));
        await this.advancedCacheService.invalidateByTags(interpolatedTags);
      }

      // Cascade invalidation
      if (rule.cascade) {
        await this.cascadeInvalidation(event);
      }
    } catch (error) {
      this.logger.error(`Failed to execute invalidation rule:`, error.message);
    }
  }

  private interpolatePattern(pattern: string, event: InvalidationEvent): string {
    return pattern
      .replace('{entityType}', event.entityType || '')
      .replace('{entityId}', event.entityId || '')
      .replace('{timestamp}', event.timestamp.getTime().toString());
  }

  private async invalidateRelatedEntities(context: {
    entityType: string;
    entityId: string;
    operation: string;
  }): Promise<void> {
    // Define entity relationships for smart invalidation
    const relationships: Record<string, string[]> = {
      User: ['Course', 'Enrollment', 'Assessment'],
      Course: ['User', 'Lesson', 'Assessment', 'Enrollment'],
      Lesson: ['Course', 'LessonProgress'],
      Assessment: ['Course', 'AssessmentAttempt'],
    };

    const relatedTypes = relationships[context.entityType] || [];

    for (const relatedType of relatedTypes) {
      await this.advancedCacheService.invalidateByTags([`entity:${relatedType}`]);
    }
  }

  private async invalidateAggregations(context: {
    entityType: string;
    entityId: string;
  }): Promise<void> {
    // Invalidate aggregation caches that might be affected
    const aggregationTags = [
      `aggregation:${context.entityType}`,
      'aggregation:statistics',
      'aggregation:analytics',
    ];

    await this.advancedCacheService.invalidateByTags(aggregationTags);
  }

  private async invalidateApiResponses(context: {
    entityType: string;
    entityId: string;
  }): Promise<void> {
    // Invalidate API response caches
    const apiPatterns = [
      `api:${context.entityType.toLowerCase()}*`,
      `api:list:${context.entityType.toLowerCase()}*`,
      `api:search:*${context.entityType.toLowerCase()}*`,
    ];

    for (const pattern of apiPatterns) {
      await this.advancedCacheService.invalidateByPattern(pattern);
    }
  }

  private async cascadeInvalidation(event: InvalidationEvent): Promise<void> {
    // Implement cascade logic based on entity relationships
    if (event.entityType === 'Course' && event.entityId) {
      // When a course is updated, invalidate all related lessons, assessments, etc.
      await this.advancedCacheService.invalidateByPattern(`*course:${event.entityId}*`);
    }
  }

  private initializeInvalidationRules(): void {
    // User-related invalidation rules
    this.registerInvalidationRule('user_updated', {
      trigger: 'user_updated',
      patterns: ['user:{entityId}*', 'api:user:{entityId}*'],
      tags: ['user_data'],
    });

    // Course-related invalidation rules
    this.registerInvalidationRule('course_updated', {
      trigger: 'course_updated',
      patterns: ['course:{entityId}*', 'api:course*'],
      tags: ['course_data', 'course_list'],
      cascade: true,
    });

    // Lesson-related invalidation rules
    this.registerInvalidationRule('lesson_updated', {
      trigger: 'lesson_updated',
      patterns: ['lesson:{entityId}*'],
      tags: ['lesson_data'],
    });

    // Assessment-related invalidation rules
    this.registerInvalidationRule('assessment_updated', {
      trigger: 'assessment_updated',
      patterns: ['assessment:{entityId}*'],
      tags: ['assessment_data'],
    });

    this.logger.log('Initialized default invalidation rules');
  }
}

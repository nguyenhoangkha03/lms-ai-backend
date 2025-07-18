import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  EmailSuppressionList,
  SuppressionReason,
  SuppressionScope,
} from '../entities/email-suppression-list.entity';

@Injectable()
export class EmailSuppressionService {
  private readonly logger = new Logger(EmailSuppressionService.name);

  constructor(
    @InjectRepository(EmailSuppressionList)
    private suppressionRepository: Repository<EmailSuppressionList>,
  ) {}

  async addToSuppressionList(
    email: string,
    reason: SuppressionReason,
    scope: SuppressionScope = SuppressionScope.GLOBAL,
    options?: {
      scopeId?: string;
      userId?: string;
      details?: string;
      source?: string;
      metadata?: Record<string, any>;
      expiresAt?: Date;
      updatedBy?: string;
    },
  ): Promise<EmailSuppressionList | null> {
    // Check if suppression already exists for this email, scope, and scopeId
    const existing = await this.suppressionRepository.findOne({
      where: {
        email: email.toLowerCase(),
        scope,
        scopeId: options?.scopeId || null,
      },
    } as any);

    if (existing) {
      // Update existing suppression
      await this.suppressionRepository.update(existing.id, {
        reason,
        isActive: true,
        details: options?.details,
        source: options?.source,
        metadata: options?.metadata,
        expiresAt: options?.expiresAt,
        lastUpdatedAt: new Date(),
        updatedBy: options?.updatedBy,
      });

      this.logger.log(`Updated suppression for ${email} - Reason: ${reason}, Scope: ${scope}`);

      return this.suppressionRepository.findOne({ where: { id: existing.id } });
    }

    // Create new suppression
    const suppression = this.suppressionRepository.create({
      email: email.toLowerCase(),
      reason,
      scope,
      scopeId: options?.scopeId,
      userId: options?.userId,
      details: options?.details,
      source: options?.source,
      metadata: options?.metadata,
      expiresAt: options?.expiresAt,
      suppressedAt: new Date(),
      isActive: true,
    });

    const savedSuppression = await this.suppressionRepository.save(suppression);

    this.logger.log(`Added ${email} to suppression list - Reason: ${reason}, Scope: ${scope}`);

    return savedSuppression;
  }

  async removeFromSuppressionList(
    email: string,
    scope: SuppressionScope = SuppressionScope.GLOBAL,
    scopeId?: string,
  ): Promise<boolean> {
    const suppression = await this.suppressionRepository.findOne({
      where: {
        email: email.toLowerCase(),
        scope,
        scopeId: scopeId || null,
        isActive: true,
      },
    } as any);

    if (!suppression) {
      return false;
    }

    await this.suppressionRepository.update(suppression.id, {
      isActive: false,
      lastUpdatedAt: new Date(),
    });

    this.logger.log(`Removed ${email} from suppression list - Scope: ${scope}`);

    return true;
  }

  async isEmailSuppressed(
    email: string,
    scope: SuppressionScope | string = SuppressionScope.GLOBAL,
    scopeId?: string,
  ): Promise<boolean> {
    const now = new Date();
    const normalizedEmail = email.toLowerCase();

    // Check global suppression first
    const globalSuppression = await this.suppressionRepository.findOne({
      where: {
        email: normalizedEmail,
        scope: SuppressionScope.GLOBAL,
        isActive: true,
      },
    });

    if (globalSuppression) {
      // Check if suppression has expired
      if (globalSuppression.expiresAt && globalSuppression.expiresAt <= now) {
        await this.suppressionRepository.update(globalSuppression.id, {
          isActive: false,
          lastUpdatedAt: now,
        });
        return false;
      }
      return true;
    }

    // If not globally suppressed, check scope-specific suppression
    if (scope !== SuppressionScope.GLOBAL) {
      const scopedSuppression = await this.suppressionRepository.findOne({
        where: {
          email: normalizedEmail,
          scope: scope as SuppressionScope,
          scopeId: scopeId || null,
          isActive: true,
        },
      } as any);

      if (scopedSuppression) {
        // Check if suppression has expired
        if (scopedSuppression.expiresAt && scopedSuppression.expiresAt <= now) {
          await this.suppressionRepository.update(scopedSuppression.id, {
            isActive: false,
            lastUpdatedAt: now,
          });
          return false;
        }
        return true;
      }
    }

    return false;
  }

  async bulkCheckSuppression(
    emails: string[],
    scope: SuppressionScope = SuppressionScope.GLOBAL,
    scopeId?: string,
  ): Promise<{ email: string; suppressed: boolean; reason?: SuppressionReason }[]> {
    const normalizedEmails = emails.map(email => email.toLowerCase());
    const now = new Date();

    const suppressions = await this.suppressionRepository.find({
      where: [
        {
          email: In(normalizedEmails),
          scope: SuppressionScope.GLOBAL,
          isActive: true,
        },
        ...(scope !== SuppressionScope.GLOBAL
          ? [
              {
                email: In(normalizedEmails),
                scope,
                scopeId: scopeId || null,
                isActive: true,
              },
            ]
          : []),
      ],
    } as any);

    // Create a map for quick lookup
    const suppressionMap = new Map<string, EmailSuppressionList>();

    for (const suppression of suppressions) {
      // Check if suppression has expired
      if (suppression.expiresAt && suppression.expiresAt <= now) {
        await this.suppressionRepository.update(suppression.id, {
          isActive: false,
          lastUpdatedAt: now,
        });
        continue;
      }

      // Global suppressions take precedence
      if (suppression.scope === SuppressionScope.GLOBAL || !suppressionMap.has(suppression.email)) {
        suppressionMap.set(suppression.email, suppression);
      }
    }

    return emails.map(email => {
      const normalizedEmail = email.toLowerCase();
      const suppression = suppressionMap.get(normalizedEmail);

      return {
        email,
        suppressed: !!suppression,
        reason: suppression?.reason,
      };
    });
  }

  async getSuppressionList(
    page: number = 1,
    limit: number = 50,
    filters?: {
      reason?: SuppressionReason;
      scope?: SuppressionScope;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<{ suppressions: EmailSuppressionList[]; total: number }> {
    const queryBuilder = this.suppressionRepository.createQueryBuilder('suppression');

    if (filters?.reason) {
      queryBuilder.andWhere('suppression.reason = :reason', { reason: filters.reason });
    }

    if (filters?.scope) {
      queryBuilder.andWhere('suppression.scope = :scope', { scope: filters.scope });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('suppression.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.search) {
      queryBuilder.andWhere('suppression.email LIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    queryBuilder
      .orderBy('suppression.suppressedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [suppressions, total] = await queryBuilder.getManyAndCount();

    return { suppressions, total };
  }

  async handleBounce(
    email: string,
    bounceType: 'hard' | 'soft',
    bounceReason?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const reason =
      bounceType === 'hard' ? SuppressionReason.BOUNCED_HARD : SuppressionReason.BOUNCED_SOFT;

    // For hard bounces, add to global suppression
    // For soft bounces, add temporarily or track count
    const expiresAt =
      bounceType === 'soft'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        : undefined; // Permanent for hard bounces

    await this.addToSuppressionList(email, reason, SuppressionScope.GLOBAL, {
      details: bounceReason,
      source: 'bounce_handler',
      metadata: {
        bounceType,
        bounceReason,
        ...metadata,
      },
      expiresAt,
    });
  }

  async handleUnsubscribe(
    email: string,
    method: 'link' | 'reply' | 'complaint',
    source?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.addToSuppressionList(
      email,
      SuppressionReason.UNSUBSCRIBED,
      SuppressionScope.MARKETING, // Usually marketing emails
      {
        details: `Unsubscribed via ${method}`,
        source: source || 'unsubscribe_handler',
        metadata: {
          unsubscribeMethod: method,
          ...metadata,
        },
      },
    );
  }

  async handleSpamComplaint(
    email: string,
    feedbackType?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.addToSuppressionList(
      email,
      SuppressionReason.SPAM_COMPLAINT,
      SuppressionScope.GLOBAL,
      {
        details: `Spam complaint: ${feedbackType || 'Unknown'}`,
        source: 'spam_complaint_handler',
        metadata: {
          feedbackType,
          ...metadata,
        },
      },
    );
  }

  async cleanupExpiredSuppressions(): Promise<number> {
    const now = new Date();

    const result = await this.suppressionRepository
      .createQueryBuilder()
      .update(EmailSuppressionList)
      .set({ isActive: false, lastUpdatedAt: now })
      .where('isActive = true AND expiresAt IS NOT NULL AND expiresAt <= :now', { now })
      .execute();

    const cleanedCount = result.affected || 0;

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired email suppressions`);
    }

    return cleanedCount;
  }

  async getSuppressionStatistics(): Promise<{
    totalSuppressed: number;
    globalSuppressions: number;
    marketingSuppressions: number;
    bounceSuppressions: number;
    unsubscribeSuppressions: number;
    spamComplaintSuppressions: number;
    expiredSuppressions: number;
  }> {
    const stats = await this.suppressionRepository
      .createQueryBuilder('suppression')
      .select([
        'COUNT(*) as totalSuppressed',
        'COUNT(CASE WHEN suppression.scope = :global THEN 1 END) as globalSuppressions',
        'COUNT(CASE WHEN suppression.scope = :marketing THEN 1 END) as marketingSuppressions',
        'COUNT(CASE WHEN suppression.reason IN (:...bounceReasons) THEN 1 END) as bounceSuppressions',
        'COUNT(CASE WHEN suppression.reason = :unsubscribed THEN 1 END) as unsubscribeSuppressions',
        'COUNT(CASE WHEN suppression.reason = :spamComplaint THEN 1 END) as spamComplaintSuppressions',
        'COUNT(CASE WHEN suppression.expiresAt IS NOT NULL AND suppression.expiresAt <= NOW() THEN 1 END) as expiredSuppressions',
      ])
      .where('suppression.isActive = true')
      .setParameters({
        global: SuppressionScope.GLOBAL,
        marketing: SuppressionScope.MARKETING,
        bounceReasons: [SuppressionReason.BOUNCED_HARD, SuppressionReason.BOUNCED_SOFT],
        unsubscribed: SuppressionReason.UNSUBSCRIBED,
        spamComplaint: SuppressionReason.SPAM_COMPLAINT,
      })
      .getRawOne();

    return {
      totalSuppressed: parseInt(stats.totalSuppressed) || 0,
      globalSuppressions: parseInt(stats.globalSuppressions) || 0,
      marketingSuppressions: parseInt(stats.marketingSuppressions) || 0,
      bounceSuppressions: parseInt(stats.bounceSuppressions) || 0,
      unsubscribeSuppressions: parseInt(stats.unsubscribeSuppressions) || 0,
      spamComplaintSuppressions: parseInt(stats.spamComplaintSuppressions) || 0,
      expiredSuppressions: parseInt(stats.expiredSuppressions) || 0,
    };
  }

  async importSuppressionList(
    suppressions: Array<{
      email: string;
      reason: SuppressionReason;
      scope?: SuppressionScope;
      details?: string;
    }>,
    source: string = 'bulk_import',
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const suppression of suppressions) {
      try {
        const exists = await this.isEmailSuppressed(
          suppression.email,
          suppression.scope || SuppressionScope.GLOBAL,
        );

        if (exists) {
          skipped++;
          continue;
        }

        await this.addToSuppressionList(
          suppression.email,
          suppression.reason,
          suppression.scope || SuppressionScope.GLOBAL,
          {
            details: suppression.details,
            source,
          },
        );

        imported++;
      } catch (error) {
        errors.push(`Failed to import ${suppression.email}: ${error.message}`);
      }
    }

    this.logger.log(
      `Bulk import completed: ${imported} imported, ${skipped} skipped, ${errors.length} errors`,
    );

    return { imported, skipped, errors };
  }
}

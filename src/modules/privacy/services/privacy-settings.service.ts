import { PrivacySettings } from '../entities/privacy-settings.entity';
import { UpdatePrivacySettingsDto } from '../dto/update-privacy-settings.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WinstonService } from '@/logger/winston.service';
import { ComplianceAuditService } from './compliance-audit.service';
import { ComplianceStatus } from '../entities/compliance-audit-trail.entity';

@Injectable()
export class PrivacySettingsService {
  constructor(
    @InjectRepository(PrivacySettings)
    private privacySettingsRepository: Repository<PrivacySettings>,
    private winstonLogger: WinstonService,
    private complianceAudit: ComplianceAuditService,
  ) {
    this.winstonLogger.setContext(PrivacySettingsService.name);
  }

  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    let settings = await this.privacySettingsRepository.findOne({
      where: { userId },
    });

    if (!settings) {
      settings = await this.createDefaultSettings(userId);
    }

    return settings;
  }

  async updatePrivacySettings(
    userId: string,
    updateDto: UpdatePrivacySettingsDto,
    updatedBy?: string,
  ): Promise<PrivacySettings> {
    const existingSettings = await this.getPrivacySettings(userId);
    const previousSettings = { ...existingSettings };

    const updatedSettings = Object.assign(existingSettings, {
      ...updateDto,
      updatedBy: updatedBy || userId,
    });

    const savedSettings = await this.privacySettingsRepository.save(updatedSettings);

    const significantChanges = this.identifySignificantChanges(previousSettings, updateDto);
    if (significantChanges.length > 0) {
      await this.complianceAudit.logEvent({
        eventType: 'privacy_settings_change',
        subjectUserId: userId,
        performedBy: updatedBy || userId,
        description: `Privacy settings updated: ${significantChanges.join(', ')}`,
        eventData: {
          before: this.extractRelevantSettings(previousSettings),
          after: this.extractRelevantSettings(savedSettings),
          changes: significantChanges,
        },
        complianceStatus: ComplianceStatus.COMPLIANT,
        applicableRegulations: [
          {
            name: 'GDPR',
            article: 'Article 7',
            requirement: 'Consent management',
            status: ComplianceStatus.COMPLIANT,
          },
        ],
      });
    }

    this.winstonLogger.log(`Privacy settings updated for user: ${userId}, {
      userId: ${userId},
      changes: ${significantChanges},
    }`);

    return savedSettings;
  }

  private async createDefaultSettings(userId: string): Promise<PrivacySettings> {
    const defaultSettings = this.privacySettingsRepository.create({
      userId,
      cookiePreferences: {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false,
        preferences: false,
      },
      dataRetentionPreferences: {
        learningData: '2_years',
        communicationData: '1_year',
        analyticsData: '6_months',
        backupData: '1_year',
      },
      advancedSettings: {
        dataMinimization: true,
        automaticDeletion: false,
        encryptionLevel: 'standard',
        accessControls: {},
      },
    });

    return await this.privacySettingsRepository.save(defaultSettings);
  }

  private identifySignificantChanges(
    previous: PrivacySettings,
    updates: UpdatePrivacySettingsDto,
  ): string[] {
    const significantFields = [
      'trackLearningActivity',
      'trackPerformanceData',
      'shareActivityData',
      'allowAnalytics',
      'shareDataWithThirdParties',
      'allowMarketingEmails',
    ];

    const changes: string[] = [];

    for (const field of significantFields) {
      if (updates[field] !== undefined && updates[field] !== previous[field]) {
        changes.push(field);
      }
    }

    if (updates.cookiePreferences) {
      for (const [key, value] of Object.entries(updates.cookiePreferences)) {
        if (value !== previous.cookiePreferences?.[key]) {
          changes.push(`cookiePreferences.${key}`);
        }
      }
    }

    return changes;
  }

  private extractRelevantSettings(settings: PrivacySettings): any {
    return {
      trackLearningActivity: settings.trackLearningActivity,
      trackPerformanceData: settings.trackPerformanceData,
      shareActivityData: settings.shareActivityData,
      allowAnalytics: settings.allowAnalytics,
      shareDataWithThirdParties: settings.shareDataWithThirdParties,
      allowMarketingEmails: settings.allowMarketingEmails,
      cookiePreferences: settings.cookiePreferences,
    };
  }

  async getCookieConsent(userId: string): Promise<{
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  }> {
    const settings = await this.getPrivacySettings(userId);
    return (
      settings.cookiePreferences || {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false,
        preferences: false,
      }
    );
  }

  async updateCookieConsent(
    userId: string,
    cookiePreferences: {
      essential?: boolean;
      functional?: boolean;
      analytics?: boolean;
      marketing?: boolean;
      preferences?: boolean;
    },
  ): Promise<PrivacySettings> {
    return this.updatePrivacySettings(userId, { cookiePreferences });
  }
}

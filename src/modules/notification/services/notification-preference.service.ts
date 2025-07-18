import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationPreferenceDto } from '../dto/notification.dto';
import { NotificationType, NotificationFrequency } from '@/common/enums/notification.enums';

@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async findAllForUser(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.find({
      where: { userId },
      order: { notificationType: 'ASC' },
    });
  }

  async findOne(
    userId: string,
    notificationType: NotificationType,
  ): Promise<NotificationPreference> {
    const preference = await this.preferenceRepository.findOne({
      where: { userId, notificationType },
    });

    if (!preference) {
      throw new NotFoundException(`Preference not found for ${notificationType}`);
    }

    return preference;
  }

  async upsert(
    userId: string,
    preferenceDto: NotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const existingPreference = await this.preferenceRepository.findOne({
      where: { userId, notificationType: preferenceDto.notificationType },
    });

    if (existingPreference) {
      await this.preferenceRepository.update(existingPreference.id, {
        ...preferenceDto,
        updatedAt: new Date(),
      });
      return this.findOne(userId, preferenceDto.notificationType);
    } else {
      const newPreference = this.preferenceRepository.create({
        userId,
        ...preferenceDto,
      });
      return this.preferenceRepository.save(newPreference);
    }
  }

  async updateBulk(
    userId: string,
    preferences: NotificationPreferenceDto[],
  ): Promise<NotificationPreference[]> {
    const results: NotificationPreference[] = [];

    for (const preferenceDto of preferences) {
      const updated = await this.upsert(userId, preferenceDto);
      results.push(updated);
    }

    this.logger.log(`Updated ${preferences.length} preferences for user: ${userId}`);
    return results;
  }

  async createDefaults(userId: string): Promise<NotificationPreference[]> {
    const defaultPreferences = Object.values(NotificationType).map(type => ({
      userId,
      notificationType: type,
      emailEnabled: this.getDefaultEmailEnabled(type),
      pushEnabled: this.getDefaultPushEnabled(type),
      smsEnabled: this.getDefaultSmsEnabled(type),
      inAppEnabled: true, // Always enabled by default
      frequency: this.getDefaultFrequency(type),
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
        weekdays: [0, 1, 2, 3, 4, 5, 6], // All days
      },
      filters: {
        minimumPriority: 'normal',
      },
      digestSettings: {
        enabled: false,
        frequency: 'daily' as 'daily' | 'hourly' | 'weekly',
        time: '08:00',
        maxItems: 10,
        groupByCategory: true,
      },
    }));

    const savedPreferences = await this.preferenceRepository.save(
      defaultPreferences.map(pref => this.preferenceRepository.create(pref)),
    );

    this.logger.log(`Created default preferences for user: ${userId}`);
    return savedPreferences;
  }

  async delete(userId: string, notificationType: NotificationType): Promise<void> {
    const preference = await this.findOne(userId, notificationType);
    await this.preferenceRepository.remove(preference);
    this.logger.log(`Deleted preference ${notificationType} for user: ${userId}`);
  }

  async resetToDefaults(userId: string): Promise<NotificationPreference[]> {
    // Delete existing preferences
    await this.preferenceRepository.delete({ userId });

    // Create new defaults
    return this.createDefaults(userId);
  }

  private getDefaultEmailEnabled(type: NotificationType): boolean {
    const emailEnabledTypes = [
      NotificationType.COURSE_ENROLLMENT,
      NotificationType.ASSIGNMENT_DUE,
      NotificationType.GRADE_POSTED,
      NotificationType.CERTIFICATE_EARNED,
      NotificationType.SYSTEM_MAINTENANCE,
      NotificationType.SECURITY_ALERT,
    ];
    return emailEnabledTypes.includes(type);
  }

  private getDefaultPushEnabled(type: NotificationType): boolean {
    const pushDisabledTypes = [NotificationType.SYSTEM_MAINTENANCE];
    return !pushDisabledTypes.includes(type);
  }

  private getDefaultSmsEnabled(type: NotificationType): boolean {
    const smsEnabledTypes = [
      NotificationType.SECURITY_ALERT,
      NotificationType.VIDEO_SESSION_STARTING,
    ];
    return smsEnabledTypes.includes(type);
  }

  private getDefaultFrequency(type: NotificationType): NotificationFrequency {
    const immediateTypes = [
      NotificationType.MESSAGE_RECEIVED,
      NotificationType.VIDEO_SESSION_STARTING,
      NotificationType.SECURITY_ALERT,
    ];

    const dailyTypes = [NotificationType.ASSIGNMENT_DUE, NotificationType.REMINDER_STUDY];

    if (immediateTypes.includes(type)) {
      return NotificationFrequency.IMMEDIATE;
    } else if (dailyTypes.includes(type)) {
      return NotificationFrequency.DAILY;
    } else {
      return NotificationFrequency.IMMEDIATE;
    }
  }

  async checkUserPreference(
    userId: string,
    notificationType: NotificationType,
    channel: 'email' | 'push' | 'sms' | 'inApp',
  ): Promise<boolean> {
    try {
      const preference = await this.findOne(userId, notificationType);

      switch (channel) {
        case 'email':
          return preference.emailEnabled;
        case 'push':
          return preference.pushEnabled;
        case 'sms':
          return preference.smsEnabled;
        case 'inApp':
          return preference.inAppEnabled;
        default:
          return false;
      }
    } catch (error) {
      // If no preference found, return default
      return channel === 'inApp'; // Only in-app enabled by default
    }
  }
}

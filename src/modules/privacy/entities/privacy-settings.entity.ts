import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('privacy_settings')
@Index(['userId'])
export class PrivacySettings extends BaseEntity {
  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId: string;

  @Column({ type: 'boolean', default: true })
  profileVisible: boolean;

  @Column({ type: 'boolean', default: true })
  allowSearch: boolean;

  @Column({ type: 'boolean', default: false })
  showOnlineStatus: boolean;

  @Column({ type: 'boolean', default: true })
  showLastSeen: boolean;

  @Column({ type: 'boolean', default: true })
  trackLearningActivity: boolean;

  @Column({ type: 'boolean', default: true })
  trackPerformanceData: boolean;

  @Column({ type: 'boolean', default: false })
  shareActivityData: boolean;

  @Column({ type: 'boolean', default: false })
  allowAnalytics: boolean;

  @Column({ type: 'boolean', default: true })
  allowDirectMessages: boolean;

  @Column({ type: 'boolean', default: true })
  allowGroupInvitations: boolean;

  @Column({ type: 'boolean', default: false })
  allowMarketingEmails: boolean;

  @Column({ type: 'boolean', default: true })
  allowSystemNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  shareDataWithInstructors: boolean;

  @Column({ type: 'boolean', default: false })
  shareDataWithPeers: boolean;

  @Column({ type: 'boolean', default: false })
  shareDataWithThirdParties: boolean;

  @Column({ type: 'boolean', default: false })
  allowDataExport: boolean;

  @Column({ type: 'json', nullable: true })
  cookiePreferences?: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };

  @Column({ type: 'json', nullable: true })
  dataRetentionPreferences?: {
    learningData?: string;
    communicationData?: string;
    analyticsData?: string;
    backupData?: string;
  };

  @Column({ type: 'json', nullable: true })
  advancedSettings?: {
    dataMinimization?: boolean;
    automaticDeletion?: boolean;
    encryptionLevel?: string;
    accessControls?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => User, user => user.privacySettings)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

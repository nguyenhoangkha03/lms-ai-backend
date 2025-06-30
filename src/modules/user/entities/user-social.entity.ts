import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { SocialPlatform } from '@/common/enums/user.enums';
import { User } from './user.entity';

@Entity('user_socials')
@Unique(['userId', 'platform'])
@Index(['platform'])
@Index(['isPublic'])
export class UserSocial extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Reference to user ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: SocialPlatform,
    comment: 'Social media platform',
  })
  platform: SocialPlatform;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Profile URL',
  })
  url: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Username or handle on the platform',
  })
  handle?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Display name on the platform',
  })
  displayName?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether this social link is public',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this social account is verified',
  })
  isVerified: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Order for displaying social links',
  })
  displayOrder: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Custom label for the social link',
  })
  customLabel?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Description or note about this social link',
  })
  description?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional platform-specific metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.socials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get platformName(): string {
    const platformNames = {
      [SocialPlatform.FACEBOOK]: 'Facebook',
      [SocialPlatform.TWITTER]: 'Twitter',
      [SocialPlatform.LINKEDIN]: 'LinkedIn',
      [SocialPlatform.INSTAGRAM]: 'Instagram',
      [SocialPlatform.YOUTUBE]: 'YouTube',
      [SocialPlatform.GITHUB]: 'GitHub',
      [SocialPlatform.PERSONAL_WEBSITE]: 'Personal Website',
    };
    return platformNames[this.platform] || this.platform;
  }

  get displayLabel(): string {
    return this.customLabel || this.platformName;
  }
}

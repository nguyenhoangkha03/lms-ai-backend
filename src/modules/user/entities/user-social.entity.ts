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
    comment: 'Tham chiếu ID người dùng',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: SocialPlatform,
    comment: 'Tên nền tảng mạng xã hội ',
  })
  platform: SocialPlatform;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Đường dẫn URL đầy đủ cho nền tảng mạng xã hội',
  })
  url: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên định danh của người dùng trên nền tảng đó',
  })
  handle?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên hiển thị trên nền tảng mạng xã hội.',
  })
  displayName?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment:
      'Cờ (true/false) cho phép người dùng chọn ẩn/hiện liên kết này trên hồ sơ công khai của họ',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: ': Cờ (true/false) cho biết tài khoản mạng xã hội này đã được xác minh hay chưa',
  })
  isVerified: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số nguyên xác định thứ tự hiển thị của các liên kết mạng xã hội trên hồ sơ',
  })
  displayOrder: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Nhãn do người dùng tự đặt cho liên kết',
  })
  customLabel?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả ngắn về liên kết này',
  })
  description?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
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

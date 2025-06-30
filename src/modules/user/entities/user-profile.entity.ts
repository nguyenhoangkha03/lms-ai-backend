import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Gender } from '@/common/enums/user.enums';
import { User } from './user.entity';

@Entity('user_profiles')
@Index(['userId'], { unique: true })
@Index(['countryCode', 'cityCode'])
export class UserProfile extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Reference to user ID',
  })
  userId: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User biography',
  })
  bio?: string;

  @Column({
    type: 'date',
    nullable: true,
    comment: 'Date of birth',
  })
  dateOfBirth?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
    comment: 'Gender',
  })
  gender?: Gender;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Full address',
  })
  address?: string;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: true,
    comment: 'ISO country code',
  })
  countryCode?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Country name',
  })
  country?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'State or province',
  })
  state?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'City name',
  })
  city?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'City code or identifier',
  })
  cityCode?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Postal or ZIP code',
  })
  postalCode?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Timezone identifier',
  })
  timezone?: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Preferred language code',
  })
  languagePreference?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Organization or company',
  })
  organization?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Job title or position',
  })
  jobTitle?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Department or division',
  })
  department?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Personal website URL',
  })
  website?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional interests',
  })
  interests?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Skills and competencies',
  })
  skills?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Hobbies and personal interests',
  })
  hobbies?: string[];

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Profile visibility to other users',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Allow other users to search this profile',
  })
  isSearchable: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Profile verification status',
  })
  isVerified: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When profile was verified',
  })
  verifiedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Who verified the profile',
  })
  verifiedBy?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional profile metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @OneToOne(() => User, user => user.userProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get age(): number | null {
    if (!this.dateOfBirth) return null;

    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  get fullAddress(): string {
    const parts = [this.address, this.city, this.state, this.country].filter(Boolean);
    return parts.join(', ');
  }

  get displayLocation(): string {
    const parts = [this.city, this.state, this.country].filter(Boolean);
    return parts.join(', ');
  }
}

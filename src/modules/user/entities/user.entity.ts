import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '@/common/entities/base.entity';
import { UserType, UserStatus } from '@/common/enums/user.enums';
import { UserProfile } from './user-profile.entity';
import { StudentProfile } from './student-profile.entity';
import { TeacherProfile } from './teacher-profile.entity';
import { UserSocial } from './user-social.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('users')
@Index(['userType', 'status'])
@Index(['createdAt'])
@Index(['lastLoginAt'])
export class User extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'User email address',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: 'Unique username',
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Hashed password',
  })
  @Exclude()
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'First name',
  })
  firstName?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Last name',
  })
  lastName?: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
    comment: 'Display name or alias',
  })
  displayName?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Phone number',
  })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.STUDENT,
    comment: 'User type/role',
  })
  userType: UserType;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
    comment: 'Account status',
  })
  status: UserStatus;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Profile avatar URL',
  })
  avatarUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Profile cover image URL',
  })
  coverUrl?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Email verification status',
  })
  emailVerified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Email verification token',
  })
  @Exclude()
  emailVerificationToken?: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Email verification token expiry',
  })
  @Exclude()
  emailVerificationExpiry?: Date | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Two-factor authentication enabled',
  })
  twoFactorEnabled: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Two-factor authentication secret',
  })
  @Exclude()
  twoFactorSecret?: string | null;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Two-factor backup codes',
  })
  @Exclude()
  backupCodes?: string[] | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Password reset token',
  })
  @Exclude()
  passwordResetToken?: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Password reset token expiry',
  })
  @Exclude()
  passwordResetExpiry?: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When password was last changed',
  })
  passwordChangedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last login timestamp',
  })
  lastLoginAt?: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Last login IP address',
  })
  lastLoginIp?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Failed login attempts count',
  })
  failedLoginAttempts: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Account locked until timestamp',
  })
  lockedUntil?: Date | null;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Active refresh tokens',
  })
  @Exclude()
  refreshTokens?: string[];

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Preferred language code',
  })
  preferredLanguage?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Timezone identifier',
  })
  timezone?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'User preferences and settings',
  })
  preferences?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'User metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @OneToOne(() => UserProfile, profile => profile.user, { cascade: true })
  userProfile?: UserProfile;

  @OneToOne(() => StudentProfile, profile => profile.user, { cascade: true })
  studentProfile?: StudentProfile;

  @OneToOne(() => TeacherProfile, profile => profile.user, { cascade: true })
  teacherProfile?: TeacherProfile;

  @OneToMany(() => UserSocial, social => social.user, { cascade: true })
  socials?: UserSocial[];

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles?: Role[];

  @ManyToMany(() => Permission, permission => permission.users)
  @JoinTable({
    name: 'user_permissions',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions?: Permission[];

  // Virtual properties
  get fullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.displayName || this.username;
  }

  get isLocked(): boolean | undefined | null {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get canLogin(): boolean {
    return this.isActive && !this.isLocked;
  }

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  updateTimestamp() {
    this.updatedAt = new Date();
  }

  @BeforeInsert()
  setDefaults() {
    if (!this.displayName && this.firstName && this.lastName) {
      this.displayName = `${this.firstName} ${this.lastName}`;
    }

    if (!this.preferredLanguage) {
      this.preferredLanguage = 'en';
    }

    if (!this.timezone) {
      this.timezone = 'UTC';
    }
  }
}

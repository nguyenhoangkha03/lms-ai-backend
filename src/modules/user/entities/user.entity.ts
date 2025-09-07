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
  PrimaryGeneratedColumn,
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
import { NotificationPreference } from '@/modules/notification/entities/notification-preference.entity';
import { TutoringSession } from '@/modules/intelligent-tutoring/entities/tutoring-session.entity';
import { LearningStyleProfile } from '@/modules/intelligent-tutoring/entities/learning-style-profile.entity';
import { DataProtectionRequest } from '@/modules/privacy/entities/data-protection-request.entity';
import { ConsentRecord } from '@/modules/privacy/entities/consent-record.entity';
import { PrivacySettings } from '@/modules/privacy/entities/privacy-settings.entity';
import { Course } from '@/modules/course/entities/course.entity';
import { Cart } from '@/modules/course/entities/cart.entity';
import { Enrollment } from '@/modules/course/entities/enrollment.entity';

@Entity('users')
@Index(['userType', 'status'])
@Index(['createdAt'])
@Index(['lastLoginAt'])
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    comment: 'Địa chỉ email duy nhất',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: 'Tên người dùng duy nhất',
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Chuỗi mật khẩu đã được băm an toàn',
  })
  @Exclude()
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên của người dùng',
  })
  firstName?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Họ của người dùng',
  })
  lastName?: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
    comment: 'Tên sẽ xuất hiện công khai trên các diễn đàn',
  })
  displayName?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Số điện thoại của người dùng, có thể dùng để xác thực hai lớp (2FA) hoặc liên lạc.',
  })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.STUDENT,
    comment: 'Vai trò chính của người dùng trong hệ thống (student, teacher, admin)',
  })
  userType: UserType;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
    comment: 'Quản lý trạng thái của tài khoản',
  })
  status: UserStatus;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến ảnh đại diện của người dùng',
  })
  avatarUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến ảnh bìa trên trang cá nhân của người dùng.',
  })
  coverUrl?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Một cờ (true/false) để biết email của người dùng đã được xác thực hay chưa. ',
  })
  emailVerified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Chuỗi mã token duy nhất được gửi đến email để người dùng nhấp vào xác thực',
  })
  @Exclude() // Do not return this field
  emailVerificationToken?: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm mà mã xác thực email sẽ không còn hiệu lực.',
  })
  @Exclude()
  emailVerificationExpiry?: Date | null;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết người dùng có bật bảo mật hai lớp hay không',
  })
  twoFactorEnabled: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mã bí mật dùng để liên kết với ứng dụng xác thực như Google Authenticator.',
  })
  @Exclude()
  twoFactorSecret?: string | null;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Một danh sách các mã dự phòng (lưu dưới dạng JSON) để người dùng có thể đăng nhập nếu mất thiết bị xác thực',
  })
  @Exclude()
  backupCodes?: string[] | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Chuỗi mã token duy nhất được tạo khi người dùng yêu cầu "Quên mật khẩu"',
  })
  @Exclude()
  passwordResetToken?: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm mà mã đặt lại mật khẩu sẽ không còn hiệu lực',
  })
  @Exclude()
  passwordResetExpiry?: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ghi lại lần cuối cùng người dùng thay đổi mật khẩu',
  })
  passwordChangedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ghi lại thời gian của lần đăng nhập thành công gần nhất',
  })
  lastLoginAt?: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Ghi lại địa chỉ IP của lần đăng nhập gần nhất để phát hiện hoạt động bất thường',
  })
  lastLoginIp?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Đếm số lần nhập sai mật khẩu liên tiếp',
  })
  failedLoginAttempts: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Nếu đăng nhập sai quá nhiều lần, tài khoản sẽ bị khóa đến thời điểm này',
  })
  lockedUntil?: Date | null;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Lưu trữ các refresh token đang hoạt động (dưới dạng JSON) để duy trì phiên đăng nhập lâu dài',
  })
  @Exclude()
  refreshTokens?: string[];

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Lưu ngôn ngữ người dùng chọn (ví dụ: vi, en) để hiển thị giao diện phù hợp',
  })
  preferredLanguage?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Múi giờ của người dùng để hiển thị thời gian chính xác ',
  })
  timezone?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Tùy chọn cá nhân',
  })
  preferences?: Record<string, any>;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin mở rộng khác mà không cần thay đổi cấu trúc bảng',
  })
  metadata?: string;

  // Relationships
  @OneToOne(() => UserProfile, profile => profile.user, { cascade: true, onDelete: 'CASCADE' })
  userProfile?: UserProfile | null;

  @OneToOne(() => StudentProfile, profile => profile.user, { cascade: true, onDelete: 'CASCADE' })
  studentProfile?: StudentProfile | null;

  @OneToOne(() => TeacherProfile, profile => profile.user, { cascade: true, onDelete: 'CASCADE' })
  teacherProfile?: TeacherProfile | null;

  @OneToMany(() => Course, course => course.teacher)
  courses?: Course[];

  @OneToMany(() => Cart, cart => cart.user)
  cartItems?: Cart[];

  @OneToMany(() => Enrollment, enrollment => enrollment.student)
  enrollments?: Enrollment[];

  @OneToMany(() => UserSocial, social => social.user, { cascade: true, onDelete: 'CASCADE' })
  socials?: UserSocial[] | null;

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

  @OneToMany(() => NotificationPreference, pref => pref.user)
  notificationPreferences?: NotificationPreference[];

  @OneToMany(() => TutoringSession, session => session.student, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  tutoringSessions: TutoringSession[];

  @OneToOne(() => LearningStyleProfile, profile => profile.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  learningStyleProfile: LearningStyleProfile;

  @OneToMany(() => DataProtectionRequest, request => request.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  dataProtectionRequests: DataProtectionRequest[];

  @OneToMany(() => ConsentRecord, consent => consent.user, { cascade: true, onDelete: 'CASCADE' })
  consentRecords: ConsentRecord[];

  @OneToOne(() => PrivacySettings, settings => settings.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  privacySettings: PrivacySettings;

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

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
    comment: 'Tham chiếu ID người dùng',
  })
  userId: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Tiểu sử',
  })
  bio?: string;

  @Column({
    type: 'date',
    nullable: true,
    comment: 'Ngày sinh',
  })
  dateOfBirth?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
    comment: 'Giới tính',
  })
  gender?: Gender;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Địa chỉ đầy đủ',
  })
  address?: string;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: true,
    comment: 'Mã quốc gia chuẩn ISO 3166-1 alpha-3. Ví dụ: VNM, USA, ...',
  })
  countryCode?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên quốc gia',
  })
  country?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tỉnh, bang hoặc khu vực hành chính cấp 1. Ví dụ: Hanoi, New York, ...',
  })
  state?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên thành phố. Ví dụ: "Ho Chi Minh City", "New York", ...',
  })
  city?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment:
      'Mã định danh của thành phố, có thể là mã nội bộ, mã hệ thống, hoặc mã hành chính. Ví dụ: "SGN" cho TP.HCM',
  })
  cityCode?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment:
      'Mã bưu chính (ZIP code), dùng trong vận chuyển thư, hàng hóa. Ví dụ: "700000" cho TP.HCM, "10001" cho New York',
  })
  postalCode?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Tên công ty, trường học hoặc tổ chức mà người dùng thuộc về',
  })
  organization?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Chức danh công việc của người dùng',
  })
  jobTitle?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Phòng ban nơi người dùng làm việc',
  })
  department?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến trang web cá nhân hoặc blog của người dùng',
  })
  website?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Lĩnh vực người dùng quan tâm',
  })
  interests?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Danh sách kỹ năng, năng lực',
  })
  skills?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Danh sách sở thích với người dùng',
  })
  hobbies?: string[];

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Công khai hồ sơ',
  })
  isPublic: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cho phép tìm kiếm',
  })
  isSearchable: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) cho biết hồ sơ này đã được xác minh (ví dụ: tài khoản của người nổi tiếng).',
  })
  isVerified: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm xác minh',
  })
  verifiedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Người xác minh',
  })
  verifiedBy?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
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

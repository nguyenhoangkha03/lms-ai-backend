import { Entity, Column, OneToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from './user.entity';

@Entity('teacher_profiles')
@Index(['userId'], { unique: true })
@Index(['isApproved', 'isActive'])
@Index(['specializations'])
@Index(['rating'])
export class TeacherProfile extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Tham chiếu ID người dùng',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    comment: 'Mã giảng viên',
  })
  teacherCode: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Các lĩnh vực chuyên môn sâu của giảng viên',
  })
  specializations?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Thông tin về bằng cấp học vấn (đại học, thạc sĩ, tiến sĩ)',
  })
  qualifications?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số năm kinh nghiệm giảng dạy',
  })
  yearsExperience: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Phong cách giảng dạy',
  })
  teachingStyle?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Lịch làm việc hoặc thời gian sẵn sàng hỗ trợ sinh viên',
  })
  officeHours?: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    comment: 'Điểm đánh giá trung bình từ sinh viên',
  })
  rating: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số lần giảng viên được sinh viên đánh giá.',
  })
  totalRatings: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số sinh viên mà giảng viên đã dạy',
  })
  totalStudents: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số khóa học do giảng viên tạo ra',
  })
  totalCourses: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số bài học do giảng viên tạo ra.',
  })
  totalLessons: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số giờ đã giảng dạy trên hệ thống',
  })
  totalTeachingHours: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Tổng thu nhập kiếm được từ các khóa học.',
  })
  totalEarnings: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) xác định hồ sơ giảng viên đã được Admin phê duyệt hay chưa',
  })
  isApproved: boolean;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Trạng thái hoạt động của giảng viên trên nền tảng.',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết đây có phải là giảng viên nổi bật hay không',
  })
  isFeatured: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) đánh dấu giảng viên đã được xác minh danh tính (ví dụ: qua CMND/CCCD',
  })
  isVerified: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của admin đã duyệt hồ sơ',
  })
  approvedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian hồ sơ được duyệt.',
  })
  approvedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú của admin khi duyệt hồ sơ',
  })
  approvalNotes?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Số giấy phép hoặc chứng chỉ giảng dạy',
  })
  licenseNumber?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Các trường học, tổ chức mà giảng viên đang liên kết.',
  })
  affiliations?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON liệt kê các môn học, chủ đề giảng dạys',
  })
  subjects?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON liệt kê các ngôn ngữ mà giảng viên có thể dạy',
  })
  teachingLanguages?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON lưu lịch rảnh của giảng viên cho các buổi dạy kèm hoặc họp',
  })
  availability?: Record<string, any>;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
    comment: 'Mức phí cho mỗi giờ dạy kèm (nếu có)',
  })
  hourlyRate?: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
    comment: 'Loại tiền tệ cho mức phí',
  })
  currency: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON liệt kê các giải thưởng, công nhận đã đạt được',
  })
  awards?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON liệt kê các bài báo, công trình nghiên cứu đã xuất bản',
  })
  publications?: string[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Tóm tắt chuyên môn',
  })
  professionalSummary?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL hồ sơ (CV)',
  })
  resumeUrl?: string;
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Đường dẫn đến trang portfolio hoặc các sản phẩm giảng dạy mẫu',
  })
  portfolioUrl?: string;
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Nhận sinh viên mới',
  })
  acceptingStudents: boolean;
  @Column({
    type: 'int',
    nullable: true,
    comment: 'Số sinh viên tối đa trong một lớp',
  })
  maxStudentsPerClass?: number;
  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cài đặt cho phép sinh viên đánh giá giảng viên hay không',
  })
  allowReviews: boolean;
  @Column({
    type: 'boolean',
    default: true,
    comment: 'Cài đặt nhận thông báo qua email của giảng viên.',
  })
  emailNotifications: boolean;
  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Ngày nộp hồ sơ',
  })
  applicationDate: Date;
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Lần dạy cuối',
  })
  lastTeachingAt?: Date;
  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu meta',
  })
  metadata?: Record<string, any>;
  // Relationships
  @OneToOne(() => User, user => user.teacherProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get averageRating(): number {
    return this.rating;
  }
  get isActiveTeacher(): boolean {
    if (!this.lastTeachingAt) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.lastTeachingAt > thirtyDaysAgo && this.isActive && this.isApproved;
  }
  get experienceLevel(): string {
    if (this.yearsExperience >= 10) return 'Expert';
    if (this.yearsExperience >= 5) return 'Experienced';
    if (this.yearsExperience >= 2) return 'Intermediate';
    return 'Beginner';
  }
  get canTeach(): boolean {
    return this.isApproved && this.isActive && this.acceptingStudents;
  }
}

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { AuditAction, AuditLevel, AuditStatus } from '@/common/enums/system.enums';
import { User } from '../../user/entities/user.entity';

@Entity('audit_logs')
@Index(['userId'])
@Index(['action'])
@Index(['entityType'])
@Index(['entityId'])
@Index(['level'])
@Index(['status'])
@Index(['timestamp'])
@Index(['ipAddress'])
@Index(['sessionId'])
export class AuditLog extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người dùng đã thực hiện hành động',
  })
  userId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mã định danh của phiên đăng nhập khi hành động được thực hiện',
  })
  sessionId?: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
    comment: ': Loại hành động đã được thực hiện, ví dụ: login, user_updated, create_assessment',
  })
  action: AuditAction;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Loại đối tượng bị tác động, ví dụ: course, user',
  })
  entityType?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của đối tượng cụ thể bị tác động, ví dụ: course_id, user_id',
  })
  entityId?: string;

  @Column({
    type: 'text',
    comment: 'Mô tả chi tiết về hành động đã diễn ra',
  })
  description: string;

  @Column({
    type: 'enum',
    enum: AuditLevel,
    default: AuditLevel.INFO,
    comment: 'Mức độ nghiêm trọng của log (info, warning, error).',
  })
  level: AuditLevel;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.SUCCESS,
    comment: 'Trạng thái của hành động (success, failed).',
  })
  status: AuditStatus;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm chính xác khi hành động xảy ra',
  })
  timestamp: Date;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Địa chỉ IP của người dùng khi thực hiện hành động',
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Thông tin về trình duyệt và hệ điều hành của người dùng',
  })
  userAgent?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'URL của yêu cầu đã gây ra hành động',
  })
  requestUrl?: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Phương thức HTTP của yêu cầu đã gây ra hành động',
  })
  httpMethod?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Mã trạng thái HTTP trả về (ví dụ: 200, 404, 500)',
  })
  responseCode?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Thời gian (tính bằng mili giây) mà hệ thống cần để xử lý yêu cầu',
  })
  processingTime?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Nội dung dữ liệu được gửi đi (đã được làm sạch để bỏ thông tin nhạy cảm).',
  })
  requestData?: {
    params?: Record<string, any>;
    query?: Record<string, any>;
    body?: Record<string, any>;
    headers?: Record<string, string>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Nội dung dữ liệu nhận về (đã được làm sạch để bỏ thông tin nhạy cảm)',
  })
  responseData?: {
    data?: any;
    errors?: any[];
    statusCode?: number;
    message?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Trường JSON ghi lại dữ liệu "trước" và "sau" khi có hành động update, giúp thấy rõ những gì đã bị thay đổi',
  })
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thông tin ngữ cảnh bổ sung về hành động',
  })
  context?: {
    module?: string;
    feature?: string;
    environment?: string;
    version?: string;
    correlationId?: string;
    parentAction?: string;
    businessContext?: Record<string, any>;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thông tin liên quan đến bảo mật',
  })
  securityInfo?: {
    authMethod?: string;
    permissions?: string[];
    riskScore?: number;
    deviceFingerprint?: string;
    geoLocation?: { country: string; region: string; city: string };
    threatIndicators?: string[];
  };

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Chi tiết lỗi nếu hành động không thành công',
  })
  errorDetails?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Mã lỗi hoặc loại ngoại lệ',
  })
  errorCode?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả ngữ cảnh và vị trí xảy ra lỗi trong mã nguồn',
  })
  stackTrace?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Các thực thể liên quan bị ảnh hưởng bởi hành động này',
  })
  relatedEntities?: {
    entityType: string;
    entityId: string;
    relationship: string;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thẻ để phân loại và lọc hành động',
  })
  tags?: string[];

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) đánh dấu đây là một hành động quan trọng cần chú ý đặc biệt (ví dụ: thay đổi quyền admin).',
  })
  isSensitive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Liệu hành động này có cần phải xem xét thủ công không',
  })
  requiresReview: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của quản trị viên đã xem xét hành động này',
  })
  reviewedBy?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm hành động này được xem xét',
  })
  reviewedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Ghi chú khi xem xét hành động',
  })
  reviewNotes?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => User, user => user.id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer?: User;

  // Virtual properties
  get isError(): boolean {
    return this.status === AuditStatus.ERROR || this.status === AuditStatus.FAILED;
  }

  get isHighRisk(): boolean {
    return (
      this.level === AuditLevel.CRITICAL ||
      (this.securityInfo?.riskScore !== undefined && this.securityInfo.riskScore > 80) ||
      this.isSensitive
    );
  }

  get durationFormatted(): string {
    if (!this.processingTime) return 'N/A';
    if (this.processingTime < 1000) return `${this.processingTime}ms`;
    return `${(this.processingTime / 1000).toFixed(2)}s`;
  }

  get hasChanges(): boolean {
    return !!(this.changes && this.changes.length > 0);
  }

  get changeCount(): number {
    return this.changes?.length || 0;
  }
}

import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, Index } from 'typeorm';

@Entity('api_keys')
@Index(['key'])
@Index(['userId'])
@Index(['status', 'expiresAt'])
export class ApiKeyEntity extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Chuỗi khóa bí mật duy nhất được cung cấp cho bên thứ ba',
  })
  key: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Tên gợi nhớ cho khóa API',
  })
  name: string;

  @Column({ nullable: true, comment: 'Mô tả' })
  description: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của người dùng sở hữu khóa API này',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'revoked'],
    default: 'active',
    comment: 'Trạng thái của khóa (active, inactive, suspended, revoked - đã bị thu hồi).',
  })
  status: string;

  @Column('json', {
    comment: 'Trường JSON định nghĩa các quyền hạn mà khóa API này được phép thực hiện',
  })
  permissions: string[];

  @Column('json', {
    nullable: true,
    comment:
      'Trường JSON định nghĩa các giới hạn (ví dụ: chỉ cho phép truy cập từ một số địa chỉ IP nhất định).',
  })
  restrictions: Record<string, any>;

  @Column({
    type: 'int',
    default: 1000,
    comment: 'Số lượng yêu cầu tối đa mà khóa này có thể thực hiện trong một khoảng thời gian.',
  })
  rateLimit: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng yêu cầu hành động trong một khoảng thời gian.',
  })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true, comment: 'Thời gian lần cuối dùng khóa' })
  lastUsedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: 'Thời gian hệ thống bị thu hồi khóa' })
  expiresAt: Date;

  @Column({ nullable: true, comment: 'IP lần cuối dùng khóa' })
  lastUsedIp: string;

  @Column({ nullable: true, comment: 'User-Agent lần cuối dùng khóa' })
  lastUsedUserAgent: string;

  @Column('json', { nullable: true, comment: 'Thống tin khóa' })
  metadata: Record<string, any>;

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission) || this.permissions.includes('*');
  }

  isActive(): boolean {
    if (this.status !== 'active') return false;
    if (this.expiresAt && this.expiresAt < new Date()) return false;
    return true;
  }

  isIpAllowed(ip: string): boolean {
    if (!this.restrictions?.ipWhitelist) return true;
    return this.restrictions.ipWhitelist.includes(ip);
  }

  getRemainingQuota(): number {
    return Math.max(0, this.rateLimit - this.usageCount);
  }

  incrementUsage(ip?: string, userAgent?: string): void {
    this.usageCount++;
    this.lastUsedAt = new Date();
    if (ip) this.lastUsedIp = ip;
    if (userAgent) this.lastUsedUserAgent = userAgent;
  }
}

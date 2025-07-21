import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('api_keys')
@Index(['key'])
@Index(['userId'])
@Index(['status', 'expiresAt'])
export class ApiKeyEntity extends BaseEntity {
  @Column()
  key: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended', 'revoked'],
    default: 'active',
  })
  status: string;

  @Column('json')
  permissions: string[];

  @Column('json', { nullable: true })
  restrictions: Record<string, any>;

  @Column({ type: 'int', default: 1000 })
  rateLimit: number;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  lastUsedIp: string;

  @Column({ nullable: true })
  lastUsedUserAgent: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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

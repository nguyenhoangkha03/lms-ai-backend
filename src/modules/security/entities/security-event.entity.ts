import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('security_events')
@Index(['type', 'timestamp'])
@Index(['severity', 'timestamp'])
@Index(['ip', 'timestamp'])
@Index(['userId', 'timestamp'])
export class SecurityEvent extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ['authentication', 'authorization', 'validation', 'encryption', 'suspicious'],
  })
  type: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
  })
  severity: string;

  @Column()
  source: string;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column()
  ip: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column('json')
  details: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}

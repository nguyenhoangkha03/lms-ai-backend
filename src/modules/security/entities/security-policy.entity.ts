import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('security_policies')
@Index(['name'])
export class SecurityPolicy extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ['rate_limiting', 'ip_filtering', 'validation', 'encryption', 'audit'],
  })
  category: string;

  @Column('text')
  description: string;

  @Column('json')
  configuration: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'testing'],
    default: 'active',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  priority: string;

  @Column({ nullable: true })
  targetEndpoints: string;

  @Column({ nullable: true })
  targetRoles: string;

  @Column({ type: 'timestamp', nullable: true })
  effectiveFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo: Date;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get parsedTargetEndpoints(): string[] {
    return this.targetEndpoints ? JSON.parse(this.targetEndpoints) : [];
  }

  set parsedTargetEndpoints(endpoints: string[]) {
    this.targetEndpoints = JSON.stringify(endpoints);
  }

  get parsedTargetRoles(): string[] {
    return this.targetRoles ? JSON.parse(this.targetRoles) : [];
  }

  set parsedTargetRoles(roles: string[]) {
    this.targetRoles = JSON.stringify(roles);
  }
}

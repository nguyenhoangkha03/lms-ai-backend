import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ProjectRole } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { GroupProject } from './group-project.entity';

@Entity('project_members')
@Index(['projectId'])
@Index(['userId'])
@Index(['role'])
@Index(['status'])
export class ProjectMember extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Project ID',
  })
  projectId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ProjectRole,
    default: ProjectRole.MEMBER,
    comment: 'Member role in project',
  })
  role: ProjectRole;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'removed'],
    default: 'active',
    comment: 'Member status',
  })
  status: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Join timestamp',
  })
  joinedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last activity timestamp',
  })
  lastActiveAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Contribution score',
  })
  contributionScore: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tasks completed',
  })
  tasksCompleted: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Member responsibilities (JSON)',
  })
  responsibilities?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => GroupProject, project => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: GroupProject;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

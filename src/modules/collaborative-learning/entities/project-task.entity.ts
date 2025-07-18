import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { TaskStatus, TaskPriority } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { GroupProject } from './group-project.entity';

@Entity('project_tasks')
@Index(['projectId'])
@Index(['assigneeId'])
@Index(['status'])
@Index(['priority'])
@Index(['dueDate'])
@Index(['createdAt'])
export class ProjectTask extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Project ID',
  })
  projectId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Task title',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Task description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
    comment: 'Task status',
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
    comment: 'Task priority',
  })
  priority: TaskPriority;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Task assignee ID',
  })
  assigneeId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Task creator ID',
  })
  creatorId: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Task due date',
  })
  dueDate?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Task completion date',
  })
  completedAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Estimated hours',
  })
  estimatedHours: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Actual hours spent',
  })
  actualHours: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Task dependencies (JSON)',
  })
  dependencies?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Task attachments (JSON)',
  })
  attachments?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Task comments (JSON)',
  })
  comments?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => GroupProject, project => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: GroupProject;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
}

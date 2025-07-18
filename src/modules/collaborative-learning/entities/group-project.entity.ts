import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ProjectStatus } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { StudyGroup } from './study-group.entity';
import { Course } from '../../course/entities/course.entity';
import { ProjectMember } from './project-member.entity';
import { ProjectTask } from './project-task.entity';

@Entity('group_projects')
@Index(['status'])
@Index(['leaderId'])
@Index(['studyGroupId'])
@Index(['courseId'])
@Index(['dueDate'])
@Index(['createdAt'])
export class GroupProject extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Project name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Project description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
    comment: 'Project status',
  })
  status: ProjectStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Project leader ID',
  })
  leaderId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Associated study group ID',
  })
  studyGroupId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Associated course ID',
  })
  courseId?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Project start date',
  })
  startDate?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Project due date',
  })
  dueDate?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Project completion date',
  })
  completedAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Project progress percentage',
  })
  progressPercentage: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Project objectives (JSON)',
  })
  objectives?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Project deliverables (JSON)',
  })
  deliverables?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Project resources (JSON)',
  })
  resources?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Project milestones (JSON)',
  })
  milestones?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Project attachments (JSON)',
  })
  attachments?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Project settings (JSON)',
  })
  settings?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaderId' })
  leader: User;

  @ManyToOne(() => StudyGroup, group => group.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studyGroupId' })
  studyGroup?: StudyGroup;

  @ManyToOne(() => Course, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @OneToMany(() => ProjectMember, member => member.project)
  members: ProjectMember[];

  @OneToMany(() => ProjectTask, task => task.project)
  tasks: ProjectTask[];
}

import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { StudyGroupType, StudyGroupStatus } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { StudyGroupMember } from './study-group-member.entity';
import { SharedWhiteboard } from './shared-whiteboard.entity';
import { CollaborativeNote } from './collaborative-note.entity';
import { GroupProject } from './group-project.entity';

@Entity('study_groups')
@Index(['type'])
@Index(['status'])
@Index(['courseId'])
@Index(['creatorId'])
@Index(['createdAt'])
export class StudyGroup extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Study group name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Study group description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: StudyGroupType,
    default: StudyGroupType.GENERAL,
    comment: 'Type of study group',
  })
  type: StudyGroupType;

  @Column({
    type: 'enum',
    enum: StudyGroupStatus,
    default: StudyGroupStatus.OPEN,
    comment: 'Study group status',
  })
  status: StudyGroupStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Study group creator ID',
  })
  creatorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Associated course ID',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Study group avatar URL',
  })
  avatarUrl?: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Study group invite code',
  })
  inviteCode?: string;

  @Column({
    type: 'int',
    default: 20,
    comment: 'Maximum number of members',
  })
  maxMembers: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Current member count',
  })
  memberCount: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is group private',
  })
  isPrivate: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Requires approval to join',
  })
  requiresApproval: boolean;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Study group tags (JSON)',
  })
  tags?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Study schedule (JSON)',
  })
  schedule?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Group goals and objectives (JSON)',
  })
  goals?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Group rules and guidelines (JSON)',
  })
  rules?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Group settings (JSON)',
  })
  settings?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Group statistics (JSON)',
  })
  statistics?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last activity timestamp',
  })
  lastActivityAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Group archive date',
  })
  archivedAt?: Date;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @ManyToOne(() => Course, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @OneToMany(() => StudyGroupMember, member => member.studyGroup)
  members: StudyGroupMember[];

  @OneToMany(() => SharedWhiteboard, whiteboard => whiteboard.studyGroup)
  whiteboards: SharedWhiteboard[];

  @OneToMany(() => CollaborativeNote, note => note.studyGroup)
  notes: CollaborativeNote[];

  @OneToMany(() => GroupProject, project => project.studyGroup)
  projects: GroupProject[];
}

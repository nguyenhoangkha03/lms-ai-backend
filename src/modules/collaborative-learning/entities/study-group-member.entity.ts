import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { StudyGroupRole } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { StudyGroup } from './study-group.entity';

@Entity('study_group_members')
@Index(['studyGroupId'])
@Index(['userId'])
@Index(['role'])
@Index(['status'])
@Index(['joinedAt'])
export class StudyGroupMember extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Study group ID',
  })
  studyGroupId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: StudyGroupRole,
    default: StudyGroupRole.MEMBER,
    comment: 'Member role in study group',
  })
  role: StudyGroupRole;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'banned', 'pending'],
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
    comment: 'Leave timestamp',
  })
  leftAt?: Date;

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
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Member nickname in group',
  })
  nickname?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Member bio in group',
  })
  bio?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Member preferences (JSON)',
  })
  preferences?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Member statistics (JSON)',
  })
  statistics?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => StudyGroup, group => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studyGroupId' })
  studyGroup: StudyGroup;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

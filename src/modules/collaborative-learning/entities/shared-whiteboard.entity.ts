import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { WhiteboardPermission } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { StudyGroup } from './study-group.entity';
import { WhiteboardElement } from './whiteboard-element.entity';

@Entity('shared_whiteboards')
@Index(['studyGroupId'])
@Index(['creatorId'])
@Index(['status'])
@Index(['createdAt'])
export class SharedWhiteboard extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Whiteboard name',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Whiteboard description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Whiteboard creator ID',
  })
  creatorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Associated study group ID',
  })
  studyGroupId?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    comment: 'Whiteboard status',
  })
  status: string;

  @Column({
    type: 'int',
    default: 1920,
    comment: 'Canvas width',
  })
  canvasWidth: number;

  @Column({
    type: 'int',
    default: 1080,
    comment: 'Canvas height',
  })
  canvasHeight: number;

  @Column({
    type: 'varchar',
    length: 10,
    default: '#FFFFFF',
    comment: 'Background color',
  })
  backgroundColor: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is whiteboard locked',
  })
  isLocked: boolean;

  @Column({
    type: 'enum',
    enum: WhiteboardPermission,
    default: WhiteboardPermission.DRAW,
    comment: 'Default permission for members',
  })
  defaultPermission: WhiteboardPermission;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Whiteboard data (JSON)',
  })
  canvasData?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Thumbnail URL',
  })
  thumbnailUrl?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Version number',
  })
  version: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last edit timestamp',
  })
  lastEditedAt?: Date;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Last editor ID',
  })
  lastEditedBy?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Whiteboard settings (JSON)',
  })
  settings?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Access permissions (JSON)',
  })
  permissions?: string;

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

  @ManyToOne(() => StudyGroup, group => group.whiteboards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studyGroupId' })
  studyGroup?: StudyGroup;

  @OneToMany(() => WhiteboardElement, element => element.whiteboard)
  elements: WhiteboardElement[];
}

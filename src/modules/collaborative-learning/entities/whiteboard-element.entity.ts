import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { WhiteboardToolType } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { SharedWhiteboard } from './shared-whiteboard.entity';

@Entity('whiteboard_elements')
@Index(['whiteboardId'])
@Index(['creatorId'])
@Index(['type'])
@Index(['createdAt'])
export class WhiteboardElement extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Whiteboard ID',
  })
  whiteboardId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Element creator ID',
  })
  creatorId: string;

  @Column({
    type: 'enum',
    enum: WhiteboardToolType,
    comment: 'Element type',
  })
  type: WhiteboardToolType;

  @Column({
    type: 'longtext',
    comment: 'Element data (JSON)',
  })
  elementData: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'X coordinate',
  })
  x: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    comment: 'Y coordinate',
  })
  y: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Element width',
  })
  width?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Element height',
  })
  height?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Element rotation',
  })
  rotation: number;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Z-index for layering',
  })
  zIndex: number;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Element color',
  })
  color?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Stroke width',
  })
  strokeWidth?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
    comment: 'Element opacity',
  })
  opacity: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is element locked',
  })
  isLocked: boolean;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => SharedWhiteboard, whiteboard => whiteboard.elements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'whiteboardId' })
  whiteboard: SharedWhiteboard;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
}

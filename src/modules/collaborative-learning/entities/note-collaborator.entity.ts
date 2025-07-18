import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { CollaborativeNote } from './collaborative-note.entity';

@Entity('note_collaborators')
@Index(['noteId'])
@Index(['userId'])
@Index(['permission'])
@Index(['createdAt'])
export class NoteCollaborator extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Note ID',
  })
  noteId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Collaborator user ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['view', 'comment', 'edit', 'admin'],
    default: 'view',
    comment: 'Collaborator permission',
  })
  permission: string;

  @Column({
    type: 'enum',
    enum: ['invited', 'active', 'inactive'],
    default: 'invited',
    comment: 'Collaborator status',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Invitation sent timestamp',
  })
  invitedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Invitation accepted timestamp',
  })
  acceptedAt?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Last access timestamp',
  })
  lastAccessAt?: Date;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => CollaborativeNote, note => note.collaborators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: CollaborativeNote;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

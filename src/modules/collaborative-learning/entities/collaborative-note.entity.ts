import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { NoteType, NoteStatus } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { StudyGroup } from './study-group.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { NoteCollaborator } from './note-collaborator.entity';

@Entity('collaborative_notes')
@Index(['type'])
@Index(['status'])
@Index(['authorId'])
@Index(['studyGroupId'])
@Index(['courseId'])
@Index(['lessonId'])
@Index(['createdAt'])
export class CollaborativeNote extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Note title',
  })
  title: string;

  @Column({
    type: 'longtext',
    comment: 'Note content',
  })
  content: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Note content in HTML format',
  })
  contentHtml?: string;

  @Column({
    type: 'enum',
    enum: NoteType,
    default: NoteType.PERSONAL,
    comment: 'Note type',
  })
  type: NoteType;

  @Column({
    type: 'enum',
    enum: NoteStatus,
    default: NoteStatus.DRAFT,
    comment: 'Note status',
  })
  status: NoteStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Note author ID',
  })
  authorId: string;

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
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Associated lesson ID',
  })
  lessonId?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Note tags (JSON)',
  })
  tags?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is note pinned',
  })
  isPinned: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is note template',
  })
  isTemplate: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Template source ID',
  })
  templateId?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Note version',
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
    comment: 'Note permissions (JSON)',
  })
  permissions?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Note settings (JSON)',
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
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => StudyGroup, group => group.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studyGroupId' })
  studyGroup?: StudyGroup;

  @ManyToOne(() => Course, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @OneToMany(() => NoteCollaborator, collaborator => collaborator.note)
  collaborators: NoteCollaborator[];
}

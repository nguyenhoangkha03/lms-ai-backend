import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Lesson } from './lesson.entity';
import { User } from '@/modules/user/entities/user.entity';

@Entity('content_versions')
export class ContentVersion extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Reference to lesson',
  })
  lessonId: string;

  @Column({
    type: 'int',
    comment: 'Version number (incremental)',
  })
  versionNumber: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Lesson content for this version',
  })
  content?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Lesson description for this version',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Note about this version change',
  })
  versionNote?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether this is the current active version',
  })
  isActive: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Content metadata and settings for this version',
  })
  contentMetadata?: {
    wordCount?: number;
    readingTime?: number;
    videoDuration?: number;
    attachmentCount?: number;
    lastModified?: Date;
    checksum?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Change summary between versions',
  })
  changesSummary?: {
    contentChanged?: boolean;
    titleChanged?: boolean;
    descriptionChanged?: boolean;
    attachmentsChanged?: boolean;
    settingsChanged?: boolean;
    additions?: string[];
    deletions?: string[];
    modifications?: string[];
  };

  @Column({
    type: 'enum',
    enum: ['major', 'minor', 'patch', 'draft'],
    default: 'minor',
    comment: 'Type of version change',
  })
  versionType: 'major' | 'minor' | 'patch' | 'draft';

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional version metadata',
  })
  metadata?: Record<string, any>;

  // === RELATIONSHIPS === //

  @ManyToOne(() => Lesson, lesson => lesson.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'updatedBy' })
  updater?: User;
}

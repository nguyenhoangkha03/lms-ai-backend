import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';

@Entity('assignments')
@Index(['courseId'])
@Index(['instructorId'])
@Index(['dueDate'])
@Index(['status'])
export class Assignment extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Assignment title',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Assignment description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Instructor user ID',
  })
  instructorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Associated course ID',
  })
  courseId: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    comment: 'Assignment status',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Assignment due date',
  })
  dueDate?: Date;

  @Column({
    type: 'int',
    default: 100,
    comment: 'Maximum points',
  })
  maxPoints: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Assignment instructions',
  })
  instructions?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Submission requirements (JSON)',
  })
  requirements?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Grading rubric (JSON)',
  })
  rubric?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Assignment attachments (JSON)',
  })
  attachments?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;
}

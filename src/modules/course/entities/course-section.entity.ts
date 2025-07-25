import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@Entity('course_sections')
@Index(['courseId'])
@Index(['orderIndex'])
@Index(['isActive'])
export class CourseSection extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Course ID this section belongs to',
  })
  courseId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Section title',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Section description',
  })
  description?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Order within course',
  })
  orderIndex: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Section active status',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Section completion required to proceed',
  })
  isRequired: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of lessons in this section',
  })
  totalLessons: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total duration of all lessons in seconds',
  })
  totalDuration: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Section availability start date',
  })
  availableFrom?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Section availability end date',
  })
  availableUntil?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Section learning objectives',
  })
  objectives?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Section settings and preferences',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional section metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => Course, course => course.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @OneToMany(() => Lesson, lesson => lesson.section, { cascade: true })
  lessons?: Lesson[];

  // Virtual properties
  get formattedDuration(): string {
    if (this.totalDuration === 0) return '0m';

    const hours = Math.floor(this.totalDuration / 3600);
    const minutes = Math.floor((this.totalDuration % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  get isAvailable(): boolean {
    const now = new Date();

    if (this.availableFrom && now < this.availableFrom) {
      return false;
    }

    if (this.availableUntil && now > this.availableUntil) {
      return false;
    }

    return this.isActive;
  }

  get completionPercentage(): number {
    // This will be calculated based on lesson progress
    return 0;
  }
}

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
    comment: 'Khóa ngoại liên kết tới courses.id',
  })
  courseId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên của chương (ví dụ: "Chương 1: Giới thiệu về Machine Learning")',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả ngắn gọn về nội dung của chương',
  })
  description?: string;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Thứ tự hiển thị',
  })
  orderIndex: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Trạng thái hoạt động của phần',
  })
  isActive: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      ': Cờ (true/false) xác định học viên có bắt buộc phải hoàn thành chương này trước khi qua chương tiếp theo hay không',
  })
  isRequired: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số bài học có trong chương này',
  })
  totalLessons: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng thời lượng (tính bằng giây) của tất cả các bài học trong chương.',
  })
  totalDuration: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ngày bắt đầu có sẵn phần',
  })
  availableFrom?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Ngày kết thúc sẵn có của phần',
  })
  availableUntil?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Trường JSON liệt kê các mục tiêu học tập cần đạt được sau khi hoàn thành chương',
  })
  objectives?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Cài đặt và tùy chọn phần',
  })
  settings?: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Siêu dữ liệu của phần bổ sung',
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

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
    comment: 'Tên của bài tập (ví dụ: "Bài tập lớn cuối kỳ: Xây dựng ứng dụng web").',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả ngắn gọn về mục tiêu và nội dung của bài tập',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định giảng viên ra đề',
  })
  instructorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới courses.id, xác định bài tập này thuộc khóa học nào',
  })
  courseId: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    comment:
      'Trạng thái của bài tập (draft - bản nháp, published - đã giao, archived - đã lưu trữ).',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm cuối cùng sinh viên phải nộp bài',
  })
  dueDate?: Date;

  @Column({
    type: 'int',
    default: 100,
    comment: 'Tổng số điểm tối đa cho bài tập này',
  })
  maxPoints: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Hướng dẫn chi tiết cách làm bài cho sinh viên',
  })
  instructions?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment:
      'Trường JSON định nghĩa các yêu cầu khi nộp bài (ví dụ: định dạng file, số lượng file).',
  })
  requirements?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON chứa các tiêu chí (rubric) để chấm điểm một cách nhất quán',
  })
  rubric?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment:
      'Trường JSON chứa danh sách các tệp đính kèm từ giảng viên (ví dụ: file đề bài, file mẫu).',
  })
  attachments?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON để lưu các thông tin mở rộng khác',
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

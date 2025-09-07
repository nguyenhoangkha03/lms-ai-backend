import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Grade } from './grade.entity';
import { BaseEntity } from '@/common/entities/base.entity';

export enum GradebookStatus {
  ACTIVE = 'active',
  FINALIZED = 'finalized',
  ARCHIVED = 'archived',
}

@Entity('gradebooks')
@Index(['courseId', 'teacherId'])
@Index(['status', 'createdAt'])
export class Gradebook extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID của khóa học liên kết với sổ điểm',
  })
  courseId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID giáo viên phụ trách sổ điểm',
  })
  teacherId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tên của sổ điểm (ví dụ: "Sổ điểm Toán 12A")',
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả chi tiết hoặc ghi chú về sổ điểm',
  })
  description: string;

  @Column({
    type: 'enum',
    enum: GradebookStatus,
    default: GradebookStatus.ACTIVE,
    comment: 'Trạng thái của sổ điểm: đang hoạt động, đã khóa, đã lưu trữ',
  })
  status: GradebookStatus;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Thang điểm dùng để quy đổi điểm (dạng JSON)',
  })
  gradingScale: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Cách tính trọng số giữa các bài kiểm tra (dạng JSON)',
  })
  weightingScheme: string;

  @Column({
    type: 'float',
    precision: 5,
    scale: 2,
    default: 60.0,
    comment: 'Ngưỡng điểm tối thiểu để được xem là đạt',
  })
  passingThreshold: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Có cho phép nộp bài trễ hay không',
  })
  allowLateSubmissions: boolean;

  @Column({
    type: 'float',
    precision: 5,
    scale: 2,
    default: 10.0,
    comment: 'Phần trăm bị trừ khi nộp bài trễ',
  })
  latePenaltyPercentage: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số học viên trong sổ điểm',
  })
  totalStudents: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Tổng số bài đánh giá được ghi nhận trong sổ điểm',
  })
  totalAssessments: number;

  @Column({
    type: 'float',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Điểm trung bình của toàn lớp trong sổ điểm',
  })
  classAverage: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm hệ thống tính lại điểm trung bình gần nhất',
  })
  lastCalculatedAt: Date;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Cấu hình hiển thị sổ điểm (ẩn/hiện các cột...)',
  })
  displaySettings: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Cấu hình xuất file (PDF, CSV, lọc học viên, v.v.)',
  })
  exportSettings: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Thông tin bổ sung tùy chỉnh (metadata, JSON)',
  })
  metadata: string;

  @ManyToOne(() => Course, { lazy: true })
  @JoinColumn({ name: 'courseId' })
  course: Promise<Course>;

  @ManyToOne(() => User, { lazy: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: Promise<User>;

  @OneToMany(() => Grade, grade => grade.assessment, { lazy: true })
  grades: Promise<Grade[]>;
}

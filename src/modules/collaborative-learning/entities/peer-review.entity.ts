import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { PeerReviewType, PeerReviewStatus } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Assignment } from '@/modules/assessment/entities/assignment.entity';
import { PeerReviewSubmission } from './peer-review-submission.entity';
import { Assessment } from '@/modules/assessment/entities/assessment.entity';

@Entity('peer_reviews')
@Index(['type'])
@Index(['status'])
@Index(['creatorId'])
@Index(['courseId'])
@Index(['assignmentId'])
@Index(['dueDate'])
@Index(['createdAt'])
export class PeerReview extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Tiêu đề đánh giá ngang hàng',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mô tả đánh giá ngang hàng',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: PeerReviewType,
    comment:
      'Loại bài tập được đánh giá (assignment - bài tập, project - dự án, presentation - bài thuyết trình).',
  })
  type: PeerReviewType;

  @Column({
    type: 'enum',
    enum: PeerReviewStatus,
    default: PeerReviewStatus.PENDING,
    comment:
      'Trạng thái của cả quá trình đánh giá (pending - đang chờ, in_progress - đang diễn ra).',
  })
  status: PeerReviewStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'ID người tạo đánh giá ngang hàng',
  })
  creatorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID khóa học được liên kết',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID bài tập liên quan',
  })
  assignmentId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID bài tập liên quan',
  })
  assessmentId?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Xem lại ngày đến hạn',
  })
  dueDate?: Date;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Số lượng người đánh giá cho mỗi bài nộp',
  })
  reviewersPerSubmission: number;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Số lượng bài nộp của mỗi người đánh giá',
  })
  submissionsPerReviewer: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Là đánh giá ẩn danh',
  })
  isAnonymous: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cho phép tự xem xét',
  })
  allowSelfReview: boolean;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Tiêu chí đánh giá (JSON)',
  })
  criteria?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Tiêu chí đánh giá (JSON)',
  })
  rubric?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Hướng dẫn chi tiết cho sinh viên về cách thực hiện đánh giá',
  })
  instructions?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON để lưu trữ các cấu hình và tùy chọn khác của nhiệm vụ.',
  })
  settings?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu metadata',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @ManyToOne(() => Course, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Assignment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignmentId' })
  assignment?: Assignment;

  @ManyToOne(() => Assessment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assessmentId' })
  assessment?: Assessment;

  @OneToMany(() => PeerReviewSubmission, submission => submission.peerReview)
  submissions: PeerReviewSubmission[];
}

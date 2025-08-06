import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { PeerReview } from './peer-review.entity';
import { PeerReviewFeedback } from './peer-review-feedback.entity';

@Entity('peer_review_submissions')
@Index(['peerReviewId'])
@Index(['submitterId'])
@Index(['status'])
@Index(['submittedAt'])
export class PeerReviewSubmission extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới peer_reviews.id, cho biết bài nộp này thuộc nhiệm vụ nào',
  })
  peerReviewId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định sinh viên đã nộp bài',
  })
  submitterId: string;

  @Column({
    type: 'longtext',
    comment: 'Nội dung chính của bài làm (dạng văn bản).',
  })
  content: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON chứa danh sách các tệp mà sinh viên nộp kèm',
  })
  attachments?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'submitted', 'under_review', 'reviewed', 'completed'],
    default: 'draft',
    comment:
      'Trạng thái của bài nộp (draft - bản nháp, submitted - đã nộp, under_review - đang được đánh giá).',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian sinh viên nộp bài',
  })
  submittedAt?: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm số trung bình được tính từ tất cả các lượt đánh giá của các sinh viên khác',
  })
  averageScore?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Đếm xem đã có bao nhiêu sinh viên khác đánh giá bài nộp này',
  })
  reviewsReceived: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Đếm xem người nộp bài này đã hoàn thành việc đánh giá bài cho bao nhiêu bạn khác',
  })
  reviewsCompleted: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu metadata',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => PeerReview, review => review.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'peerReviewId' })
  peerReview: PeerReview;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitterId' })
  submitter: User;

  @OneToMany(() => PeerReviewFeedback, feedback => feedback.submission)
  feedbacks: PeerReviewFeedback[];
}

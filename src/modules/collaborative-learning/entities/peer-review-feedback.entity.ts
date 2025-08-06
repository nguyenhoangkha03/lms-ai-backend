import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { PeerReviewSubmission } from './peer-review-submission.entity';

@Entity('peer_review_feedbacks')
@Index(['submissionId'])
@Index(['reviewerId'])
@Index(['status'])
@Index(['submittedAt'])
export class PeerReviewFeedback extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment:
      'Khóa ngoại liên kết tới peer_review_submissions.id, xác định bài nộp nào đang được nhận xét',
  })
  submissionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment:
      'Khóa ngoại liên kết tới users.id, xác định sinh viên nào đang thực hiện việc đánh giá',
  })
  reviewerId?: string | null;

  @Column({
    type: 'longtext',
    comment: 'Nội dung nhận xét, góp ý chi tiết của người đánh giá',
  })
  feedback: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Điểm số tổng thể mà người đánh giá cho bài làm',
  })
  score?: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Trường JSON chứa điểm số chi tiết cho từng tiêu chí trong rubric',
  })
  criteriaScores?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'submitted', 'completed'],
    default: 'draft',
    comment: 'Trạng thái của chính lượt phản hồi này (draft - bản nháp, submitted - đã gửi)',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian người đánh giá hoàn thành và gửi đi nhận xét của mình',
  })
  submittedAt?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment:
      'Cờ (true/false) do người được đánh giá bình chọn, cho biết phản hồi này có hữu ích hay không',
  })
  isHelpful: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Đếm số lượt bình chọn "hữu ích" cho phản hồi này',
  })
  helpfulnessVotes: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Dữ liệu metadata',
  })
  metadata?: string;

  // Relations
  @ManyToOne(() => PeerReviewSubmission, submission => submission.feedbacks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submissionId' })
  submission: PeerReviewSubmission;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer?: User;
}

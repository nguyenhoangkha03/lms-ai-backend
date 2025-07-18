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
    comment: 'Peer review ID',
  })
  peerReviewId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Submitter user ID',
  })
  submitterId: string;

  @Column({
    type: 'longtext',
    comment: 'Submission content',
  })
  content: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Submission attachments (JSON)',
  })
  attachments?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'submitted', 'under_review', 'reviewed', 'completed'],
    default: 'draft',
    comment: 'Submission status',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Submission timestamp',
  })
  submittedAt?: Date;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Average peer score',
  })
  averageScore?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of reviews received',
  })
  reviewsReceived: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of reviews completed by submitter',
  })
  reviewsCompleted: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Submission metadata (JSON)',
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

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
    comment: 'Submission ID being reviewed',
  })
  submissionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Reviewer user ID',
  })
  reviewerId?: string | null;

  @Column({
    type: 'longtext',
    comment: 'Review feedback content',
  })
  feedback: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Overall score given',
  })
  score?: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Detailed scores by criteria (JSON)',
  })
  criteriaScores?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'submitted', 'completed'],
    default: 'draft',
    comment: 'Feedback status',
  })
  status: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Feedback submission timestamp',
  })
  submittedAt?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is feedback helpful',
  })
  isHelpful: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Helpfulness votes',
  })
  helpfulnessVotes: number;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
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

import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { PeerReviewType, PeerReviewStatus } from '@/common/enums/collaborative.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Assignment } from '@/modules/assessment/entities/assignment.entity';
import { PeerReviewSubmission } from './peer-review-submission.entity';

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
    comment: 'Peer review title',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Peer review description',
  })
  description?: string;

  @Column({
    type: 'enum',
    enum: PeerReviewType,
    comment: 'Peer review type',
  })
  type: PeerReviewType;

  @Column({
    type: 'enum',
    enum: PeerReviewStatus,
    default: PeerReviewStatus.PENDING,
    comment: 'Peer review status',
  })
  status: PeerReviewStatus;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Peer review creator ID',
  })
  creatorId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Associated course ID',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Associated assignment ID',
  })
  assignmentId?: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Review due date',
  })
  dueDate?: Date;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Number of reviewers per submission',
  })
  reviewersPerSubmission: number;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Number of submissions per reviewer',
  })
  submissionsPerReviewer: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Is anonymous review',
  })
  isAnonymous: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Allow self review',
  })
  allowSelfReview: boolean;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Review criteria (JSON)',
  })
  criteria?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Review rubric (JSON)',
  })
  rubric?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Review instructions',
  })
  instructions?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Peer review settings (JSON)',
  })
  settings?: string;

  @Column({
    type: 'longtext',
    nullable: true,
    comment: 'Additional metadata (JSON)',
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

  @OneToMany(() => PeerReviewSubmission, submission => submission.peerReview)
  submissions: PeerReviewSubmission[];
}

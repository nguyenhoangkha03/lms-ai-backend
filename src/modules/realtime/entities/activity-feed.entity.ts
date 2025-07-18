import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum ActivityType {
  // Learning Activities
  COURSE_ENROLLED = 'course_enrolled',
  LESSON_COMPLETED = 'lesson_completed',
  ASSIGNMENT_SUBMITTED = 'assignment_submitted',
  QUIZ_COMPLETED = 'quiz_completed',
  CERTIFICATE_EARNED = 'certificate_earned',

  // Social Activities
  COMMENT_POSTED = 'comment_posted',
  DISCUSSION_STARTED = 'discussion_started',
  ANSWER_PROVIDED = 'answer_provided',
  QUESTION_ASKED = 'question_asked',

  // Collaboration Activities
  GROUP_JOINED = 'group_joined',
  PROJECT_SHARED = 'project_shared',
  NOTE_SHARED = 'note_shared',
  PEER_REVIEW_COMPLETED = 'peer_review_completed',

  // Achievement Activities
  BADGE_EARNED = 'badge_earned',
  MILESTONE_REACHED = 'milestone_reached',
  STREAK_ACHIEVED = 'streak_achieved',
  GOAL_COMPLETED = 'goal_completed',

  // System Activities
  PROFILE_UPDATED = 'profile_updated',
  SETTINGS_CHANGED = 'settings_changed',
}

export enum ActivityVisibility {
  PUBLIC = 'public', // Visible to all users
  FRIENDS = 'friends', // Visible to connected friends
  COURSE_MEMBERS = 'course_members', // Visible to course participants
  GROUP_MEMBERS = 'group_members', // Visible to group members
  PRIVATE = 'private', // Only visible to the user
}

@Entity('activity_feeds')
@Index(['userId'])
@Index(['activityType'])
@Index(['visibility'])
@Index(['createdAt'])
@Index(['isVisible'])
@Index(['courseId'])
@Index(['groupId'])
export class ActivityFeed extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User who performed the activity',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    comment: 'Type of activity performed',
  })
  activityType: ActivityType;

  @Column({
    type: 'enum',
    enum: ActivityVisibility,
    default: ActivityVisibility.PUBLIC,
    comment: 'Who can see this activity',
  })
  visibility: ActivityVisibility;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Activity title/summary',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Detailed activity description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related course ID',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related lesson ID',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related assignment ID',
  })
  assignmentId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related group ID',
  })
  groupId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Related entity ID (generic)',
  })
  relatedId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Related entity type',
  })
  relatedType?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Activity data and context',
  })
  activityData?: {
    score?: number;
    percentage?: number;
    timeTaken?: number;
    attempts?: number;
    difficulty?: string;
    points?: number;
    streakCount?: number;
    metadata?: Record<string, any>;
  };

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Action URL for the activity',
  })
  actionUrl?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Thumbnail/icon URL',
  })
  imageUrl?: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether activity is visible',
  })
  isVisible: boolean;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of likes on this activity',
  })
  likesCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of comments on this activity',
  })
  commentsCount: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Number of shares of this activity',
  })
  sharesCount: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Users who liked this activity',
  })
  likedBy?: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Activity tags for filtering',
  })
  tags?: string[];

  @Column({
    type: 'int',
    default: 1,
    comment: 'Activity importance score',
  })
  importance: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When activity occurred (if different from createdAt)',
  })
  occurredAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional metadata',
  })
  metadata?: {
    location?: string;
    device?: string;
    platform?: string;
    customFields?: Record<string, any>;
  };

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}

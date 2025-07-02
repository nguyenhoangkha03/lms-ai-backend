import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ParticipantRole, ParticipantConnectionStatus } from '@/common/enums/communication.enums';
import { VideoSession } from './video-session.entity';
import { User } from '../../user/entities/user.entity';

@Entity('video_participants')
@Unique(['sessionId', 'userId'])
@Index(['sessionId'])
@Index(['userId'])
@Index(['role'])
@Index(['connectionStatus'])
@Index(['joinedAt'])
@Index(['leftAt'])
export class VideoParticipant extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Video session ID',
  })
  sessionId: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'User ID',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.ATTENDEE,
    comment: 'Role of participant in session',
  })
  role: ParticipantRole;

  @Column({
    type: 'enum',
    enum: ParticipantConnectionStatus,
    default: ParticipantConnectionStatus.CONNECTED,
    comment: 'Current connection status',
  })
  connectionStatus: ParticipantConnectionStatus;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'When participant joined',
  })
  joinedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When participant left',
  })
  leftAt?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Total duration in session (seconds)',
  })
  duration?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether participant audio is muted',
  })
  isMuted: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether participant video is disabled',
  })
  videoDisabled: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether participant is sharing screen',
  })
  isScreenSharing: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether participant hand is raised',
  })
  handRaised: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'When hand was raised',
  })
  handRaisedAt?: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether participant is in waiting room',
  })
  inWaitingRoom: boolean;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Current breakout room ID',
  })
  breakoutRoomId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Display name in session',
  })
  displayName?: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Avatar URL for session',
  })
  avatarUrl?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Device and browser information',
  })
  deviceInfo?: {
    browser?: string;
    browserVersion?: string;
    operatingSystem?: string;
    deviceType?: 'desktop' | 'tablet' | 'mobile';
    screenResolution?: string;
    cameraDevices?: string[];
    microphoneDevices?: string[];
    speakerDevices?: string[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Connection quality metrics',
  })
  connectionQuality?: {
    audioQuality?: number;
    videoQuality?: number;
    networkLatency?: number;
    jitter?: number;
    packetLoss?: number;
    bandwidth?: number;
    connectionType?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Participant permissions',
  })
  permissions?: {
    canUnmuteSelf?: boolean;
    canStartVideo?: boolean;
    canShareScreen?: boolean;
    canUseChatPrivately?: boolean;
    canUseChatPublic?: boolean;
    canUseWhiteboard?: boolean;
    canRecord?: boolean;
    canCreatePolls?: boolean;
    canViewParticipantList?: boolean;
    canInviteOthers?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Engagement metrics',
  })
  engagementMetrics?: {
    chatMessagesSent?: number;
    pollsAnswered?: number;
    handRaisedCount?: number;
    screenShareDuration?: number;
    speakingTime?: number;
    attentionScore?: number;
    participationRate?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Session activities log',
  })
  activitiesLog?: {
    timestamp: Date;
    action: string;
    details?: any;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Technical issues encountered',
  })
  technicalIssues?: {
    timestamp: Date;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    resolved?: boolean;
    resolution?: string;
  }[];

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Participant feedback about session',
  })
  feedback?: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    comment: 'Session rating (1.0 - 5.0)',
  })
  rating?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Exit survey responses',
  })
  exitSurvey?: {
    overallSatisfaction?: number;
    audioQuality?: number;
    videoQuality?: number;
    contentQuality?: number;
    technicalIssues?: boolean;
    wouldRecommend?: boolean;
    comments?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional participant metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => VideoSession, session => session.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: VideoSession;

  @ManyToOne(() => User, user => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Virtual properties
  get isActive(): boolean {
    return this.connectionStatus === ParticipantConnectionStatus.CONNECTED && !this.leftAt;
  }

  get sessionDuration(): string {
    if (!this.duration) return '0m';
    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  get isPresenter(): boolean {
    return [ParticipantRole.HOST, ParticipantRole.CO_HOST, ParticipantRole.PRESENTER].includes(
      this.role,
    );
  }

  get canModerate(): boolean {
    return [ParticipantRole.HOST, ParticipantRole.CO_HOST, ParticipantRole.MODERATOR].includes(
      this.role,
    );
  }
}

import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import {
  VideoSessionType,
  VideoSessionStatus,
  VideoProvider,
} from '@/common/enums/communication.enums';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { VideoParticipant } from './video-participant.entity';

@Entity('video_sessions')
@Index(['hostId'])
@Index(['courseId'])
@Index(['lessonId'])
@Index(['sessionType'])
@Index(['status'])
@Index(['scheduledStart'])
@Index(['scheduledEnd'])
@Index(['actualStart'])
@Index(['actualEnd'])
export class VideoSession extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Session title',
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Session description',
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Session host user ID',
  })
  hostId: string;

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
    type: 'enum',
    enum: VideoSessionType,
    default: VideoSessionType.MEETING,
    comment: 'Type of video session',
  })
  sessionType: VideoSessionType;

  @Column({
    type: 'enum',
    enum: VideoSessionStatus,
    default: VideoSessionStatus.SCHEDULED,
    comment: 'Current session status',
  })
  status: VideoSessionStatus;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Scheduled start time',
  })
  scheduledStart: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Scheduled end time',
  })
  scheduledEnd: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Actual start time',
  })
  actualStart?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Actual end time',
  })
  actualEnd?: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Maximum number of participants',
  })
  maxParticipants?: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Current number of participants',
  })
  currentParticipants: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Total participants who joined',
  })
  totalParticipants: number;

  @Column({
    type: 'enum',
    enum: VideoProvider,
    default: VideoProvider.WEBRTC,
    comment: 'Video provider/platform',
  })
  provider: VideoProvider;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Meeting URL for participants',
  })
  meetingUrl?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'External meeting ID (Zoom, Teams, etc.)',
  })
  meetingId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Meeting passcode/password',
  })
  passcode?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Dial-in information',
  })
  dialInInfo?: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether session is being recorded',
  })
  isRecording: boolean;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Recording URL',
  })
  recordingUrl?: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Recording duration in seconds',
  })
  recordingDuration?: number;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Recording file size in bytes',
  })
  recordingSize?: number;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether session requires registration',
  })
  requiresRegistration: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Whether waiting room is enabled',
  })
  waitingRoomEnabled: boolean;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Session settings and features',
  })
  settings?: {
    muteParticipantsOnEntry?: boolean;
    allowParticipantScreenShare?: boolean;
    allowParticipantChat?: boolean;
    allowParticipantRecording?: boolean;
    autoStartRecording?: boolean;
    enableBreakoutRooms?: boolean;
    enablePolls?: boolean;
    enableWhiteboard?: boolean;
    enableAnnotations?: boolean;
    participantVideoOnEntry?: boolean;
    hostVideoOnEntry?: boolean;
    audioOnEntry?: boolean;
    lockMeeting?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Security and access control settings',
  })
  securitySettings?: {
    passwordProtected?: boolean;
    webinarMode?: boolean;
    privateChat?: boolean;
    fileTransfer?: boolean;
    attendeeAuthentication?: boolean;
    encryptionRequired?: boolean;
    watermarkEnabled?: boolean;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Breakout rooms configuration',
  })
  breakoutRooms?: {
    enabled: boolean;
    autoAssign?: boolean;
    allowParticipantsToChoose?: boolean;
    rooms: {
      id: string;
      name: string;
      participantIds: string[];
      capacity?: number;
    }[];
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Polling data',
  })
  polls?: {
    id: string;
    question: string;
    options: string[];
    responses: { participantId: string; answer: string }[];
    isActive: boolean;
    createdAt: Date;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Session analytics and metrics',
  })
  analytics?: {
    totalDuration?: number;
    averageParticipationTime?: number;
    peakParticipants?: number;
    participantEngagement?: number;
    chatMessageCount?: number;
    pollResponseRate?: number;
    screenShareDuration?: number;
    recordingViews?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Technical quality metrics',
  })
  qualityMetrics?: {
    averageAudioQuality?: number;
    averageVideoQuality?: number;
    connectionIssues?: number;
    dropoutRate?: number;
    latencyAverage?: number;
    bandwidthUsage?: number;
  };

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Session agenda',
  })
  agenda?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Session notes',
  })
  notes?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Session summary',
  })
  summary?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Follow-up actions',
  })
  followUpActions?: {
    action: string;
    assignedTo?: string;
    dueDate?: Date;
    completed?: boolean;
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Additional session metadata',
  })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'hostId' })
  host: User;

  @ManyToOne(() => Course, course => course.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: Course;

  @ManyToOne(() => Lesson, lesson => lesson.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @OneToMany(() => VideoParticipant, participant => participant.session)
  participants?: VideoParticipant[];

  // Virtual properties
  get isLive(): boolean {
    return this.status === VideoSessionStatus.LIVE;
  }

  get isCompleted(): boolean {
    return this.status === VideoSessionStatus.COMPLETED;
  }

  get duration(): number {
    if (this.actualStart && this.actualEnd) {
      return Math.floor((this.actualEnd.getTime() - this.actualStart.getTime()) / 1000);
    }
    return 0;
  }

  get scheduledDuration(): number {
    return Math.floor((this.scheduledEnd.getTime() - this.scheduledStart.getTime()) / 1000);
  }

  get isScheduledNow(): boolean {
    const now = new Date();
    return now >= this.scheduledStart && now <= this.scheduledEnd;
  }

  get canJoin(): boolean {
    return (
      [VideoSessionStatus.SCHEDULED, VideoSessionStatus.LIVE].includes(this.status) &&
      (!this.maxParticipants || this.currentParticipants < this.maxParticipants)
    );
  }
}

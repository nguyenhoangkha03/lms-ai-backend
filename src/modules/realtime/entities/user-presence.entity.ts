import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

export enum PresenceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
  DO_NOT_DISTURB = 'do_not_disturb',
  INVISIBLE = 'invisible',
}

export enum ActivityStatus {
  STUDYING = 'studying',
  IN_LESSON = 'in_lesson',
  TAKING_QUIZ = 'taking_quiz',
  IN_CHAT = 'in_chat',
  IN_VIDEO_CALL = 'in_video_call',
  IDLE = 'idle',
  BROWSING = 'browsing',
}

@Entity('user_presence')
@Index(['userId'], { unique: true })
@Index(['status'])
@Index(['lastSeenAt'])
@Index(['isOnline'])
@Index(['currentCourseId'])
@Index(['currentLessonId'])
export class UserPresence extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Tham chiếu ID người dùng',
  })
  userId: string;

  @Column({
    type: 'enum',
    enum: PresenceStatus,
    default: PresenceStatus.OFFLINE,
    comment: 'Trạng thái chung của người dùng (online, offline, away - tạm vắng).',
  })
  status: PresenceStatus;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.IDLE,
    comment: 'Hoạt động cụ thể mà người dùng đang làm (studying, in_lesson, taking_quiz)',
  })
  activityStatus: ActivityStatus;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Cờ (true/false) cho biết người dùng có đang kết nối với hệ thống hay không',
  })
  isOnline: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm cuối cùng hệ thống ghi nhận người dùng trực tuyến.',
  })
  lastSeenAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời điểm người dùng trên lớp hệ thống.',
  })
  onlineAt?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Một thông điệp ngắn do người dùng tự đặt',
  })
  statusMessage?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của khóa học mà người dùng đang xem',
  })
  currentCourseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID của bài học mà người dùng đang xem',
  })
  currentLessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Người dùng phòng chat hiện tại đang ở',
  })
  currentChatRoomId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'Phiên video hiện tại người dùng đang ở',
  })
  currentVideoSessionId?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thông tin thiết bị',
  })
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
    userAgent?: string;
    screenResolution?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Thống tin vị trí người dùng',
  })
  locationInfo?: {
    country?: string;
    city?: string;
    timezone?: string;
    ip?: string;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Chi tiết hoạt động hiện tại',
  })
  activityDetails?: {
    startedAt?: Date;
    progress?: number;
    timeSpent?: number;
    interactionCount?: number;
    metadata?: Record<string, any>;
  };

  @Column({
    type: 'int',
    default: 0,
    comment: 'Thời gian của phiên làm việc hiện tại, tính bằng giây.',
  })
  sessionDuration: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số trang/màn hình được xem trong phiên',
  })
  pageViews: number;

  @Column({
    type: 'int',
    default: 0,
    comment: 'Số lượng tương tác của người dùng trong phiên hiện tại',
  })
  interactionCount: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Thời gian cuối người dùng trên lớp hệ thống.',
  })
  lastActivityAt?: Date;

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Cột này chứa danh sách các kết nối socket hiện tại mà người dùng đang sử dụng để tương tác với hệ thống.',
  })
  connections?: {
    socketId: string;
    namespace: string;
    connectedAt: Date;
    rooms: string[];
  }[];

  @Column({
    type: 'json',
    nullable: true,
    comment:
      'Cột này dùng để lưu các cài đặt mà người dùng chọn cho việc hiển thị trạng thái online và nhận thông báo.',
  })
  preferences?: {
    showOnlineStatus?: boolean;
    showActivity?: boolean;
    allowDirectMessages?: boolean;
    notifications?: {
      desktop?: boolean;
      sound?: boolean;
      vibration?: boolean;
    };
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu metadata',
  })
  metadata?: Record<string, any>;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}

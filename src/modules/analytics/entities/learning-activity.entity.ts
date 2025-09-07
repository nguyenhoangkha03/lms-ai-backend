import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ActivityType, DeviceType } from '@/common/enums/analytics.enums';

@Entity('learning_activities')
@Index(['studentId'])
@Index(['courseId'])
@Index(['lessonId'])
@Index(['activityType'])
@Index(['sessionId'])
@Index(['timestamp'])
@Index(['studentId', 'courseId', 'timestamp'])
export class LearningActivity extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 36,
    comment: 'Khóa ngoại liên kết tới users.id, xác định sinh viên nào đã thực hiện hoạt động',
  })
  studentId: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID khóa học nếu hoạt động liên quan đến khóa học',
  })
  courseId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID bài học nếu hoạt động liên quan đến bài học',
  })
  lessonId?: string;

  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID đánh giá nếu hoạt động liên quan đến đánh giá',
  })
  assessmentId?: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    comment:
      'Cột quan trọng nhất, phân loại hành động đã diễn ra. Ví dụ: video_play (bắt đầu xem video), video_pause (tạm dừng), video_seek (tua video), quiz_submit (nộp bài quiz).',
  })
  activityType: ActivityType;

  @Column({
    type: 'varchar',
    length: 255,
    comment:
      'Mã định danh của phiên đăng nhập khi hoạt động được thực hiện, giúp nhóm các hoạt động lại với nhau',
  })
  sessionId: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm chính xác khi hoạt động xảy ra',
  })
  timestamp: Date;

  @Column({
    type: 'int',
    nullable: true,
    comment:
      'Thời gian kéo dài của hoạt động, tính bằng giây (ví dụ: thời gian xem video trước khi tạm dừng).',
  })
  duration?: number;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu metadata',
  })
  metadata?: {
    videoPosition?: number;
    playbackSpeed?: number;
    quality?: string;
    questionsAnswered?: number;
    questionsCorrect?: number;
    score?: number;
    pageUrl?: string;
    referrer?: string;
    searchQuery?: string;
    downloadedFile?: string;
    chatMessages?: number;
    interactionType?: string;
    [key: string]: any;
  };

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Địa chỉ IP của người dùng khi thực hiện hoạt động',
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Chuỗi thông tin về trình duyệt và hệ điều hành của người dùng',
  })
  userAgent?: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
    nullable: true,
    comment: 'Loại thiết bị được sử dụng',
  })
  deviceType?: DeviceType;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Tên trình duyệt',
  })
  browser?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Hệ điều hành',
  })
  operatingSystem?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Độ phân giải màn hình',
  })
  screenResolution?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Múi giờ của người dùng',
  })
  timezone?: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu định vị địa lý nếu có',
  })
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @Column({
    type: 'json',
    nullable: true,
    comment: 'Dữ liệu theo dõi bổ sung',
  })
  trackingData?: Record<string, any>;

  // Virtual properties
  get isEngagementActivity(): boolean {
    return [
      ActivityType.VIDEO_PLAY,
      ActivityType.VIDEO_START,
      ActivityType.VIDEO_RESUME,
      ActivityType.VIDEO_PAUSE,
      ActivityType.VIDEO_SEEK,
      ActivityType.VIDEO_SPEED_CHANGE,
      ActivityType.VIDEO_QUALITY_CHANGE,
      ActivityType.QUIZ_START,
      ActivityType.QUIZ_SUBMIT,
      ActivityType.DISCUSSION_POST,
      ActivityType.CHAT_MESSAGE,
      ActivityType.INTERACTIVE_COMPLETED,
      ActivityType.NOTE_CREATE,
      ActivityType.NOTE_UPDATED,
      ActivityType.BOOKMARK_CREATED,
    ].includes(this.activityType);
  }

  get isLearningProgress(): boolean {
    return [
      ActivityType.LESSON_START,
      ActivityType.LESSON_COMPLETE,
      ActivityType.LESSON_PROGRESS,
      ActivityType.COURSE_COMPLETE,
      ActivityType.VIDEO_COMPLETE,
      ActivityType.QUIZ_SUBMIT,
      ActivityType.QUIZ_COMPLETE,
      ActivityType.ASSIGNMENT_SUBMIT,
      ActivityType.INTERACTIVE_COMPLETED,
    ].includes(this.activityType);
  }
}

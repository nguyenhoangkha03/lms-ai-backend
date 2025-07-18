import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsDate,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType, EventScope } from '../entities/realtime-event.entity';
import { ActivityType, ActivityVisibility } from '../entities/activity-feed.entity';
import { PresenceStatus, ActivityStatus } from '../entities/user-presence.entity';

// Real-time Event DTOs
export class CreateEventDto {
  @ApiProperty({ enum: EventType, description: 'Type of real-time event' })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ enum: EventScope, description: 'Scope of event distribution' })
  @IsEnum(EventScope)
  scope: EventScope;

  @ApiPropertyOptional({ description: 'Target ID based on scope' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: 'User who triggered the event' })
  @IsOptional()
  @IsString()
  triggeredBy?: string;

  @ApiProperty({ description: 'Event title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Event message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Event payload data' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Action URL for event' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Icon URL for event' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Event priority (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number = 1;

  @ApiPropertyOptional({ description: 'Delivery channels configuration' })
  @IsOptional()
  @IsObject()
  channels?: {
    websocket?: boolean;
    push?: boolean;
    email?: boolean;
    sms?: boolean;
    inApp?: boolean;
  };

  @ApiPropertyOptional({ description: 'Event tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'When event expires' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;
}

export class BroadcastEventDto {
  @ApiProperty({ description: 'Event ID to broadcast' })
  @IsString()
  eventId: string;

  @ApiPropertyOptional({ description: 'Additional broadcast options' })
  @IsOptional()
  @IsObject()
  options?: {
    immediate?: boolean;
    priority?: number;
  };
}

export class EventFilters {
  @ApiPropertyOptional({ enum: EventType, isArray: true, description: 'Filter by event types' })
  @IsOptional()
  @IsArray()
  @IsEnum(EventType, { each: true })
  eventTypes?: EventType[];

  @ApiPropertyOptional({ description: 'Filter by priority levels', isArray: true })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  priority?: number[];

  @ApiPropertyOptional({ description: 'Filter by tags', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter events since this date' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  since?: Date;
}

// User Presence DTOs
export class UpdatePresenceDto {
  @ApiProperty({ enum: PresenceStatus, description: 'User presence status' })
  @IsEnum(PresenceStatus)
  status: PresenceStatus;

  @ApiPropertyOptional({ enum: ActivityStatus, description: 'User activity status' })
  @IsOptional()
  @IsEnum(ActivityStatus)
  activityStatus?: ActivityStatus;

  @ApiPropertyOptional({ description: 'Custom status message' })
  @IsOptional()
  @IsString()
  statusMessage?: string;

  @ApiPropertyOptional({ description: 'Current course ID' })
  @IsOptional()
  @IsString()
  currentCourseId?: string;

  @ApiPropertyOptional({ description: 'Current lesson ID' })
  @IsOptional()
  @IsString()
  currentLessonId?: string;

  @ApiPropertyOptional({ description: 'Current chat room ID' })
  @IsOptional()
  @IsString()
  currentChatRoomId?: string;

  @ApiPropertyOptional({ description: 'Current video session ID' })
  @IsOptional()
  @IsString()
  currentVideoSessionId?: string;
}

export class PresenceFilters {
  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by group ID' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Exclude specific user ID' })
  @IsOptional()
  @IsString()
  excludeUserId?: string;

  @ApiPropertyOptional({ enum: ActivityStatus, description: 'Filter by activity status' })
  @IsOptional()
  @IsEnum(ActivityStatus)
  activityStatus?: ActivityStatus;

  @ApiPropertyOptional({ description: 'Limit number of results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

// Activity Feed DTOs
export class CreateActivityDto {
  @ApiProperty({ description: 'User who performed the activity' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: ActivityType, description: 'Type of activity' })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiPropertyOptional({ enum: ActivityVisibility, description: 'Activity visibility' })
  @IsOptional()
  @IsEnum(ActivityVisibility)
  visibility?: ActivityVisibility = ActivityVisibility.PUBLIC;

  @ApiProperty({ description: 'Activity title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Activity description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Related course ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Related lesson ID' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Related assignment ID' })
  @IsOptional()
  @IsString()
  assignmentId?: string;

  @ApiPropertyOptional({ description: 'Related group ID' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  @IsOptional()
  @IsString()
  relatedId?: string;

  @ApiPropertyOptional({ description: 'Related entity type' })
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiPropertyOptional({ description: 'Activity data and context' })
  @IsOptional()
  @IsObject()
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

  @ApiPropertyOptional({ description: 'Action URL for the activity' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Image/thumbnail URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Activity tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'When activity occurred' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  occurredAt?: Date;
}

export class DateRangeDto {
  @ApiProperty({ description: 'Start date' })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'End date' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

export class ActivityFilters {
  @ApiPropertyOptional({
    enum: ActivityType,
    isArray: true,
    description: 'Filter by activity types',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ActivityType, { each: true })
  activityTypes?: ActivityType[];

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Date range filter' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({ description: 'Minimum importance level', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minImportance?: number;

  @ApiPropertyOptional({ description: 'Filter by tags', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Real-time subscription DTOs
export class SubscribeChannelDto {
  @ApiProperty({ description: 'Channel to subscribe to' })
  @IsString()
  channel: string;

  @ApiPropertyOptional({ description: 'Subscription filters' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilters)
  filters?: EventFilters;
}

export class UnsubscribeChannelDto {
  @ApiProperty({ description: 'Channel to unsubscribe from' })
  @IsString()
  channel: string;
}

// Live updates DTOs
export class SendLiveUpdateDto {
  @ApiProperty({ enum: EventType, description: 'Type of live update' })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ enum: EventScope, description: 'Update scope' })
  @IsEnum(EventScope)
  scope: EventScope;

  @ApiPropertyOptional({ description: 'Target ID based on scope' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiProperty({ description: 'Update title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Update message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Update payload' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Priority level', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number = 1;
}

// Progress tracking DTOs
export class TrackProgressDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  courseId: string;

  @ApiPropertyOptional({ description: 'Lesson ID' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiProperty({ description: 'Progress percentage', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiPropertyOptional({ description: 'Time spent in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Pagination DTOs
export class PaginationDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

// Response DTOs
export class RealtimeEventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: EventType })
  eventType: EventType;

  @ApiProperty({ enum: EventScope })
  scope: EventScope;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message?: string;

  @ApiProperty()
  payload?: Record<string, any>;

  @ApiProperty()
  triggeredBy?: string;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  reachCount: number;

  @ApiProperty()
  interactionCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  expiresAt?: Date;
}

export class UserPresenceResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: PresenceStatus })
  status: PresenceStatus;

  @ApiProperty({ enum: ActivityStatus })
  activityStatus: ActivityStatus;

  @ApiProperty()
  isOnline: boolean;

  @ApiProperty()
  lastSeenAt: Date;

  @ApiProperty()
  statusMessage?: string;

  @ApiProperty()
  currentCourseId?: string;

  @ApiProperty()
  currentLessonId?: string;

  @ApiProperty()
  sessionDuration: number;

  @ApiProperty()
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export class ActivityFeedResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ActivityType })
  activityType: ActivityType;

  @ApiProperty({ enum: ActivityVisibility })
  visibility: ActivityVisibility;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  courseId?: string;

  @ApiProperty()
  activityData?: Record<string, any>;

  @ApiProperty()
  likesCount: number;

  @ApiProperty()
  commentsCount: number;

  @ApiProperty()
  sharesCount: number;

  @ApiProperty()
  importance: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

export class LiveActivityStatsDto {
  @ApiProperty()
  totalOnlineUsers: number;

  @ApiProperty()
  activeInLessons: number;

  @ApiProperty()
  takingQuizzes: number;

  @ApiProperty()
  inVideoSessions: number;

  @ApiProperty()
  recentActivities: ActivityFeedResponseDto[];

  @ApiProperty()
  popularCourses: Array<{
    courseId: string;
    courseName: string;
    activeUsers: number;
  }>;
}

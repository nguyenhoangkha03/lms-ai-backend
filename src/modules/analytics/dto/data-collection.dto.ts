import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, DeviceType } from '@/common/enums/analytics.enums';

export class CreateActivityDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsString()
  studentId: string;

  @ApiPropertyOptional({ description: 'Course ID if activity is course-related' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Lesson ID if activity is lesson-related' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Assessment ID if activity is assessment-related' })
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ApiProperty({ enum: ActivityType, description: 'Type of learning activity' })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiProperty({ description: 'Unique session identifier' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Duration of activity in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Activity-specific metadata' })
  @IsOptional()
  @IsObject()
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

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ enum: DeviceType, description: 'Type of device used' })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ description: 'Browser name' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system' })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiPropertyOptional({ description: 'Screen resolution' })
  @IsOptional()
  @IsString()
  screenResolution?: string;

  @ApiPropertyOptional({ description: 'User timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class ActivityBatchDto {
  @ApiProperty({ type: [CreateActivityDto], description: 'Array of activities to track' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityDto)
  activities: CreateActivityDto[];

  @ApiPropertyOptional({ description: 'Batch identifier for tracking' })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ description: 'Processing priority (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class CreateSessionDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Unique session identifier' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ enum: DeviceType, description: 'Primary device type used in session' })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @ApiPropertyOptional({ description: 'Browser used in session' })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional({ description: 'Operating system used in session' })
  @IsOptional()
  @IsString()
  operatingSystem?: string;

  @ApiPropertyOptional({ description: 'IP address used in session' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Geolocation data for session' })
  @IsOptional()
  @IsObject()
  location?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiPropertyOptional({ description: 'Initial session metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Session engagement metrics' })
  @IsOptional()
  @IsObject()
  engagementMetrics?: {
    scrollDepth?: number;
    clickCount?: number;
    keystrokeCount?: number;
    idleTime?: number;
    focusTime?: number;
    tabSwitches?: number;
  };

  @ApiPropertyOptional({ description: 'Learning outcomes from this session' })
  @IsOptional()
  @IsObject()
  learningOutcomes?: {
    lessonsCompleted?: number;
    quizzesCompleted?: number;
    averageQuizScore?: number;
    newSkillsLearned?: string[];
    certificatesEarned?: string[];
  };

  @ApiPropertyOptional({ description: 'Session quality indicators' })
  @IsOptional()
  @IsObject()
  qualityIndicators?: {
    completionRate?: number;
    engagementScore?: number;
    focusScore?: number;
    interactionQuality?: number;
    learningEfficiency?: number;
  };

  @ApiPropertyOptional({ description: 'Additional session metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class EngagementMetricsDto {
  @ApiProperty({ description: 'Focus score (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  focusScore: number;

  @ApiProperty({ description: 'Interaction rate (interactions per minute)' })
  @IsNumber()
  @Min(0)
  interactionRate: number;

  @ApiPropertyOptional({ description: 'Scroll depth percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scrollDepth?: number;

  @ApiPropertyOptional({ description: 'Number of clicks' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  clickCount?: number;

  @ApiPropertyOptional({ description: 'Number of keystrokes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  keystrokeCount?: number;

  @ApiPropertyOptional({ description: 'Idle time in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  idleTime?: number;

  @ApiPropertyOptional({ description: 'Focus time in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  focusTime?: number;

  @ApiPropertyOptional({ description: 'Number of tab switches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tabSwitches?: number;

  @ApiPropertyOptional({ description: 'Mouse movement distance' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mouseMoveDistance?: number;

  @ApiPropertyOptional({ description: 'Time since last interaction in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSinceLastInteraction?: number;
}

export class PerformanceMetricsDto {
  @ApiProperty({ description: 'Average score percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  averageScore: number;

  @ApiProperty({ description: 'Completion rate (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  completionRate: number;

  @ApiPropertyOptional({ description: 'Number of attempts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  attempts?: number;

  @ApiPropertyOptional({ description: 'Time spent in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Success rate (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  successRate?: number;

  @ApiPropertyOptional({ description: 'Improvement rate (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(1)
  improvementRate?: number;

  @ApiPropertyOptional({ description: 'Difficulty level (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  difficultyLevel?: number;

  @ApiPropertyOptional({ description: 'Help requests count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  helpRequestsCount?: number;
}

export class BehaviorTrackingDto {
  @ApiProperty({ description: 'Student user ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Session identifier' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Event type' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({ description: 'Event data' })
  @IsOptional()
  @IsObject()
  eventData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Page or screen identifier' })
  @IsOptional()
  @IsString()
  pageId?: string;

  @ApiPropertyOptional({ description: 'Element identifier' })
  @IsOptional()
  @IsString()
  elementId?: string;

  @ApiPropertyOptional({ description: 'Event duration in milliseconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class RealTimeMetricsQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to look back', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  days?: number = 1;

  @ApiPropertyOptional({ description: 'Include engagement metrics', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeEngagement?: boolean = true;

  @ApiPropertyOptional({ description: 'Include performance metrics', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includePerformance?: boolean = true;

  @ApiPropertyOptional({ description: 'Include session data', default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeSession?: boolean = true;
}

export class BehaviorAnalysisQueryDto {
  @ApiPropertyOptional({ description: 'Number of days to analyze', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  days?: number = 30;

  @ApiPropertyOptional({ description: 'Specific course ID to analyze' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Activity types to include' })
  @IsOptional()
  @IsArray()
  @IsEnum(ActivityType, { each: true })
  activityTypes?: ActivityType[];

  @ApiPropertyOptional({ description: 'Include detailed patterns', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeDetailedPatterns?: boolean = false;
}

export class StreamingConfigDto {
  @ApiProperty({ description: 'Enable real-time streaming' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Streaming interval in milliseconds', default: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  interval?: number = 5000;

  @ApiPropertyOptional({ description: 'Events to stream' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @ApiPropertyOptional({ description: 'Buffer size for streaming', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  bufferSize?: number = 100;
}

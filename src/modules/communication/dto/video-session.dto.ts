import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDateString,
  IsObject,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VideoSessionType, VideoProvider } from '@/common/enums/communication.enums';
import { BreakoutRoom } from '../services/breakout-room.service';

export class CreateVideoSessionDto {
  @IsString()
  @IsNotEmpty()
  hostId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsEnum(VideoSessionType)
  sessionType: VideoSessionType;

  @IsEnum(VideoProvider)
  provider: VideoProvider;

  @IsDateString()
  scheduledStart: Date;

  @IsDateString()
  scheduledEnd: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxParticipants?: number;

  @IsOptional()
  @IsString()
  passcode?: string;

  @IsOptional()
  @IsBoolean()
  requiresRegistration?: boolean = false;

  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean = false;

  @IsOptional()
  @IsObject()
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

  @IsOptional()
  @IsObject()
  securitySettings?: {
    passwordProtected?: boolean;
    webinarMode?: boolean;
    privateChat?: boolean;
    fileTransfer?: boolean;
    attendeeAuthentication?: boolean;
    encryptionRequired?: boolean;
    watermarkEnabled?: boolean;
  };

  @IsOptional()
  @IsString()
  agenda?: string;
}

export class UpdateVideoSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsDateString()
  scheduledStart?: Date;

  @IsOptional()
  @IsDateString()
  scheduledEnd?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxParticipants?: number;

  @IsOptional()
  @IsBoolean()
  requiresRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;

  @IsOptional()
  @IsObject()
  settings?: any;

  @IsOptional()
  @IsObject()
  securitySettings?: any;

  @IsOptional()
  @IsString()
  agenda?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class JoinSessionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsObject()
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
}

export class ScheduleSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  scheduledStart: Date;

  @IsNumber()
  @Min(15)
  @Max(1440) // Max 24 hours
  duration: number; // in minutes

  @IsArray()
  @IsUUID(undefined, { each: true })
  participantIds: string[];

  @IsOptional()
  @IsEnum(VideoSessionType)
  sessionType?: VideoSessionType = VideoSessionType.MEETING;

  @IsOptional()
  @IsEnum(VideoProvider)
  provider?: VideoProvider = VideoProvider.WEBRTC;

  @IsOptional()
  @IsBoolean()
  autoStartRecording?: boolean = false;

  @IsOptional()
  @IsObject()
  settings?: any;
}

export class CreateBreakoutRoomsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakoutRoomDto)
  rooms: BreakoutRoom[];

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean = false;
}

export class BreakoutRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  participantIds?: string[] = [];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  capacity?: number;
}

export class RecordingControlDto {
  @IsBoolean()
  start: boolean;

  @IsOptional()
  @IsObject()
  settings?: {
    recordAudio?: boolean;
    recordVideo?: boolean;
    recordScreenShare?: boolean;
    quality?: 'SD' | 'HD' | 'FHD';
    format?: 'mp4' | 'webm';
  };
}

export class ParticipantActionDto {
  @IsUUID()
  targetUserId: string;

  @IsEnum(['mute', 'unmute', 'disable_video', 'enable_video', 'remove', 'promote', 'demote'])
  action: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PollDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  question: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  options: string[];

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean = false;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600) // Max 1 hour
  duration?: number; // in seconds
}

export class PollResponseDto {
  @IsUUID()
  pollId: string;

  @IsArray()
  @IsString({ each: true })
  answers: string[];
}

export class SessionFeedbackDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  audioQuality?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  videoQuality?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  contentQuality?: number;

  @IsOptional()
  @IsBoolean()
  technicalIssues?: boolean;

  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class TechnicalIssueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  issue: string;

  @IsEnum(['low', 'medium', 'high'])
  severity: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsObject()
  details?: any;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ConnectionQualityDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  audioQuality: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  videoQuality: number;

  @IsNumber()
  @Min(0)
  networkLatency: number; // in ms

  @IsNumber()
  @Min(0)
  @Max(100)
  jitter: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  packetLoss: number; // percentage

  @IsOptional()
  @IsNumber()
  bandwidth?: number; // in kbps

  @IsOptional()
  @IsString()
  connectionType?: string;
}

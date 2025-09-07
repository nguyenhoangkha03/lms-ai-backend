import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ParticipantRole, MessageType } from '@/common/enums/communication.enums';

export class SendMessageDto {
  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsUUID()
  senderId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @IsOptional()
  @IsUUID()
  threadId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];

  @IsOptional()
  @IsString()
  tempId?: string; // For client-side tracking
}

export class JoinRoomDto {
  @IsUUID()
  roomId: string;
}

export class LeaveRoomDto {
  @IsUUID()
  roomId: string;
}

export class TypingIndicatorDto {
  @IsUUID()
  roomId: string;
}

export class MessageReactionDto {
  @IsUUID()
  messageId: string;

  @IsString()
  @MaxLength(50)
  emoji: string;
}

export class EditMessageDto {
  @IsUUID()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

export class DeleteMessageDto {
  @IsUUID()
  messageId: string;
}

export class CreateThreadDto {
  @IsUUID()
  parentMessageId: string;

  @IsString()
  createdBy: string;

  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class FileUploadDto {
  @IsUUID()
  roomId: string;

  @IsOptional()
  @IsString()
  messageContent?: string;

  file: Express.Multer.File;
}

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(['public', 'private', 'course', 'lesson', 'study_group'])
  type?: string = 'public';

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = false;

  @IsOptional()
  @IsNumber()
  maxParticipants?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  settings?: any;

  @IsOptional()
  moderationSettings?: any;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  maxParticipants?: number;

  @IsOptional()
  settings?: any;

  @IsOptional()
  moderationSettings?: any;
}

export class InviteToRoomDto {
  @IsUUID()
  roomId: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  userIds: string[];

  @IsOptional()
  @IsEnum(['member', 'moderator', 'admin'])
  role?: ParticipantRole = ParticipantRole.MEMBER;
}

export class SearchMessagesDto {
  @IsUUID()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number = 0;
}

export class ModerationActionDto {
  @IsUUID()
  roomId: string;

  @IsUUID()
  targetUserId: string;

  @IsEnum(['warn', 'mute', 'kick', 'ban', 'delete_message', 'timeout'])
  action: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  duration?: number; // in minutes for temporary actions

  @IsOptional()
  @IsUUID()
  messageId?: string;
}

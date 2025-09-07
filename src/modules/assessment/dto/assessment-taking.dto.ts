import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsNotEmpty,
  Min,
  Max,
  Length,
} from 'class-validator';
import { SecurityEvent } from '../entities/assessment-session.entity';

export class StartAssessmentDto {
  @ApiPropertyOptional({ description: 'Browser information' })
  @IsOptional()
  @IsObject()
  browserInfo?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Screen resolution' })
  @IsOptional()
  @IsString()
  screenResolution?: string;

  @ApiPropertyOptional({ description: 'Network quality information' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  networkQuality?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SubmitAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Answer value' })
  @IsNotEmpty()
  answer: any;

  @ApiPropertyOptional({ description: 'Time spent on question in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Is final answer' })
  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @ApiPropertyOptional({ description: 'Answer metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SecurityEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsEnum(SecurityEvent)
  eventType: SecurityEvent;

  @ApiProperty({ description: 'Event timestamp' })
  @IsString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Event details' })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Severity level' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  severity?: number;
}

export class UpdateProgressDto {
  @ApiProperty({ description: 'Current question index' })
  @IsNumber()
  @Min(0)
  currentQuestionIndex: number;

  @ApiPropertyOptional({ description: 'Questions answered count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  questionsAnswered?: number;

  @ApiPropertyOptional({ description: 'Last activity timestamp' })
  @IsOptional()
  @IsString()
  lastActivity?: string;
}

export class SessionHeartbeatDto {
  @ApiProperty({ description: 'Current timestamp' })
  @IsString()
  timestamp: string;

  @ApiPropertyOptional({ description: 'Is window focused' })
  @IsOptional()
  @IsBoolean()
  windowFocused?: boolean;

  @ApiPropertyOptional({ description: 'Network status' })
  @IsOptional()
  @IsString()
  networkStatus?: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class PauseSessionDto {
  @ApiPropertyOptional({ description: 'Pause reason' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ResumeSessionDto {
  @ApiPropertyOptional({ description: 'Browser information' })
  @IsOptional()
  @IsObject()
  browserInfo?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SessionWarningDto {
  @ApiProperty({ description: 'Warning type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Warning message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Severity level' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  severity?: number;

  @ApiPropertyOptional({ description: 'Auto-dismiss after seconds' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  autoDismiss?: number;
}

export class AssessmentSessionResponse {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Session token' })
  sessionToken: string;

  @ApiProperty({ description: 'Assessment data' })
  assessment: any;

  @ApiProperty({ description: 'Questions data' })
  questions: any[];

  @ApiProperty({ description: 'Session configuration' })
  config: any;

  @ApiProperty({ description: 'Time remaining in seconds' })
  timeRemaining: number;

  @ApiProperty({ description: 'Current progress' })
  progress: {
    currentQuestion: number;
    totalQuestions: number;
    questionsAnswered: number;
    progressPercentage: number;
  };

  @ApiProperty({ description: 'Security settings' })
  security: {
    lockBrowser: boolean;
    disableCopyPaste: boolean;
    requireFullscreen: boolean;
    monitorTabSwitching: boolean;
    maxTabSwitches: number;
  };
}

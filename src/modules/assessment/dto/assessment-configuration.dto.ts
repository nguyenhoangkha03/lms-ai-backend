import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentStatus } from '@/common/enums/assessment.enums';

export class AntiCheatSettingsDto {
  @ApiPropertyOptional({ description: 'Lock browser during assessment' })
  @IsOptional()
  @IsBoolean()
  lockBrowser?: boolean;

  @ApiPropertyOptional({ description: 'Disable copy/paste' })
  @IsOptional()
  @IsBoolean()
  disableCopyPaste?: boolean;

  @ApiPropertyOptional({ description: 'Disable right-click context menu' })
  @IsOptional()
  @IsBoolean()
  disableRightClick?: boolean;

  @ApiPropertyOptional({ description: 'Monitor tab switching' })
  @IsOptional()
  @IsBoolean()
  monitorTabSwitching?: boolean;

  @ApiPropertyOptional({ description: 'Require webcam monitoring' })
  @IsOptional()
  @IsBoolean()
  requireWebcam?: boolean;

  @ApiPropertyOptional({ description: 'Detect screen sharing' })
  @IsOptional()
  @IsBoolean()
  detectScreenSharing?: boolean;

  @ApiPropertyOptional({ description: 'Maximum allowed tab switches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxTabSwitches?: number;

  @ApiPropertyOptional({ description: 'Randomize question order per student' })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiPropertyOptional({ description: 'Randomize answer options' })
  @IsOptional()
  @IsBoolean()
  randomizeAnswers?: boolean;

  @ApiPropertyOptional({ description: 'IP address restrictions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpAddresses?: string[];

  @ApiPropertyOptional({ description: 'Time zone restrictions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTimeZones?: string[];
}

export class AssessmentSettingsDto {
  @ApiPropertyOptional({ description: 'Allow late submission' })
  @IsOptional()
  @IsBoolean()
  allowLateSubmission?: boolean;

  @ApiPropertyOptional({ description: 'Late submission penalty percentage' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  lateSubmissionPenalty?: number;

  @ApiPropertyOptional({ description: 'Auto-submit when time expires' })
  @IsOptional()
  @IsBoolean()
  autoSubmitOnTimeout?: boolean;

  @ApiPropertyOptional({ description: 'Show timer to students' })
  @IsOptional()
  @IsBoolean()
  showTimer?: boolean;

  @ApiPropertyOptional({ description: 'Send reminder notifications' })
  @IsOptional()
  @IsBoolean()
  sendReminders?: boolean;

  @ApiPropertyOptional({ description: 'Reminder times in minutes before deadline' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  reminderTimes?: number[];

  @ApiPropertyOptional({ description: 'Allow question navigation' })
  @IsOptional()
  @IsBoolean()
  allowQuestionNavigation?: boolean;

  @ApiPropertyOptional({ description: 'Require all questions answered' })
  @IsOptional()
  @IsBoolean()
  requireAllAnswers?: boolean;

  @ApiPropertyOptional({ description: 'Show progress indicator' })
  @IsOptional()
  @IsBoolean()
  showProgress?: boolean;

  @ApiPropertyOptional({ description: 'Auto-save interval in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(300)
  autoSaveInterval?: number;
}

export class ConfigureAssessmentDto {
  @ApiPropertyOptional({ description: 'Assessment status', enum: Object.values(AssessmentStatus) })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({ description: 'Assessment settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssessmentSettingsDto)
  settings?: AssessmentSettingsDto;

  @ApiPropertyOptional({ description: 'Anti-cheating settings' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AntiCheatSettingsDto)
  antiCheatSettings?: AntiCheatSettingsDto;

  @ApiPropertyOptional({ description: 'Schedule assessment' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({ description: 'Assessment deadline' })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

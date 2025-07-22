import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class CookiePreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  essential?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  functional?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  analytics?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preferences?: boolean;
}

class DataRetentionPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  learningData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communicationData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  analyticsData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backupData?: string;
}

class AdvancedSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dataMinimization?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  automaticDeletion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  encryptionLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  accessControls?: Record<string, any>;
}

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  profileVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowSearch?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showLastSeen?: boolean;

  // Activity tracking
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackLearningActivity?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackPerformanceData?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareActivityData?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowAnalytics?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDirectMessages?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowGroupInvitations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowMarketingEmails?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowSystemNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareDataWithInstructors?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareDataWithPeers?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareDataWithThirdParties?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDataExport?: boolean;

  @ApiPropertyOptional({ type: CookiePreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CookiePreferencesDto)
  cookiePreferences?: CookiePreferencesDto;

  @ApiPropertyOptional({ type: DataRetentionPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DataRetentionPreferencesDto)
  dataRetentionPreferences?: DataRetentionPreferencesDto;

  @ApiPropertyOptional({ type: AdvancedSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdvancedSettingsDto)
  advancedSettings?: AdvancedSettingsDto;
}

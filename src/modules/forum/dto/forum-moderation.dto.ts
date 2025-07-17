import { IsString, IsOptional, IsInt, IsEnum, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModerationActionDto {
  @ApiProperty({ description: 'Action type' })
  @IsEnum([
    'lock',
    'unlock',
    'pin',
    'unpin',
    'feature',
    'unfeature',
    'archive',
    'delete',
    'ban_user',
    'mute_user',
  ])
  action: string;

  @ApiProperty({ description: 'Reason for action' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Action duration in hours (for temporary actions)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'Additional action information' })
  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, any>;
}

export class BulkModerationDto {
  @ApiProperty({ description: 'Target IDs for bulk action' })
  @IsString({ each: true })
  targetIds: string[];

  @ApiProperty({ description: 'Action type' })
  @IsEnum(['lock', 'unlock', 'pin', 'unpin', 'feature', 'unfeature', 'archive', 'delete'])
  action: string;

  @ApiProperty({ description: 'Reason for action' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Additional action information' })
  @IsOptional()
  @IsObject()
  additionalInfo?: Record<string, any>;
}

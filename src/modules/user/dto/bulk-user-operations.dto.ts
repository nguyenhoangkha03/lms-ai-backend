import { IsArray, IsEnum, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@/common/enums/user.enums';

export class BulkUserIdsDto {
  @ApiProperty({ description: 'Array of user IDs', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];
}

export class BulkUpdateStatusDto extends BulkUserIdsDto {
  @ApiProperty({ enum: UserStatus, description: 'New status for selected users' })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkAssignRolesDto extends BulkUserIdsDto {
  @ApiProperty({ description: 'Array of role IDs to assign', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  roleIds: string[];
}

export class ImportUsersDto {
  @ApiProperty({ description: 'CSV data with user information' })
  @IsString()
  csvData: string;

  @ApiPropertyOptional({ description: 'Send welcome emails to imported users', default: true })
  @IsOptional()
  sendWelcomeEmails?: boolean = true;
}

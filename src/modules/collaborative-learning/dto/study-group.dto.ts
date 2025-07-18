import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StudyGroupType,
  StudyGroupStatus,
  StudyGroupRole,
} from '@/common/enums/collaborative.enums';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class CreateStudyGroupDto {
  @ApiProperty({ description: 'Study group name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Study group description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: StudyGroupType, description: 'Study group type' })
  @IsEnum(StudyGroupType)
  type: StudyGroupType;

  @ApiPropertyOptional({ description: 'Associated course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Study group avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Maximum number of members', minimum: 2, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(100)
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Is group private' })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ description: 'Requires approval to join' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Study group tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Study schedule' })
  @IsOptional()
  schedule?: any;

  @ApiPropertyOptional({ description: 'Group goals and objectives' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ description: 'Group rules and guidelines' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];
}

export class UpdateStudyGroupDto {
  @ApiPropertyOptional({ description: 'Study group name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Study group description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: StudyGroupStatus, description: 'Study group status' })
  @IsOptional()
  @IsEnum(StudyGroupStatus)
  status?: StudyGroupStatus;

  @ApiPropertyOptional({ description: 'Study group avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Maximum number of members', minimum: 2, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(100)
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Is group private' })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ description: 'Requires approval to join' })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ description: 'Study group tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Study schedule' })
  @IsOptional()
  schedule?: any;

  @ApiPropertyOptional({ description: 'Group goals and objectives' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional({ description: 'Group rules and guidelines' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];
}

export class StudyGroupQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: StudyGroupType, description: 'Filter by group type' })
  @IsOptional()
  @IsEnum(StudyGroupType)
  type?: StudyGroupType;

  @ApiPropertyOptional({ enum: StudyGroupStatus, description: 'Filter by group status' })
  @IsOptional()
  @IsEnum(StudyGroupStatus)
  status?: StudyGroupStatus;

  @ApiPropertyOptional({ description: 'Filter by course ID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Show only joinable groups' })
  @IsOptional()
  @IsBoolean()
  joinableOnly?: boolean;
}

export class JoinStudyGroupDto {
  @ApiPropertyOptional({ description: 'Invite code' })
  @IsOptional()
  @IsString()
  inviteCode?: string;

  @ApiPropertyOptional({ description: 'Join message' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class ManageStudyGroupMemberDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: StudyGroupRole, description: 'Member role' })
  @IsEnum(StudyGroupRole)
  role: StudyGroupRole;

  @ApiPropertyOptional({ description: 'Action reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

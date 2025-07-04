import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserType, UserStatus } from '@/common/enums/user.enums';

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Search term for name, email, username' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserType, description: 'Filter by user type' })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by user status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by email verification status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  emailVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter by 2FA enabled status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Filter users created after this date' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'Filter users created before this date' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional({ description: 'Filter users by last login after this date' })
  @IsOptional()
  @IsDateString()
  lastLoginAfter?: string;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Include related profiles in response' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeProfiles?: boolean = false;

  @ApiPropertyOptional({ description: 'Include roles and permissions in response' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeRoles?: boolean = false;
}

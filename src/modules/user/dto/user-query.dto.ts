import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { UserType, UserStatus } from '@/common/enums/user.enums';

export class UserQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user type',
    enum: UserType,
  })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    description: 'Search term for email, username, or name',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Include user profiles in response',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeProfiles?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include user roles in response',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeRoles?: boolean = false;
}

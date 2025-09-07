import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { UserStatus } from '@/common/enums/user.enums';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Unique username',
    example: 'johndoe123',
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(50, { message: 'Username must not exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'johndoe@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Password (min 6 chars)',
    example: 'StrongP@ssw0rd',
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  password?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'John D.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://example.com/cover.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverUrl?: string;

  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'UTC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'User preferences',
    example: { theme: 'dark', notifications: true },
  })
  @IsOptional()
  preferences?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'User status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

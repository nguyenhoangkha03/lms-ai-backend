import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserType } from '@/common/enums/user.enums';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'johndoe123',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(50, { message: 'Username must not exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    description: 'Hashed password',
    example: '$2b$12$...',
  })
  @IsString()
  passwordHash: string;

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
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'User type',
    enum: UserType,
    default: UserType.STUDENT,
  })
  @IsOptional()
  @IsEnum(UserType, {
    message: 'User type must be either student, teacher, or admin',
  })
  userType?: UserType;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

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
}

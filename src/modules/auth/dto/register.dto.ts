import { UserType } from '@/common/enums/user.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Username (unique)',
    example: 'johndoe123',
    minLength: 3,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    description: 'Password (must meet security requirements)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({
    description: 'User type',
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
  })
  @IsOptional()
  @IsEnum(['student', 'teacher', 'admin'], {
    message: 'User type must be either student, teacher, or admin',
  })
  userType?: UserType;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}

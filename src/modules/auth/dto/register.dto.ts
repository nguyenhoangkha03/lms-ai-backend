import { UserType } from '@/common/enums/user.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsBoolean,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PasswordsMatchValidator } from '../validators/password.validator';

// ✅ Custom validator cho terms acceptance
@ValidatorConstraint({ name: 'mustBeTrue', async: false })
export class MustBeTrueValidator implements ValidatorConstraintInterface {
  validate(value: boolean) {
    return value === true;
  }

  defaultMessage() {
    return 'You must accept the terms and conditions';
  }
}

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Password (must meet security requirements)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'Confirm password (must match password)',
    example: 'SecurePassword123!',
  })
  @IsString()
  @Validate(PasswordsMatchValidator, ['password'], {
    message: 'Confirm password does not match password',
  })
  confirmPassword: string;

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

  @ApiProperty({
    description: 'Accept terms and conditions',
    example: true,
  })
  @IsBoolean({ message: 'Accept terms must be a boolean value' })
  @Validate(MustBeTrueValidator, {
    message: 'You must accept the terms and conditions',
  })
  acceptTerms: boolean;

  @ApiProperty({
    description: 'Agreed to terms and conditions',
    example: true,
  })
  @IsBoolean({ message: 'Agreed to terms must be a boolean value' })
  @Validate(MustBeTrueValidator, {
    message: 'You must agree to the terms and conditions',
  })
  agreedToTerms: boolean;
}

// import { UserType } from '@/common/enums/user.enums';
// import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// import {
//   IsEmail,
//   IsString,
//   MinLength,
//   IsEnum,
//   IsOptional,
//   Validate,
//   IsBoolean,
// } from 'class-validator';
// import { PasswordsMatchValidator } from '../validators/password.validator';

// export class RegisterDto {
//   @ApiProperty({
//     description: 'User email address',
//     example: 'user@example.com',
//   })
//   @IsEmail({}, { message: 'Please provide a valid email address' })
//   email: string;

//   //   @ApiProperty({
//   //     description: 'Username (unique)',
//   //     example: 'johndoe123',
//   //     minLength: 3,
//   //   })
//   //   @IsString()
//   //   @MinLength(3, { message: 'Username must be at least 3 characters long' })
//   //   @Matches(/^[a-zA-Z0-9_-]+$/, {
//   //     message: 'Username can only contain letters, numbers, underscores, and hyphens',
//   //   })
//   //   username: string;

//   @ApiProperty({
//     description: 'Password (must meet security requirements)',
//     example: 'SecurePassword123!',
//     minLength: 8,
//   })
//   @IsString()
//   @MinLength(8, { message: 'Password must be at least 8 characters long' })
//   password: string;

//   @ApiProperty({
//     description: 'Confirm password (must match password)',
//     example: 'SecurePassword123!',
//   })
//   @IsString()
//   @Validate(PasswordsMatchValidator, {
//     message: 'Confirm password does not match password',
//   })
//   confirmPassword: string;

//   @ApiPropertyOptional({
//     description: 'User type',
//     enum: ['student', 'teacher', 'admin'],
//     default: 'student',
//   })
//   @IsOptional()
//   @IsEnum(['student', 'teacher', 'admin'], {
//     message: 'User type must be either student, teacher, or admin',
//   })
//   userType?: UserType;

//   @ApiPropertyOptional({
//     description: 'First name',
//     example: 'John',
//   })
//   @IsOptional()
//   @IsString()
//   firstName?: string;

//   @ApiPropertyOptional({
//     description: 'Last name',
//     example: 'Doe',
//   })
//   @IsOptional()
//   @IsString()
//   lastName?: string;

//   @ApiProperty({
//     description: 'Accept terms and conditions',
//     example: true,
//   })
//   @IsBoolean({ message: 'You must accept the terms and conditions' })
//   acceptTerms: boolean;
// }

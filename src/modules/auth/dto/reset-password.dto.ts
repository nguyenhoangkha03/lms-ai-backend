import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token',
    example: 'abc123-def456-ghi789',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password (must meet security requirements)',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password (must match new password)',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  confirmPassword: string;
}

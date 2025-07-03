import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Enable2FADto {
  @ApiProperty({
    description: '6-digit verification code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'Code must be a string' })
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @IsNotEmpty({ message: 'Verification code is required' })
  code: string;
}

export class Verify2FADto {
  @ApiProperty({
    description: '6-digit verification code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'Code must be a string' })
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @IsNotEmpty({ message: 'Verification code is required' })
  code: string;
}

export class Complete2FALoginDto {
  @ApiProperty({
    description: 'Temporary token from initial login',
    example: 'temp_token_abc123...',
  })
  @IsString({ message: 'Temporary token must be a string' })
  @IsNotEmpty({ message: 'Temporary token is required' })
  tempToken: string;

  @ApiProperty({
    description: '6-digit verification code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: 'Code must be a string' })
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @IsNotEmpty({ message: 'Verification code is required' })
  code: string;
}

// export class VerifyTwoFactorDto {
//   @ApiProperty({
//     description: '6-digit TOTP code',
//     example: '123456',
//   })
//   @IsString()
//   @Length(6, 6, { message: 'Code must be exactly 6 digits' })
//   @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
//   token: string;
// }
// export class DisableTwoFactorDto extends VerifyTwoFactorDto {}
// export class VerifyBackupCodeDto {
//   @ApiProperty({
//     description: 'Backup code',
//     example: 'ABC123XYZ',
//   })
//   @IsString()
//   @Length(8, 10, { message: 'Backup code must be 8-10 characters' })
//   code: string;
// }

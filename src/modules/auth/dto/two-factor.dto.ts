import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: '6-digit TOTP code',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  token: string;
}

export class DisableTwoFactorDto extends VerifyTwoFactorDto {}

export class VerifyBackupCodeDto {
  @ApiProperty({
    description: 'Backup code',
    example: 'ABC123XYZ',
  })
  @IsString()
  @Length(8, 10, { message: 'Backup code must be 8-10 characters' })
  code: string;
}

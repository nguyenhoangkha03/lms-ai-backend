import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LinkOAuthDto {
  @ApiProperty({
    description: 'OAuth provider',
    enum: ['google', 'facebook'],
    example: 'google',
  })
  @IsEnum(['google', 'facebook'], { message: 'Provider must be google or facebook' })
  @IsNotEmpty({ message: 'Provider is required' })
  provider: 'google' | 'facebook';

  @ApiProperty({
    description: 'Provider user ID',
    example: '1234567890',
  })
  @IsString({ message: 'Provider ID must be a string' })
  @IsNotEmpty({ message: 'Provider ID is required' })
  providerId: string;

  @ApiProperty({
    description: 'OAuth access token',
    example: 'ya29.a0ARrdaM...',
  })
  @IsString({ message: 'Access token must be a string' })
  @IsNotEmpty({ message: 'Access token is required' })
  accessToken: string;

  @ApiProperty({
    description: 'OAuth refresh token',
    example: '1//04...',
    required: false,
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsOptional()
  refreshToken?: string;

  @ApiProperty({
    description: 'Profile data from OAuth provider',
    example: { name: 'John Doe', avatar: 'https://...' },
  })
  @IsObject({ message: 'Profile data must be an object' })
  @IsNotEmpty({ message: 'Profile data is required' })
  profileData: {
    name: string;
    avatar?: string;
  };
}

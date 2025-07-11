import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ContentVersionDto {
  @ApiPropertyOptional({
    description: 'Version note',
    example: 'Updated examples and added quiz',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  versionNote?: string;

  @ApiProperty({
    description: 'Version type',
    enum: ['major', 'minor', 'patch', 'draft'],
    example: 'minor',
  })
  @IsEnum(['major', 'minor', 'patch', 'draft'])
  versionType: 'major' | 'minor' | 'patch' | 'draft';
}
